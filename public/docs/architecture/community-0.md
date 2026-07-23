# Architecture: Community 0 — Worktree Sync, File Discovery & Overlay Integration

## Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Grok (LLM text predictor)             │
└────────────────────────┬────────────────────────────────┘
                         │ typed tool calls (ToolInput JSON)
┌────────────────────────▼────────────────────────────────┐
│              Tool Dispatcher / ToolInput enum            │
│   (mod.rs L232 — routes FsRead/FsWrite/Search/...)      │
└──┬──────────┬──────────┬──────────┬─────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
ext_fs.rs  discovery  hub/      plugins/
(Ch1+2)    (Ch3)      channel   installer
                      (Ch10)    (Ch9)
   │          │
   ▼          ▼
WorkspaceHandle    FileIndex
(path confinement) (HashMap<PathBuf, FileIndexEntry>)
   │
   ▼
OS filesystem (sandboxed to worktree root)
```

## Chapter Dependency Graph

```
Ch1 (ToolInput/ServerId/ShellWorktreeType)
  └── Ch2 (FsWriteFileReq.execute())
        └── Ch3 (FileIndex, embedded_search_tools, path_suggestions)
              └── Ch4 (MemoryLog, Checkpoint, IndexManager, Recovery)
                    └── Ch5 (WorktreeManager → git worktree add/remove)
                          └── Ch7 (copy_gitdir — lightweight .git copy)
                    └── Ch6 (SessionState, SessionUpdate, plan_approval)
