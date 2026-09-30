import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Award, BookOpen, CheckCircle2, Info, Keyboard, LoaderCircle, Search, Target, Trophy, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLearningData } from "../../data/LearningContext";
import { filterSessionsInRange, summarizeSessions } from "../../data/sessionAnalytics";
import { supabase } from "../../lib/supabase";

type RankBy = "speed" | "accuracy";
type TimeRange = "all" | "week" | "month";
type LeaderboardEntry = {
  rank: number;
  display_name: string;
  best_wpm: number;
  average_accuracy: number;
  test_count: number;
  level: number;
  is_you: boolean;
};
type BoardState =
  | { status: "loading"; entries: LeaderboardEntry[] }
  | { status: "ready"; entries: LeaderboardEntry[] }
  | { status: "error"; entries: LeaderboardEntry[]; message: string }
  | { status: "unconfigured"; entries: [] };

const avatarColors = ["bg-rose-400", "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-teal-500"];
const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TT";
}

function periodStart(range: TimeRange) {
  if (range === "all") return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else {
    start.setDate(1);
  }
  return start;
}

export default function Leaderboard() {
  const { learner, results, completedLessons } = useLearningData();
  const [rankBy, setRankBy] = useState<RankBy>("speed");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [query, setQuery] = useState("");
  const [authReady, setAuthReady] = useState(!supabase);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [board, setBoard] = useState<BoardState>(supabase ? { status: "loading", entries: [] } : { status: "unconfigured", entries: [] });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user.id ?? null);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    }).catch(() => {
      if (active) setAuthReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !authReady) return;
    if (!userId) {
      setIsPublic(false);
      setDisplayName(learner?.name || "");
      setProfileLoading(false);
      setProfileError("");
      return;
    }

    let active = true;
    setProfileLoading(true);
    setProfileError("");
    void (async () => {
      try {
        const { data, error } = await supabase.from("leaderboard_profiles").select("display_name,is_public").eq("user_id", userId).maybeSingle();
        if (!active) return;
        if (error) {
          setProfileError(error.message);
          return;
        }
        const profile = data as { display_name: string; is_public: boolean } | null;
        setDisplayName(profile?.display_name || learner?.name || "Learner");
        setIsPublic(profile?.is_public ?? false);
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : "Could not load your leaderboard profile.");
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authReady, learner?.name, userId]);

  useEffect(() => {
    if (!supabase) {
      setBoard({ status: "unconfigured", entries: [] });
      return;
    }
    let active = true;
    setBoard((current) => ({ status: "loading", entries: current.entries }));
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_public_leaderboard", { p_period: timeRange, p_sort: rankBy });
        if (!active) return;
        if (error) {
          setBoard({ status: "error", entries: [], message: error.message });
          return;
        }
        setBoard({ status: "ready", entries: (data || []) as LeaderboardEntry[] });
      } catch (error) {
        if (active) setBoard({ status: "error", entries: [], message: error instanceof Error ? error.message : "Could not load the leaderboard." });
      }
    })();
    return () => { active = false; };
  }, [authReady, rankBy, reloadKey, timeRange, userId]);

  const periodTests = useMemo(() => {
    const start = periodStart(timeRange);
    return filterSessionsInRange(results, start).filter((result) => result.mode === "test");
  }, [results, timeRange]);

  const testSummary = summarizeSessions(periodTests);
  const bestWpm = testSummary.bestWpm;
  const averageAccuracy = testSummary.averageAccuracy;
  const entries = board.status === "unconfigured" ? [] : board.entries;
  const filteredEntries = entries.filter((entry) => entry.display_name.toLowerCase().includes(query.trim().toLowerCase()));
  const podiumEntries = [
    entries.find((entry) => entry.rank === 2),
    entries.find((entry) => entry.rank === 1),
    entries.find((entry) => entry.rank === 3),
  ];
  const myEntry = entries.find((entry) => entry.is_you);
  const rangeLabel = timeRange === "all" ? "all time" : timeRange === "week" ? "this week" : "this month";

  const stats = [
    { label: "Personal best", value: periodTests.length ? `${Math.round(bestWpm)} WPM` : "—", icon: Zap, color: "bg-blue-50 text-blue-600" },
    { label: "Average test accuracy", value: averageAccuracy === null ? "—" : `${averageAccuracy.toFixed(1)}%`, icon: Target, color: "bg-emerald-50 text-emerald-600" },
    { label: "Typing tests", value: String(periodTests.length), icon: Keyboard, color: "bg-violet-50 text-violet-600" },
    { label: "Lessons completed", value: String(completedLessons.length), icon: BookOpen, color: "bg-amber-50 text-amber-600" },
  ];

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    const safeName = displayName.trim();
    if (!safeName || safeName.length > 32) {
      setProfileError("Choose a display name between 1 and 32 characters.");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    setProfileNotice("");
    const { error } = await supabase.from("leaderboard_profiles").upsert({
      user_id: userId,
      display_name: safeName,
      is_public: true,
    }, { onConflict: "user_id" });
    if (error) {
      setProfileError(error.message);
    } else {
      setDisplayName(safeName);
      setIsPublic(true);
      setProfileNotice("Your public leaderboard profile is saved.");
      setReloadKey((key) => key + 1);
    }
    setProfileSaving(false);
  };

  const leaveLeaderboard = async () => {
    if (!supabase || !userId) return;
    setProfileSaving(true);
    setProfileError("");
    setProfileNotice("");
    const { error } = await supabase.from("leaderboard_profiles").upsert({
      user_id: userId,
      display_name: displayName.trim() || learner?.name || "Learner",
      is_public: false,
    }, { onConflict: "user_id" });
    if (error) {
      setProfileError(error.message);
    } else {
      setIsPublic(false);
      setProfileNotice("Your scores are no longer shown on the public leaderboard.");
      setReloadKey((key) => key + 1);
    }
    setProfileSaving(false);
  };

  return (
    <div className="w-full space-y-6 p-5 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Community &amp; personal bests</p>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#64748B]">Compare typing-test results with learners who choose to share.</p>
        </div>
        <Link to="/test" className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          Take a typing test <ArrowRight size={15} />
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Your typing-test statistics">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18} /></div>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{value}</p>
            <p className="mt-0.5 text-xs text-[#64748B]">{label}</p>
          </article>
        ))}
      </section>

      {!periodTests.length && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#2563EB]"><Trophy size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#0F172A]">Set your first test score</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">Your personal stats use completed typing tests for {rangeLabel}.</p>
          </div>
          <Link to="/test" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-blue-800">Start a test <ArrowRight size={14} /></Link>
        </section>
      )}

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5" aria-labelledby="leaderboard-privacy-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2"><Users size={18} className="text-[#2563EB]" /><h2 id="leaderboard-privacy-title" className="font-semibold text-[#0F172A]">Choose how you appear</h2></div>
            <p className="mt-2 text-xs leading-relaxed text-[#64748B]">Joining shares your display name, level, best WPM, average test accuracy, and test count. Your email and individual session details stay private. You can leave at any time.</p>
          </div>
          {isPublic && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Sharing enabled</span>}
        </div>

        {!authReady ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#64748B]"><LoaderCircle size={16} className="animate-spin" /> Checking your sign-in status…</div>
        ) : !supabase ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-xs text-amber-800">Connect Supabase to view and join the shared leaderboard.</p>
        ) : !userId ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-[#64748B]">Sign in to opt in and publish your typing-test scores.</p>
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline">Sign in <ArrowRight size={14} /></Link>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-medium text-[#475569]">
              Public display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value.slice(0, 32))}
                maxLength={32}
                required
                disabled={profileLoading || profileSaving}
                placeholder="Name shown on the leaderboard"
                className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </label>
            <button type="submit" disabled={profileLoading || profileSaving || !displayName.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : null}
              {profileSaving ? "Saving…" : isPublic ? "Save public profile" : "Join leaderboard"}
            </button>
            {isPublic && <button type="button" onClick={() => void leaveLeaderboard()} disabled={profileSaving} className="min-h-10 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50 disabled:opacity-60">Leave</button>}
          </form>
        )}
        {profileError && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-rose-700"><AlertCircle size={15} className="mt-0.5 shrink-0" />{profileError}</p>}
        {profileNotice && <p role="status" className="mt-3 text-xs text-emerald-700">{profileNotice}</p>}
      </section>

      <section className="leaderboard-podium rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Award size={18} className="text-amber-500" /><h2 className="font-semibold text-[#0F172A]">Top performers</h2></div>
          <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Opt-in community board</span>
        </div>
        {board.status === "loading" && !entries.length ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#64748B]"><LoaderCircle size={18} className="animate-spin" />Loading shared scores…</div>
        ) : board.status === "error" ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white/80 p-4 text-sm text-rose-700"><span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" />{board.message}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold text-[#2563EB] hover:underline">Try again</button></div>
        ) : board.status === "unconfigured" ? (
          <p className="rounded-xl bg-white/80 p-4 text-sm text-[#64748B]">The shared board will be available after Supabase is configured.</p>
        ) : entries.length ? (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podiumEntries.map((entry, slot) => entry ? (
              <article key={entry.rank} className={`flex min-w-0 flex-col items-center rounded-2xl border bg-white/90 px-2 py-4 text-center sm:px-4 ${entry.rank === 1 ? "min-h-44 border-amber-300 shadow-sm sm:min-h-48" : "min-h-36 border-[#E2E8F0] sm:min-h-40"}`}>
                <span className="mb-2 text-2xl" aria-label={`Rank ${entry.rank}`}>{medals[entry.rank]}</span>
                <div className={`mb-2 grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white ${avatarColors[(entry.rank - 1) % avatarColors.length]}`}>{initials(entry.display_name)}</div>
                <p className="w-full truncate text-xs font-semibold text-[#0F172A] sm:text-sm">{entry.display_name}{entry.is_you ? " (you)" : ""}</p>
                <p className="mt-1 text-lg font-bold text-[#2563EB] sm:text-xl">{rankBy === "speed" ? Math.round(entry.best_wpm) : `${Number(entry.average_accuracy).toFixed(1)}%`}</p>
                <p className="text-[10px] text-[#94A3B8]">{rankBy === "speed" ? "WPM" : "average accuracy"}</p>
              </article>
            ) : <div key={`podium-empty-${slot}`} className="min-h-28" />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-8 text-center">
            <Trophy size={22} className="mx-auto text-amber-500" />
            <p className="mt-2 text-sm font-semibold text-[#0F172A]">No public test scores yet</p>
            <p className="mt-1 text-xs text-[#64748B]">Opt in and complete a typing test to start the community board.</p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3 sm:px-5">
          <span className="text-xs font-medium text-[#64748B]">Show results for</span>
          <div className="flex items-center gap-2" role="group" aria-label="Filter leaderboard by time period">
            {([["all", "All Time"], ["week", "This Week"], ["month", "This Month"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={timeRange === value} onClick={() => setTimeRange(value)} className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${timeRange === value ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] p-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-[#2563EB]" />
            <div><h2 className="text-sm font-semibold text-[#0F172A]">Rankings</h2><p className="mt-0.5 text-[11px] text-[#94A3B8]">Top 100 and your rank · {rankBy === "speed" ? "best test WPM" : "average test accuracy"} · {rangeLabel}</p></div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="leaderboard-search">Search learners</label>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 sm:w-52 sm:flex-none">
              <Search size={15} className="shrink-0 text-[#94A3B8]" />
              <input id="leaderboard-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search learners" className="min-w-0 flex-1 bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8]" />
            </div>
            <div className="flex rounded-xl border border-[#E2E8F0] bg-slate-50 p-1" role="group" aria-label="Sort leaderboard">
              <button type="button" aria-pressed={rankBy === "speed"} onClick={() => setRankBy("speed")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${rankBy === "speed" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>Speed</button>
              <button type="button" aria-pressed={rankBy === "accuracy"} onClick={() => setRankBy("accuracy")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${rankBy === "accuracy" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>Accuracy</button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-blue-800 sm:px-5">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>Only learners who opt in appear. Rankings use saved typing-test results for the selected period; scores are not independently verified.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-slate-50/70">
                <th scope="col" className="w-20 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Rank</th>
                <th scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Learner</th>
                <th scope="col" className="w-24 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Level</th>
                <th scope="col" className="w-28 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Best WPM</th>
                <th scope="col" className="w-28 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Avg. accuracy</th>
                <th scope="col" className="w-28 px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Tests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredEntries.map((entry) => (
                <tr key={`${entry.rank}-${entry.display_name}`} className={`transition-colors ${entry.is_you ? "bg-blue-50/80" : "hover:bg-slate-50"}`}>
                  <td className="px-5 py-3.5"><span className={`text-sm font-semibold ${entry.rank <= 3 ? "text-amber-600" : "text-[#64748B]"}`}>{medals[entry.rank] || `#${entry.rank}`}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${avatarColors[(entry.rank - 1) % avatarColors.length]}`}>{initials(entry.display_name)}</div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0F172A]">{entry.display_name}{entry.is_you && <span className="ml-2 rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[9px] font-semibold text-white">YOU</span>}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#64748B]">Lv. {entry.level}</td>
                  <td className="px-4 py-3.5"><span className="font-mono text-sm font-bold text-[#2563EB]">{Math.round(entry.best_wpm)}</span><span className="ml-1 text-[10px] text-[#94A3B8]">WPM</span></td>
                  <td className="px-4 py-3.5"><span className={`text-sm font-medium ${entry.average_accuracy >= 98 ? "text-emerald-600" : "text-[#64748B]"}`}>{Number(entry.average_accuracy).toFixed(1)}%</span></td>
                  <td className="px-5 py-3.5 text-right text-sm text-[#64748B]">{entry.test_count}</td>
                </tr>
              ))}
              {board.status === "loading" && !entries.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748B]"><LoaderCircle size={18} className="mx-auto mb-2 animate-spin" />Loading rankings…</td></tr>}
              {board.status === "ready" && !filteredEntries.length && (
                <tr><td colSpan={6} className="px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"><Search size={17} /></div><p className="mt-3 text-sm font-semibold text-[#0F172A]">{entries.length ? "No matching learners" : "The board is waiting for its first scores"}</p><p className="mt-1 text-xs text-[#64748B]">{entries.length ? "Try another name or clear your search." : "Opt in and save a typing test to appear here."}</p>{query && <button onClick={() => setQuery("")} className="mt-3 text-xs font-semibold text-[#2563EB] hover:underline">Clear search</button>}</td></tr>
              )}
              {board.status === "error" && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-rose-700">Could not load rankings. Use the retry button above.</td></tr>}
              {board.status === "unconfigured" && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#64748B]">Connect Supabase to load public rankings.</td></tr>}
            </tbody>
          </table>
        </div>

        {myEntry && <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-blue-50 px-4 py-3 sm:px-5"><div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CheckCircle2 size={15} />Your community position</div><span className="text-sm font-bold text-blue-800">#{myEntry.rank} <span className="text-[10px] font-medium">by {rankBy === "speed" ? "speed" : "accuracy"}</span></span></div>}
      </section>
    </div>
  );
}
