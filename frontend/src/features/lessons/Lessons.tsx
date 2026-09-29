import { useEffect, useState } from 'react'
import { CheckCircle, Lock, Play, Clock, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLearningData } from '../../data/LearningContext'
import { getLessonCatalog, subscribeToLessonCatalog, type LessonCategory } from './lessonCatalog'

const CATEGORIES: LessonCategory[] = ['Beginner', 'Intermediate', 'Advanced', 'Programming']

const diffColor: Record<string, string> = {
  Beginner: 'bg-green-50 text-green-700',
  Intermediate: 'bg-blue-50 text-[#2563EB]',
  Advanced: 'bg-purple-50 text-purple-700',
}

export default function Lessons() {
  const [activeTab, setActiveTab] = useState('All')
  const [catalog, setCatalog] = useState(getLessonCatalog)
  const navigate = useNavigate()
  const { completedLessons } = useLearningData()

  useEffect(() => subscribeToLessonCatalog(() => setCatalog(getLessonCatalog())), [])

  const publishedLessons = catalog.filter((lesson) => lesson.status === 'Published')
  const availableLessons = publishedLessons.map((lesson, index) => {
    const completed = completedLessons.includes(lesson.id)
    const previousLesson = publishedLessons[index - 1]
    const unlocked = index === 0 || (previousLesson ? completedLessons.includes(previousLesson.id) : false)
    return { ...lesson, desc: lesson.description, cat: lesson.category, duration: `${lesson.durationMinutes} min`, status: completed ? 'completed' : unlocked ? 'active' : 'locked', progress: completed ? 100 : 0 }
  })
  const filtered = activeTab === 'All' ? availableLessons : availableLessons.filter(l => l.cat === activeTab)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Lessons</h1>
        <p className="text-sm text-[#64748B]">Complete a lesson to unlock the next step in your learning path.</p>
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
                onClick={() => navigate(`/practice?lesson=${lesson.id}`)}
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
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center"><BookOpen className="mx-auto mb-3 text-[#94A3B8]" /><p className="font-medium text-[#0F172A]">No published lessons in this category</p><p className="mt-1 text-sm text-[#64748B]">Choose another category to keep practicing.</p></div>}
    </div>
  )
}
