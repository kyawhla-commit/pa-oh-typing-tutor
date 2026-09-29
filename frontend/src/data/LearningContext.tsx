import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface Learner {
  name: string;
  email: string;
}

export interface PracticeResult {
  id: string;
  mode: "practice" | "test";
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

interface LearningContextValue extends LearningData {
  signIn: (learner: Learner) => void;
  signOut: () => void;
  addResult: (result: Omit<PracticeResult, "id" | "createdAt">) => void;
  completeLesson: (lessonId: number) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
}

const STORAGE_KEY = "typing-tutor.unified-data.v2";
const defaultPreferences: Preferences = {
  darkMode: false,
  sounds: true,
  targetWpm: 100,
  dailyGoal: 600,
  difficulty: "Medium",
  keyboardLayout: "QWERTY",
};

const demoData: LearningData = {
  learner: { name: "Alex Johnson", email: "alex@email.com" },
  results: [],
  completedLessons: [],
  preferences: defaultPreferences,
};

function loadData(): LearningData {
  if (typeof window === "undefined") return demoData;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return demoData;
    const parsed = JSON.parse(saved) as Partial<LearningData>;
    return {
      ...demoData,
      ...parsed,
      preferences: { ...defaultPreferences, ...parsed.preferences },
      results: Array.isArray(parsed.results) ? parsed.results : [],
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    };
  } catch {
    return demoData;
  }
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LearningData>(loadData);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const value = useMemo<LearningContextValue>(() => ({
    ...data,
    signIn: (learner) => setData((current) => ({ ...current, learner })),
    signOut: () => setData((current) => ({ ...current, learner: null })),
    addResult: (result) => setData((current) => ({
      ...current,
      results: [{ ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current.results],
    })),
    completeLesson: (lessonId) => setData((current) => ({
      ...current,
      completedLessons: current.completedLessons.includes(lessonId)
        ? current.completedLessons
        : [...current.completedLessons, lessonId],
    })),
    updatePreferences: (preferences) => setData((current) => ({
      ...current,
      preferences: { ...current.preferences, ...preferences },
    })),
  }), [data]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearningData() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearningData must be used inside LearningProvider");
  return context;
}
