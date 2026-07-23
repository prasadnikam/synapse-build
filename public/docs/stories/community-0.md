# Stories: Community 0 — Worktree Sync, File Discovery & Overlay Integration

Each story maps to one chapter. Each contains the mental model, key concepts, and build steps extracted from the PDF curriculum.

---

## Story 1: Filesystem Foundations
**"Bridging Grok to the Filesystem"**  
Easy · 90 min · 6 concepts

### Mental Model
- **ToolInput Parsing** — reads incoming request, turns it into structured fields (what file, what operation, which server)
- **ServerId Routing** — figures out which backend instance should handle the request
- **ShellWorktreeType Resolution** — decides whether operation runs against a durable or disposable workspace
- **Path Confinement / Validation** — checks that the requested file path falls inside the workspace boundaries
- **Filesystem Execution** — performs the actual read/write/search against disk
- **Output Serialization** — packages result into the structured response type

### Key Concepts
1. `ToolInput` — defined in mod.rs ~L232; shared input type deserialized from model JSON tool-call arguments
2. `ServerId` — defined in ids.rs ~L161; newtype wrapping String/u64; implements Eq, Hash, Serialize/Deserialize
3. `ShellWorktreeType` — defined in worktree.rs ~L22; enum for Ephemeral/Persistent/Shared; determines filesystem lifecycle

### Build Steps
1. **Define FsReadFileReq struct with path field** — plain data struct, single field `path: PathBuf`, derive serde Deserialize
2. **Define FsWriteFileReq struct with path, content, create_dirs** — three fields, derive serde Deserialize, no methods yet
3. **Add Fs variants to ToolInput enum** — `ToolInput::FsReadFile(FsReadFileReq)` and `ToolInput::FsWriteFile(FsWriteFileReq)`
4. **Implement execute() for each Fs request scoped by ServerId** — `execute(&self, server_id: ServerId)` reads `self.path` and `self.content`
5. **Wire ToolInput::FsReadFile/FsWriteFile into the dispatch match** — add match arms that call execute(server_id) and convert result
6. **Scope filesystem access using ShellWorktreeType** — branch on ShellWorktreeType to decide the root path passed into execute()

---

## Story 2: File I/O & Access Control
**"Giving the Model a Hand to Write Files"**  
Easy · 90 min · 6 concepts

### Mental Model
- **FsWriteFileReq (Request Struct)** — caller constructs this and hands it off; packages the intended write into one bundle
- **Path Validation / Confinement Check** — guard/sandbox check inside the fs extension, invoked before execute() runs
- **Execute() Method** — FsWriteFileReq itself; performs the real work — writing content to disk
- **Underlying Filesystem Write** — the OS/filesystem layer beneath ext_fs.rs, called from inside execute()
- **Result / Response Returned** — execute() returns this to the original caller

### Key Concepts
1. `FsWriteFileReq` — struct defined in ext_fs.rs ~L129; fields `path: PathBuf`, `content: String`, `create_dirs: bool`
2. `.execute()` — defined at ext_fs.rs ~L130; called on FsWriteFileReq with no additional arguments; returns Result
3. **Request/Result contract** — construct a `*Req` struct, call `.execute()`, receive a Result; no bare values or throws

### Build Steps
1. **Define FsWriteFileReq struct with core fields** — path, content, create_dirs; derive serde::Deserialize
2. **Add derives for Debug and Deserialize** — `#[derive(Debug, Deserialize)]`; confirm serde is imported
3. **Implement execute() to create parent directories** — if `self.create_dirs`, call `std::fs::create_dir_all` on parent before write
4. **Write file contents via execute()** — call `std::fs::write(&self.path, &self.content)`, propagate errors with `?`
5. **Wire FsWriteFileReq into the tool dispatcher** — add match arm for write-file tool name; deserialize JSON → execute()

---

