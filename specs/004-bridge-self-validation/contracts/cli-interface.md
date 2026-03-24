# CLI Interface Contract: squad-speckit-bridge

**Feature**: 004-bridge-self-validation | **Version**: 0.3.0 (target)

## Global Options

All commands support these global flags:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--config <path>` | `string` | `bridge.config.json` in project root | Path to bridge configuration file |
| `--json` | `boolean` | `false` | Output in JSON format (structured, machine-readable) |
| `--quiet` | `boolean` | `false` | Suppress informational output |
| `--verbose` | `boolean` | `false` | Enable verbose diagnostic output |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (see structured error in output) |

## Error Codes

All errors emit structured output matching this schema:

```typescript
interface StructuredError {
  error: true;
  code: ErrorCode;
  message: string;
  suggestion: string;
}
```

| Error Code | Trigger | Suggestion |
|------------|---------|------------|
| `SQUAD_NOT_FOUND` | `.squad/` directory missing | Initialize Squad first |
| `SPECKIT_NOT_FOUND` | `.specify/` directory missing | Initialize Spec Kit first |
| `SPEC_DIR_NOT_FOUND` | Specified spec directory missing | Create the spec directory |
| `TASKS_NOT_FOUND` | tasks.md file not found | Check path to tasks.md |
| `PERMISSION_DENIED` | Write permission denied | Check file permissions |
| `CONFIG_INVALID` | Configuration validation failure | Validate bridge.config.json |
| `PARSE_ERROR` | Malformed markdown/YAML | Check file syntax |
| `GITHUB_AUTH_FAILED` | GitHub auth not configured | Run `gh auth login` |
| `ISSUE_CREATE_FAILED` | Issue creation API failure | Check repo permissions |
| `SYNC_FAILED` | Learning sync write failure | Check Squad directory permissions |

---

## Commands

### `sqsk context <spec-dir>`

**Purpose**: Generate `squad-context.md` from Squad memory for SpecKit planning.

**Arguments**:
| Arg | Required | Description |
|-----|----------|-------------|
| `spec-dir` | Yes | Target spec directory (e.g., `specs/004-bridge-self-validation/`) |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--max-size <bytes>` | `number` | `8192` | Maximum output size in bytes |
| `--sources <list>` | `string` | `skills,decisions,histories` | Comma-separated sources to include |
| `--squad-dir <path>` | `string` | `.squad` | Override Squad directory path |

**Human Output** (exit 0):
```
✅ Squad context generated: specs/004-bridge-self-validation/squad-context.md
   Sources: 2 skills, 19 decisions, 7 agent histories
   Size: 6,421 / 8,192 bytes (78%)
   Cycle: #2 (previous: 2025-07-16T10:30:00Z)
```

**JSON Output** (exit 0):
```json
{
  "metadata": {
    "generated": "2025-07-17T14:00:00Z",
    "cycleCount": 2,
    "sources": { "skills": 2, "decisions": 19, "histories": 7, "skipped": [] },
    "sizeBytes": 6421,
    "maxBytes": 8192
  },
  "outputPath": "specs/004-bridge-self-validation/squad-context.md"
}
```

**Behavior**:
- Reads `.squad/skills/*/SKILL.md`, `.squad/decisions.md`, `.squad/agents/*/history.md`
- Handles missing/partial `.squad/` structures: produces valid output with available data + warnings
- If `squad-context.md` already exists, reads its metadata for cycle count, then overwrites
- Empty/missing `.squad/` → generates minimal file with warning

---

### `sqsk issues <tasks-file>`

**Purpose**: Create GitHub issues from unchecked tasks in a tasks.md file.

**Arguments**:
| Arg | Required | Description |
|-----|----------|-------------|
| `tasks-file` | Yes | Path to tasks.md file |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | `boolean` | `false` | Preview issues without creating them |
| `--labels <labels>` | `string` | `squad,speckit` | Comma-separated labels to apply |
| `--repo <owner/repo>` | `string` | Auto-detect | GitHub repository (owner/repo format) |

**Human Output — Dry Run** (exit 0):
```
🔍 DRY RUN — Issues that would be created:

  1. [T001] Define DistributionAnalysis entity types
     Labels: squad, speckit, area/bridge, type/feature
  2. [T002] Implement analyzeDistribution pure function
     Labels: squad, speckit, area/bridge, type/feature
  ...

Summary: 18 issues would be created (2 already exist, skipped)
```

**Human Output — Create** (exit 0):
```
✅ Created 18 GitHub issues:

  #142 [T001] Define DistributionAnalysis entity types
  #143 [T002] Implement analyzeDistribution pure function
  ...

Summary: 18 created, 2 skipped (duplicates), 0 failed
```

