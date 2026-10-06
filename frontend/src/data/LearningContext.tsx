import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { normalizePracticeResults } from "./sessionAnalytics";

export interface Learner {
  name: string;
  email: string;
}

export interface PracticeResult {
  id: string;
  mode: "practice" | "test";
  label?: string;
  wpm: number;
  accuracy: number;
  characters: number;
  errors: number;
  durationSeconds: number;
  createdAt: string;
}

export interface Preferences {
  darkMode: boolean;
  sounds: boolean;
  targetWpm: number;
  dailyGoal: number;
  difficulty: string;
  keyboardLayout: string;
}

interface LearningData {
  learner: Learner | null;
  results: PracticeResult[];
  completedLessons: number[];
  preferences: Preferences;
}

type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface LearningContextValue extends LearningData {
  /** undefined while auth identity resolves; null denotes the local/guest persona. */
  authenticatedUserId: string | null | undefined;
  syncStatus: SyncStatus;
  syncError: string | null;
  signIn: (learner: Learner) => void;
  signOut: () => void;
  addResult: (result: Omit<PracticeResult, "id" | "createdAt">) => void;
  resetProgress: () => void;
  deleteLocalAccount: () => void;
  completeLesson: (lessonId: number) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
}

const STORAGE_KEY = "typing-tutor.unified-data.v2";
const LEGACY_IMPORT_KEY = "typing-tutor.supabase-guest-import.v1";
const defaultPreferences: Preferences = {
  darkMode: false,
  sounds: true,
  targetWpm: 100,
  dailyGoal: 600,
  difficulty: "Medium",
  keyboardLayout: "QWERTY",
};

const emptyData: LearningData = {
  learner: null,
  results: [],
  completedLessons: [],
  preferences: defaultPreferences,
};

function storageKey(userId?: string) {
  return userId ? `${STORAGE_KEY}.user.${userId}` : STORAGE_KEY;
}

function readStoredData(key: string, fallback: LearningData): LearningData {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<LearningData>;
    return {
      ...fallback,
      ...parsed,
      preferences: { ...defaultPreferences, ...parsed.preferences },
      results: normalizePracticeResults(parsed.results),
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    };
  } catch {
    return fallback;
  }
}

function getUserName(user: User) {
  const metadataName = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name;
  return typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split("@")[0] || "Learner";
}

function canImportGuestData(data: LearningData, user: User) {
  if (!data.learner) return false;
  const localEmail = data.learner.email.trim().toLowerCase();
  const accountEmail = user.email?.trim().toLowerCase() || "";
  return !localEmail || localEmail === accountEmail || data.learner.name.toLowerCase() === "guest learner";
}

