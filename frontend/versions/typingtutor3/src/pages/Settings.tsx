import { useState } from 'react';
import { USER } from '../data/mockData';

export default function Settings() {
  const [form, setForm] = useState({
    username: USER.username,
    email: USER.email,
    targetWpm: USER.targetWpm,
    dailyGoal: USER.dailyGoal,
    soundFeedback: true,
    showKeyboard: true,
    theme: 'light',
    fontSize: 'md',
  });

  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(f => ({ ...f, [k]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {USER.avatar}
            </div>
            <div>
              <p className="font-medium text-slate-800">{USER.username}</p>
              <p className="text-sm text-slate-400">{USER.email}</p>
              <button type="button" className="text-xs text-blue-600 hover:text-blue-700 mt-1">Change avatar</button>
            </div>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Learning Goals</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Target WPM <span className="text-slate-400 font-normal">— {form.targetWpm} WPM</span>
              </label>
              <input
                type="range"
                min={20}
                max={200}
                value={form.targetWpm}
                onChange={set('targetWpm')}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>20</span><span>100</span><span>200</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Daily Goal <span className="text-slate-400 font-normal">— {form.dailyGoal} minutes</span>
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={form.dailyGoal}
                onChange={set('dailyGoal')}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5 min</span><span>60 min</span><span>120 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Typing Preferences</h2>
          <div className="space-y-4">
            {[
              { key: 'soundFeedback', label: 'Sound feedback', desc: 'Play a soft click on each keypress' },
              { key: 'showKeyboard', label: 'Show virtual keyboard', desc: 'Display keyboard visualization during practice' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={set(key as keyof typeof form)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Text font size</label>
              <select
                value={form.fontSize}
                onChange={set('fontSize')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="sm">Small</option>
                <option value="md">Medium (recommended)</option>
                <option value="lg">Large</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h2 className="font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Delete account</p>
              <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
            </div>
            <button type="button" className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
              Delete account
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full font-semibold py-3 rounded-xl transition-colors text-sm ${
            saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