## Story 3: Discovery, Search & Indexing
**"Turning Files Into Searchable Knowledge"**  
Easy-medium · 120 min · 8 concepts

### Mental Model
- **Discovery / Request Intake (discovery.rs)** — figures out what the caller is looking for and decides which search resources to consult
- **Embedded Search Tools (embedded_search_tools.rs)** — runs the actual fast in-process lookup against a local index
- **Path Suggestions (path_suggestions.rs)** — turns raw search hits into a ranked, human-readable list of candidate file locations
- **Production Path Validation (path_suggestions_production.rs)** — re-checks candidate suggestions against reality before handing back
- **Remote Search Sync (search_remote_sync.rs)** — keeps the local index up to date by periodically pulling in changes

### Key Concepts
1. **Search Query** — processed through an indexing system; matched against stored data; returns results by relevance
2. **Indexing** — extracting relevant fields and storing in searchable format; matched on query receipt
3. **Search Engine** — receives queries, matches against index, retrieves results; may include ranking algorithms
4. **Data Record** — created and updated as part of the indexing process; contains all data needed to be searched
5. **Search Result** — includes record ID, score, and relevant metadata

### Build Steps
1. **Define FileIndexEntry struct with path and metadata** — fields: `path: PathBuf`, `extension: String`, `size_bytes: u64`, `last_modified: SystemTime`; derive Serialize/Deserialize
2. **Build FileIndex with in-memory HashMap store** — `FileIndex` wrapping HashMap; methods `insert`, `get`, `iter`; `build_from_dir(root: &Path)`
3. **Implement embedded_search_tools.rs scoring function** — `fn search(index: &FileIndex, query: &str) -> Vec<(PathBuf, f32)>` with substring + extension match scoring
4. **Implement path_suggestions.rs fuzzy matcher** — `fn suggest_paths(index: &FileIndex, partial: &str) -> Vec<PathBuf>` with fuzzy/prefix matching
5. **Harden path_suggestions_production.rs with limits** — wrap suggest_paths with MAX_SUGGESTIONS cap and timeout guard; return `Result<_, DiscoveryError>`
6. **Wire search_remote_sync.rs to refresh index on demand** — `fn sync_index(index: &mut FileIndex, root: &Path)` re-walks directory for changed `last_modified`

---

## Story 4: Storage & Persistence
**"Giving Grok's Agent a Durable Memory"**  
Medium · 90 min · 6 concepts

### Mental Model
- **storage.rs (Filing System / Archivist)** — public interface; defines overall rules for where data lives; gives every other piece a single consistent way to read and write
- **memory_log.rs (The Ledger)** — records every change as an append-only entry; nothing is ever silently overwritten or lost
- **index_manager.rs (The Card Catalog)** — keeps a fast lookup table pointing to where each item's latest data lives; reads don't require scanning the whole log
- **checkpoint.rs (The Summary Sheet)** — periodically saves a full snapshot; the system never has to replay the entire history to know where things stand
- **recovery.rs (The Shift-Change Recovery Drill)** — after restart or crash, loads the last checkpoint and replays only the log entries written since

### Key Concepts
1. **Memory Log** — append-style write path; serializes event to one line of newline-delimited JSON with fsync after write
2. **Checkpointing** — serializes current in-memory state (task progress, file diffs, tool call results) to snapshot record with log offset reference
3. **Index Manager** — HashMap: `MemoryLogEntry.id` → byte offset in log file; `record(event, offset)` called right after each append
4. **Recovery / Replay** — asks checkpoint.rs for latest valid checkpoint, then asks memory_log.rs for all entries since that offset, applies each via deterministic state-transition function

