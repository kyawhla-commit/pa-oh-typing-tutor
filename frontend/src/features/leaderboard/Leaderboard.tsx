import { useMemo, useState } from "react";
import { ArrowRight, Award, BookOpen, CheckCircle2, Info, Keyboard, Search, Target, Trophy, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLearningData } from "../../data/LearningContext";

type RankBy = "speed" | "accuracy";
type TimeRange = "all" | "week" | "month";
type Player = {
  id: string;
  name: string;
  level: number;
  wpm: number;
  accuracy: number;
  sessions: number;
  you?: boolean;
  sample?: boolean;
};

const samplePlayers: Player[] = [
  { id: "sarah", name: "Sarah K.", level: 25, wpm: 142, accuracy: 99, sessions: 184, sample: true },
  { id: "mike", name: "Mike T.", level: 22, wpm: 138, accuracy: 98, sessions: 147, sample: true },
  { id: "priya", name: "Priya S.", level: 20, wpm: 131, accuracy: 99, sessions: 122, sample: true },
  { id: "james", name: "James L.", level: 18, wpm: 125, accuracy: 97, sessions: 103, sample: true },
  { id: "anna", name: "Anna R.", level: 17, wpm: 119, accuracy: 98, sessions: 98, sample: true },
  { id: "david", name: "David W.", level: 16, wpm: 115, accuracy: 96, sessions: 82, sample: true },
  { id: "emma", name: "Emma C.", level: 15, wpm: 110, accuracy: 97, sessions: 76, sample: true },
];

