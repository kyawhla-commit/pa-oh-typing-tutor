import { useState } from 'react'
import { CheckCircle, Lock, Play, Clock } from 'lucide-react'

const CATEGORIES = ['Beginner', 'Intermediate', 'Advanced', 'Programming']

const lessons = [
  { id: 1, title: 'Home Row Keys', desc: 'Master ASDF and JKL; — the foundation of touch typing.', progress: 100, status: 'completed', duration: '10 min', difficulty: 'Beginner', cat: 'Beginner' },
  { id: 2, title: 'Top Row Keys', desc: 'Expand to QWERTY and YUIOP with proper finger placement.', progress: 75, status: 'active', duration: '12 min', difficulty: 'Beginner', cat: 'Beginner' },
  { id: 3, title: 'Bottom Row Keys', desc: 'Complete the full keyboard with ZXCVB and NM,./', progress: 0, status: 'locked', duration: '15 min', difficulty: 'Beginner', cat: 'Beginner' },
  { id: 4, title: 'Common Words', desc: 'Practice the 100 most common English words for fluency.', progress: 0, status: 'locked', duration: '20 min', difficulty: 'Intermediate', cat: 'Intermediate' },
  { id: 5, title: 'Numbers & Symbols', desc: 'Tackle number row and shift-key symbols efficiently.', progress: 0, status: 'locked', duration: '18 min', difficulty: 'Intermediate', cat: 'Intermediate' },
  { id: 6, title: 'Speed Drills', desc: 'Push your WPM ceiling with intensive speed exercises.', progress: 0, status: 'locked', duration: '25 min', difficulty: 'Advanced', cat: 'Advanced' },
  { id: 7, title: 'JavaScript Syntax', desc: 'Type common JS patterns, arrow functions, and destructuring.', progress: 0, status: 'locked', duration: '30 min', difficulty: 'Advanced', cat: 'Programming' },
  { id: 8, title: 'Python Patterns', desc: 'Practice Python indentation, list comprehensions, and f-strings.', progress: 0, status: 'locked', duration: '28 min', difficulty: 'Advanced', cat: 'Programming' },
]

const diffColor: Record<string, string> = {
  Beginner: 'bg-green-50 text-green-700',
  Intermediate: 'bg-blue-50 text-[#2563EB]',
  Advanced: 'bg-purple-50 text-purple-700',
}

export default function Lessons() {
  const [activeTab, setActiveTab] = useState('All')

  const filtered = activeTab === 'All' ? lessons : lessons.filter(l => l.cat === activeTab)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Lessons</h1>
        <p className="text-sm text-[#64748B]">Follow the structured learning path to master touch typing.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#E2E8F0] rounded-xl p-1 w-fit mb-6">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === cat ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(lesson => (
          <div
            key={lesson.id}
            className={`bg-white rounded-2xl border p-5 transition-shadow ${
              lesson.status === 'locked' ? 'border-[#E2E8F0] opacity-60' : 'border-[#E2E8F0] hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#94A3B8]">Lesson {lesson.id}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diffColor[lesson.difficulty]}`}>
                  {lesson.difficulty}
                </span>
              </div>
              {lesson.status === 'completed' && <CheckCircle size={18} className="text-[#16A34A] flex-shrink-0" />}
              {lesson.status === 'locked' && <Lock size={16} className="text-[#94A3B8] flex-shrink-0" />}
            </div>

            <h3 className="font-semibold text-[#0F172A] mb-1.5">{lesson.title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">{lesson.desc}</p>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1.5">
                <span>Progress</span>
                <span>{lesson.progress}%</span>
              </div>
              <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all"
                  style={{ width: `${lesson.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                <Clock size={12} />
                {lesson.duration}
              </div>
              <button
                disabled={lesson.status === 'locked'}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  lesson.status === 'locked'
                    ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                    : lesson.status === 'completed'
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-[#2563EB] text-white hover:bg-blue-700'
                }`}
              >
                <Play size={11} />
                {lesson.status === 'completed' ? 'Review' : lesson.status === 'locked' ? 'Locked' : 'Continue'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
