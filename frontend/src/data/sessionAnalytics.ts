import type { PracticeResult } from "./LearningContext";

export type SessionSummary = {
  sessions: number;
  words: number;
  durationSeconds: number;
  averageWpm: number | null;
  bestWpm: number;
  averageAccuracy: number | null;
  activeDays: number;
};

export function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfLocalWeek(value: Date) {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function getSessionsOnDay(results: PracticeResult[], date: Date) {
  const key = localDateKey(date);
  if (!key) return [];
  return results.filter((result) => localDateKey(result.createdAt) === key);
}

export function sumSessionSeconds(results: PracticeResult[]) {
  return results.reduce((sum, result) => sum + (Number.isFinite(result.durationSeconds) ? Math.max(0, result.durationSeconds) : 0), 0);
}

export function estimateTypedWords(results: PracticeResult[]) {
  const characters = results.reduce((sum, result) => sum + (Number.isFinite(result.characters) ? Math.max(0, result.characters) : 0), 0);
  return Math.floor(characters / 5);
}

export function summarizeSessions(results: PracticeResult[]): SessionSummary {
  const valid = results.filter((result) => Number.isFinite(new Date(result.createdAt).getTime()));
  return {
    sessions: valid.length,
    words: estimateTypedWords(valid),
    durationSeconds: sumSessionSeconds(valid),
    averageWpm: valid.length ? Math.round(valid.reduce((sum, result) => sum + result.wpm, 0) / valid.length) : null,
    bestWpm: Math.max(0, ...valid.map((result) => result.wpm)),
    averageAccuracy: valid.length ? valid.reduce((sum, result) => sum + result.accuracy, 0) / valid.length : null,
    activeDays: new Set(valid.map((result) => localDateKey(result.createdAt)).filter(Boolean)).size,
  };
}

function activeDayOrdinals(results: PracticeResult[]) {
  return [...new Set(results.map((result) => localDateKey(result.createdAt)).filter((key): key is string => Boolean(key)))]
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return Math.floor(Date.UTC(year, month, day) / 86_400_000);
    })
    .sort((a, b) => a - b);
}

export function getLongestPracticeStreak(results: PracticeResult[]) {
  let longest = 0;
  let current = 0;
  let previous: number | undefined;
  for (const day of activeDayOrdinals(results)) {
    current = previous !== undefined && day - previous === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

export function getCurrentPracticeStreak(results: PracticeResult[], now = new Date()) {
  const activeDays = new Set(activeDayOrdinals(results));
  let cursor = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  if (!activeDays.has(cursor)) cursor -= 1;
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function filterSessionsByPeriod(results: PracticeResult[], period: "7d" | "30d" | "all", now = new Date()) {
  if (period === "all") return results;
  const firstDay = startOfLocalDay(now);
  firstDay.setDate(firstDay.getDate() - (period === "7d" ? 6 : 29));
  return results.filter((result) => {
    const timestamp = new Date(result.createdAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= firstDay.getTime() && timestamp <= now.getTime();
  });
}

export function filterSessionsInRange(results: PracticeResult[], start: Date | null, end = new Date()) {
  const startTime = start?.getTime() ?? Number.NEGATIVE_INFINITY;
  const endTime = end.getTime();
  return results.filter((result) => {
    const timestamp = new Date(result.createdAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
  });
}

export function normalizePracticeResult(value: unknown): PracticeResult | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const mode = row.mode;
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : typeof row.created_at === "string" ? row.created_at : "";
  const date = new Date(createdAt);
  const number = (primary: unknown, fallback: unknown) => Number(primary ?? fallback);
  const wpm = number(row.wpm, 0);
  const accuracy = number(row.accuracy, 0);
  const characters = number(row.characters, 0);
  const errors = number(row.errors, 0);
  const durationSeconds = number(row.durationSeconds, row.duration_seconds);
  if (!id || (mode !== "practice" && mode !== "test") || !Number.isFinite(date.getTime())) return null;
  if (![wpm, accuracy, characters, errors, durationSeconds].every(Number.isFinite)) return null;
  if (wpm < 0 || accuracy < 0 || accuracy > 100 || characters < 0 || errors < 0 || durationSeconds < 0) return null;
  const label = typeof row.label === "string" && row.label.trim() ? row.label : undefined;
  return {
    id,
    mode,
    ...(label ? { label } : {}),
    wpm,
    accuracy,
    characters,
    errors,
    durationSeconds,
    createdAt: date.toISOString(),
  };
}

export function normalizePracticeResults(value: unknown): PracticeResult[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, PracticeResult>();
  for (const entry of value) {
    const result = normalizePracticeResult(entry);
    if (result && !byId.has(result.id)) byId.set(result.id, result);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
