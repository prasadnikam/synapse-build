import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export interface Chapter {
  id: string
  number: number
  title: string
  difficulty: string
  estimated_minutes: number
  concept_count: number
  tag: string
  tagline: string
  key_concepts: string[]
  build_steps: string[]
  types_to_implement: string[]
}

export interface CurriculumModule {
  id: string
  title: string
  community: number
  difficulty: string
  estimated_minutes: number
  concept_count: number
  generated: string
  chapters: Chapter[]
}

const DIFF_COLOR: Record<string, string> = {
  Easy: 'text-green-400',
  'Easy-medium': 'text-lime-400',
  Medium: 'text-yellow-400',
  'Medium-hard': 'text-orange-400',
  Hard: 'text-red-400',
}

function ChapterCard({ chapter, moduleId }: { chapter: Chapter; moduleId: string }) {
  const nav = useNavigate()
  const diffColor = DIFF_COLOR[chapter.difficulty] ?? 'text-zinc-400'
  const hours = (chapter.estimated_minutes / 60).toFixed(1)

  return (
    <div
      onClick={() => nav(`/module/${moduleId}/${chapter.id}`)}
      className="cursor-pointer bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-zinc-600 font-mono">Ch {chapter.number}</span>
        <span className={`text-xs font-medium ${diffColor}`}>{chapter.difficulty}</span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1">{chapter.title}</h3>
      <p className="text-xs text-zinc-500 italic mb-3 line-clamp-1">"{chapter.tagline}"</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {chapter.key_concepts.slice(0, 3).map(c => (
          <span key={c} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded">
            {c}
          </span>
        ))}
        {chapter.key_concepts.length > 3 && (
          <span className="text-zinc-600 text-xs px-1">+{chapter.key_concepts.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span>{chapter.concept_count} concepts</span>
        <span>·</span>
        <span>{hours}h</span>
        <span>·</span>
        <span>{chapter.build_steps.length} steps</span>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [modules, setModules] = useState<CurriculumModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/docs/curriculum.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: CurriculumModule[]) => setModules(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalChapters = modules.reduce((s, m) => s + m.chapters.length, 0)
  const totalConcepts = modules.reduce((s, m) => s + m.concept_count, 0)
  const totalHours = modules.reduce((s, m) => s + m.estimated_minutes, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Synapse Build</h1>
          <p className="text-xs text-zinc-500 mt-0.5">grok-build curriculum control plane</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{totalChapters} chapters</span>
          <span>·</span>
          <span>{totalConcepts} concepts</span>
          <span>·</span>
          <span>{(totalHours / 60).toFixed(0)}h total</span>
          <a
            href="http://localhost:5173/teacher/sessions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors ml-2"
          >
            Kadoosh Sessions ↗
          </a>
        </div>
      </header>

      <main className="px-6 py-6 max-w-6xl mx-auto">
        {loading && <p className="text-zinc-500 text-sm">Loading curriculum…</p>}

        {!loading && modules.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-2xl mb-2">No curriculum loaded</p>
            <p className="text-sm">Activate <code className="bg-zinc-800 px-1 rounded">/grok-teacher</code> and drop a PDF to generate one</p>
          </div>
        )}

        {modules.map(mod => (
          <section key={mod.id} className="mb-10">
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-base font-semibold text-zinc-100">{mod.title}</h2>
              <span className="text-xs text-zinc-500">Community {mod.community}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 mb-4">
              <span className={DIFF_COLOR[mod.difficulty] ?? 'text-zinc-400'}>{mod.difficulty}</span>
              <span>·</span>
              <span>{mod.concept_count} concepts</span>
              <span>·</span>
              <span>{(mod.estimated_minutes / 60).toFixed(0)}h</span>
              <span>·</span>
              <span>{mod.generated}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mod.chapters.map(ch => (
                <ChapterCard key={ch.id} chapter={ch} moduleId={mod.id} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
