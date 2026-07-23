import { useNavigate } from 'react-router-dom'
import type { KadooshTask } from '../api/kadoosh'
import { StatusBadge, DocBadge, PriorityBadge } from './StatusBadge'
import type { CurriculumEntry } from '../pages/Dashboard'

interface Props {
  task: KadooshTask
  entry: CurriculumEntry | undefined
}

export function ModuleCard({ task, entry }: Props) {
  const nav = useNavigate()
  const slug = entry?.slug ?? String(task.id)

  return (
    <div
      onClick={() => nav(`/module/${task.id}`)}
      className="cursor-pointer bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        <DocBadge label="PRD"  done={!!entry?.prd} />
        <DocBadge label="Arch" done={!!entry?.architecture} />
        <DocBadge label="Stories" done={!!entry?.stories} />
        <DocBadge label="Code" done={!!entry?.code} />
      </div>

      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <PriorityBadge priority={task.priority} />
        <span>#{task.id}</span>
        <span className="ml-auto">{new Date(task.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
