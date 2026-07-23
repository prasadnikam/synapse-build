# synapse-build Workflow

## What this project is

synapse-build is the **project management control plane** for rebuilding grok-build (xAI's terminal-based AI coding agent, 64-crate Rust workspace) from scratch.

- **Dashboard** (`localhost:5174`) — chapter cards, progress tracking, docs viewer
- **Curriculum** (`docs/curriculum.json`, `public/docs/curriculum.json`) — CurriculumModule[] source of truth
- **Agents** — GrokTeacher writes specs, Isaac implements Rust, Interviewer preps you for interviews
- **GitHub** — https://github.com/prasadnikam/synapse-build

---

## Curriculum pipeline (one module per PDF)

```
1. Drop PDF → /grok-teacher activates
2. GrokTeacher summarizes module — identifies crate(s), learning objectives
3. GrokTeacher creates teacher_task in kadoosh:
       POST http://localhost:8002/tasks/auto  (X-Session-ID: a2a:service)
       { "goal": "GrokTeacher module: <name>", "task_type": "teacher_task" }
4. /pm writes PRD → docs/prds/<slug>.md
       git commit -m "feat(prd): <module>"
5. GrokTeacher writes architecture doc → docs/architecture/<slug>.md
       git commit -m "feat(arch): <module>"
6. GrokTeacher writes Jira-format stories → docs/stories/<slug>.md
       git commit -m "feat(stories): <module>"
7. Update BOTH docs/curriculum.json AND public/docs/curriculum.json (must stay in sync)
       git commit -m "chore(curriculum): add <module> entry"
8. git push origin main
9. GrokTeacher saves episodic memory → visible in kadoosh Teacher > Sessions
10. Dashboard at localhost:5174 shows new chapter cards automatically
```

---

## Learning cycle (per chapter)

```
not_started → studying → in_progress → review → mastered
```

| State | Action |
|---|---|
| `studying` | Read PRD, architecture, stories in ModuleView |
| `in_progress` | Isaac implementing Rust in grok-build |
| `review` | Review Isaac's code, ask GrokTeacher questions |
| `mastered` | You can explain WHY every type and build step exists |

Chapter dependency order Isaac follows: `Ch1 → Ch2 → Ch3 → Ch4 → Ch5 → Ch7`, Ch6 independent, Ch8–Ch12 independent.

---

## Interview prep

```
/interviewer → drop any PDF or name a topic
             → 10 Q&A per role: AI Engineer / Software Developer / Product Manager
             → say "quiz me" for simulation mode (scored, with feedback)
```

Interviewer saves your score and weak areas to kadoosh memory — next session it picks up where you left off.

---

## Agents (all in kadoosh, all use X-Session-ID: a2a:service)

| Agent | ID | Role | Skill |
|---|---|---|---|
| GrokTeacher | 714 | Curriculum authority, writes specs | `/grok-teacher` |
| Isaac | 190 | Rust implementer, builds grok-build chapter by chapter | `/isaac` |
| Interviewer | 765 | Interview Q&A and simulation from any PDF/topic | `/interviewer` |
| PM | 193 | Writes PRDs incrementally | `/pm` |

Memory APIs:
- `GET  /agents/{id}/memory?project=...&limit=N`
- `POST /agents/{id}/memory` — save any memory type
- `POST /agents/{id}/memory/search` — semantic search via Qdrant

---

## Doc naming

- Slug: kebab-case (`worktree-sync`, `tui-elm-architecture`, `acp-protocol`)
- PRD:          `docs/prds/<slug>.md`         + `public/docs/prds/<slug>.md`
- Architecture: `docs/architecture/<slug>.md`  + `public/docs/architecture/<slug>.md`
- Stories:      `docs/stories/<slug>.md`       + `public/docs/stories/<slug>.md`

**Both `docs/` and `public/docs/` must always be in sync.** `public/docs/` is what Vite serves to the browser.

---

## curriculum.json schema

```json
{
  "id": "community-0",
  "title": "Worktree Sync, File Discovery & Overlay Integration",
  "community": 0,
  "difficulty": "Medium",
  "estimated_minutes": 7500,
  "concept_count": 500,
  "generated": "July 2026",
  "chapters": [
    {
      "id": "ch01",
      "number": 1,
      "title": "Filesystem Foundations",
      "difficulty": "Easy",
      "estimated_minutes": 90,
      "concept_count": 6,
      "tag": "types",
      "tagline": "Bridging Grok to the Filesystem",
      "key_concepts": [],
      "build_steps": [],
      "types_to_implement": []
    }
  ]
}
```

---

## Commit convention

| Prefix | When |
|---|---|
| `feat(prd):` | New PRD committed |
| `feat(arch):` | New architecture doc |
| `feat(stories):` | New stories file |
| `feat(impl):` | Rust implementation notes |
| `feat(dashboard):` | UI changes |
| `feat(agent):` | New agent or prompt update |
| `chore(curriculum):` | curriculum.json updated |
| `fix:` | Bug fix |

---

## Local dev

```bash
cd /Users/prasad.nikam/projects1/synapse-build
npm run dev        # localhost:5174

# kadoosh backend must be running at localhost:8002
cd /Users/prasad.nikam/projects1/kadoosh
./start.sh
```