### Build Steps
1. **Define MemoryLogEntry struct and append-only writer** — fields: `id: u64`, `timestamp: i64`, `payload: serde_json::Value`; `append(&MemoryLogEntry)` serializes to JSON + fsync
2. **Implement IndexManager mapping ids to file offsets** — HashMap; `record(id, offset: u64)`; `lookup(id) -> Option<u64>`; persist index to sidecar file on `save()`
3. **Wire append() to update the index on every write** — MemoryLog holds IndexManager; after each write, call `index.record(entry.id, offset)` using byte offset captured just before the write
4. **Define Checkpoint struct and snapshot writer** — fields: `last_entry_id: u64`, `state: SessionState`, `created_at: i64`; `write_checkpoint(state, last_entry_id)` serializes to versioned file; `latest_checkpoint() -> Option`
5. **Implement recover() replaying log entries after last checkpoint** — `recover() -> SessionState`; calls `checkpoint::latest_checkpoint()`, then `IndexManager` to iterate entries with id > last_entry_id; applies each payload to base state

---

## Story 5: Worktree Core Operations
**"Isolated Git Workspaces for Agent Edits"**  
Medium · 105 min · 7 concepts

### Mental Model
- **Path & Branch Validation** — before creating anything, checks folder isn't in use and branch isn't checked out by another worktree
- **Registry Entry Creation** — writes a new administrative record under `.git/worktrees/` that names the worktree and links it back to the main repository
- **Working Directory Checkout** — populates the new folder with the actual files for the chosen branch
- **Shared Object Store Linkage** — every worktree reads history and file contents from the one shared repository database instead of copying it
- **Lock/Unlock Safety Flag** — lets an operator mark a worktree as protected so automated cleanup won't remove it
- **List & Prune Maintenance** — periodically reviews which worktrees are actually still present on disk and removes stale registry entries

### Key Concepts
1. **Worktree as an Isolated Checkout** — thin wrapper around `git worktree` subcommand family; primary entry points `create(path, branch)` and `list()/remove(path)`
2. **Worktree Locking and Concurrency Safety** — acquired via `WorktreePool::acquire()` which either creates fresh or reuses from free-list, marking busy via lock file or Mutex
3. **Pruning Stale Worktrees** — `prune()` runs `git worktree prune` and cross-checks pool's bookkeeping against filesystem

### Build Steps
1. **Define WorktreeManager struct with repo root path** — `struct WorktreeManager { repo_root: PathBuf }`; `new(repo_root: PathBuf) -> Self`
2. **Implement run_git_command helper for subprocess calls** — private `run_git_command(&self, args: &[&str]) -> Result`; shells out via `std::process::Command` with `-C self.repo_root`
3. **Implement create_worktree(path, branch) method** — calls `run_git_command` with `["worktree", "add", path.to_str(), branch]`
4. **Implement list_worktrees() returning parsed entries** — calls `run_git_command` with `["worktree", "list", "--porcelain"]`; parses output into `Vec<WorktreeEntry { path, head, branch }>`
5. **Implement remove_worktree(path) with existence check** — first calls `list_worktrees()` to confirm path is registered; then `run_git_command` with `["worktree", "remove", path]`
6. **Add unit tests covering create, list, remove lifecycle** — use `tempfile` crate to build temp git repo; construct WorktreeManager; assert full lifecycle

---

## Story 6: Session & State Management
**"The Ledger Behind Every Agent Turn"**  
Medium · 105 min · 7 concepts

### Mental Model
- **workspace_user.rs** — confirms whose session this is before any state is touched
- **session_updates.rs** — the single place session data gets mutated; writes the latest changes into the session's current state
- **goal_strategist.rs** — looks at the freshly updated state and decides what should happen next
- **plan_approval_resume.rs** — pauses execution when a decision needs sign-off; picks back up exactly where it stopped once approval arrives
- **log.rs** — records every update, decision, and approval with a timestamp

