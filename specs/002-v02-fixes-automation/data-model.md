# Data Model: Squad-SpecKit Bridge v0.2.0

**Phase**: 1 — Design & Contracts
**Date**: 2025-07-25
**Extends**: v0.1.0 data model (`specs/001-squad-speckit-bridge/data-model.md`)

## New Entities

### 1. IssueRecord

A GitHub issue created from a task entry. Produced by the `CreateIssuesFromTasks` use case.

| Field | Type | Description |
|-------|------|-------------|
| `issueNumber` | number | GitHub issue number (assigned after creation) |
| `title` | string | Issue title (from task title) |
| `body` | string | Issue body (from task description + dependency references) |
| `labels` | string[] | Applied labels (auto-generated phase label + user-specified) |
| `dependencyRefs` | string[] | GitHub issue cross-references (`#N` notation) |
| `sourceTaskId` | string | Original task ID from tasks.md (e.g., "T001") |
| `createdAt` | ISO 8601 timestamp | When the issue was created |
| `url` | string | GitHub URL for the created issue |

**Validation Rules**:
- `sourceTaskId` must match pattern `T\d{3}` (e.g., T001, T042)
- `labels` must not be empty (at minimum, the auto-generated phase label)
- `issueNumber` is 0 until the issue is actually created (dry-run mode)

---

### 2. TaskEntry

A parsed task from tasks.md. Input to the `CreateIssuesFromTasks` use case.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Task ID (e.g., "T001") |
| `title` | string | Task description text |
| `isParallelizable` | boolean | Has `[P]` marker |
| `storyLabel` | string \| null | Story label (e.g., "US1") or null for setup/foundational/polish |
| `phase` | string | Phase name the task belongs to |
| `dependencies` | string[] | Task IDs this task depends on |
| `filePath` | string \| null | File path mentioned in the task description |
| `isComplete` | boolean | Checkbox is checked (`[x]`) |

**Validation Rules**:
- `id` must be unique within the tasks.md
- `dependencies` must reference existing task IDs (circular dependencies are an error)

---

### 3. SyncRecord

A snapshot of what changed in Squad memory since the last sync.

| Field | Type | Description |
|-------|------|-------------|
| `syncTimestamp` | ISO 8601 timestamp | When this sync was performed |
| `previousSyncTimestamp` | ISO 8601 timestamp \| null | When the last sync was performed (null = first sync) |
| `newDecisionsCount` | number | Number of new decisions detected |
| `newLearningsCount` | number | Number of new learning entries detected |
| `affectedAgentIds` | string[] | Agent names whose histories changed |
| `syncStatus` | `"success"` \| `"partial"` \| `"failed"` | Outcome of the sync |
| `changes` | SyncChange[] | Detailed list of detected changes |

**SyncChange**:

| Field | Type | Description |
|-------|------|-------------|
| `file` | string | Relative path to the changed file |
| `changeType` | `"added"` \| `"modified"` | Type of change |
| `summary` | string | Brief description of what changed |

**Validation Rules**:
- `syncStatus` is `"partial"` when some files couldn't be read (locked, permissions)
- `syncStatus` is `"failed"` when no files could be processed

---

### 4. SyncState

Persisted state tracking sync history. Stored as `.bridge-sync-state.json`.

| Field | Type | Description |
|-------|------|-------------|
| `lastSyncTimestamp` | ISO 8601 timestamp | When the last successful sync occurred |
| `fileHashes` | Record<string, string> | Map of file path → content hash at last sync |
| `version` | string | Bridge version that performed the sync |

---

### 5. HookScript

A deployed automation script tied to a Spec Kit lifecycle event.

| Field | Type | Description |
|-------|------|-------------|
| `hookPoint` | `"before_specify"` \| `"after_tasks"` \| `"after_implement"` | Spec Kit lifecycle event |
| `scriptPath` | string | Absolute path to the deployed script |
| `isExecutable` | boolean | Whether the script has executable permissions |
| `enabled` | boolean | Whether the hook is active in extension.yml |
| `supported` | boolean | Whether the hook point is supported by the installed Spec Kit version |

**Validation Rules**:
- `scriptPath` must point to an existing file after deployment
- `isExecutable` must be true for the hook to function

---

## Updated Entities (from v0.1.0)

### ApprovalStatus (FIXED)

**v0.1.0**: `"approved" | "changes_requested" | "blocked"`
**v0.2.0**: `"pending" | "approved" | "changes_requested"`

Changes:
- **Added** `pending` as the initial state (review record created but not yet evaluated)
- **Removed** `blocked` (blocking is a workflow/scheduling concern, not a review outcome)

Valid state transitions:
```
pending → approved
pending → changes_requested
```

### InstallManifest (EXTENDED)

New fields added to track hook deployment:

| Field | Type | Description |
|-------|------|-------------|
| `components.hookScripts` | boolean | Whether hook scripts were deployed |
| `hooks` | HookScript[] | List of deployed hook scripts with their status |

### BridgeConfig (EXTENDED)

New fields for sync and issues configuration:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sync.enabled` | boolean | true | Enable sync state tracking |
| `sync.stateFile` | string | ".bridge-sync-state.json" | Path to sync state file |
| `issues.defaultLabels` | string[] | [] | Labels applied to all created issues |
| `issues.phaseLabels` | boolean | true | Auto-generate phase labels |
| `hooks.beforeSpecify` | boolean | true | Enable before_specify hook |
| `hooks.afterImplement` | boolean | true | Enable after_implement hook |

---

## Entity Relationships

```text
BridgeConfig ──controls──▶ ContextSummary generation (unchanged)
             ──controls──▶ SyncLearnings behavior (NEW)
             ──controls──▶ Issue creation defaults (NEW)

TaskEntry[] ──parsed from──▶ tasks.md
            ──input to──▶ CreateIssuesFromTasks
            ──produces──▶ IssueRecord[]

SyncState ──tracks──▶ last sync point
          ──enables──▶ SyncLearnings change detection
          ──produces──▶ SyncRecord

HookScript[] ──deployed by──▶ InstallBridge + DeployHooks
             ──referenced in──▶ extension.yml manifest
             ──invokes──▶ bridge CLI commands (context, sync)

IssueRecord[] ──references──▶ IssueRecord[] (dependency cross-refs)
              ──source──▶ TaskEntry (1:1 mapping)
```

## State Transitions

### Issue Creation Lifecycle

```
[tasks.md exists] ──issues command──▶ [parsing]
[parsing]         ──valid tasks───▶ [creating] (API calls)
[parsing]         ──malformed────▶ [skipped with warning]
[creating]        ──success──────▶ [created] (IssueRecord with number)
[creating]        ──dry-run──────▶ [previewed] (IssueRecord with number=0)
[created]         ──2nd pass─────▶ [cross-referenced] (dependency refs updated)
```

### Sync Lifecycle

```
[no sync state]   ──sync──▶ [initial sync] (all current state captured)
[sync state exists] ──sync──▶ [diff computed] → [sync record produced]
[diff computed]    ──no changes──▶ [no-op] ("No new learnings to sync")
[sync record]     ──context──▶ [consumed in next planning cycle]
```

### Hook Deployment Lifecycle

```
[template exists]  ──install──▶ [deployed] (copied + chmod +x)
[deployed]        ──re-install──▶ [verified] (exists + permissions checked)
[missing]         ──re-install──▶ [deployed] (newly added, summary updated)
[permission fail] ──install──▶ [warning] (remediation command shown)
```
