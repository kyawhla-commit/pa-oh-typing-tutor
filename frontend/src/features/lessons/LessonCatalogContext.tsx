import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { defaultLessons, getLessonCatalog, saveLessonCatalog, type LessonRecord, type LessonStatus } from "./lessonCatalog";

type CatalogStatus = "local" | "loading" | "synced" | "error";
type LessonDraft = Omit<LessonRecord, "id" | "updatedAt">;

export interface LessonCatalogValue {
  catalog: LessonRecord[];
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  canManageCatalog: boolean;
  isLocalCatalog: boolean;
  saveLesson: (lesson: LessonDraft, id?: number) => Promise<void>;
  changeLessonStatus: (id: number, status: LessonStatus) => Promise<void>;
  deleteLesson: (id: number) => Promise<void>;
  restoreDefaultCatalog: () => Promise<void>;
}

export const CatalogContext = createContext<LessonCatalogValue | null>(null);

type LessonRow = {
  id: number;
  title: string;
  description: string;
  difficulty: LessonRecord["difficulty"];
  category: LessonRecord["category"];
  duration_minutes: number;
  content: string;
  status: LessonStatus;
  updated_at: string;
};

function toLesson(row: LessonRow): LessonRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    category: row.category,
    durationMinutes: row.duration_minutes,
    content: row.content,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toRow(lesson: LessonDraft) {
  return {
    title: lesson.title,
    description: lesson.description,
    difficulty: lesson.difficulty,
    category: lesson.category,
    duration_minutes: lesson.durationMinutes,
    content: lesson.content,
    status: lesson.status,
  };
}

