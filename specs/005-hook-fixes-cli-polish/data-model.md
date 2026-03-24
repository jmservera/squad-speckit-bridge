# Data Model: Hook Fixes and CLI Polish (v0.3.1)

**Feature**: 005-hook-fixes-cli-polish  
**Date**: 2026-03-24  
**Status**: Complete

## Overview

This feature is primarily a bug-fix and documentation release. No new entities are introduced. One existing entity (`BridgeConfig`) may receive a minor field addition to support configurable auto-issue creation. All other changes are to shell script templates (Layer 3) and documentation files.

## Existing Entities (Unchanged)

### HookScript

**Location**: `src/types.ts`  
**Layer**: Entity (Layer 0)

| Field | Type | Description |
|-------|------|-------------|
| `hookPoint` | `string` | Lifecycle trigger: `before-specify`, `after-tasks`, `after-implement` |
| `scriptPath` | `string` | Relative path to the hook script file |
| `enabled` | `boolean` | Whether this hook is active |
| `description` | `string` | Human-readable hook description |

**No changes needed**: The entity correctly models hook metadata. The bugs are in the script content and file permissions, not the entity model.

### TaskEntry

**Location**: `src/types.ts`  
**Layer**: Entity (Layer 0)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task identifier (e.g., `T001`) |
| `title` | `string` | Task title |
| `description` | `string` | Full task description |
| `dependencies` | `string[]` | IDs of prerequisite tasks |
| `status` | `string` | Task status: `unchecked`, `done` |

**No changes needed**: The issues command already consumes this entity.

### IssueRecord

**Location**: `src/types.ts`  
**Layer**: Entity (Layer 0)

| Field | Type | Description |
|-------|------|-------------|
| `issueNumber` | `number` | GitHub issue number |
| `title` | `string` | Issue title |
| `body` | `string` | Issue body (markdown) |
| `labels` | `string[]` | Applied labels |
| `taskId` | `string` | Source task ID for traceability |
| `url` | `string` | GitHub issue URL |
| `createdAt` | `string` | ISO 8601 creation timestamp |

**No changes needed**: Already used by the `issues` command that the hook will invoke.

### DeploymentFile

**Location**: `src/types.ts`  
**Layer**: Entity (Layer 0)

| Field | Type | Description |
|-------|------|-------------|
| `targetPath` | `string` | Relative path for deployment |
| `content` | `string` | File content to write |

**No changes needed**: Used by `deployExecutable()` which already handles chmod.

## Modified Entity

### BridgeConfig (Minor Addition)

**Location**: `src/types.ts`  
**Layer**: Entity (Layer 0)

Current `hooks` section:

```typescript
hooks: {
  afterTasks: boolean;     // Whether after-tasks hook is deployed
  beforeSpecify: boolean;  // Whether before-specify hook is deployed
  afterImplement: boolean; // Whether after-implement hook is deployed
}
```

**Proposed addition** to support FR-008 (configurable auto-issue creation):

```typescript
hooks: {
  afterTasks: boolean;
  beforeSpecify: boolean;
  afterImplement: boolean;
  autoCreateIssues: boolean;  // NEW: Whether after-tasks auto-creates issues (default: true)
}
```

**Rationale**: The spec requires that "when the bridge configuration disables automatic issue creation, the after-tasks hook MUST respect that setting" (FR-008). This flag controls whether the hook invokes `squask issues` or skips it.

**Default**: `true` — The spec states "the after-tasks hook should invoke issue creation by default" (Assumptions).

**Validation**: Boolean field, no additional validation needed beyond what `isValidConfig()` already provides.

**Impact analysis**:
- `src/types.ts` — Add field to `BridgeConfig` type, update `createDefaultConfig()`, update `isValidConfig()`
- `src/install/adapters/config-loader.ts` — No changes (loads whatever fields exist in JSON)
- Hook templates — Read this field at runtime via inline Node.js expression (existing pattern)

## Relationships

```text
BridgeConfig.hooks.afterTasks ──controls──▶ Hook deployment (installer)
BridgeConfig.hooks.autoCreateIssues ──controls──▶ Issue creation at runtime (hook script)
HookScript.hookPoint ──maps-to──▶ Shell script in templates/hooks/
DeploymentFile ──consumed-by──▶ FileSystemDeployer.deployExecutable()
TaskEntry ──consumed-by──▶ createIssuesFromTasks() ──produces──▶ IssueRecord
```

## State Transitions

### Hook Execution Flow (after-tasks)

```
HOOK_TRIGGERED
  │
  ├── npx not available ──▶ WARN_AND_EXIT(0)
  │
  ├── SPECKIT_SPEC_DIR not set ──▶ WARN_AND_EXIT(0)
  │
  ├── hook disabled in config ──▶ SILENT_EXIT(0)
  │
  ├── tasks.md not found ──▶ WARN_AND_EXIT(0)
  │
  ├── autoCreateIssues = false ──▶ SKIP_ISSUES, EXIT(0)
  │
  ├── autoCreateIssues = true
  │     │
  │     ├── issues created successfully ──▶ CONFIRM_AND_EXIT(0)
  │     │
  │     └── issues creation failed ──▶ WARN_AND_EXIT(0)
  │
  └── unexpected error ──▶ WARN_AND_EXIT(0)
```

All exit paths return `exit 0` to never block the SpecKit pipeline (FR-005).
