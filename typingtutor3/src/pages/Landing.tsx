import { Link } from 'react-router-dom';

const features = [
  { icon: '⌨', title: 'Real-time WPM', desc: 'Track your words per minute as you type with live accuracy feedback.' },
  { icon: '📖', title: 'Structured Lessons', desc: 'Progress from home row basics to advanced programming syntax.' },
  { icon: '📈', title: 'Analytics', desc: 'Visualize your improvement with detailed charts and trend analysis.' },
  { icon: '🏆', title: 'Achievements', desc: 'Earn badges as you hit milestones and maintain practice streaks.' },
  { icon: '🥇', title: 'Leaderboard', desc: 'Compete globally or with friends on weekly and monthly rankings.' },
  { icon: '🎯', title: 'Tests & Challenges', desc: '15s to 5-minute timed tests across words, sentences, and code.' },
];

const stats = [
  { value: '124K+', label: 'Active typists' },
  { value: '8.3M', label: 'Sessions completed' },
  { value: '73 WPM', label: 'Avg. after 30 days' },
  { value: '99.1%', label: 'Uptime' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold font-mono">TM</span>
          </div>
          <span className="font-semibold text-lg">TypeMaster</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-8">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          Over 124,000 typists improving daily
        </div>
        <h1 className="text-6xl font-semibold tracking-tight leading-tight mb-6 max-w-3xl mx-auto">
          Type faster.<br />
          <span className="text-blue-500">Think clearer.</span>
        </h1>
        <p className="text-slate-400 text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          TypeMaster is the precision typing platform built for professionals. Track WPM, master lessons, and climb the global leaderboard.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg">
            Start typing for free
          </Link>
          <Link to="/dashboard" className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg">
            View demo
          </Link>
        </div>

        {/* Typing preview */}
        <div className="mt-16 bg-slate-800 rounded-2xl p-6 max-w-3xl mx-auto border border-slate-700 text-left">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-slate-500 text-xs font-mono">practice mode</span>
          </div>
          <p className="font-mono text-lg leading-8">
            <span className="text-slate-100">the quick brown </span>
            <span className="text-slate-100">fox </span>
            <span className="text-red-400 bg-red-500/10">jumks</span>
            <span className="text-slate-100"> over the lazy </span>
            <span className="text-blue-400 border-b-2 border-blue-500">d</span>
            <span className="text-slate-500">og and runs away</span>
          </p>
          <div className="flex gap-6 mt-4 text-sm">
            <div><span className="text-slate-500">WPM </span><span className="text-blue-400 font-semibold font-mono">68</span></div>
            <div><span className="text-slate-500">Accuracy </span><span className="text-emerald-400 font-semibold font-mono">96%</span></div>
            <div><span className="text-slate-500">Time </span><span className="text-slate-300 font-semibold font-mono">0:43</span></div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-800/50 border-y border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-semibold text-white mb-1">{value}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-semibold text-center mb-12">Everything you need to type faster</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-2xl mb-4">{icon}</div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20 text-center">
        <div className="bg-blue-600 rounded-3xl py-16 px-8">
          <h2 className="text-3xl font-semibold mb-4">Ready to type faster?</h2>
          <p className="text-blue-200 mb-8">Join 124,000+ professionals improving their typing every day.</p>
          <Link to="/register" className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors inline-block">
            Create free account
          </Link>
        </div>
      </section>
    </div>
  );
}
