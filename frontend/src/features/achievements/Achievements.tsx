import { useMemo } from "react";
import { useLearningData, type PracticeResult } from "../../data/LearningContext";
import { getLongestPracticeStreak, localDateKey, summarizeSessions } from "../../data/sessionAnalytics";

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
type Milestone = {
  id: string;
  icon: string;
  title: string;
  description: string;
  rarity: Rarity;
  progress: number;
  target: number;
  progressUnit: string;
  earnedAt?: string;
};

const rarityStyles: Record<Rarity, string> = {
  Common: "bg-slate-100 text-slate-600",
  Uncommon: "bg-emerald-50 text-emerald-700",
  Rare: "bg-blue-50 text-blue-700",
  Epic: "bg-violet-50 text-violet-700",
  Legendary: "bg-amber-50 text-amber-700",
};

function formatEarnedDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function firstMatchingDate(results: PracticeResult[], predicate: (result: PracticeResult) => boolean, requiredCount = 1) {
  const matches = [...results].filter(predicate).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return matches.length >= requiredCount ? matches[requiredCount - 1].createdAt : undefined;
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function firstStreakDate(results: PracticeResult[], target: number) {
  const uniqueDates = new Map<string, Date>();
  results.forEach((result) => {
    const date = dateOnly(new Date(result.createdAt));
    const key = localDateKey(date);
    if (key) uniqueDates.set(key, date);
  });
  const dates = [...uniqueDates.values()].sort((a, b) => a.getTime() - b.getTime());

  let streak = 0;
  let previous: Date | undefined;
  for (const date of dates) {
    const consecutive = previous !== undefined && (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(previous.getFullYear(), previous.getMonth(), previous.getDate())) === 86_400_000;
    streak = consecutive ? streak + 1 : 1;
    if (streak >= target) return date.toISOString();
    previous = date;
  }
  return undefined;
}

function firstWordMilestoneDate(results: PracticeResult[], threshold: number) {
  let words = 0;
  for (const result of [...results].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    words += result.characters / 5;
    if (words >= threshold) return result.createdAt;
  }
  return undefined;
}

export default function Achievements() {
  const { results, completedLessons } = useLearningData();
  const sortedResults = useMemo(() => [...results].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [results]);
  const tests = results.filter((result) => result.mode === "test");
  const lifetimeSummary = summarizeSessions(results);
  const bestWpm = lifetimeSummary.bestWpm;
  const totalWords = lifetimeSummary.words;
  const longestStreak = useMemo(() => getLongestPracticeStreak(results), [results]);

  const nightSessions = results.filter((result) => new Date(result.createdAt).getHours() < 5).length;
  const earlySessions = results.filter((result) => {
    const hour = new Date(result.createdAt).getHours();
    return hour >= 5 && hour < 6;
  }).length;
  const firstThirtyWpm = firstMatchingDate(sortedResults, (result) => result.wpm >= 30);
  const firstSixtyWpm = firstMatchingDate(sortedResults, (result) => result.wpm >= 60);
  const firstEightyWpm = firstMatchingDate(sortedResults, (result) => result.wpm >= 80);
  const firstHundredWpm = firstMatchingDate(sortedResults, (result) => result.wpm >= 100);
  const firstWordWarrior = firstWordMilestoneDate(sortedResults, 1000);
  const firstWordsmith = firstWordMilestoneDate(sortedResults, 10000);
  const firstWeek = firstStreakDate(results, 7);
  const firstMonth = firstStreakDate(results, 30);
  const firstPrecisionTest = firstMatchingDate(sortedResults, (result) => result.mode === "test" && result.accuracy >= 99);
  const firstPerfectTest = firstMatchingDate(sortedResults, (result) => result.mode === "test" && result.accuracy === 100);
  const firstNightOwl = firstMatchingDate(results, (result) => new Date(result.createdAt).getHours() < 5, 5);
  const firstEarlyBird = firstMatchingDate(results, (result) => {
    const hour = new Date(result.createdAt).getHours();
    return hour >= 5 && hour < 6;
  }, 5);

  const milestones: Milestone[] = [
    { id: "speed-30", icon: "⚡", title: "Speed Demon", description: "Reach 30 WPM for the first time", rarity: "Common", progress: bestWpm, target: 30, progressUnit: "WPM", earnedAt: firstThirtyWpm },
    { id: "speed-60", icon: "🎯", title: "Professional", description: "Reach 60 WPM", rarity: "Uncommon", progress: bestWpm, target: 60, progressUnit: "WPM", earnedAt: firstSixtyWpm },
    { id: "speed-80", icon: "🏆", title: "Expert Typist", description: "Reach 80 WPM", rarity: "Rare", progress: bestWpm, target: 80, progressUnit: "WPM", earnedAt: firstEightyWpm },
    { id: "speed-100", icon: "💯", title: "Century Club", description: "Break the 100 WPM barrier", rarity: "Epic", progress: bestWpm, target: 100, progressUnit: "WPM", earnedAt: firstHundredWpm },
    { id: "words-1000", icon: "📝", title: "Word Warrior", description: "Type 1,000 words in saved sessions", rarity: "Common", progress: totalWords, target: 1000, progressUnit: "words", earnedAt: firstWordWarrior },
    { id: "words-10000", icon: "📚", title: "Wordsmith", description: "Type 10,000 words in saved sessions", rarity: "Uncommon", progress: totalWords, target: 10000, progressUnit: "words", earnedAt: firstWordsmith },
    { id: "streak-7", icon: "🔥", title: "Week Warrior", description: "Complete a typing session on 7 consecutive days", rarity: "Uncommon", progress: longestStreak, target: 7, progressUnit: "days", earnedAt: firstWeek },
    { id: "streak-30", icon: "💪", title: "Iron Fingers", description: "Complete a typing session on 30 consecutive days", rarity: "Epic", progress: longestStreak, target: 30, progressUnit: "days", earnedAt: firstMonth },
    { id: "accuracy-99", icon: "🎖️", title: "Precision Master", description: "Reach 99% accuracy in a typing test", rarity: "Rare", progress: tests.some((result) => result.accuracy >= 99) ? 1 : 0, target: 1, progressUnit: "test", earnedAt: firstPrecisionTest },
    { id: "accuracy-100", icon: "⭐", title: "Perfect Score", description: "Finish a typing test with 100% accuracy", rarity: "Legendary", progress: tests.some((result) => result.accuracy === 100) ? 1 : 0, target: 1, progressUnit: "test", earnedAt: firstPerfectTest },
    { id: "night-owl", icon: "🦉", title: "Night Owl", description: "Save 5 sessions before 5 a.m.", rarity: "Common", progress: nightSessions, target: 5, progressUnit: "sessions", earnedAt: firstNightOwl },
    { id: "early-bird", icon: "🐦", title: "Early Bird", description: "Save 5 sessions between 5 and 6 a.m.", rarity: "Common", progress: earlySessions, target: 5, progressUnit: "sessions", earnedAt: firstEarlyBird },
    { id: "lesson-path", icon: "🧭", title: "Lesson Finisher", description: "Complete all 8 lessons in the learning path", rarity: "Rare", progress: completedLessons.length, target: 8, progressUnit: "lessons", earnedAt: completedLessons.length >= 8 ? firstMatchingDate(sortedResults, (result) => result.label === "Lesson 8") : undefined },
  ];
  const isEarned = (milestone: Milestone) => Boolean(milestone.earnedAt) || (milestone.id === "lesson-path" && completedLessons.length >= 8);
  const earnedCount = milestones.filter(isEarned).length;
  const completion = milestones.length ? Math.round((earnedCount / milestones.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-6 lg:p-8">
      <header className="mb-7">
        <h1 className="text-2xl font-bold text-[#0F172A]">Achievements</h1>
        <p className="mt-1 text-sm text-[#64748B]">Milestones earned through consistent practice</p>
      </header>

      <section className="mb-7 flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:gap-6 sm:p-6" aria-label="Achievement completion">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-50 text-3xl sm:h-16 sm:w-16">🏆</div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-semibold text-[#0F172A] sm:text-base">{earnedCount} of {milestones.length} achievements earned</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Achievements complete" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${completion}%` }} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-amber-500">{completion}%</p>
          <p className="text-xs text-slate-400">Complete</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Achievement milestones">
        {milestones.map((milestone) => {
          const earned = isEarned(milestone);
          const progress = Math.min(100, Math.round((milestone.progress / milestone.target) * 100));
          return (
            <article key={milestone.id} className={`min-h-44 rounded-2xl border p-5 transition-shadow ${earned ? "border-[#E2E8F0] bg-white hover:shadow-sm" : "border-slate-100 bg-white/70"}`}>
              <div className="mb-3 flex items-start justify-between">
                <div className={`grid h-12 w-12 place-items-center rounded-xl text-2xl ${earned ? "bg-amber-50" : "bg-slate-100 grayscale"}`} aria-hidden>{milestone.icon}</div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${rarityStyles[milestone.rarity]}`}>{milestone.rarity}</span>
              </div>
              <h2 className={`mb-1 font-semibold ${earned ? "text-[#0F172A]" : "text-slate-500"}`}>{milestone.title}</h2>
              <p className={`text-xs leading-relaxed ${earned ? "text-[#64748B]" : "text-slate-400"}`}>{milestone.description}</p>
              {earned ? (
                <p className="mt-3 text-xs font-medium text-emerald-600">✓ Earned {milestone.earnedAt ? formatEarnedDate(milestone.earnedAt) : "Complete"}</p>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-slate-400">{milestone.progress > 0 ? `${milestone.progressUnit === "words" ? Math.floor(milestone.progress).toLocaleString() : milestone.progress} / ${milestone.target.toLocaleString()} ${milestone.progressUnit}` : "Not yet earned"}</p>
                  {milestone.progress > 0 && <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-400" style={{ width: `${progress}%` }} /></div>}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
