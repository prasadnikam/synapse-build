import { useEffect, useState, useCallback } from 'react'
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
  status?: string
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

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  not_started:  { dot: 'bg-zinc-600',   label: 'not started' },
  in_progress:  { dot: 'bg-blue-400',   label: 'in progress' },
  done:         { dot: 'bg-green-400',  label: 'done' },
  failed:       { dot: 'bg-red-400',    label: 'failed' },
}

const STORAGE_KEY = 'synapse_chapter_state'

interface ChapterState {
  status: string
  task_id?: number
}

function loadState(): Record<string, ChapterState> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function saveState(s: Record<string, ChapterState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

async function createTeacherTask(chapter: Chapter, moduleId: string): Promise<number | null> {
  try {
    const r = await fetch('/api/teacher-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': 'a2a:service' },
      body: JSON.stringify({
        title: `Implement ${chapter.id}: ${chapter.title}`,
        description: `grok-build chapter — ${chapter.tagline}\n\nBuild steps:\n${chapter.build_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nTypes: ${chapter.types_to_implement.join(', ')}`,
        success_criterion: `All ${chapter.types_to_implement.length} types implemented, cargo check passes, chapter marked done in synapse-build`,
        agent_id: 190,
        priority: chapter.number <= 5 ? 1 : 2,
      }),
    })
    if (!r.ok) return null
    const t = await r.json()
    return t.id ?? null
  } catch { return null }
}

async function patchTeacherTask(taskId: number, status: string) {
  await fetch(`/api/teacher-tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': 'a2a:service' },
    body: JSON.stringify({ status }),
  })
}

function ChapterCard({
  chapter,
  moduleId,
  state,
  onStateChange,
}: {
  chapter: Chapter
  moduleId: string
  state: ChapterState
  onStateChange: (id: string, s: ChapterState) => void
}) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const diffColor = DIFF_COLOR[chapter.difficulty] ?? 'text-zinc-400'
  const hours = (chapter.estimated_minutes / 60).toFixed(1)
  const status = state.status || chapter.status || 'not_started'
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.not_started

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    const task_id = await createTeacherTask(chapter, moduleId) ?? undefined
    const next: ChapterState = { status: 'in_progress', task_id }
    onStateChange(chapter.id, next)
    setBusy(false)
  }

  const handleDone = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    if (state.task_id) await patchTeacherTask(state.task_id, 'completed')
    onStateChange(chapter.id, { ...state, status: 'done' })
    setBusy(false)
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (state.task_id) patchTeacherTask(state.task_id, 'pending')
    onStateChange(chapter.id, { status: 'not_started' })
  }

  return (
    <div
      onClick={() => nav(`/module/${moduleId}/${chapter.id}`)}
      className="cursor-pointer bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-zinc-600 font-mono">Ch {chapter.number}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${diffColor}`}>{chapter.difficulty}</span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} />
            {st.label}
          </span>
        </div>
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

      <div className="flex items-center gap-3 text-xs text-zinc-600 mb-3">
        <span>{chapter.concept_count} concepts</span>
        <span>·</span>
        <span>{hours}h</span>
        <span>·</span>
        <span>{chapter.build_steps.length} steps</span>
      </div>

      {/* Action buttons */}
      <div
        className="flex gap-2 pt-2 border-t border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        {status === 'not_started' && (
          <button
            disabled={busy}
            onClick={handleStart}
            className="flex-1 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
          >
            {busy ? '…' : 'Start'}
          </button>
        )}
        {status === 'in_progress' && (
          <>
            <button
              disabled={busy}
              onClick={handleDone}
              className="flex-1 py-1.5 text-xs font-semibold rounded bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 transition-colors"
            >
              {busy ? '…' : 'Mark Done'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Reset
            </button>
          </>
        )}
        {status === 'done' && (
          <>
            <span className="flex-1 py-1.5 text-xs text-center text-green-400 font-semibold">
              ✓ Done
            </span>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Reset
            </button>
          </>
        )}
        {status === 'failed' && (
          <button
            onClick={handleReset}
            className="flex-1 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function Dashboard() {
  const [modules, setModules] = useState<CurriculumModule[]>([])
  const [loading, setLoading] = useState(true)
  const [chapterStates, setChapterStates] = useState<Record<string, ChapterState>>(loadState)

  useEffect(() => {
    fetch('/docs/curriculum.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: CurriculumModule[]) => setModules(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStateChange = useCallback((id: string, s: ChapterState) => {
    setChapterStates(prev => {
      const next = { ...prev, [id]: s }
      saveState(next)
      return next
    })
  }, [])

  const totalChapters = modules.reduce((s, m) => s + m.chapters.length, 0)
  const totalConcepts = modules.reduce((s, m) => s + m.concept_count, 0)
  const totalHours = modules.reduce((s, m) => s + m.estimated_minutes, 0)
  const doneCount = Object.values(chapterStates).filter(s => s.status === 'done').length
  const inProgressCount = Object.values(chapterStates).filter(s => s.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Synapse Build</h1>
          <p className="text-xs text-zinc-500 mt-0.5">grok-build curriculum control plane</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {doneCount > 0 && <span className="text-green-400">{doneCount} done</span>}
          {inProgressCount > 0 && <span className="text-blue-400">{inProgressCount} in progress</span>}
          <span>{totalChapters} chapters</span>
          <span>·</span>
          <span>{totalConcepts} concepts</span>
          <span>·</span>
          <span>{(totalHours / 60).toFixed(0)}h total</span>
          <a
            href="http://localhost:5173/teacher/tasks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors ml-2"
          >
            Kadoosh Tasks ↗
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
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  moduleId={mod.id}
                  state={chapterStates[ch.id] ?? { status: ch.status ?? 'not_started' }}
                  onStateChange={handleStateChange}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
