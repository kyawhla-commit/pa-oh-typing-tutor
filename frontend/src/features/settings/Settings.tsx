import { useState } from "react";
import { AlertTriangle, BookOpen, Check, Keyboard, Moon, RotateCcw, SlidersHorizontal, Trash2, UserRound, Volume2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLearningData, type Preferences } from "../../data/LearningContext";

export default function Settings() {
  const navigate = useNavigate();
  const { learner, preferences, updatePreferences, resetProgress, deleteLocalAccount } = useLearningData();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [dangerAction, setDangerAction] = useState<"reset-progress" | "delete-account" | null>(null);

  const changed = (Object.keys(preferences) as (keyof Preferences)[]).some((key) => draft[key] !== preferences[key]);
  const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setNotice("");
  };

  const save = () => {
    if (!changed) return;
    updatePreferences(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const discard = () => {
    setDraft(preferences);
    setSaved(false);
    setNotice("");
  };

  const confirmDangerAction = () => {
    if (dangerAction === "reset-progress") {
      resetProgress();
      setNotice("Progress has been reset. Your profile and preferences are unchanged.");
    } else if (dangerAction === "delete-account") {
      deleteLocalAccount();
      navigate("/login", { replace: true });
    }
    setDangerAction(null);
  };

  const initials = learner?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "L";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5 pb-24 sm:p-6 lg:p-8 lg:pb-8">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">Personalize your typing goals and learning experience.</p>
      </header>

      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <Check size={16} /> Your preferences have been saved.
        </div>
      )}
      {notice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{notice}</div>}

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#2563EB]"><UserRound size={17} /><h2 className="text-sm font-semibold text-[#0F172A]">Account</h2></div>
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[#F8FAFC] p-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-sm font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F172A]">{learner?.name || "Learner"}</p>
            <p className="truncate text-xs text-[#64748B]">{learner?.email || "No email provided"}</p>
          </div>
          <Link to="/profile" className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-blue-50">Edit profile</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#2563EB]"><BookOpen size={17} /><h2 className="text-sm font-semibold text-[#0F172A]">Learning goals</h2></div>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="target-wpm" className="text-sm font-medium text-[#0F172A]">Target typing speed</label>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-[#2563EB]">{draft.targetWpm} WPM</span>
            </div>
            <input id="target-wpm" type="range" min={20} max={200} step={5} value={draft.targetWpm} onChange={(event) => setPreference("targetWpm", Number(event.target.value))} className="w-full accent-[#2563EB]" />
            <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]"><span>20 WPM</span><span>200 WPM</span></div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="daily-goal" className="text-sm font-medium text-[#0F172A]">Daily word goal</label>
              <span className="rounded-lg bg-green-50 px-2.5 py-1 font-mono text-sm font-bold text-green-700">{draft.dailyGoal.toLocaleString()} words</span>
            </div>
            <input id="daily-goal" type="range" min={100} max={2000} step={100} value={draft.dailyGoal} onChange={(event) => setPreference("dailyGoal", Number(event.target.value))} className="w-full accent-[#2563EB]" />
            <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]"><span>100 words</span><span>2,000 words</span></div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[#0F172A]">Default exercise difficulty</legend>
            <div className="grid grid-cols-3 gap-2">
              {["Easy", "Medium", "Hard"].map((difficulty) => (
                <button key={difficulty} type="button" aria-pressed={draft.difficulty === difficulty} onClick={() => setPreference("difficulty", difficulty)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${draft.difficulty === difficulty ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"}`}>
                  {difficulty}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-[#2563EB]"><SlidersHorizontal size={17} /><h2 className="text-sm font-semibold text-[#0F172A]">App preferences</h2></div>
        <div className="divide-y divide-[#F1F5F9]">
          <Toggle icon={Moon} label="Dark mode" description="Use a darker theme for your learning workspace." value={draft.darkMode} onChange={(value) => setPreference("darkMode", value)} />
          <Toggle icon={Volume2} label="Sound feedback" description="Save whether you want sound feedback in future typing sessions." value={draft.sounds} onChange={(value) => setPreference("sounds", value)} />
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0F172A]"><Keyboard size={15} className="text-[#64748B]" />Preferred keyboard layout</legend>
          <div className="grid grid-cols-3 gap-2">
            {["QWERTY", "Dvorak", "Colemak"].map((layout) => (
              <button key={layout} type="button" aria-pressed={draft.keyboardLayout === layout} onClick={() => setPreference("keyboardLayout", layout)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${draft.keyboardLayout === layout ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"}`}>
                {layout}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#94A3B8]">The Practice on-screen keyboard follows your selected layout.</p>
        </fieldset>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 flex gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button type="button" onClick={discard} disabled={!changed} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#64748B] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw size={15} />Discard
        </button>
        <button type="button" onClick={save} disabled={!changed} className="flex-1 rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:flex-none sm:min-w-40">
          Save changes
        </button>
      </div>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6" aria-labelledby="danger-zone-title">
        <div className="mb-1 flex items-center gap-2 text-red-700"><AlertTriangle size={17} /><h2 id="danger-zone-title" className="text-sm font-semibold">Danger Zone</h2></div>
        <p className="mb-4 text-xs leading-relaxed text-red-600">These actions affect data saved in this browser. This demo has no remote account service.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDangerAction("reset-progress")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100">
            <RotateCcw size={14} />Reset progress
          </button>
          <button type="button" onClick={() => setDangerAction("delete-account")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100">
            <Trash2 size={14} />Delete local account
          </button>
        </div>
      </section>

      {dangerAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDangerAction(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-danger-title" aria-describedby="confirm-danger-description" className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={19} /></div>
              <h2 id="confirm-danger-title" className="text-base font-semibold text-[#0F172A]">{dangerAction === "reset-progress" ? "Reset your progress?" : "Delete local account data?"}</h2>
            </div>
            <p id="confirm-danger-description" className="text-sm leading-relaxed text-[#64748B]">
              {dangerAction === "reset-progress"
                ? "This will permanently clear your saved sessions and lesson completions from this browser. Your profile and preferences will stay."
                : "This will clear your local demo profile, saved sessions, lesson completions, and preferences from this browser, then sign you out. It does not delete a remote account."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDangerAction(null)} className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#64748B] transition-colors hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={confirmDangerAction} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                {dangerAction === "reset-progress" ? "Reset progress" : "Delete local data"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Toggle({ icon: Icon, label, description, value, onChange }: { icon: typeof Moon; label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon size={17} className="mt-0.5 shrink-0 text-[#64748B]" />
        <div><p className="text-sm font-medium text-[#0F172A]">{label}</p><p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">{description}</p></div>
      </div>
      <button type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
