import { useState } from "react";
import { useLearningData } from "../../data/LearningContext";

export default function Profile() {
  const { learner, results, completedLessons, signIn } = useLearningData();
  const [name, setName] = useState(learner?.name ?? "");
  const [email, setEmail] = useState(learner?.email ?? "");
  const [saved, setSaved] = useState(false);
  const latest = results[0];
  const initials = (learner?.name || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    signIn({ name: name.trim(), email: email.trim() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Your profile</h1>
        <p className="text-sm text-[#64748B] mt-1">Your learner details and typing milestones.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <form onSubmit={saveProfile} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-xl font-bold text-white">{initials}</div>
            <div><h2 className="font-semibold text-[#0F172A]">Learner profile</h2><p className="text-sm text-[#64748B]">Your display name syncs with your account</p></div>
          </div>
          <label className="mb-4 block text-sm font-medium text-[#334155]">Display name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} required className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm outline-none focus:border-[#2563EB]" /></label>
          <label className="mb-5 block text-sm font-medium text-[#334155]">Account email<input type="email" value={email} readOnly autoComplete="email" className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-[#E2E8F0] bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600 outline-none" /><span className="mt-1 block text-xs font-normal text-[#64748B]">Managed by your Supabase sign-in provider.</span></label>
          <button className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{saved ? "Saved" : "Save profile"}</button>
        </form>
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 font-semibold text-[#0F172A]">Learning at a glance</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sessions" value={results.length} />
            <Stat label="Lessons done" value={completedLessons.length} />
            <Stat label="Best speed" value={`${Math.max(0, ...results.map((result) => result.wpm))} WPM`} />
            <Stat label="Latest accuracy" value={latest ? `${latest.accuracy}%` : "—"} />
          </div>
          <p className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-sm leading-relaxed text-[#64748B]">Finish a practice session or test to add your first result here. Signed-in learning history syncs across your devices.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[#E2E8F0] p-4"><div className="text-xs text-[#64748B]">{label}</div><div className="mt-1 text-xl font-bold text-[#0F172A]">{value}</div></div>;
}