### Key Concepts
1. **Session State Object** — lives as a struct created when a shell interaction begins; updated incrementally; other modules emit typed `SessionUpdate` variants rather than mutating directly
2. **Session Update Events** — enum variants: `PlanApproved`, `GoalChanged`, `WorkspaceUserSet`, `Resumed`; each carries the data needed to replay or persist that transition
3. **Active Sessions Registry** — `active_sessions.rs` exposes a concurrent map `SessionId → SessionState` with create/fetch/update/evict
4. **Plan Approval & Resume Flow** — `plan_approval_resume.rs` exposes 'propose a plan' → `PlanProposed`, 'approve' → `PlanApproved`, 'resume' re-hydrates a paused session
5. **Goal Strategist Binding** — reads the session's `current_goal`, provides it as context when a new plan is proposed

### Build Steps
1. **Define SessionState struct with core fields** — `current_goal: Option<String>`, `plan_status: PlanStatus`, `workspace_user: String`, `history: Vec<String>`; derive Debug and Clone
2. **Implement update_goal and update_plan_status methods** — `update_goal(&mut self, goal: String)` sets `current_goal` and pushes to history; `update_plan_status(&mut self, status: PlanStatus)` similarly
3. **Wire plan_approval_resume.rs to call update_plan_status** — locate approval/resume handlers; call `session_state.update_plan_status(PlanStatus::Approved)` or `Resumed`
4. **Add goal_strategist.rs hook for update_goal** — find where new goal is finalized; call `session_state.update_goal(new_goal.clone())`
5. **Emit structured log entries from log.rs on state changes** — `log_session_state(state: &SessionState)` writes JSON line after each mutation point
6. **Write tests.rs covering state transitions** — construct SessionState; call update_goal and update_plan_status in sequence; assert fields and history buffer match expectations

---

## Story 7: Git Backend Integration
**"Fast, Isolated Git Worktrees for Agents"**  
Medium · 90 min · 6 concepts

### Mental Model
- **Source Repository Resolution** — finds and confirms the exact location of the original git repository data
- **Git Object/Data Duplication** — copies or links the underlying git object files, packs, and refs into the new worktree location so history and content are available without re-downloading
- **Worktree Metadata Assembly** — writes the small set of files (gitdir pointer, HEAD, index) that tell the new worktree which repository it belongs to and what state it starts in
- **Integrity Validation** — checks that the copied data and metadata are complete and consistent before the worktree is considered usable
- **Worktree Handoff** — returns the finished, ready-to-use worktree directory to whatever part of the codegen pipeline asked for it

### Key Concepts
1. **The .git Directory vs. Linked-Worktree .git File** — `copy_git_dir(source_git, dest_git)` copies source repo's `.git` and returns `Result` with counts of files, dirs, symlinks
2. **Reflink (CoW) Directory Copy as the Standalone Worktree Strategy** — `copy_git_dir` walks source `.git` tree via `collect_work_recursive`, creates each destination directory eagerly, pushes regular files + symlinks into flat `Vec<{source, dest}>` pairs
3. **Skip-List Filtering of Transient & Stale Git State** — `should_skip(name, depth) -> bool` checked for every directory entry during recursive walk; returns `true` for any entry name ending in `.lock`

### Build Steps
1. **Define GitDirCopyError enum for copy failures** — variants: `Io(std::io::Error)`, `InvalidGitDir(String)`, `SymlinkUnsupported(PathBuf)`
2. **Implement is_git_dir path validator** — `is_git_dir(path: &Path) -> bool`; checks path exists, is directory, contains HEAD file plus objects subdirectory
3. **Implement recursive copy_gitdir_contents walker** — `copy_gitdir_contents(src: &Path, dst: &Path) -> Result<(), GitDirCopyError>`; walks src recursively via `std::fs::read_dir`, creates matching directories under dst, copies regular files
4. **Implement public copy_gitdir entry point** — `pub fn copy_gitdir(src: &Path, dst: &Path) -> Result<(), GitDirCopyError>`; calls `is_git_dir(src)`, returns `InvalidGitDir` if false; creates dst with `create_dir_all`; calls `copy_gitdir_contents`
5. **Add unit tests with tempfile fixtures** — use `tempfile` crate to build fake `.git` directory (HEAD file, objects/, refs/); assert copy_gitdir succeeds; assert `InvalidGitDir` on plain empty directory
6. **Wire copy_gitdir into worktree creation call site** — in worktree setup module, call `copy_gitdir(repo_root.join(".git"), new_worktree_path.join(".git"))`; propagate errors

