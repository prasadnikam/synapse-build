# Changelog

All notable changes to synapse-build are documented here.
Format: `[version] YYYY-MM-DD — summary`

---

## [0.3.0] 2026-07-24 — Interviewer agent, memory REST APIs, correct routing

### Added
- **Interviewer agent** (kadoosh id=765): generates 10 Q&A per role (AI Engineer / SWE / PM)
  from any PDF or topic; simulation/quiz mode with scoring and weak-area tracking
- `/interviewer` skill registered in `~/.claude/skills/interviewer/SKILL.md`
- `POST /agents/{id}/memory` — REST endpoint to save any memory type from agents
- `POST /agents/{id}/memory/search` — semantic search via Qdrant from REST
- `GET /agents/{id}/memory` now accepts `?project=&limit=` query params
- Permanent semantic memories seeded for Isaac (id=190) and GrokTeacher (id=714)
  with correct API paths and synapse-build context
- `CHANGELOG.md` — this file
- `WORKFLOW.md` — rewritten to cover full pipeline, agents table, learning cycle, schema

### Changed
- Isaac and GrokTeacher prompts updated via kadoosh API to reflect:
  - synapse-build as PM control plane (not a passive viewer)
  - Correct memory API paths: `/agents/{id}/memory` (was `/agent-memories`)
  - grok-build as the artifact being rebuilt chapter by chapter
- `.gitignore` — added `tsconfig.tsbuildinfo` (build artifact, not source)

---

## [0.2.0] 2026-07-23 — Dashboard migration, CORS fix, static doc serving

### Added
- `public/docs/` — Vite static serving for curriculum.json + Community 0 docs
- Vite proxy `/api → localhost:8002` to bypass CORS on kadoosh API calls

### Changed
- **Dashboard.tsx** — rewritten to use `CurriculumModule`/`Chapter` types from
  `curriculum.json` directly; removed kadoosh task dependency
- **ModuleView.tsx** — new route `/module/:moduleId/:chapterId`; loads chapter
  from curriculum.json; PRD/Architecture/Stories/Concepts tabs; fetches markdown docs
- **App.tsx** — route updated `/module/:id` → `/module/:moduleId/:chapterId`
- **kadoosh.ts** — `BASE` changed to `/api` proxy; `X-Session-ID` → `a2a:service`;
  `EventSource` replaced with `fetch` + `ReadableStream` SSE (supports custom headers)

### Removed
- `src/components/ModuleCard.tsx` — orphan importing deleted `CurriculumEntry` type

### Fixed
- PRD tab showing raw HTML (markdown files renamed to match module ID `community-0.md`)
- 401 Unauthorized on experiments page (wrong session ID + CORS)

---

## [0.1.0] 2026-07-23 — Community 0 curriculum extracted from PDF

### Added
- `docs/curriculum.json` — full CurriculumModule for Community 0 (12 chapters,
  500 concepts, 7500 min) extracted from 75-page PDF
- `docs/prds/community-0-worktree-sync.md` — PRD: problem, 11 goals, scope table,
  6 key design decisions, success criteria
- `docs/architecture/community-0-worktree-sync.md` — layer overview, dependency
  graph, full module map, tool call + recovery data flow diagrams
- `docs/stories/community-0-worktree-sync.md` — 12 detailed stories with mental
  models, key concepts (exact file:line refs), and build steps

---

## [0.0.1] 2026-07-23 — Initial commit

### Added
- React + TypeScript + Vite + Tailwind scaffold
- Dashboard page, ModuleView page, ExperimentsPage
- kadoosh API client (`src/api/kadoosh.ts`)
- `WORKFLOW.md` — initial curriculum pipeline documentation
