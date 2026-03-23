# CLI Interface Contract: Squad-SpecKit Bridge v0.2.0

**Phase**: 1 — Design & Contracts
**Date**: 2025-07-25
**Extends**: v0.1.0 CLI contract (`specs/001-squad-speckit-bridge/contracts/cli-interface.md`)

## Command: `squad-speckit-bridge`

**Executable**: `squad-speckit-bridge` (or `npx squad-speckit-bridge`)

### Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--config <path>` | string | `./bridge.config.json` | Path to bridge configuration file |
| `--json` | boolean | false | Output in JSON format (machine-readable) |
| `--quiet` | boolean | false | Suppress informational output, only show errors/warnings |
| `--verbose` | boolean | false | **(NEW v0.2.0)** Emit diagnostic output to stderr: files processed, skip reasons, byte counts, timing |
| `--version` | boolean | — | Print version and exit |
| `--help` | boolean | — | Print help and exit |

> **v0.2.0 change**: Added `--verbose` global flag (FR-020). Diagnostic output goes to stderr so stdout remains clean for piping/parsing.

---

## Subcommand: `install` (EXTENDED)

Deploy bridge components to Squad and Spec Kit directories. **Extended in v0.2.0** to deploy hook scripts and validate extension manifest.

```bash
squad-speckit-bridge install [options]
```

### Options (unchanged from v0.1.0)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--squad-dir <path>` | string | `.squad` | Override Squad directory path |
| `--specify-dir <path>` | string | `.specify` | Override Spec Kit directory path |
| `--force` | boolean | false | Overwrite existing bridge files without confirmation |

### Extended Behavior (v0.2.0)

1. All v0.1.0 installation steps (unchanged)
2. **(NEW)** Deploy hook scripts to `.specify/extensions/squad-speckit-bridge/hooks/`:
   - `after-tasks.sh` — triggers clarify pass + Design Review notification
   - `before-specify.sh` — auto-runs context command (if hook point supported)
   - `after-implement.sh` — auto-runs sync command
3. **(NEW)** Set executable permissions (`chmod +x`) on all deployed hook scripts
4. **(NEW)** Validate that all hooks referenced in `extension.yml` have corresponding scripts on disk
5. **(NEW)** Detect unsupported hook points and warn with manual workaround
6. **(NEW)** On re-installation, detect and deploy missing hook scripts with summary of additions

### Extended Output (v0.2.0)

**Human-readable** (default):
```
Squad-SpecKit Bridge v0.2.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/skills/speckit-bridge/ceremony.md
  ✓ Spec Kit extension: .specify/extensions/squad-speckit-bridge/extension.yml
  ✓ Hook: .specify/extensions/squad-speckit-bridge/hooks/after-tasks.sh
  ✓ Hook: .specify/extensions/squad-speckit-bridge/hooks/after-implement.sh
  ⚠ Hook: before-specify — hook point not supported by Spec Kit (manual workaround: run `squad-speckit-bridge context` before `speckit specify`)
  ✓ Manifest: .bridge-manifest.json

Installation complete. 6 files created. 1 hook skipped (unsupported).
```

### Exit Codes (unchanged)

| Code | Meaning |
|------|---------|
| 0 | Success (full or partial installation) |
| 1 | Fatal error (filesystem permissions, invalid config) |

---

## Subcommand: `context` (UNCHANGED)

Generate Squad context summary for Spec Kit planning. No v0.2.0 changes.

```bash
squad-speckit-bridge context [options]
```

---

## Subcommand: `review` (EXTENDED)

Run Design Review ceremony. **Extended in v0.2.0** with `--notify` flag.

```bash
squad-speckit-bridge review <tasks-file> [options]
```

### New Options (v0.2.0)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--notify` | boolean | false | **(NEW v0.2.0)** Emit notification on review completion (FR-021) |

### Notify Behavior

When `--notify` is used:
- On `approved`: notification with "✓ Design Review passed for {tasks-file}"
- On `changes_requested`: notification with "✗ Design Review found {N} issues for {tasks-file}"
- If no notification adapter is configured: warning to stderr, proceed without notification

---

## Subcommand: `status` (EXTENDED)

Check bridge installation status. **Extended in v0.2.0** with constitution detection.

```bash
squad-speckit-bridge status [options]
```

### Extended Behavior (v0.2.0)

1. All v0.1.0 status checks (unchanged)
2. **(NEW)** Detect uncustomized constitution (FR-024):
   - Scan `.specify/memory/constitution.md` for placeholder markers: `[PLACEHOLDER]`, `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`
   - If found: emit warning with remediation guidance
3. **(NEW)** Report deployed hook scripts and their status (enabled/disabled/unsupported)

### Extended Output (v0.2.0)

**Human-readable** (default, with constitution warning):
```
Squad-SpecKit Bridge v0.2.0 — Status

Frameworks:
  ✓ Squad: .squad/
  ✓ Spec Kit: .specify/

Components:
  ✓ Squad skill: installed
  ✓ Spec Kit extension: installed
  ✓ Ceremony definition: installed

Hooks:
  ✓ after_tasks: enabled
  ✓ after_implement: enabled
  ⚠ before_specify: unsupported (manual workaround available)

Constitution: ⚠ uncustomized
  Warning: Spec Kit constitution contains placeholder markers.
  Planning quality may be reduced. Run /speckit.constitution to customize.

Sync: last sync 2025-07-25T10:30:00Z (2 hours ago)
```