---

## Story 8: Environment & Configuration
**"Setting Up Grok's Execution Environments"**  
Easy-medium · 90 min · 6 concepts

### Mental Model
- **grok_home_paths.rs** — called first by envrc.rs to locate the environment before any configuration is read or written
- **builtin.rs** — consulted by envrc.rs whenever a setting isn't explicitly provided; supplies default configuration values
- **python.rs / rust.rs** — invoked by envrc.rs once the workspace's language/toolchain is known; handle setup details specific to each programming language's environment
- **config_toml_edit.rs** — called after language-specific setup to persist the resulting configuration; writes the finalized settings into the actual config.toml file
- **envrc.rs** — the top-level module that owns and coordinates all the other pieces; orchestrates the whole process end to end

### Key Concepts
1. **GROK_HOME Path Resolution** — checks for explicit `GROK_HOME` env var override; falls back to OS-standard location; returns `PathBuf`
2. **Format-Preserving TOML Config Edits** — editor loads raw TOML text into document model that keeps every comment, blank line, and key ordering; callers navigate to a key path and set a new value
3. **Project-Local Environment Loading (.envrc)** — loader walks upward from cwd looking for the environment file; parses `KEY=VALUE` entries; merges into process environment
4. **Pluggable Language Environment Providers** — each provider implements a common detection interface: `detect(dir: &Path) -> bool` + `generate_envrc(dir: &Path) -> String`

### Build Steps
1. **Implement GrokHomePaths resolver in grok_home_paths.rs** — `struct GrokHomePaths { base_home_dir: PathBuf, config_toml_path: PathBuf, cache_dir: PathBuf }`; `resolve() -> Self` reads GROK_HOME or platform default
2. **Define Config struct and I/O in config_toml_edit.rs** — fields: `default_env: String`, `env_overrides: HashMap`, `last_used_env: Option`; `Config::load(path: &Path) -> Config`; `Config::save(&self, path: &Path)`
3. **Define EnvKind enum and EnvProvider trait** — `enum EnvKind { Python, Rust, Builtin }`; `trait EnvProvider { fn detect(dir: &Path) -> bool; fn generate_envrc(dir: &Path) -> String; }`
4. **Implement Python, Rust, and Builtin providers** — `PythonEnv`: detect checks for `.venv/venv` or `requirements.txt`; `RustEnv`: detect checks for `Cargo.toml`; `BuiltinEnv`: always-true fallback
5. **Wire providers and config together in envrc.rs** — top-level `run()`: resolve GrokHomePaths; load Config; build `Vec<dyn EnvProvider>` in priority order; call `detect()` on each; call `generate_envrc()` on first match; write `.envrc` file; update `Config.last_used_env`

---

## Story 9: Installation & Package Management
**"How Grok Installs and Manages Plugins"**  
Medium · 90 min · 6 concepts

### Mental Model
- **registry.rs (Package Registry Lookup)** — order desk / catalog service — the first thing the install request touches; looks up the requested package name and version against the catalog
- **legacy_0_4_10.rs (Legacy Compatibility Shim)** — legacy desk — invoked by the registry only when an older version is requested; translates requests or definitions written for an old, discontinued version format
- **bundle.rs (Package Bundling)** — packing station — runs after the registry has resolved which package definition to use; collects all the files, assets, and metadata into one packaged unit
- **resize.rs (Asset Resizing/Adaptation)** — finishing shop — operates on the contents of the bundle before it's sealed; adjusts images or other assets so they fit the size and format the target environment expects
- **installer.rs (Installer Execution)** — delivery and assembly crew — the last step, producing the installed package as output

