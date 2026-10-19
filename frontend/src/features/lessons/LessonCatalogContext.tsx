import { createContext, useContext, type ReactNode } from "react";
import { bundledLessons } from "./bundledLessons";
import { type LessonRecord, type LessonStatus } from "./lessonCatalog";

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

// The deployed catalog is source-controlled and identical for every visitor.
// Browser storage and old cloud credentials cannot override these lessons.
const readOnly = async () => {
  throw new Error("Edit bundledLessons.ts and redeploy to update the lesson catalog.");
};
const bundledCatalog: LessonCatalogValue = {
  catalog: bundledLessons,
  catalogStatus: "local",
  catalogError: null,
  canManageCatalog: false,
  isLocalCatalog: true,
  saveLesson: readOnly,
  changeLessonStatus: readOnly,
  deleteLesson: readOnly,
  restoreDefaultCatalog: readOnly,
};

export function LessonCatalogProvider({ children }: { children: ReactNode }) {
  return <CatalogContext.Provider value={bundledCatalog}>{children}</CatalogContext.Provider>;
}

export function useLessonCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useLessonCatalog must be used inside LessonCatalogProvider");
  return context;
}
