# CLI Contract: `squask sync-reverse`

**Spec**: 009-knowledge-feedback-loop  
**Version**: 1.0.0 (Phase 1 — manual ceremony)

---

## Command Signature

```
squask sync-reverse <spec-dir> [options]
```

**Aliases**: `sqsk sync-reverse`, `squad-speckit-bridge sync-reverse`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `spec-dir` | Yes | Path to the spec directory (e.g., `specs/009-knowledge-feedback-loop`). Resolved relative to CWD. |

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dry-run` | boolean | `false` | Preview output without writing any files. |
| `--cooldown <hours>` | number | `24` | Minimum age (in hours) for learnings to be included. `0` = include all. |
| `--sources <list>` | string | `histories,decisions,skills` | Comma-separated list of source types to include. |
| `--no-constitution` | boolean | `false` | Skip constitution enrichment even for constitution-worthy entries. |
| `--squad-dir <path>` | string | `.squad` | Override Squad directory path. |

### Global Options (inherited)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config <path>` | string | `bridge.config.json` | Path to bridge configuration file. |
| `--json` | boolean | `false` | Output in JSON format. |
| `--quiet` | boolean | `false` | Suppress informational output. |
| `--verbose` | boolean | `false` | Enable verbose/debug output. |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — learnings written (or dry-run preview displayed). |
| `0` | Success — no new learnings found (summary reports zero new entries). |
| `1` | Error — invalid spec directory, missing Squad directory, or write failure. |

## Human Output Format

### Success with new learnings

```
Reverse Sync — Knowledge Feedback Loop

Sources processed:
  ✓ Agent histories: 12 entries from 3 agents
  ✓ Team decisions: 5 entries
  ✓ Skills: 2 entries

Filtering:
  • Deduplicated: 4 (already synced)
  • Cooldown excluded: 2 (newer than 24h)
  • Privacy redacted: 3 items (2 API keys, 1 email)

Results:
  → 13 learnings written to specs/009-knowledge-feedback-loop/learnings.md
  → 2 entries added to .specify/memory/constitution.md
    (classified as spec/plan-level non-negotiables)

Summary: 13 new learnings from 19 total extracted (4 deduped, 2 cooled down)
```

### Success — no new learnings

```
Reverse Sync — Knowledge Feedback Loop

Sources processed:
  ✓ Agent histories: 8 entries from 2 agents
  ✓ Team decisions: 3 entries

No new learnings — all 11 entries already synced in previous runs.
```

### Dry-run output

```
[DRY RUN] Reverse Sync — Knowledge Feedback Loop

Sources processed:
  ✓ Agent histories: 12 entries from 3 agents
  ✓ Team decisions: 5 entries
  ✓ Skills: 2 entries

Would write:
  → 13 learnings to specs/009-knowledge-feedback-loop/learnings.md
  → 2 entries to .specify/memory/constitution.md

Preview of constitution-worthy entries:
  1. "All public APIs must have version negotiation" (from: gilfoyle, decisions)
  2. "Breaking changes require deprecation cycle" (from: team, decisions)

No files were created or modified.
```

### Error — spec directory not found

```
Error [SPEC_DIR_NOT_FOUND]: Spec directory not found: specs/999-nonexistent
  Suggestion: Create the spec directory first, e.g. mkdir -p specs/999-nonexistent/
```

### Error — Squad not found

```
Error [SQUAD_NOT_FOUND]: No Squad installation detected at .squad/
  Suggestion: Initialize Squad first, or use --squad-dir to specify a custom path.
```

## JSON Output Format

### Success

```json
{
  "totalExtracted": 19,
  "deduplicated": 4,
  "cooledDown": 2,
  "fullyRedacted": 0,
  "learningsWritten": 13,
  "constitutionEntriesAdded": 2,
  "sourcesProcessed": [
    { "type": "histories", "count": 12 },
    { "type": "decisions", "count": 5 },
    { "type": "skills", "count": 2 }
  ],
  "outputPath": "specs/009-knowledge-feedback-loop/learnings.md",
  "dryRun": false,
  "redactionSummary": {
    "totalRedactions": 3,
    "types": ["api-key", "email"]
  },
  "summary": "13 new learnings from 19 total extracted (4 deduped, 2 cooled down)"
}
```

### Error

```json
{
  "error": true,
  "code": "SPEC_DIR_NOT_FOUND",
  "message": "Spec directory not found: specs/999-nonexistent",
  "suggestion": "Create the spec directory first, e.g. mkdir -p specs/999-nonexistent/"
}
```

## Example Usage

```bash
# Basic reverse sync after implementation
squask sync-reverse specs/009-knowledge-feedback-loop

# Preview before writing (dry-run)
squask sync-reverse specs/009-knowledge-feedback-loop --dry-run

# Immediate sync, no cooldown (ceremony-driven)
squask sync-reverse specs/009-knowledge-feedback-loop --cooldown 0

# Only sync from decisions (skip histories and skills)
squask sync-reverse specs/009-knowledge-feedback-loop --sources decisions

# Skip constitution update
squask sync-reverse specs/009-knowledge-feedback-loop --no-constitution

# JSON output for scripting
squask sync-reverse specs/009-knowledge-feedback-loop --json

# Full verbose output
squask sync-reverse specs/009-knowledge-feedback-loop --verbose --cooldown 0

# Custom squad directory
squask sync-reverse specs/009-knowledge-feedback-loop --squad-dir /path/to/.squad
```

## Behavioral Notes

1. **Idempotency**: Running the same command twice produces the same `learnings.md`. Second run reports "no new learnings" because fingerprints are persisted.
2. **Append-only for constitution**: Constitution entries are appended, never removed. Deduplication prevents duplicates.
3. **No spec mutation**: `spec.md`, `plan.md`, and `tasks.md` are NEVER modified (FR-005).
4. **Graceful degradation**: Missing/malformed source files produce warnings, not failures (FR-013).
5. **Privacy-first**: All content passes through privacy filter BEFORE any disk write, including dry-run display (FR-007).
