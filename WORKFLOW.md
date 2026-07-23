# GrokBuild Curriculum Workflow

## Pipeline

```
1. User drops PDF/topic in session → /grok-teacher activates
2. GrokTeacher summarizes module — identifies crate(s), learning objectives
3. GrokTeacher creates teacher_task in kadoosh:
       POST http://localhost:8002/tasks/auto
       { "goal": "GrokTeacher module: <name> — ...", "task_type": "teacher_task" }
4. /pm agent writes PRD → docs/prds/<slug>.md
       git commit -m "feat(prd): add PRD for <module>"
5. GrokTeacher writes architecture doc → docs/architecture/<slug>.md
       git commit -m "feat(arch): add architecture doc for <module>"
6. GrokTeacher generates Jira-format stories → docs/stories/<slug>.md
       git commit -m "feat(stories): add stories for <module>"
7. docs/curriculum.json updated: { slug, task_id, prd, architecture, stories, code }
       git commit -m "chore(curriculum): add <module> entry"
8. GrokTeacher saves episodic memory → visible in kadoosh Teacher > Sessions
9. Dashboard at localhost:5174 shows the new module card automatically
```

## Doc Naming Convention

- Slug: kebab-case from module title (e.g. `tui-elm-architecture`, `acp-protocol`, `memory-system`)
- PRD:          `docs/prds/<slug>.md`
- Architecture: `docs/architecture/<slug>.md`
- Stories:      `docs/stories/<slug>.md`

## curriculum.json Entry Shape

```json
{
  "slug": "tui-elm-architecture",
  "task_id": 123,
  "prd": "tui-elm-architecture.md",
  "architecture": "tui-elm-architecture.md",
  "stories": "tui-elm-architecture.md",
  "code": false
}
```

## Commit Convention

| Scope   | When |
|---------|------|
| `feat(prd):`      | New PRD file committed |
| `feat(arch):`     | New architecture doc committed |
| `feat(stories):`  | New stories file committed |
| `feat(impl):`     | Rust implementation notes added |
| `chore(curriculum):` | curriculum.json updated |

## Future

- Rust code implementation guided step by step
- Jira sync via /connector once integration is set up
- Experiment benchmarks on GrokTeacher prompt quality via kadoosh Experiments