### Key Concepts
1. **Plugin Bundle Format** — deserialized in `bundle.rs` from an archive/directory into a struct holding a manifest (name, semver version, entrypoint, declared capabilities) plus a list of asset paths
2. **Plugin Registry** — `registry.rs` exposes lookups keyed by plugin name; `Registry::get(name) -> Option` and mutation methods `register(bundle_meta)` and `unregister(name)`
3. **Installation Flow** — `installer.rs` takes a validated Bundle and drives: check registry for existing/conflicting version → stage bundle files → resize or process any assets → move staged files into live plugin directory → register the result
4. **Legacy Format Compatibility** — `legacy_0_4_10.rs` provides a conversion path that detects the old format and transforms it into the current `Bundle`/`PluginManifest` shape
5. **Asset Resizing** — `resize.rs` exposes a function that takes source image (bytes or path) and target dimension and returns resized image bytes

### Build Steps
1. **Define PluginRegistry struct and lookup method** — `PluginRegistry { map: HashMap<String, RegistryEntry> }`; `RegistryEntry { name, version, download_url }`; `lookup(&self, name: &str) -> Option<&RegistryEntry>`
2. **Define PluginBundle struct for packaged plugin contents** — `PluginBundle { name: String, version: String, files: Vec<PathBuf>, assets: Vec<PathBuf> }`; `from_archive(path: &Path) -> Result`; derive Debug and Clone
3. **Implement asset resize utility for bundle icons** — `resize_assets(bundle: &mut PluginBundle) -> Result<(), ResizeError>`; iterates `bundle.assets`; for any image file, resizes to standard icon dimensions before overwriting in place
4. **Implement legacy_0_4_10 format converter** — `is_legacy_format(path: &Path) -> bool` detects old 0.4.10 manifest layout; `convert(path: &Path) -> Result<PluginBundle>` translates into current PluginBundle struct
5. **Implement Installer orchestrating registry, bundle, and legacy paths** — `Installer { registry: PluginRegistry }`; `install(&self, name: &str) -> Result`; calls `registry.lookup(name)` → download → `PluginBundle::from_archive` or `legacy_0_4_10::convert` if `is_legacy_format` → `resize_assets` → return

---

## Story 10: Communication & Networking
**"The Hub That Lets Grok Act"**  
Medium-hard · 90 min · 6 concepts

### Mental Model
- **terminal_command.rs** — the client/caller side that initiates a request into the hub; captures and parses what the caller actually wants
- **channel.rs (Hub)** — the hub's central channel dispatcher; acts as the switchboard operator; decides which route a request should take and owns the connection's lifecycle from pickup to hangup
- **wire_round_trip.rs** — the channel's connection-establishment/validation logic; runs the 'can you hear me, over' check — confirms a wired connection can actually send and receive before any real traffic is trusted
- **local_terminal.rs** — the hub's local execution handler; handles requests meant for the same machine directly
- **rest.rs** — the hub's remote/external transport handler; handles requests meant for an outside destination

### Key Concepts
1. **Channel Abstraction** — a channel exposes a small, consistent contract: something you send a message into, and something you receive messages out of, usually asynchronously
2. **Wire Protocol Round-Trip** — a message is serialized on the sending side into a wire format, pushed through the channel as raw bytes, and deserialized back into the original typed message on the receiving side
3. **Local Terminal Command Execution** — a command is packaged as a message and sent down a channel to a local terminal process; that process spawns the actual shell command and streams each chunk back up the same channel
4. **REST Interface** — an HTTP request arrives at a defined route, gets parsed into a typed request object, and is translated internally into a message pushed onto the appropriate hub channel

