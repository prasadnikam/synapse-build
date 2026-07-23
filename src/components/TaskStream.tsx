import { useEffect, useRef, useState } from 'react'
import type { ComputationEvent } from '../api/kadoosh'
import { streamTaskEvents } from '../api/kadoosh'

const TYPE_COLOR: Record<string, string> = {
  task_done:   'text-green-400',
  task_failed: 'text-red-400',
  step_start:  'text-blue-400',
  step_done:   'text-green-300',
  step_failed: 'text-red-300',
  log:         'text-zinc-400',
}

export function TaskStream({ taskId, initialEvents }: { taskId: number; initialEvents: ComputationEvent[] }) {
  const [events, setEvents] = useState<ComputationEvent[]>(initialEvents)
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStreaming(true)
    const stop = streamTaskEvents(
      taskId,
      ev => setEvents(prev => [...prev, ev]),
      () => setStreaming(false),
    )
    return stop
  }, [taskId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 font-mono text-xs h-80 overflow-y-auto">
      {events.length === 0 && !streaming && (
        <span className="text-zinc-600">No events yet.</span>
      )}
      {events.map((ev, i) => (
        <div key={i} className="mb-1">
          <span className={`${TYPE_COLOR[ev.type] ?? 'text-zinc-400'} mr-2`}>[{ev.type}]</span>
          {ev.label && <span className="text-zinc-300 mr-1">{ev.label}</span>}
          {ev.output && <span className="text-zinc-500">{ev.output.slice(0, 200)}</span>}
          {ev.error && <span className="text-red-400">{ev.error.slice(0, 200)}</span>}
        </div>
      ))}
      {streaming && <div className="text-blue-500 animate-pulse">● streaming…</div>}
      <div ref={bottomRef} />
    </div>
  )
}
