# Research: Squad-SpecKit Bridge v0.2.0

**Phase**: 0 — Outline & Research
**Date**: 2025-07-25

## Research Tasks

### 1. Hook Deployment Failure Root Cause

**Question**: Why does the v0.1.0 installer fail to deploy hook scripts?

**Decision**: The installer's `FileDeployer` adapter copies template files for SKILL.md, ceremony.md, and extension.yml but never calls a hook deployment step. The `after-tasks.sh` hook script exists in `src/install/templates/` but the installer only processes manifest-level files, not hook scripts.

**Rationale**: The v0.1.0 `InstallBridge` use case has a fixed list of deployable components. Hook scripts were added to the template directory but never registered as deployable artifacts. The fix requires extending the use case to include a hook deployment step and adding a `HookScriptDeployer` adapter.

**Alternatives Considered**:
- Inline hook deployment in existing `TemplateRenderer` adapter — rejected because it mixes concerns (template rendering vs. script deployment with permissions)
- Post-install script that copies hooks separately — rejected because it fragments the installation flow

---

### 2. Spec Kit Extension Schema Compatibility

**Question**: What is Spec Kit's actual extension manifest schema?

**Decision**: Spec Kit extensions use an `extension.yml` manifest in `.specify/extensions/{ext-id}/`. The schema requires: `name`, `version`, `description`, `hooks` (map of lifecycle event → script path), and optionally `commands` (map of command name → handler). Hook registration format is `{event}: {script_path}` with environment variables passed as `env:` block.

**Rationale**: The v0.1.0 extension.yml was generated from assumptions rather than verified against Spec Kit's actual discovery code. The manifest format is straightforward but field names and hook registration syntax must match exactly for Spec Kit to discover the extension.

**Alternatives Considered**:
- Programmatic validation against Spec Kit's schema at install time — deferred to v0.3.0 (requires Spec Kit to expose its schema)
- Static JSON Schema for validation — reasonable but Spec Kit doesn't publish one yet

---

### 3. GitHub Issue Creation via @octokit/rest

**Question**: Best approach for creating GitHub issues from tasks.md?

**Decision**: Use @octokit/rest with repository context from `git remote` parsing. Authentication via `GITHUB_TOKEN` environment variable or `gh auth token` fallback. Dependency resolution requires two-pass creation: first pass creates all issues (collecting issue numbers), second pass updates issue bodies with cross-references.

**Rationale**: Two-pass creation is necessary because GitHub issue numbers are assigned server-side. You can't reference `#42` in issue `#41`'s body until both exist. The alternative (creating issues sequentially and back-patching) requires N additional API calls for N dependent issues.

**Alternatives Considered**:
- GitHub CLI (`gh issue create`) — simpler but no programmatic control over cross-references; harder to batch
- GraphQL API — more efficient batching but higher complexity for a CLI tool
- Single-pass with placeholder references — user-hostile (issues reference "TBD" instead of real numbers)

---

### 4. Sync State Tracking

**Question**: How to track what's changed in Squad memory since last sync?

**Decision**: Persist a `.bridge-sync-state.json` at repo root with `lastSyncTimestamp` and per-file modification hashes. The sync command compares current file modification times and content hashes against the last sync state to identify new decisions, learnings, and skill updates.

**Rationale**: File modification times alone are unreliable across git operations (clone, checkout, rebase change mtimes). Content hashing (MD5 of file contents) provides reliable change detection. The sync state file is small (<1KB) and can be gitignored or tracked depending on team preference.

**Alternatives Considered**:
- Git log-based detection (compare commits since last sync tag) — more precise but requires git history access and doesn't detect manual file edits
- Timestamp-only tracking — unreliable across git operations
- Full-file snapshots — storage-heavy for large decision/history files

---

### 5. Unsupported Hook Points

**Question**: How to handle `before_specify` hook when Spec Kit may not support it?

**Decision**: The installer checks for hook point support by examining Spec Kit's extension schema documentation or version. If a hook point is unsupported, the installer skips it with a warning message: "Hook point '{point}' not supported by installed Spec Kit version. Manual workaround: run `squad-speckit-bridge context` before `speckit specify`."

**Rationale**: Graceful degradation is critical. The user should never see a silent failure or cryptic error. The warning provides both the diagnosis and the workaround in one message.

**Alternatives Considered**:
- Fail installation entirely if any hook is unsupported — too aggressive; partial automation is better than none
- Silently skip unsupported hooks — violates the principle of least surprise; user expects hooks to work
