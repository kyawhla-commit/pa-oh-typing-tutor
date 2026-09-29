export type LessonStatus = "Published" | "Draft";
export type LessonDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type LessonCategory = "Beginner" | "Intermediate" | "Advanced" | "Programming";

export interface LessonRecord {
  id: number;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  category: LessonCategory;
  durationMinutes: number;
  content: string;
  status: LessonStatus;
  updatedAt: string;
}

const STORAGE_KEY = "typing-tutor.lesson-catalog.v1";
const EVENT_NAME = "typing-tutor:lesson-catalog-updated";

export const defaultLessons: LessonRecord[] = [
  { id: 1, title: "Home Row Keys", description: "Master ASDF and JKL; — the foundation of touch typing.", difficulty: "Beginner", category: "Beginner", durationMinutes: 10, content: "asdf jkl; asdf jkl; sad lad fall ask flask", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 2, title: "Top Row Keys", description: "Expand to QWERTY and YUIOP with proper finger placement.", difficulty: "Beginner", category: "Beginner", durationMinutes: 12, content: "qwer tyui op qwer tyui op type the top row with steady rhythm", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 3, title: "Bottom Row Keys", description: "Complete the full keyboard with ZXCVB and NM,./", difficulty: "Beginner", category: "Beginner", durationMinutes: 15, content: "zxcv bnm zxcv bnm practice the bottom row with relaxed hands", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 4, title: "Common Words", description: "Practice the 100 most common English words for fluency.", difficulty: "Intermediate", category: "Intermediate", durationMinutes: 20, content: "the quick brown fox jumps over the lazy dog while we practice common words", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 5, title: "Numbers & Symbols", description: "Tackle number row and shift-key symbols efficiently.", difficulty: "Intermediate", category: "Intermediate", durationMinutes: 18, content: "12345 67890 ! @ # $ % use the number row with careful accuracy", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 6, title: "Speed Drills", description: "Push your WPM ceiling with intensive speed exercises.", difficulty: "Advanced", category: "Advanced", durationMinutes: 25, content: "steady rhythm and accurate movement build speed through focused daily practice", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 7, title: "JavaScript Syntax", description: "Type common JS patterns, arrow functions, and destructuring.", difficulty: "Advanced", category: "Programming", durationMinutes: 30, content: "const greet = (name) => `Hello, ${name}!`; console.log(greet('world'));", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: 8, title: "Python Patterns", description: "Practice Python indentation, list comprehensions, and f-strings.", difficulty: "Advanced", category: "Programming", durationMinutes: 28, content: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('world'))", status: "Published", updatedAt: "2026-09-01T00:00:00.000Z" },
];

function isLessonRecord(value: unknown): value is LessonRecord {
  if (!value || typeof value !== "object") return false;
  const lesson = value as Partial<LessonRecord>;
  return Number.isInteger(lesson.id) && typeof lesson.title === "string" && typeof lesson.description === "string"
    && typeof lesson.content === "string" && (lesson.status === "Published" || lesson.status === "Draft");
}

export function getLessonCatalog(): LessonRecord[] {
  if (typeof window === "undefined") return defaultLessons;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultLessons;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(isLessonRecord) ? parsed : defaultLessons;
  } catch {
    return defaultLessons;
  }
}

export function saveLessonCatalog(lessons: LessonRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeToLessonCatalog(onChange: () => void) {
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener("storage", onChange);
  };
}
