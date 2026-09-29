import { useState } from 'react'

interface Props { onNavigate: (page: string) => void }

const categories = [
  {
    level: 'Beginner',
    color: 'bg-green-50 text-secondary border-green-200',
    badge: 'bg-secondary text-white',
    lessons: [
      { title: 'Pa-O Alphabet', desc: 'Learn all Pa-O consonants and vowels', chars: 35, progress: 80, duration: '20 min' },
      { title: 'Basic Characters', desc: 'Core character recognition and typing', chars: 20, progress: 100, duration: '15 min' },
      { title: 'Number System', desc: 'Pa-O digits and counting', chars: 10, progress: 60, duration: '10 min' },
      { title: 'Tone Markers', desc: 'Understanding Pa-O tone marks', chars: 8, progress: 0, duration: '25 min' },
    ],
  },
  {
    level: 'Intermediate',
    color: 'bg-amber-50 text-accent border-amber-200',
    badge: 'bg-accent text-white',
    lessons: [
      { title: 'Daily Vocabulary', desc: 'Common Pa-O words for everyday use', chars: 150, progress: 40, duration: '30 min' },
      { title: 'Family & Home', desc: 'Words about family and household', chars: 80, progress: 0, duration: '25 min' },
      { title: 'Nature & Places', desc: 'Describing the natural world', chars: 90, progress: 0, duration: '30 min' },
    ],
  },
  {
    level: 'Advanced',
    color: 'bg-blue-50 text-primary border-blue-200',
    badge: 'bg-primary text-white',
    lessons: [
      { title: 'Pa-O Literature', desc: 'Excerpts from classical Pa-O texts', chars: 300, progress: 0, duration: '45 min' },
      { title: 'Long Sentences', desc: 'Complex sentence structures', chars: 200, progress: 0, duration: '40 min' },
      { title: 'Poetry & Song', desc: 'Traditional Pa-O songs and poems', chars: 250, progress: 0, duration: '50 min' },
    ],
  },
]

export default function LessonLibrary({ onNavigate }: Props) {
  const [filter, setFilter] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All')

  const filtered = filter === 'All' ? categories : categories.filter(c => c.level === filter)

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto page-transition">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Lesson Library</h1>
          <p className="text-muted-foreground mt-1">Structured Pa-O typing curriculum for all levels</p>
        </div>
        <div className="flex gap-2">
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filter === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {filtered.map(({ level, color, badge, lessons }) => (
          <div key={level}>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${color} mb-4`}>
              {level === 'Beginner' ? '🟢' : level === 'Intermediate' ? '🟡' : '🔵'} {level}
              <span className="text-xs opacity-70">· {lessons.length} lessons</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map(({ title, desc, chars, progress, duration }) => (
                <div key={title} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer" onClick={() => onNavigate('practice')}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{level}</div>
                    {progress === 100 && <span className="text-secondary text-lg">✓</span>}
                    {progress > 0 && progress < 100 && <span className="text-xs text-accent font-semibold">{progress}%</span>}
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{desc}</p>

                  {progress > 0 && (
                    <div className="mb-3">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>⌨ {chars} chars</span>
                    <span>⏱ {duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