---

## Subcommand: `issues` (NEW v0.2.0)

Create GitHub issues from an approved tasks.md file.

```bash
squad-speckit-bridge issues <tasks-file> [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<tasks-file>` | string | Yes | Path to the tasks.md file to create issues from |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | false | Preview issues without creating them |
| `--labels <labels>` | string | "" | Comma-separated custom labels to apply to all issues |
| `--repo <owner/repo>` | string | (auto-detected) | GitHub repository (auto-detected from git remote) |

### Behavior

1. Parse `<tasks-file>` using the Spec Kit checklist format (`- [ ] [TaskID] [P?] [Story?] Description`)
2. Validate all task entries; skip malformed entries with a warning (FR-010)
3. Detect circular dependency chains; report as error if found
4. **Pass 1**: Create all issues (collecting GitHub-assigned issue numbers)
5. **Pass 2**: Update issue bodies with dependency cross-references (`#N` notation)
6. Apply labels: auto-generated phase label + user-specified `--labels`

### Output

**Human-readable** (default):
```
Creating issues from specs/002-v02-fixes-automation/tasks.md...

  ✓ T001 → #42 "Create project structure per implementation plan"
  ✓ T002 → #43 "Define entity types in src/types.ts" [P]
  ✓ T003 → #44 "Define port interfaces in src/bridge/ports.ts" [P]
  ⚠ Skipped: Line 45 — malformed task entry (missing task ID)
  ...
  ✓ T046 → #87 "End-to-end pipeline test" (depends on: #85, #86)

Created 45 issues. 1 skipped. Dependencies cross-referenced.
```

**JSON** (`--json`):
```json
{
  "created": [
    {
      "taskId": "T001",
      "issueNumber": 42,
      "title": "Create project structure per implementation plan",
      "url": "https://github.com/owner/repo/issues/42",
      "labels": ["phase-1-setup", "bridge", "v0.2"],
      "dependencies": []
    }
  ],
  "skipped": [
    {
      "line": 45,
      "reason": "Missing task ID"
    }
  ],
  "summary": {
    "total": 46,
    "created": 45,
    "skipped": 1
  }
}
```

**Dry-run** (`--dry-run`):
```
DRY RUN — No issues will be created.

  T001 → [phase-1-setup] "Create project structure per implementation plan"
  T002 → [phase-2-foundational, P] "Define entity types in src/types.ts"
  ...

Would create 45 issues with 12 dependency cross-references.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (all valid tasks created or previewed) |
| 1 | Fatal error (no GitHub auth, no tasks file, circular dependencies) |
| 2 | Partial success (some tasks skipped due to malformation) |

### Authentication

The `issues` command requires GitHub authentication. Supported methods (in priority order):
1. `GITHUB_TOKEN` environment variable
2. `gh auth token` (GitHub CLI)
3. Fail with error: "GitHub authentication required. Set GITHUB_TOKEN or run `gh auth login`."

---

## Subcommand: `sync` (NEW v0.2.0)

Capture execution learnings from Squad memory for the knowledge flywheel.

```bash
squad-speckit-bridge sync [options]
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | false | Show what would be synced without modifying files |
| `--squad-dir <path>` | string | `.squad` | Override Squad directory path |

### Behavior

1. Load sync state from `.bridge-sync-state.json` (or initialize if first sync)
2. Scan Squad memory files (decisions.md, agent histories) for changes since last sync
3. Compare current content hashes against last sync state
4. Produce a `SyncRecord` summarizing changes
5. Update `.bridge-sync-state.json` with new sync point

### Output

**Human-readable** (default):
```
Syncing Squad memory...

  Changes since last sync (2025-07-25T08:00:00Z):
    ✓ decisions.md: 2 new decisions
    ✓ agents/richard/history.md: 3 new learnings
    ✓ agents/dinesh/history.md: 1 new learning
    — agents/gilfoyle/history.md: no changes
    — agents/jared/history.md: no changes

  Sync complete. 2 decisions, 4 learnings captured.
  Next `context` command will include these in the planning summary.
```

**No changes**:
```
No new learnings to sync. Last sync: 2025-07-25T08:00:00Z.
```

**JSON** (`--json`):
```json
{
  "syncTimestamp": "2025-07-25T10:30:00Z",
  "previousSyncTimestamp": "2025-07-25T08:00:00Z",
  "newDecisionsCount": 2,
  "newLearningsCount": 4,
  "affectedAgentIds": ["richard", "dinesh"],
  "syncStatus": "success",
  "changes": [
    {
      "file": ".squad/decisions.md",
      "changeType": "modified",
      "summary": "2 new decisions added"
    }
  ]
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (sync complete or no changes) |
| 1 | Fatal error (Squad directory not found, file permissions) |
| 2 | Partial sync (some files locked or unreadable) |
