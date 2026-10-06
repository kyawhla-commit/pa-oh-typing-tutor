import { useMemo, useState, type ReactNode } from "react";
import {
  LearningContext,
  type LearningContextValue,
  type PracticeResult,
} from "../../data/LearningContext";
import {
  CatalogContext,
  type LessonCatalogValue,
} from "../lessons/LessonCatalogContext";
import { TypingSessionObserverContext } from "../typing/useTypingSession";
import type { createPassivePilotObserver } from "./observer";
const emptyCatalog: LessonCatalogValue = {
  catalog: [],
  catalogStatus: "local",
  catalogError: null,
  canManageCatalog: false,
  isLocalCatalog: true,
  saveLesson: async () => {},
  changeLessonStatus: async () => {},
  deleteLesson: async () => {},
  restoreDefaultCatalog: async () => {},
};
/** Study iframe only. No account provider, authentication, cloud sync, or ordinary storage writes. */
export function StudyProviders({
  scope,
  observer,
  children,
}: {
  scope: string;
  observer: ReturnType<typeof createPassivePilotObserver>;
  children: ReactNode;
}) {
  const [results, setResults] = useState<PracticeResult[]>([]);
  const value = useMemo<LearningContextValue>(
    () => ({
      learner: { name: "Study learner", email: "" },
      authenticatedUserId: scope.slice(5),
      results,
      completedLessons: [],
      preferences: {
        darkMode: false,
        sounds: true,
        targetWpm: 100,
        dailyGoal: 600,
        difficulty: "Medium",
        keyboardLayout: "QWERTY",
      },
      syncStatus: "local",
      syncError: null,
      signIn: () => {},
      signOut: () => {},
      addResult: (r) =>
        setResults((previous) =>
          [
            {
              ...r,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...previous,
          ].slice(0, 50),
        ),
      resetProgress: () => {},
      deleteLocalAccount: () => {},
      completeLesson: () => {},
      updatePreferences: () => {},
    }),
    [scope, results],
  );
  return (
    <LearningContext.Provider value={value}>
      <CatalogContext.Provider value={emptyCatalog}>
        <TypingSessionObserverContext.Provider value={observer.observeSession}>
          {children}
        </TypingSessionObserverContext.Provider>
      </CatalogContext.Provider>
    </LearningContext.Provider>
  );
}
