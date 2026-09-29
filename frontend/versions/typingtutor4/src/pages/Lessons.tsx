import { useState } from 'react'

type Category = 'beginner' | 'intermediate' | 'advanced' | 'programming'

const LESSONS: Record<Category, Lesson[]> = {
  beginner: [
    { id: 1, title: 'Home Row Keys', desc: 'Master A S D F J K L ; — the foundation of touch typing.', progress: 100, duration: '15 min', difficulty: 'Easy', status: 'completed' },
    { id: 2, title: 'Top Row Keys', desc: 'Learn Q W E R T Y U I O P and extend your reach.', progress: 75, duration: '20 min', difficulty: 'Easy', status: 'in-progress' },
    { id: 3, title: 'Bottom Row Keys', desc: 'Practice Z X C V B N M and complete the alphabet.', progress: 0, duration: '25 min', difficulty: 'Easy', status: 'locked' },
    { id: 4, title: 'Number Row', desc: 'Type digits 1–0 without looking at the keyboard.', progress: 0, duration: '20 min', difficulty: 'Easy', status: 'locked' },
  ],
  intermediate: [
    { id: 5, title: 'Capital Letters', desc: 'Use Shift key efficiently with both hands.', progress: 0, duration: '20 min', difficulty: 'Medium', status: 'locked' },
    { id: 6, title: 'Punctuation', desc: 'Master commas, periods, and common symbols.', progress: 0, duration: '25 min', difficulty: 'Medium', status: 'locked' },
    { id: 7, title: 'Common Words', desc: 'Practice the 200 most common English words.', progress: 0, duration: '30 min', difficulty: 'Medium', status: 'locked' },
    { id: 8, title: 'Sentence Flow', desc: 'Type complete sentences with natural rhythm.', progress: 0, duration: '35 min', difficulty: 'Medium', status: 'locked' },
  ],
  advanced: [
    { id: 9, title: 'Speed Bursts', desc: 'Short high-intensity sprints to break speed plateaus.', progress: 0, duration: '20 min', difficulty: 'Hard', status: 'locked' },
    { id: 10, title: 'Accuracy Drills', desc: 'Zero-error typing for professional precision.', progress: 0, duration: '25 min', difficulty: 'Hard', status: 'locked' },
    { id: 11, title: 'Long-Form Text', desc: 'Sustain speed over multiple paragraphs.', progress: 0, duration: '45 min', difficulty: 'Hard', status: 'locked' },
  ],
  programming: [
    { id: 12, title: 'Brackets & Symbols', desc: 'Master {} [] () <> and programming symbols.', progress: 0, duration: '20 min', difficulty: 'Medium', status: 'locked' },
    { id: 13, title: 'JavaScript', desc: 'Type real JavaScript code snippets quickly.', progress: 0, duration: '30 min', difficulty: 'Hard', status: 'locked' },
    { id: 14, title: 'Python', desc: 'Practice Python syntax and indentation patterns.', progress: 0, duration: '30 min', difficulty: 'Hard', status: 'locked' },
  ],
}

interface Lesson {
  id: number
  title: string
  desc: string
  progress: number
  duration: string
  difficulty: string
  status: 'completed' | 'in-progress' | 'locked'
}

const difficultyColor: Record<string, string> = {
  Easy: 'bg-green-50 text-green-700',
  Medium: 'bg-blue-50 text-blue-700',
  Hard: 'bg-red-50 text-red-700',
}

export default function Lessons() {
  const [category, setCategory] = useState<Category>('beginner')

  const lessons = LESSONS[category]
  const completed = lessons.filter(l => l.status === 'completed').length

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Learning Path</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{completed}/{lessons.length} completed in {category}</p>
        </div>
        {/* Category tabs */}
        <div className="flex bg-[var(--muted)] rounded-xl p-1 gap-1">
          {(['beginner', 'intermediate', 'advanced', 'programming'] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                category === c ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-[var(--foreground)] capitalize">{category} Progress</span>
          <span className="text-[var(--muted-foreground)]">{Math.round((completed / lessons.length) * 100)}%</span>
        </div>
        <div className="bg-[var(--muted)] rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${(completed / lessons.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Lesson grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {lessons.map((lesson, i) => (
          <div
            key={lesson.id}
            className={`bg-[var(--card)] border rounded-2xl p-5 transition-all ${
              lesson.status === 'locked' ? 'border-[var(--border)] opacity-70' :
              lesson.status === 'completed' ? 'border-green-200 hover:shadow-md' :
              'border-blue-200 hover:shadow-lg hover:shadow-blue-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  lesson.status === 'completed' ? 'bg-green-100 text-green-600' :
                  lesson.status === 'in-progress' ? 'bg-blue-100 text-[var(--primary)]' :
                  'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {lesson.status === 'completed' ? '✓' : lesson.status === 'in-progress' ? '▶' : '🔒'}
                </div>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">#{String(i + 1).padStart(2, '0')}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${difficultyColor[lesson.difficulty]}`}>
                {lesson.difficulty}
              </span>
            </div>

            <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{lesson.title}</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4">{lesson.desc}</p>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1">
                <span>{lesson.progress}% complete</span>
                <span>{lesson.duration}</span>
              </div>
              <div className="bg-[var(--muted)] rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${lesson.status === 'completed' ? 'bg-green-500' : 'bg-[var(--primary)]'}`}
                  style={{ width: `${lesson.progress}%` }}
                />
              </div>
            </div>

            <button
              disabled={lesson.status === 'locked'}
              className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                lesson.status === 'locked'
                  ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                  : lesson.status === 'completed'
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-[var(--primary)] text-white hover:bg-blue-700'
              }`}
            >
              {lesson.status === 'locked' ? 'Locked' : lesson.status === 'completed' ? 'Review' : 'Continue'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