**JSON Output** (exit 0):
```json
{
  "created": [
    { "issueNumber": 142, "title": "T001: Define DistributionAnalysis entity types", "taskId": "T001", "url": "https://...", "labels": ["squad", "speckit"] }
  ],
  "skipped": [{ "id": "T019", "title": "...", "reason": "duplicate" }],
  "dryRun": false,
  "total": 20
}
```

**Behavior**:
- Parses tasks.md for unchecked tasks (status ≠ "done")
- **Deduplication**: queries existing issues via `gh issue list --label <labels> --json title`, skips tasks whose titles match existing issues
- **Batch handling**: creates issues sequentially with 200ms delay between calls
- **Label taxonomy**: accepts hierarchical labels (e.g., `area/bridge`, `type/feature`, `agent/dinesh`)
- **Label creation**: warns if labels don't exist in repo (does not auto-create)

---

### `sqsk sync <spec-dir>`

**Purpose**: Capture implementation learnings and feed them back into Squad memory.

**Arguments**:
| Arg | Required | Description |
|-----|----------|-------------|
| `spec-dir` | Yes | Spec directory with execution results |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | `boolean` | `false` | Preview sync without writing |

**Human Output** (exit 0):
```
✅ Synced 3 learnings to Squad memory:

  1. bridge/context-generation-patterns → .squad/agents/bridge/history.md
  2. bridge/issue-batch-rate-limiting → .squad/agents/bridge/history.md
  3. bridge/clean-arch-adapter-testing → .squad/agents/bridge/history.md

Sync #4 complete. Total learnings synced: 12
```

**JSON Output** (exit 0):
```json
{
  "record": {
    "syncTimestamp": "2025-07-17T14:30:00Z",
    "learningsUpdated": 3,
    "filesWritten": [".squad/agents/bridge/history.md"],
    "summary": "Synced 3 learning(s) from specs/004-bridge-self-validation/"
  },
  "dryRun": false
}
```

**Behavior**:
- Reads spec directory for execution results and agent history entries since last sync
- Writes learning entries to `.squad/agents/` via `SquadMemoryWriter` port
- Idempotent: uses `SyncState.lastSyncTimestamp` to skip already-synced entries
- No new entries → exits cleanly with informational message

---

### `sqsk review <tasks-file>`

**Purpose**: Generate a design review comparing spec requirements against implementation.

**Arguments**:
| Arg | Required | Description |
|-----|----------|-------------|
| `tasks-file` | Yes | Path to tasks.md file (or spec.md for implementation review) |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--output <path>` | `string` | `<spec-dir>/review.md` | Where to write the review |
| `--squad-dir <path>` | `string` | `.squad` | Override Squad directory path |
| `--notify` | `boolean` | `false` | Output brief notification only |
| `--mode <mode>` | `string` | `design` | Review mode: `design` (pre-impl) or `fidelity` (post-impl) |

**Human Output — Design Review** (exit 0):
```
📋 Design Review: specs/004-bridge-self-validation/tasks.md

  Findings: 0 high, 2 medium, 3 low
  Status: changes_requested

  ⚠️  [MEDIUM] Task "T005" may conflict with decision "Clean Architecture for Bridge"
  ⚠️  [MEDIUM] Task "T012" may conflict with decision "Memory Bridge Architecture"
  ℹ️  [LOW] Task "T003" touches area with documented learnings from Dinesh
  ...

  Written to: specs/004-bridge-self-validation/review.md
```

**Human Output — Fidelity Review** (exit 0):
```
📋 Implementation Fidelity Review: specs/004-bridge-self-validation/

  Requirements: 28 total, 24 covered (86%), 4 gaps

  ✅ FR-001: sqsk context generates squad-context.md → src/bridge/context.ts
  ✅ FR-002: squad-context.md includes structured sections → src/bridge/summarizer.ts
  ❌ FR-021: Distribution imbalance detection → NO IMPLEMENTATION FOUND
  ❌ FR-025: Context window limit for skills → NO IMPLEMENTATION FOUND
  ...
```

**Behavior**:
- `design` mode: existing behavior — cross-references tasks against decisions/learnings
- `fidelity` mode (new): parses `spec.md` for FR-XXX requirements, scans `src/` for evidence
- No implementation exists → reports absence without error (exit 0)
- `--notify` mode: lightweight notification suggesting full review

---

### `sqsk install`

**Purpose**: Deploy bridge components to Squad and Spec Kit directories. *(Existing, unchanged)*

### `sqsk status`

**Purpose**: Show current bridge installation and integration status. *(Existing, unchanged)*

### `sqsk demo`

**Purpose**: Run E2E demo of the pipeline. *(Existing, unchanged)*
