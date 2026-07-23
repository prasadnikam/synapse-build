import { useEffect, useState } from 'react'
import { listExperiments, type KadooshExperiment } from '../api/kadoosh'
import { useNavigate } from 'react-router-dom'

const STATUS_COLOR: Record<string, string> = {
  draft:   'text-zinc-500',
  running: 'text-blue-400 animate-pulse',
  paused:  'text-yellow-400',
  done:    'text-green-400',
}

export function ExperimentsPage() {
  const [experiments, setExperiments] = useState<KadooshExperiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    listExperiments()
      .then(setExperiments)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => nav('/')} className="text-zinc-500 hover:text-zinc-300 text-sm">← Back</button>
        <div>
          <h1 className="text-base font-semibold">Experiments & Benchmarks</h1>
          <p className="text-xs text-zinc-500">GrokTeacher prompt quality tracking</p>
        </div>
      </header>

      <main className="px-6 py-6 max-w-4xl mx-auto">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">Error: {error}</p>}

        {!loading && experiments.length === 0 && !error && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-xl mb-2">No experiments yet</p>
            <p className="text-sm">Create one via kadoosh after the first few modules are complete</p>
          </div>
        )}

        <div className="space-y-3">
          {experiments.map(exp => (
            <a
              key={exp.id}
              href={`http://localhost:5173/experiments/${exp.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{exp.name}</h3>
                  {exp.description && <p className="text-xs text-zinc-500 mt-1">{exp.description}</p>}
                </div>
                <span className={`text-xs font-mono ${STATUS_COLOR[exp.status] ?? 'text-zinc-400'}`}>
                  {exp.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-600">
                <span>objective: <span className="text-zinc-400">{exp.objective}</span></span>
                <span>optimizer: <span className="text-zinc-400">{exp.optimizer}</span></span>
                <span>rounds: <span className="text-zinc-400">{exp.rounds_completed}</span></span>
                {exp.target_score && (
                  <span>target: <span className="text-zinc-400">{exp.target_score}</span></span>
                )}
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