function mergeResults(...groups: PracticeResult[][]) {
  const unique = new Map<string, PracticeResult>();
  groups.flat().forEach((result) => {
    const normalized = normalizePracticeResults([result])[0];
    if (normalized && !unique.has(normalized.id)) unique.set(normalized.id, normalized);
  });
  return [...unique.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function supabaseError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function readCloudData(user: User): Promise<LearningData> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const [profileResult, preferencesResult, sessionsResult, lessonsResult] = await Promise.all([
    supabase.from("learner_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("learning_preferences").select("dark_mode,sounds,target_wpm,daily_goal,difficulty,keyboard_layout").eq("user_id", user.id).maybeSingle(),
    supabase.from("practice_sessions").select("id,mode,label,wpm,accuracy,characters,errors,duration_seconds,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("completed_lessons").select("lesson_id").eq("user_id", user.id),
  ]);
  supabaseError(profileResult.error);
  supabaseError(preferencesResult.error);
  supabaseError(sessionsResult.error);
  supabaseError(lessonsResult.error);

  const profile = profileResult.data as { display_name: string } | null;
  const preference = preferencesResult.data as {
    dark_mode: boolean; sounds: boolean; target_wpm: number; daily_goal: number;
    difficulty: string; keyboard_layout: string;
  } | null;
  const sessions = (sessionsResult.data || []) as Array<{
    id: string; mode: "practice" | "test"; label: string | null; wpm: number;
    accuracy: number; characters: number; errors: number; duration_seconds: number; created_at: string;
  }>;
  const lessons = (lessonsResult.data || []) as Array<{ lesson_id: number }>;

  return {
    learner: { name: profile?.display_name || getUserName(user), email: user.email || "" },
    preferences: preference ? {
      darkMode: preference.dark_mode,
      sounds: preference.sounds,
      targetWpm: preference.target_wpm,
      dailyGoal: preference.daily_goal,
      difficulty: preference.difficulty,
      keyboardLayout: preference.keyboard_layout,
    } : defaultPreferences,
    results: normalizePracticeResults(sessions.map((session) => ({
      id: session.id,
      mode: session.mode,
      ...(session.label ? { label: session.label } : {}),
      wpm: session.wpm,
      accuracy: session.accuracy,
      characters: session.characters,
      errors: session.errors,
      durationSeconds: session.duration_seconds,
      createdAt: session.created_at,
    }))),
    completedLessons: lessons.map((lesson) => lesson.lesson_id),
  };
}

async function persistCloudData(userId: string, data: LearningData) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const operations = await Promise.all([
    supabase.from("learner_profiles").upsert({ user_id: userId, display_name: data.learner?.name || "Learner" }, { onConflict: "user_id" }),
    supabase.from("learning_preferences").upsert({
      user_id: userId,
      dark_mode: data.preferences.darkMode,
      sounds: data.preferences.sounds,
      target_wpm: data.preferences.targetWpm,
      daily_goal: data.preferences.dailyGoal,
      difficulty: data.preferences.difficulty,
      keyboard_layout: data.preferences.keyboardLayout,
    }, { onConflict: "user_id" }),
    data.results.length
      ? supabase.from("practice_sessions").upsert(data.results.map((result) => ({
          id: result.id,
          user_id: userId,
          mode: result.mode,
          label: result.label || null,
          wpm: result.wpm,
          accuracy: result.accuracy,
          characters: result.characters,
          errors: result.errors,
          duration_seconds: result.durationSeconds,
          created_at: result.createdAt,
        })), { onConflict: "id" })
      : Promise.resolve({ error: null }),
    data.completedLessons.length
      ? supabase.from("completed_lessons").upsert(data.completedLessons.map((lessonId) => ({ user_id: userId, lesson_id: lessonId })), { onConflict: "user_id,lesson_id" })
      : Promise.resolve({ error: null }),
  ]);
  operations.forEach((operation) => supabaseError(operation.error));
}

export const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LearningData>(() => readStoredData(STORAGE_KEY, emptyData));
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null | undefined>(supabase ? undefined : null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const dataRef = useRef(data);
  const userIdRef = useRef<string | null>(null);
  const syncSequence = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { userIdRef.current = cloudUserId; }, [cloudUserId]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = data.preferences.darkMode ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", data.preferences.darkMode ? "#0b1220" : "#f8fafc");
  }, [data.preferences.darkMode]);

  useEffect(() => {
    window.localStorage.setItem(storageKey(cloudUserId || undefined), JSON.stringify(data));
  }, [data, cloudUserId]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const hydrateUser = async (user: User) => {
      setAuthenticatedUserId(user.id);
      const sequence = ++syncSequence.current;
      setSyncStatus("syncing");
      setSyncError(null);
      const cachedAccount = readStoredData(storageKey(user.id), { ...emptyData, learner: { name: getUserName(user), email: user.email || "" } });
      const guestData = readStoredData(STORAGE_KEY, emptyData);
      const mayImportGuest = window.localStorage.getItem(LEGACY_IMPORT_KEY) !== "done" && canImportGuestData(guestData, user);

      try {
        const cloudData = await readCloudData(user);
        const { data: cloudPreference, error: cloudPreferenceError } = await client.from("learning_preferences").select("user_id").eq("user_id", user.id).maybeSingle();
        supabaseError(cloudPreferenceError);
        if (!active || sequence !== syncSequence.current) return;
        const merged: LearningData = {
          learner: {
            name: cloudData.learner?.name || cachedAccount.learner?.name || (mayImportGuest ? guestData.learner?.name : null) || getUserName(user),
            email: user.email || "",
          },
          results: mergeResults(cloudData.results, cachedAccount.results, mayImportGuest ? guestData.results : []),
          completedLessons: [...new Set([
            ...cloudData.completedLessons,
            ...cachedAccount.completedLessons,
            ...(mayImportGuest ? guestData.completedLessons : []),
          ])],
          preferences: cloudPreference
            ? cloudData.preferences
            : cachedAccount.learner
              ? cachedAccount.preferences
              : mayImportGuest ? guestData.preferences : cloudData.preferences,
        };
        await persistCloudData(user.id, merged);
        if (!active || sequence !== syncSequence.current) return;
        window.localStorage.setItem(LEGACY_IMPORT_KEY, "done");
        if (guestData.learner || guestData.results.length || guestData.completedLessons.length) {
          if (!mayImportGuest) window.localStorage.setItem(`${STORAGE_KEY}.unassigned-backup`, JSON.stringify(guestData));
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
        }
        setData(merged);
        setCloudUserId(user.id);
        setSyncStatus("synced");
      } catch (error) {
        if (!active || sequence !== syncSequence.current) return;
        const safeFallback = cachedAccount.learner ? cachedAccount : {
          ...emptyData,
          learner: { name: getUserName(user), email: user.email || "" },
        };
        setData(safeFallback);
        setCloudUserId(user.id);
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Could not sync learning data.");
      }
    };

    const handleSignedOut = () => {
      setAuthenticatedUserId(null);
      ++syncSequence.current;
      setCloudUserId(null);
      setSyncError(null);
      setSyncStatus("local");
      setData(readStoredData(STORAGE_KEY, emptyData));
    };

    const retryOnReconnect = () => {
      void client.auth.getSession().then(({ data: sessionData }) => {
        if (active && sessionData.session?.user) void hydrateUser(sessionData.session.user);
      });
    };
    window.addEventListener("online", retryOnReconnect);

    void client.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return;
      if (error) {
        setSyncStatus("error");
        setSyncError(error.message);
        return;
      }
      if (sessionData.session?.user) void hydrateUser(sessionData.session.user);
      else setAuthenticatedUserId(null);
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        setAuthenticatedUserId(session.user.id);
        // Defer Supabase queries out of the auth callback to avoid holding its internal lock.
        Promise.resolve().then(() => { if (active) void hydrateUser(session.user); });
      } else if (event === "SIGNED_OUT") {
        handleSignedOut();
      }
    });

    return () => {
      active = false;
      window.removeEventListener("online", retryOnReconnect);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cloudUserId || !supabase) return;
    const snapshot = data;
    setSyncStatus("syncing");
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => persistCloudData(cloudUserId, snapshot))
      .then(() => {
        if (userIdRef.current === cloudUserId && dataRef.current === snapshot) {
          setSyncStatus("synced");
          setSyncError(null);
        }
      })
      .catch((error: unknown) => {
        if (userIdRef.current === cloudUserId) {
          setSyncStatus("error");
          setSyncError(error instanceof Error ? error.message : "Could not sync learning data.");
        }
      });
  }, [data, cloudUserId]);

  const value = useMemo<LearningContextValue>(() => ({
    ...data,
    authenticatedUserId,
    syncStatus,
    syncError,
    signIn: (learner) => setData((current) => ({ ...current, learner })),
    signOut: () => {
      setAuthenticatedUserId(null);
      setCloudUserId(null);
      setData(readStoredData(STORAGE_KEY, emptyData));
    },
    addResult: (result) => setData((current) => ({
      ...current,
      results: [{ ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current.results],
    })),
    resetProgress: () => {
      const userId = userIdRef.current;
      if (userId && supabase) {
        writeQueue.current = writeQueue.current.catch(() => undefined).then(async () => {
          const [sessions, lessons] = await Promise.all([
            supabase!.from("practice_sessions").delete().eq("user_id", userId),
            supabase!.from("completed_lessons").delete().eq("user_id", userId),
          ]);
          supabaseError(sessions.error);
          supabaseError(lessons.error);
        }).catch((error: unknown) => {
          setSyncStatus("error");
          setSyncError(error instanceof Error ? error.message : "Could not reset cloud progress.");
        });
      }
      setData((current) => ({ ...current, results: [], completedLessons: [] }));
    },
    deleteLocalAccount: () => {
      const currentUserId = userIdRef.current;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
      if (currentUserId) window.localStorage.removeItem(storageKey(currentUserId));
      setAuthenticatedUserId(null);
      setCloudUserId(null);
      setData({ ...emptyData });
      if (supabase) void supabase.auth.signOut();
    },
    completeLesson: (lessonId) => setData((current) => ({
      ...current,
      completedLessons: current.completedLessons.includes(lessonId) ? current.completedLessons : [...current.completedLessons, lessonId],
    })),
    updatePreferences: (preferences) => setData((current) => ({
      ...current,
      preferences: { ...current.preferences, ...preferences },
    })),
  }), [data, authenticatedUserId, syncStatus, syncError]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearningData() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearningData must be used inside LearningProvider");
  return context;
}
