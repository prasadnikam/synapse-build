# PRD: Community 0 — Worktree Sync, File Discovery & Overlay Integration

**Generated:** July 2026  
**Difficulty:** Medium  
**Estimated Time:** 7500 min  
**Concepts:** 500 across 12 chapters

---

## Problem

Grok is a text predictor — it cannot open files, create directories, run git commands, or maintain memory across calls. Yet its entire value as a coding agent depends on exactly those capabilities. Community 0 defines the foundational layer that closes this gap: the typed request/response system, sandboxed filesystem access, searchable code indexes, durable agent memory, isolated git worktrees, and a trust architecture for external hooks.

Without this layer, Grok would be pure theater — plausible-sounding text with no real-world effect.

---

## Goals

1. Build the request/response backbone that every Grok tool family inherits
2. Give the model sandboxed, validated read/write access to the filesystem
3. Build a fast, incremental code search layer that scales past the context window
4. Give the build agent durable memory that survives crashes and restarts
5. Provision isolated git worktrees so concurrent agents don't corrupt each other
6. Manage session state as a durable, event-driven ledger (not in-memory mutation)
7. Handle environment detection and config for Python/Rust/Builtin toolchains
8. Provide a safe, verifiable plugin installation pipeline
9. Centralize all external communication through a typed channel abstraction
10. Gate third-party hooks behind a computed trust score (embeddings + evidence)
11. Prove session concurrency correctness with deterministic scenario tests

---

## Scope

### In Scope (12 Chapters)

| # | Chapter | Difficulty | Est. Time |
|---|---------|-----------|-----------|
| 1 | Filesystem Foundations | Easy | 90 min |
| 2 | File I/O & Access Control | Easy | 90 min |
| 3 | Discovery, Search & Indexing | Easy-medium | 120 min |
| 4 | Storage & Persistence | Medium | 90 min |
| 5 | Worktree Core Operations | Medium | 105 min |
| 6 | Session & State Management | Medium | 105 min |
| 7 | Git Backend Integration | Medium | 90 min |
| 8 | Environment & Configuration | Easy-medium | 90 min |
| 9 | Installation & Package Management | Medium | 90 min |
| 10 | Communication & Networking | Medium-hard | 90 min |
| 11 | Security & Trust Architecture | Hard | 75 min |
| 12 | Testing & Concurrency Patterns | Hard | 150 min |

### Out of Scope

- UI rendering / frontend presentation layer
- LLM prompt engineering and inference
- Community 1+ chapters (future modules)

---

## Key Design Decisions

### Structured types over shell commands
Every filesystem operation goes through typed, validated structs (`FsReadFileReq`, `FsWriteFileReq`) rather than raw shell strings. This enables path confinement checks before any I/O touches disk.

### Index-then-query for code search
Rather than feeding entire codebases into the prompt, Discovery builds a `FileIndex` once, keeps it fresh via `search_remote_sync`, and answers narrow queries. Scales to repos far larger than any context window.

### Append-only memory log as ground truth
`memory_log.rs` is the spine. `checkpoint.rs`, `recovery.rs`, and `index_manager.rs` all exist to make that log safe, resumable, and fast to query. A crash mid-write never leaves the agent trusting corrupted state.

### Git worktrees via lightweight metadata copy
`copy_gitdir` copies only the `.git` metadata (HEAD, refs, index) while hard-linking or referencing the shared `objects/` store. Each agent gets an isolated working tree without duplicating gigabytes of object data.

### Session state as discrete update events
State changes enter as typed `SessionUpdate` variants and are applied via `apply_update()`. This makes every transition loggable, replayable, and testable in isolation — the opposite of silent in-memory mutation.

### Trust computed from hard-to-forge signals
Rather than a static allow-list or asking the model to judge safety, trust is computed from embedding similarity (against known-good/bad hooks) plus evidence records (execution history, author reputation). `trust.rs` owns the final gate.

---

## Success Criteria

- All 12 chapters have working Rust implementations that compile
- `copy_gitdir` creates independent worktrees sharing the object store
- `search_remote_sync` keeps the FileIndex fresh across branch switches
- `recovery.rs` can reconstruct session state from checkpoint + log after a simulated crash
- `trust.rs` gates marketplace hook installation on a computed TrustScore
- Concurrency tests (blitz-cancel, fork-session, orphan-reconcile) pass deterministically
