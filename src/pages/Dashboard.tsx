import { useEffect, useState } from 'react'
import { listTeacherTasks, type KadooshTask } from '../api/kadoosh'
import { ModuleCard } from '../components/ModuleCard'

export interface CurriculumEntry {
  slug: string
  task_id: number
  prd: string | null
  architecture: string | null
  stories: string | null
  code: boolean
}

const STATUS_ORDER = ['running', 'awaiting_checkpoint', 'pending', 'done', 'failed']

function sortTasks(tasks: KadooshTask[]): KadooshTask[] {
  return [...tasks].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    if (ai !== bi) return ai - bi
    const ap = a.priority ?? 99
    const bp = b.priority ?? 99
    if (ap !== bp) return ap - bp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function Dashboard() {
  const [tasks, setTasks] = useState<KadooshTask[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    listTeacherTasks()
      .then(t => { if (alive) setTasks(sortTasks(t)) })
      .catch(e => { if (alive) setError(String(e)) })
      .finally(() => { if (alive) setLoading(false) })

    fetch('/docs/curriculum.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: CurriculumEntry[]) => { if (alive) setCurriculum(data) })
      .catch(() => {})

    return () => { alive = false }
  }, [])

  const entryByTaskId = Object.fromEntries(curriculum.map(e => [e.task_id, e]))

  const statusGroups: Record<string, KadooshTask[]> = {
    running: tasks.filter(t => t.status === 'running' || t.status === 'awaiting_checkpoint'),
    pending: tasks.filter(t => t.status === 'pending'),
    done:    tasks.filter(t => t.status === 'done'),
    failed:  tasks.filter(t => t.status === 'failed'),
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Synapse Build</h1>
          <p className="text-xs text-zinc-500 mt-0.5">grok-build curriculum control plane</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{tasks.length} modules</span>
          <span>·</span>
          <span>{tasks.filter(t => t.status === 'done').length} complete</span>
          <a
            href="http://localhost:5173/teacher/sessions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            Kadoosh Sessions ↗
          </a>
        </div>
      </header>

      <main className="px-6 py-6 max-w-6xl mx-auto">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">Failed to load tasks: {error}</p>}

        {!loading && tasks.length === 0 && !error && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-2xl mb-2">No modules yet</p>
            <p className="text-sm">Activate <code className="bg-zinc-800 px-1 rounded">/grok-teacher</code> and drop a PDF to start</p>
          </div>
        )}

        {Object.entries(statusGroups).map(([group, items]) => {
          if (items.length === 0) return null
          return (
            <section key={group} className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                {group === 'running' ? 'In Progress' : group.charAt(0).toUpperCase() + group.slice(1)}
                <span className="ml-2 text-zinc-700">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(t => (
                  <ModuleCard key={t.id} task={t} entry={entryByTaskId[t.id]} />
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
