import { useLearningData } from "../../data/LearningContext";

export default function Achievements() {
  const { results, completedLessons } = useLearningData();
  const tests = results.filter((result) => result.mode === "test");
  const bestWpm = Math.max(0, ...results.map((result) => result.wpm));
  const totalWords = results.reduce((sum, result) => sum + result.characters / 5, 0);
  const perfectTest = tests.some((result) => result.accuracy === 100);
  const highAccuracyTests = tests.filter((result) => result.accuracy >= 99).length;
  const nightSessions = results.filter((result) => { const hour = new Date(result.createdAt).getHours(); return hour < 5; }).length;
  const achievements = [
    { icon: "🏆", title: "First 30 WPM", desc: "Reach a typing speed of 30 WPM.", unlocked: bestWpm >= 30 },
    { icon: "🔥", title: "7 Practice Days", desc: "Save seven typing sessions.", unlocked: results.length >= 7 },
    { icon: "⭐", title: "Accuracy Master", desc: "Complete ten tests at 99% accuracy or better.", unlocked: highAccuracyTests >= 10 },
    { icon: "🚀", title: "Speed Runner", desc: "Reach 80 WPM in a session.", unlocked: bestWpm >= 80 },
    { icon: "📚", title: "Lesson Finisher", desc: "Complete all three beginner lessons.", unlocked: [1, 2, 3].every((id) => completedLessons.includes(id)) },
    { icon: "💎", title: "Diamond Fingers", desc: "Type 100,000 words total.", unlocked: totalWords >= 100000 },
    { icon: "🌙", title: "Night Owl", desc: "Practice before 5 a.m. five times.", unlocked: nightSessions >= 5 },
    { icon: "🎯", title: "Perfect Round", desc: "Complete a test with 100% accuracy.", unlocked: perfectTest },
  ];
  const unlocked = achievements.filter((achievement) => achievement.unlocked);

  return (
    <div className="max-w-4xl p-6 lg:p-8">
      <header className="mb-6"><h1 className="mb-1 text-2xl font-bold text-[#0F172A]">Achievements</h1><p className="text-sm text-[#64748B]">{unlocked.length} of {achievements.length} earned from your activity</p></header>
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#2563EB] p-5 text-white"><div className="text-4xl">🏅</div><div><div className="text-lg font-bold">{unlocked.length} achievements earned</div><div className="text-sm text-blue-200">Keep practicing to unlock the next milestone.</div></div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {achievements.map((achievement) => <article key={achievement.title} className={`flex gap-4 rounded-2xl border p-5 ${achievement.unlocked ? "border-[#E2E8F0] bg-white" : "border-dashed border-[#E2E8F0] bg-[#F8FAFC] opacity-70"}`}><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${achievement.unlocked ? "bg-amber-50" : "bg-[#E2E8F0] grayscale"}`}>{achievement.icon}</div><div><h2 className="font-semibold text-[#0F172A]">{achievement.title}</h2><p className="mt-1 text-xs leading-relaxed text-[#64748B]">{achievement.desc}</p><span className={`mt-3 inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${achievement.unlocked ? "bg-green-50 text-green-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>{achievement.unlocked ? "Earned" : "In progress"}</span></div></article>)}
      </div>
    </div>
  );
}
