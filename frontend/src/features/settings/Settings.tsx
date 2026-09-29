import { useState } from "react";
import { BookOpen, Sliders, User } from "lucide-react";
import { useLearningData } from "../../data/LearningContext";

export default function Settings() {
  const { learner, preferences, updatePreferences } = useLearningData();
  const [saved, setSaved] = useState(false);
  const setPreference = <K extends keyof typeof preferences>(key: K, value: (typeof preferences)[K]) => {
    updatePreferences({ [key]: value });
    setSaved(false);
  };

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <header className="mb-6"><h1 className="mb-1 text-2xl font-bold text-[#0F172A]">Settings</h1><p className="text-sm text-[#64748B]">Preferences are shared across your learning screens.</p></header>
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><User size={16} className="text-[#2563EB]"/><h2 className="text-sm font-semibold text-[#0F172A]">Account</h2></div>
          <div className="rounded-xl bg-[#F8FAFC] px-4 py-3"><div className="text-sm font-medium text-[#0F172A]">{learner?.name}</div><div className="text-xs text-[#64748B]">{learner?.email}</div></div>
        </section>
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><BookOpen size={16} className="text-[#2563EB]"/><h2 className="text-sm font-semibold text-[#0F172A]">Learning goals</h2></div>
          <div className="space-y-5">
            <div><div className="mb-1 flex justify-between text-xs font-medium text-[#64748B]"><label htmlFor="target-wpm">Target speed</label><span>{preferences.targetWpm} WPM</span></div><input id="target-wpm" type="range" min={20} max={200} value={preferences.targetWpm} onChange={(event) => setPreference("targetWpm", Number(event.target.value))} className="w-full accent-[#2563EB]" /></div>
            <div><div className="mb-1 flex justify-between text-xs font-medium text-[#64748B]"><label htmlFor="daily-goal">Daily word goal</label><span>{preferences.dailyGoal} words</span></div><input id="daily-goal" type="range" min={100} max={2000} step={100} value={preferences.dailyGoal} onChange={(event) => setPreference("dailyGoal", Number(event.target.value))} className="w-full accent-[#2563EB]" /></div>
            <fieldset><legend className="mb-2 text-xs font-medium text-[#64748B]">Default difficulty</legend><div className="flex gap-2">{["Easy", "Medium", "Hard"].map((difficulty) => <button key={difficulty} type="button" onClick={() => setPreference("difficulty", difficulty)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${preferences.difficulty === difficulty ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] text-[#64748B]"}`}>{difficulty}</button>)}</div></fieldset>
          </div>
        </section>
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Sliders size={16} className="text-[#2563EB]"/><h2 className="text-sm font-semibold text-[#0F172A]">Preferences</h2></div>
          <Toggle label="Dark mode" description="Apply the dark theme throughout the app" value={preferences.darkMode} onChange={(value) => setPreference("darkMode", value)} />
          <Toggle label="Sound effects" description="Play key sounds while typing" value={preferences.sounds} onChange={(value) => setPreference("sounds", value)} />
          <fieldset className="mt-4"><legend className="mb-2 text-xs font-medium text-[#64748B]">Keyboard layout</legend><div className="flex gap-2">{["QWERTY", "Dvorak", "Colemak"].map((layout) => <button key={layout} type="button" onClick={() => setPreference("keyboardLayout", layout)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${preferences.keyboardLayout === layout ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] text-[#64748B]"}`}>{layout}</button>)}</div></fieldset>
        </section>
        <button onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2200); }} className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white hover:bg-blue-700">{saved ? "Preferences saved" : "Save preferences"}</button>
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between py-2"><div><div className="text-sm font-medium text-[#0F172A]">{label}</div><div className="text-xs text-[#94A3B8]">{description}</div></div><button type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} className={`relative h-6 w-10 rounded-full transition-colors ${value ? "bg-[#2563EB]" : "bg-[#E2E8F0]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-1"}`} /></button></div>;
}
