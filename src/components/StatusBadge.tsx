import type { TaskStatus } from '../api/kadoosh'

const MAP: Record<TaskStatus, { label: string; cls: string }> = {
  pending:              { label: 'Pending',     cls: 'bg-zinc-700 text-zinc-300' },
  running:              { label: 'Running',     cls: 'bg-blue-900 text-blue-300 animate-pulse' },
  done:                 { label: 'Done',        cls: 'bg-green-900 text-green-300' },
  failed:               { label: 'Failed',      cls: 'bg-red-900 text-red-300' },
  awaiting_checkpoint:  { label: 'Checkpoint',  cls: 'bg-yellow-900 text-yellow-300' },
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, cls } = MAP[status] ?? { label: status, cls: 'bg-zinc-700 text-zinc-300' }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export function DocBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${done ? 'bg-green-900 text-green-300' : 'bg-zinc-800 text-zinc-500'}`}>
      {done ? '✓' : '○'} {label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: number | null }) {
  if (!priority) return null
  const map: Record<number, { label: string; cls: string }> = {
    1: { label: 'High',   cls: 'bg-red-900/50 text-red-400' },
    2: { label: 'Medium', cls: 'bg-yellow-900/50 text-yellow-400' },
    3: { label: 'Low',    cls: 'bg-zinc-800 text-zinc-500' },
  }
  const { label, cls } = map[priority] ?? { label: `P${priority}`, cls: 'bg-zinc-800 text-zinc-500' }
  return <span className={`px-2 py-0.5 rounded text-xs font-mono ${cls}`}>{label}</span>
}