const avatarColors = ["bg-rose-400", "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-teal-500"];
const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Leaderboard() {
  const { learner, results, completedLessons } = useLearningData();
  const [rankBy, setRankBy] = useState<RankBy>("speed");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [query, setQuery] = useState("");
  const periodResults = useMemo(() => {
    if (timeRange === "all") return results;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (timeRange === "week") {
      const daysSinceMonday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
    } else {
      start.setDate(1);
    }

    return results.filter((result) => {
      const createdAt = new Date(result.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= now;
    });
  }, [results, timeRange]);
  const bestWpm = Math.max(0, ...periodResults.map((result) => result.wpm));
  const averageAccuracy = periodResults.length ? Math.round(periodResults.reduce((sum, result) => sum + result.accuracy, 0) / periodResults.length) : null;
  const level = Math.floor(completedLessons.length / 3) + 1;
  const learnerName = learner?.name || "You";

  const rankedPlayers = useMemo(() => {
    const participants = [...samplePlayers];
    if (periodResults.length) {
      participants.push({
        id: "current-learner",
        name: learnerName,
        level,
        wpm: bestWpm,
        accuracy: averageAccuracy || 0,
        sessions: periodResults.length,
        you: true,
      });
    }

    participants.sort((left, right) => {
      const primary = rankBy === "speed" ? right.wpm - left.wpm : right.accuracy - left.accuracy;
      if (primary) return primary;
      const secondary = rankBy === "speed" ? right.accuracy - left.accuracy : right.wpm - left.wpm;
      return secondary || left.name.localeCompare(right.name);
    });

    // The selected metric ranks first; the other metric breaks ties deterministically.
    return participants.map((player, index) => ({ ...player, rank: index + 1 }));
  }, [averageAccuracy, bestWpm, learnerName, level, periodResults, rankBy]);

  const filteredPlayers = rankedPlayers.filter((player) => player.name.toLowerCase().includes(query.trim().toLowerCase()));
  const topThree = rankedPlayers.filter((player) => player.rank <= 3);
  const myRank = rankedPlayers.find((player) => player.you)?.rank;

  const stats = [
    { label: "Personal best", value: periodResults.length ? `${bestWpm} WPM` : "—", icon: Zap, color: "bg-blue-50 text-blue-600" },
    { label: "Average accuracy", value: averageAccuracy === null ? "—" : `${averageAccuracy}%`, icon: Target, color: "bg-emerald-50 text-emerald-600" },
    { label: "Saved sessions", value: String(periodResults.length), icon: Keyboard, color: "bg-violet-50 text-violet-600" },
    { label: "Lessons completed", value: String(completedLessons.length), icon: BookOpen, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="w-full space-y-6 p-5 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-[#94A3B8]">Community & personal bests</p>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#64748B]">Track your typing scores and celebrate progress.</p>
        </div>
        <Link to="/test" className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          Take a typing test <ArrowRight size={15} />
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Your leaderboard statistics">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18} /></div>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{value}</p>
            <p className="mt-0.5 text-xs text-[#64748B]">{label}</p>
          </article>
        ))}
      </section>

      {!periodResults.length && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#2563EB]"><Trophy size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#0F172A]">Set your first score</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">Complete a typing test to add your personal best to this local preview.</p>
          </div>
          <Link to="/test" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-blue-800">Start a test <ArrowRight size={14} /></Link>
        </section>
      )}

      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            <h2 className="font-semibold text-[#0F172A]">Top performers</h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Sample community board</span>
        </div>
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((player) => {
            const first = player.rank === 1;
            return (
              <article key={player.id} className={`flex min-w-0 flex-col items-center rounded-2xl border bg-white/90 px-2 py-4 text-center sm:px-4 ${first ? "min-h-44 border-amber-300 shadow-sm sm:min-h-48" : "min-h-36 border-[#E2E8F0] sm:min-h-40"}`}>
                <span className="mb-2 text-2xl" aria-label={`Rank ${player.rank}`}>{medals[player.rank]}</span>
                <div className={`mb-2 grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white ${avatarColors[(player.rank - 1) % avatarColors.length]}`}>{initials(player.name)}</div>
                <p className="w-full truncate text-xs font-semibold text-[#0F172A] sm:text-sm">{player.name}{player.you ? " (you)" : ""}</p>
                <p className="mt-1 text-lg font-bold text-[#2563EB] sm:text-xl">{rankBy === "speed" ? player.wpm : `${player.accuracy}%`}</p>
                <p className="text-[10px] text-[#94A3B8]">{rankBy === "speed" ? "WPM" : "accuracy"}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3 sm:px-5">
          <span className="text-xs font-medium text-[#64748B]">Show results for</span>
          <div className="flex items-center gap-2" role="group" aria-label="Filter leaderboard by time period">
            {([
              ["all", "All Time"],
              ["week", "This Week"],
              ["month", "This Month"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={timeRange === value}
                onClick={() => setTimeRange(value)}
                className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${timeRange === value ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] p-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-[#2563EB]" />
            <div><h2 className="text-sm font-semibold text-[#0F172A]">Rankings</h2><p className="mt-0.5 text-[11px] text-[#94A3B8]">{rankBy === "speed" ? "Sorted by personal best WPM" : "Sorted by saved average accuracy"} · your score: {timeRange === "all" ? "all time" : timeRange === "week" ? "this week" : "this month"}</p></div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="leaderboard-search">Search players</label>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 sm:w-52 sm:flex-none">
              <Search size={15} className="shrink-0 text-[#94A3B8]" />
              <input id="leaderboard-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" className="min-w-0 flex-1 bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8]" />
            </div>
            <div className="flex rounded-xl border border-[#E2E8F0] bg-slate-50 p-1" role="group" aria-label="Sort leaderboard">
              <button type="button" aria-pressed={rankBy === "speed"} onClick={() => setRankBy("speed")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${rankBy === "speed" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>Speed</button>
              <button type="button" aria-pressed={rankBy === "accuracy"} onClick={() => setRankBy("accuracy")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${rankBy === "accuracy" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>Accuracy</button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-blue-800 sm:px-5">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>Community profiles and scores below are fixed examples for preview only. Your score uses sessions saved on this device for the selected period; rankings are not shared with other learners.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-slate-50/70">
                <th scope="col" className="w-20 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Rank</th>
                <th scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Learner</th>
                <th scope="col" className="w-24 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Level</th>
                <th scope="col" className="w-28 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Best WPM</th>
                <th scope="col" className="w-28 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Accuracy</th>
                <th scope="col" className="w-28 px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className={`transition-colors ${player.you ? "bg-blue-50/80" : "hover:bg-slate-50"}`}>
                  <td className="px-5 py-3.5">
                    {player.you && !periodResults.length ? <span className="text-xs font-medium text-[#94A3B8]">—</span> : <span className={`text-sm font-semibold ${player.rank <= 3 ? "text-amber-600" : "text-[#64748B]"}`}>{medals[player.rank] || `#${player.rank}`}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${player.you ? "bg-[#2563EB]" : avatarColors[samplePlayers.findIndex((sample) => sample.id === player.id) % avatarColors.length]}`}>{initials(player.name)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{player.name}{player.you && <span className="ml-2 rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[9px] font-semibold text-white">YOU</span>}</p>
                        {player.sample && <p className="text-[10px] text-[#94A3B8]">Example profile</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#64748B]">Lv. {player.level}</td>
                  <td className="px-4 py-3.5"><span className="font-mono text-sm font-bold text-[#2563EB]">{player.you && !periodResults.length ? "—" : player.wpm}</span><span className="ml-1 text-[10px] text-[#94A3B8]">WPM</span></td>
                  <td className="px-4 py-3.5"><span className={`text-sm font-medium ${player.accuracy >= 98 ? "text-emerald-600" : "text-[#64748B]"}`}>{player.you && !periodResults.length ? "—" : `${player.accuracy}%`}</span></td>
                  <td className="px-5 py-3.5 text-right text-sm text-[#64748B]">{player.you ? periodResults.length : player.sessions}</td>
                </tr>
              ))}
              {!filteredPlayers.length && (
                <tr><td colSpan={6} className="px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"><Search size={17} /></div><p className="mt-3 text-sm font-semibold text-[#0F172A]">No players found</p><p className="mt-1 text-xs text-[#64748B]">Try a different name or clear your search.</p><button onClick={() => setQuery("")} className="mt-3 text-xs font-semibold text-[#2563EB] hover:underline">Clear search</button></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {myRank && <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-blue-50 px-4 py-3 sm:px-5"><div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CheckCircle2 size={15} />Your sample-board position</div><span className="text-sm font-bold text-blue-800">#{myRank} <span className="text-[10px] font-medium">by {rankBy === "speed" ? "speed" : "accuracy"}</span></span></div>}
      </section>

      <p className="text-center text-[11px] text-[#94A3B8]">To publish live shared rankings, connect this screen to an authenticated leaderboard service.</p>
    </div>
  );
}
