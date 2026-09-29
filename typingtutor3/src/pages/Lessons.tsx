import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LESSONS } from '../data/mockData';

type Level = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-emerald-50 text-emerald-700',
  INTERMEDIATE: 'bg-blue-50 text-blue-700',
  ADVANCED: 'bg-violet-50 text-violet-700',
};

const completedIds = new Set([1, 2, 3, 5]);

export default function Lessons() {
  const [filter, setFilter] = useState<Level>('ALL');
  const navigate = useNavigate();

  const filtered = LESSONS.filter(l => filter === 'ALL' || l.level === filter);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Lessons</h1>
        <p className="text-slate-500 text-sm mt-0.5">Structured curriculum from beginner to advanced</p>
      </div>

      {/* Progress banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="font-semibold text-lg">Your Progress</p>
          <p className="text-blue-200 text-sm mt-0.5">{completedIds.size} of {LESSONS.length} lessons completed</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold">{Math.round((completedIds.size / LESSONS.length) * 100)}%</p>
          <p className="text-blue-200 text-sm">Complete</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as Level[]).map(l => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filter === l ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {l.charAt(0) + l.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Lesson grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(lesson => {
          const done = completedIds.has(lesson.id);
          return (
            <div
              key={lesson.id}
              className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group ${
                done ? 'border-emerald-200' : 'border-slate-200'
              }`}
              onClick={() => navigate('/practice')}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[lesson.level]}`}>
                  {lesson.level}
                </span>
                {done ? (
                  <span className="text-emerald-500 text-lg">✓</span>
                ) : (
                  <span className="text-slate-300 text-lg">○</span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                {lesson.title}
              </h3>
              <p className="text-slate-500 text-xs mb-4 leading-relaxed">{lesson.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>⏱ {lesson.duration} min</span>
                <span className="bg-slate-50 px-2 py-1 rounded-lg">{lesson.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