### Build Steps
1. **Define TerminalCommand and TerminalResponse wire types** — `TerminalCommand { id: String, cmd: String, args: Vec<String> }`; `TerminalResponse { id: String, stdout: String, stderr: String, exit_code: i32 }`; derive Serialize + Deserialize on both
2. **Write round-trip serialize/deserialize test harness** — in `wire_round_trip.rs`, add `fn round_trip(cmd: &TerminalCommand) -> TerminalResponse-shaped test helper`; serializes TerminalCommand to JSON and deserializes back, asserting field equality
3. **Define Channel trait with send method** — `trait Channel { async fn send(&self, cmd: TerminalCommand) -> Result; }`
4. **Implement Channel for local process transport** — in `local_terminal.rs`, implement `Channel` for `LocalTerminal` struct that spawns subprocess via `tokio::process::Command`, writes serialized TerminalCommand to stdin, reads stdout/stderr, constructs TerminalResponse
5. **Implement Channel for REST transport** — in `rest.rs`, implement `Channel` for `RestClient { base_url: String, client: reqwest::Client }`; `send()` POSTs serialized TerminalCommand as JSON to `base_url + '/execute'`; deserializes response body into TerminalResponse
6. **Wire hub dispatch to select Channel implementation** — in hub module, `dispatch(channel: &dyn Channel, cmd: TerminalCommand) -> Result`; constructor picks `LocalTerminal` or `RestClient` based on configuration

---

## Story 11: Security & Trust Architecture
**"Trust Architecture for Autonomous Hooks"**  
Hard · 75 min · 5 concepts

### Mental Model
- **marketplace.rs — Listing Intake** — triggered whenever a new hook is submitted for listing; registers who is offering a hook/skill and what it claims to do
- **evidence.rs — Evidence Collection** — evidence collector, invoked by the trust pipeline before any score is computed; gathers concrete, checkable facts about the submission
- **embedding.rs — Fingerprint Matching** — converts the submission into a comparable signature and checks how similar it is to previously seen safe or malicious code
- **trust.rs — Trust Scoring and Gate** — the final decision authority; combines the evidence and the fingerprint match into one score and decides whether the item is admitted, held for review, or rejected
- **marketplace.rs — Certified Release** — gated strictly on a passing trust decision; once trust.rs approves, the hook is stamped and released onto the marketplace floor

### Key Concepts
1. **Trust Score** — `trust` module exposes a function taking a component identifier and evidence set; returns a normalized score (0.0–1.0) plus categorical verdict (Trusted, Unverified, Rejected)
2. **Evidence Records** — appended, not overwritten; each observation is a discrete, timestamped record tied to a component identifier; consumers read evidence through an aggregation call returning a summarized set
3. **Embedding-Based Similarity** — a component's source or behavior profile is converted into a fixed-length numeric vector via embedding function; compared against a reference set using cosine similarity
4. **Marketplace Vetting** — when a component is submitted, marketplace module calls trust scoring pipeline which itself pulls from evidence and embedding similarity; receives back a verdict; listing is published, held pending, or rejected outright

### Build Steps
1. **Define Evidence struct and EvidenceKind enum** — `Evidence { source: String, kind: EvidenceKind, content: String, collected_at: i64 }`; `EvidenceKind { ExecutionLog, UserFeedback, StaticAnalysis }`; derive Clone, Serialize/Deserialize
2. **Implement EvidenceStore for collection and retrieval** — `EvidenceStore { items: Vec<Evidence> }`; `add(&mut self, evidence: Evidence)`; `for_source(&self, source: &str) -> Vec<&Evidence>`
3. **Define EmbeddingVector type and embed_evidence function** — `EmbeddingVector(Vec<f32>)`; `embed_evidence(evidence: &Evidence) -> EmbeddingVector`; `cosine_similarity(a: &EmbeddingVector, b: &EmbeddingVector) -> f32`
4. **Implement ReputationScore lookup in marketplace.rs** — `ReputationScore { score: f32, sample_size: u32 }`; `lookup_reputation(source: &str) -> ReputationScore`; queries marketplace registry; return default low-confidence score when source unknown
5. **Define TrustScore struct combining similarity and reputation** — `TrustScore { similarity: f32, reputation: ReputationScore, combined: f32 }`; `compute_trust_score(evidence: &Evidence, store: &EvidenceStore) -> TrustScore`; calls `embed_evidence`, `cosine_similarity`, `lookup_reputation`, blends into `combined` via weighted average
6. **Expose is_trusted threshold check for callers** — `is_trusted(score: &TrustScore, threshold: f32) -> bool`; returns true only when `score.combined >= threshold`; export alongside `compute_trust_score`