Ch8 (EnvRc, GrokHomePaths, EnvProvider — independent)
Ch9 (PluginRegistry, PluginBundle, Installer — independent)
Ch10 (HubChannel, LocalTerminal, RestClient — independent)
Ch11 (TrustScore, EvidenceStore, EmbeddingVector — independent)
Ch12 (concurrency tests — depends on Ch5+Ch6 session types)
```

## Key Module Map

### Filesystem Layer (Ch1–2)
| File | Role |
|------|------|
| `crate::types::tool_io` (mod.rs) | `ToolInput` enum — dispatch entrypoint |
| `ext_fs.rs` | `FsReadFileReq`, `FsWriteFileReq`, `.execute()` |
| `crate::types::ids` | `ServerId` newtype |
| `crate::types::worktree` | `ShellWorktreeType` enum (Ephemeral/Persistent/Shared) |
| `crate::workspace` | `WorkspaceHandle` — path confinement root |

### Discovery Layer (Ch3)
| File | Role |
|------|------|
| `discovery.rs` | Request intake, dispatches to search tools |
| `embedded_search_tools.rs` | Fast in-process `fn search(index, query) -> Vec<(PathBuf, f32)>` |
| `path_suggestions.rs` | Fuzzy prefix matcher over `FileIndex` entries |
| `path_suggestions_production.rs` | Hardened wrapper: result cap + timeout + `Result<>` |
| `search_remote_sync.rs` | `fn sync_index(index, root)` — re-walks changed paths |

### Storage Layer (Ch4)
| File | Role |
|------|------|
| `memory_log.rs` | Append-only JSONL log, fsync after every write |
| `index_manager.rs` | HashMap: entry_id → byte offset in log file |
| `checkpoint.rs` | Periodic snapshot of `SessionState` to `checkpoint_N.json` |
| `recovery.rs` | Startup: load latest checkpoint → replay log entries since |

### Worktree Layer (Ch5, Ch7)
| File | Role |
|------|------|
| `git_worktree.rs` | `WorktreeManager`: `create_worktree`, `list_worktrees`, `remove_worktree` |
| `copy_gitdir.rs` | Copy `.git` metadata only (HEAD, refs, index); hardlink `objects/` |

### Session Layer (Ch6)
| File | Role |
|------|------|
| `session_updates.rs` | `SessionUpdate` enum + `SessionState` struct + `apply_update()` |
| `plan_approval_resume.rs` | Propose/approve/reject/resume plan lifecycle |
| `goal_strategist.rs` | Reads updated state, decides next step |
| `workspace_user.rs` | Scope guard: which user/workspace owns this session |
| `log.rs` | Structured log emitted on every state mutation |

### Environment Layer (Ch8)
| File | Role |
|------|------|
| `grok_home_paths.rs` | `GrokHomePaths::resolve()` — GROK_HOME or platform default |
| `config_toml_edit.rs` | Format-preserving TOML read/write via `toml_edit` |
| `python.rs` / `rust.rs` | `LanguageEnv` impls: detect venv/Cargo.toml, emit PATH exports |
| `builtin.rs` | Always-true fallback provider with minimal defaults |
| `envrc.rs` | Top-level orchestrator: resolves paths, runs providers, writes `.envrc` |

### Plugins Layer (Ch9)
| File | Role |
|------|------|
| `registry.rs` | `PluginRegistry`: name → `RegistryEntry` (version, download_url) |
| `bundle.rs` | `PluginBundle::from_archive(path)` — unpack tarball |
| `resize.rs` | `resize_assets(bundle)` — normalize icon dimensions |
| `legacy_0_4_10.rs` | `is_legacy_format()` + `convert()` — old manifest upgrade |
| `installer.rs` | Orchestrates: registry lookup → unpack → legacy? → resize → register |

### Communication Layer (Ch10)
| File | Role |
|------|------|
| `hub/hub_channel.rs` | `HubChannel` (mpsc), `HubMessage` enum, `HubChannelHandle` |
| `hub/wire_round_trip.rs` | `TerminalCommand`/`TerminalResponse` wire types + round-trip test |
| `hub/terminal_command.rs` | `Channel` trait: `async fn send(cmd) -> Result` |
| `hub/local_terminal.rs` | `LocalTerminal`: spawns subprocess, pipes stdin/stdout |
| `hub/rest.rs` | `RestClient`: HTTP POST to remote sandbox |
| `hub/hub_server.rs` | Dispatch table: `HubMessage` variant → `LocalTerminal` or `RestClient` |

### Security Layer (Ch11)
| File | Role |
|------|------|
| `evidence.rs` | `Evidence` struct, `EvidenceKind` enum, `EvidenceStore` |
| `embedding.rs` | `EmbeddingVector` newtype, `embed_evidence()`, `cosine_similarity()` |
| `marketplace.rs` | `ReputationScore`, `MarketplaceEntry`, `lookup_reputation()` |
| `trust.rs` | `TrustScore`, `compute_trust_score()`, `is_trusted()`, `TrustGate` |

### Concurrency Tests (Ch12)
| File | Scenario |
|------|---------|
| `tests/common/harness.rs` | `new_test_session()` — mock ACP session with in-memory channels |
| `reverse_request_session_id_tests.rs` | Reverse-request carries correct `session_id` |
| `test_fork_session.rs` | Fork mid-flight → independent state, distinct IDs |
| `test_blitz_cancel.rs` | Burst of cancels → exactly one clean shutdown |
| `test_subagent_orphan_reconcile.rs` | Orphaned subagent detected and cleaned up |
| `test_xai_session_update.rs` | Concurrent updates applied in order, no lost writes |

## Data Flow: Tool Call Lifecycle

```
Model emits JSON  →  ToolInput::deserialize()  →  match variant
                                                        │
                                              FsReadFile(req)
                                                        │
                                              req.execute(server_id)
                                                        │
                                       WorkspaceHandle::confine_to_workspace_root()
                                                        │
                                              std::fs::read() / std::fs::write()
                                                        │
                                              ToolOutput { content, error }
                                                        │
                                              serialized back into model context
```

## Data Flow: Agent Recovery

```
Process restart
      │
      ▼
recovery.rs::recover(session_id)
      │
      ├── checkpoint.rs::latest_checkpoint() → Checkpoint { last_entry_id, state }
      │
      └── index_manager.rs: iterate MemoryLogEntry ids > last_entry_id
                │
                └── apply each LogOp to base SessionState
                          │
                          └── return reconstructed SessionState
```