export function LessonCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<LessonRecord[]>(getLessonCatalog);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>(supabase ? "loading" : "local");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [canManageCatalog, setCanManageCatalog] = useState(!supabase);

  const publishCatalog = (lessons: LessonRecord[], cache = true) => {
    const ordered = [...lessons].sort((a, b) => a.id - b.id);
    setCatalog(ordered);
    if (cache) saveLessonCatalog(ordered);
  };

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setCatalogStatus("local");
      return;
    }
    let active = true;
    let loadSequence = 0;
    let currentUserId: string | null = null;
    let currentIsAdmin = false;
    const loadCatalog = async (nextUserId: string | null, isAdmin: boolean) => {
      const sequence = ++loadSequence;
      currentUserId = nextUserId;
      currentIsAdmin = isAdmin;
      setUserId(nextUserId);
      setCanManageCatalog(isAdmin);
      setCatalogStatus("loading");
      setCatalogError(null);
      const query = client.from("lesson_catalog").select("id,title,description,difficulty,category,duration_minutes,content,status,updated_at").order("id");
      const { data, error } = await query;
      if (!active || sequence !== loadSequence) return;
      if (error) {
        setCatalog((current) => {
          const fallback = current.length ? current : getLessonCatalog();
          return isAdmin ? fallback : fallback.filter((lesson) => lesson.status === "Published");
        });
        setCatalogStatus("error");
        setCatalogError(error.message);
        return;
      }
      const lessons = ((data || []) as LessonRow[]).map(toLesson);
      publishCatalog(isAdmin ? lessons : lessons.filter((lesson) => lesson.status === "Published"), false);
      setCatalogStatus("synced");
    };

    const realtimeChannel = client.channel("shared-lesson-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_catalog" }, () => {
        void loadCatalog(currentUserId, currentIsAdmin);
      })
      .subscribe();

    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void loadCatalog(currentUserId, currentIsAdmin);
    };
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("online", refreshOnReturn);

    const { data: authListener } = client.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        const isAdmin = session.user.app_metadata.role === "admin";
        Promise.resolve().then(() => { if (active) void loadCatalog(session.user.id, isAdmin); });
      } else {
        void loadCatalog(null, false);
      }
    });
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) void loadCatalog(data.session.user.id, data.session.user.app_metadata.role === "admin");
      else void loadCatalog(null, false);
    });

    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("online", refreshOnReturn);
      authListener.subscription.unsubscribe();
      void client.removeChannel(realtimeChannel);
    };
  }, []);

  const value = useMemo<LessonCatalogValue>(() => {
    const ensureWritable = () => {
      if (!canManageCatalog) throw new Error("Only a provisioned lesson administrator can change the shared catalog.");
    };
    const ensureCloudAdmin = () => {
      ensureWritable();
      if (catalogStatus !== "local" && !userId) throw new Error("Sign in with an administrator account to edit the shared lesson catalog.");
      if (catalogStatus === "error") throw new Error(catalogError || "The shared lesson catalog is unavailable.");
    };
    const refreshCloudCatalog = async () => {
      if (!supabase || !userId) return;
      const { data, error } = await supabase.from("lesson_catalog").select("id,title,description,difficulty,category,duration_minutes,content,status,updated_at").order("id");
      if (error) throw error;
      publishCatalog(((data || []) as LessonRow[]).map(toLesson));
      setCatalogStatus("synced");
      setCatalogError(null);
    };

    return {
      catalog,
      catalogStatus,
      catalogError,
      canManageCatalog,
      isLocalCatalog: catalogStatus === "local",
      saveLesson: async (lesson, id) => {
        ensureCloudAdmin();
        if (catalogStatus === "local" || !userId || !supabase) {
          const updatedAt = new Date().toISOString();
          const updated = id === undefined
            ? [...catalog, { ...lesson, id: Math.max(0, ...catalog.map((item) => item.id)) + 1, updatedAt }]
            : catalog.map((item) => item.id === id ? { ...lesson, id, updatedAt } : item);
          publishCatalog(updated);
          return;
        }
        const result = id === undefined
          ? await supabase.from("lesson_catalog").insert(toRow(lesson)).select("id,title,description,difficulty,category,duration_minutes,content,status,updated_at").single()
          : await supabase.from("lesson_catalog").update(toRow(lesson)).eq("id", id).select("id,title,description,difficulty,category,duration_minutes,content,status,updated_at").single();
        if (result.error) throw result.error;
        const saved = toLesson(result.data as LessonRow);
        publishCatalog(id === undefined ? [...catalog, saved] : catalog.map((item) => item.id === id ? saved : item));
      },
      changeLessonStatus: async (id, status) => {
        ensureCloudAdmin();
        if (catalogStatus === "local" || !userId || !supabase) {
          publishCatalog(catalog.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
          return;
        }
        const { data: updated, error } = await supabase.from("lesson_catalog").update({ status }).eq("id", id).select("id").single();
        if (error) throw error;
        if (!updated) throw new Error("Lesson was not found or could not be updated.");
        await refreshCloudCatalog();
      },
      deleteLesson: async (id) => {
        ensureCloudAdmin();
        if (catalogStatus === "local" || !userId || !supabase) {
          publishCatalog(catalog.filter((item) => item.id !== id));
          return;
        }
        const { data: deleted, error } = await supabase.from("lesson_catalog").delete().eq("id", id).select("id").single();
        if (error?.code === "23503") throw new Error("This lesson has learner completion history. Move it to drafts instead of deleting it.");
        if (error) throw error;
        if (!deleted) throw new Error("Lesson was not found or could not be deleted.");
        await refreshCloudCatalog();
      },
      restoreDefaultCatalog: async () => {
        ensureCloudAdmin();
        if (catalogStatus === "local" || !userId || !supabase) {
          publishCatalog(defaultLessons);
          return;
        }
        const { error } = await supabase.rpc("restore_default_lesson_catalog");
        if (error) throw error;
        await refreshCloudCatalog();
      },
    };
  }, [catalog, catalogStatus, catalogError, canManageCatalog, userId]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useLessonCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useLessonCatalog must be used inside LessonCatalogProvider");
  return context;
}