---

## Story 12: Testing & Concurrency Patterns
**"Testing Concurrency in Grok's Session Layer"**  
Hard · 150 min · 10 concepts

### Mental Model
- **Session Intake / ID Assignment (load_user_prompts, session_id)** — every incoming request gets tagged with a unique session identifier the instant it arrives
- **Reverse Request Channel (reverse_request tests)** — ACP protocol layer inside the session actor; lets the agent side ask the client a clarifying question mid-task
- **Cancellation Handling (blitz_cancel)** — session's control loop / task supervisor; stops an in-flight task immediately and cleanly when a cancel signal arrives, even if the task was in the middle of something
- **Subagent Orphan Reconciliation (subagent_orphan_reconcile)** — detects work left behind when a subagent disappears unexpectedly and reassigns or cleans it up so nothing is silently lost
- **Session Forking (fork_session)** — duplicates an existing conversation's state under a new ID so two independent tracks can continue from the same point without interfering
- **Concurrency Test Harness (the test files themselves)** — runs scripted, repeatable versions of these race-prone scenarios together to prove the system behaves correctly no matter the timing

### Key Concepts
1. **Async Session Test Harness** — spins up a session actor on a `tokio::test` runtime, wires it to an in-memory transport (mpsc channel pair), exposes helper methods to inject inbound requests and assert outputs
2. **Session Cancellation (Blitz Cancel)** — cancellation triggered by sending a cancel signal into the session's command channel; the contract is that cancellation must be observable within one scheduler tick
3. **Session Forking** — takes a `session_id`, produces a new session with a freshly generated `session_id`, deep-copying (or structurally sharing, then copy-on-write) the parent's conversation history, tool state, and configuration up to the fork point
4. **Subagent Orphan Reconciliation** — reconciliation runs as a periodic sweep or event-triggered check; walks the set of active subagent handles, checks each one's claimed parent `session_id` against the live session registry
5. **Concurrent Convergence Testing** — tests typically spawn several concurrent tasks that each send a different event into the same session; use synchronization primitives like barriers or `tokio::join!` to maximize overlapping execution

### Build Steps
1. **Build shared mock session test harness** — test helper module: `session_id` generator, in-memory request/response channel pair, mock agent handle; expose `new_test_session() -> TestSession` constructor
2. **Test reverse-request/session_id correlation** — in `reverse_request_session_id_tests.rs`: assert reverse request carries same `session_id` as originating client request; assert mismatched or missing session_ids are rejected
3. **Write test_fork_session.rs for concurrent forking** — fork a session mid-flight; assert parent and child get distinct `session_id`s, independent state, and in-flight requests on parent are unaffected
4. **Write test_blitz_cancel.rs for rapid cancel races** — fire a burst of cancel requests against an active session including duplicate and out-of-order cancels; assert session transitions to cancelled exactly once, with no panics or double-free of response channel
5. **Write test_subagent_orphan_reconcile.rs** — simulate a subagent whose parent session was cancelled or dropped without cleanup; assert the reconciliation routine detects the orphan and either re-parents or terminates it
6. **Write test_xai_session_update.rs for concurrent updates** — send concurrent session-update messages to the same `session_id`; assert updates apply in order without lost writes; use the harness's mock channel to interleave writes from multiple simulated tasks
