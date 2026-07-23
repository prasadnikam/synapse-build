import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DocViewer } from '../components/DocViewer'
import type { CurriculumModule, Chapter } from './Dashboard'

type Tab = 'prd' | 'architecture' | 'stories' | 'concepts'

const DIFF_COLOR: Record<string, string> = {
  Easy: 'text-green-400',
  'Easy-medium': 'text-lime-400',
  Medium: 'text-yellow-400',
  'Medium-hard': 'text-orange-400',
  Hard: 'text-red-400',
}

export function ModuleView() {
  const { moduleId, chapterId } = useParams<{ moduleId: string; chapterId: string }>()
  const nav = useNavigate()

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [module, setModule] = useState<CurriculumModule | null>(null)
  const [tab, setTab] = useState<Tab>('prd')
  const [docs, setDocs] = useState<Record<string, string | null>>({ prd: null, architecture: null, stories: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/docs/curriculum.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: CurriculumModule[]) => {
        const mod = data.find(m => m.id === moduleId)
        if (!mod) return
        setModule(mod)
        const ch = mod.chapters.find(c => c.id === chapterId)
        if (ch) setChapter(ch)

        // slugify module id to filename: community-0-worktree-sync
        const slug = moduleId
        const paths: Record<string, string> = {
          prd:          `/docs/prds/${slug}.md`,
          architecture: `/docs/architecture/${slug}.md`,
          stories:      `/docs/stories/${slug}.md`,
        }
        Object.entries(paths).forEach(([key, path]) => {
          fetch(path)
            .then(r => r.ok ? r.text() : null)
            .then(text => setDocs(prev => ({ ...prev, [key]: text })))
        })
      })
      .finally(() => setLoading(false))
  }, [moduleId, chapterId])

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center">Loading…</div>
  )
  if (!chapter) return (
    <div className="min-h-screen bg-zinc-950 text-red-400 flex items-center justify-center">Chapter not found</div>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prd',          label: 'PRD' },
    { key: 'architecture', label: 'Architecture' },
    { key: 'stories',      label: 'Stories' },
    { key: 'concepts',     label: 'Concepts' },
  ]

  const diffColor = DIFF_COLOR[chapter.difficulty] ?? 'text-zinc-400'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-start gap-4">
          <button onClick={() => nav('/')} className="text-zinc-500 hover:text-zinc-300 text-sm mt-0.5">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-600 font-mono">Ch {chapter.number}</span>
              <h1 className="text-base font-semibold text-zinc-100">{chapter.title}</h1>
              <span className={`text-xs font-medium ${diffColor}`}>{chapter.difficulty}</span>
              <span className="text-xs text-zinc-600 ml-auto">
                {chapter.concept_count} concepts · {(chapter.estimated_minutes / 60).toFixed(1)}h
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 italic">"{chapter.tagline}"</p>
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
          <DocViewer content={docs.prd} placeholder="No PRD yet" />
        )}
        {tab === 'architecture' && (
          <DocViewer content={docs.architecture} placeholder="No architecture doc yet" />
        )}
        {tab === 'stories' && (
          <DocViewer content={docs.stories} placeholder="No stories yet" />
        )}
        {tab === 'concepts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Key Concepts</h2>
              <div className="flex flex-wrap gap-2">
                {chapter.key_concepts.map(c => (
                  <span key={c} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm px-3 py-1.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Build Steps</h2>
              <ol className="space-y-2">
                {chapter.build_steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-zinc-600 font-mono w-5 shrink-0">{i + 1}.</span>
                    <span className="text-zinc-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Types to Implement</h2>
              <ul className="space-y-1">
                {chapter.types_to_implement.map((t, i) => (
                  <li key={i} className="text-sm text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
