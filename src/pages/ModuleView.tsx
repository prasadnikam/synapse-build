import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTask, type KadooshTask, type ComputationEvent } from '../api/kadoosh'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { DocViewer } from '../components/DocViewer'
import { TaskStream } from '../components/TaskStream'
import type { CurriculumEntry } from './Dashboard'

type Tab = 'prd' | 'architecture' | 'stories' | 'tasklog'

export function ModuleView() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const taskId = Number(id)

  const [task, setTask] = useState<KadooshTask | null>(null)
  const [entry, setEntry] = useState<CurriculumEntry | null>(null)
  const [tab, setTab] = useState<Tab>('prd')
  const [docs, setDocs] = useState<Record<string, string | null>>({ prd: null, architecture: null, stories: null })
  const [initialEvents, setInitialEvents] = useState<ComputationEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!taskId) return
    getTask(taskId).then(setTask).finally(() => setLoading(false))

    fetch('/docs/curriculum.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: CurriculumEntry[]) => {
        const e = data.find(x => x.task_id === taskId)
        if (!e) return
        setEntry(e)
        const paths: Record<string, string> = {
          prd:          e.prd          ? `/docs/prds/${e.prd}`                   : '',
          architecture: e.architecture ? `/docs/architecture/${e.architecture}`  : '',
          stories:      e.stories      ? `/docs/stories/${e.stories}`            : '',
        }
        Object.entries(paths).forEach(([key, path]) => {
          if (!path) return
          fetch(path).then(r => r.ok ? r.text() : null).then(text => {
            setDocs(prev => ({ ...prev, [key]: text }))
          })
        })
      })
  }, [taskId])

  useEffect(() => {
    if (!task?.computation_graph) return
    try {
      setInitialEvents(JSON.parse(task.computation_graph) as ComputationEvent[])
    } catch {}
  }, [task?.computation_graph])

  if (loading) return <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center">Loading…</div>
  if (!task) return <div className="min-h-screen bg-zinc-950 text-red-400 flex items-center justify-center">Task not found</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prd',          label: 'PRD' },
    { key: 'architecture', label: 'Architecture' },
    { key: 'stories',      label: 'Stories' },
    { key: 'tasklog',      label: 'Task Log' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-start gap-4">
          <button onClick={() => nav('/')} className="text-zinc-500 hover:text-zinc-300 text-sm mt-0.5">← Back</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-zinc-100">{task.title}</h1>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <span className="text-xs text-zinc-600 ml-auto">#{task.id}</span>
            </div>
            {task.description && <p className="text-xs text-zinc-500 mt-1">{task.description}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-zinc-800">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-zinc-100 border-b-2 border-blue-500 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'prd' && (
          <DocViewer content={docs.prd} placeholder="No PRD yet — trigger /pm in a /grok-teacher session" />
        )}
        {tab === 'architecture' && (
          <DocViewer content={docs.architecture} placeholder="No architecture doc yet" />
        )}
        {tab === 'stories' && (
          <DocViewer content={docs.stories} placeholder="No stories yet" />
        )}
        {tab === 'tasklog' && (
          <TaskStream taskId={taskId} initialEvents={initialEvents} />
        )}

        {task.graph_plan && (
          <details className="mt-6">
            <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">DAG Plan (raw)</summary>
            <pre className="mt-2 text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto">
              {JSON.stringify(JSON.parse(task.graph_plan), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
