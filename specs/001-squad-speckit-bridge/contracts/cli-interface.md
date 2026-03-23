# CLI Interface Contract: Squad-SpecKit Bridge

**Phase**: 1 — Design & Contracts
**Date**: 2025-07-24

## Command: `squad-speckit-bridge`

**Executable**: `squad-speckit-bridge` (or `npx squad-speckit-bridge`)

### Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--config <path>` | string | `./bridge.config.json` | Path to bridge configuration file |
| `--json` | boolean | false | Output in JSON format (machine-readable) |
| `--quiet` | boolean | false | Suppress informational output, only show errors/warnings |
| `--version` | boolean | — | Print version and exit |
| `--help` | boolean | — | Print help and exit |

---

## Subcommand: `install`

Deploy bridge components to Squad and Spec Kit directories.

```bash
squad-speckit-bridge install [options]
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--squad-dir <path>` | string | `.squad` | Override Squad directory path |
| `--specify-dir <path>` | string | `.specify` | Override Spec Kit directory path |
| `--force` | boolean | false | Overwrite existing bridge files without confirmation |

### Behavior

1. Detect frameworks present in the repository
2. Install applicable components:
   - **Squad detected**: Copy `SKILL.md` → `.squad/skills/speckit-bridge/SKILL.md`, add ceremony definition
   - **Spec Kit detected**: Register extension in `.specify/extensions/squad-bridge/`, create `extension.yml`
3. Create `.bridge-manifest.json` at repo root
4. Print installation summary

### Output (stdout)

**Human-readable** (default):
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/skills/speckit-bridge/ceremony.md
  ✓ Spec Kit extension: .specify/extensions/squad-bridge/extension.yml
  ✓ Manifest: .bridge-manifest.json

Installation complete. 4 files created.
```

**JSON** (`--json`):
```json
{
  "version": "0.1.0",
  "frameworks": {
    "squad": { "detected": true, "path": ".squad" },
    "specKit": { "detected": true, "path": ".specify" }
  },
  "installed": [
    ".squad/skills/speckit-bridge/SKILL.md",
    ".squad/skills/speckit-bridge/ceremony.md",
    ".specify/extensions/squad-bridge/extension.yml",
    ".bridge-manifest.json"
  ],
  "warnings": []
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (full or partial installation) |
| 1 | Fatal error (filesystem permissions, invalid config) |

### Partial Installation (Degraded Mode)

When only one framework is detected:
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ⚠ Spec Kit not detected (.specify/ missing)

Installing Squad-only components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/skills/speckit-bridge/ceremony.md
  ✓ Manifest: .bridge-manifest.json

Partial installation complete. 3 files created.
To complete: Initialize Spec Kit, then run `squad-speckit-bridge install` again.
```

---

## Subcommand: `context`

Generate a context summary from Squad memory for Spec Kit planning consumption.

```bash
squad-speckit-bridge context [options] <spec-dir>
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `spec-dir` | string | Yes | Target spec directory (e.g., `specs/001-feature/`) |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--max-size <bytes>` | number | 8192 | Maximum output size in bytes |
| `--sources <list>` | string | `skills,decisions,histories` | Comma-separated list of sources to include |
| `--squad-dir <path>` | string | `.squad` | Override Squad directory path |

### Behavior

1. Read Squad memory artifacts (skills, decisions, histories)
2. Parse and prioritize content (skills > decisions > learnings)
3. Apply progressive summarization to fit within size limit
4. Write `squad-context.md` to the target spec directory
5. Print summary of what was included/excluded

### Output (stdout)

**Human-readable** (default):
```
Generating Squad context for specs/001-squad-speckit-bridge/...

Sources processed:
  Skills:    3 files (2.1KB)
  Decisions: 47 entries, 12 included (3.2KB)
  Histories: 5 files, 8 entries included (2.4KB)
  Skipped:   1 file (malformed: .squad/agents/erlich/history.md)

Output: specs/001-squad-speckit-bridge/squad-context.md (7.7KB / 8.0KB limit)
```

**JSON** (`--json`):
```json
{
  "output": "specs/001-squad-speckit-bridge/squad-context.md",
  "sizeBytes": 7700,
  "maxBytes": 8192,
  "sources": {
    "skills": { "found": 3, "included": 3, "bytes": 2100 },
    "decisions": { "found": 47, "included": 12, "bytes": 3200 },
    "histories": { "found": 5, "entriesIncluded": 8, "bytes": 2400 }
  },
  "skipped": [
    { "file": ".squad/agents/erlich/history.md", "reason": "malformed markdown" }
  ],
  "warnings": []
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (context generated) |
| 0 | Success with warnings (some files skipped) |
| 1 | Fatal error (spec-dir not found, Squad dir not found, permissions) |

---

## Subcommand: `review`

Generate a Design Review ceremony template for a Spec Kit tasks.md file.

```bash
squad-speckit-bridge review [options] <tasks-file>
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `tasks-file` | string | Yes | Path to Spec Kit tasks.md to review |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--output <path>` | string | (same dir)/review.md | Where to write the review template |

### Behavior

1. Read and parse the tasks.md file
2. Cross-reference tasks against Squad decisions and agent histories
3. Generate a review template with pre-populated findings
4. Write the review document

### Output (stdout)

```
Design Review prepared for specs/001-feature/tasks.md

Pre-populated findings:
  ⚠ 2 potential decision conflicts detected
  ℹ 3 tasks may benefit from agent expertise
  
Review template written to: specs/001-feature/review.md
Next: Run the Design Review ceremony with your Squad team.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Fatal error (tasks file not found, parse error) |

---

## Subcommand: `status`

Show current bridge installation and integration status.

```bash
squad-speckit-bridge status [options]
```

### Output

```
Squad-SpecKit Bridge v0.1.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md)
  Ceremony def:     ✓ installed (.squad/skills/speckit-bridge/ceremony.md)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json)

Configuration:
  Context max size: 8192 bytes
  After-tasks hook: enabled
  Sources:          skills, decisions, histories

Last context run:   2025-07-24T10:30:00Z (specs/001-feature/)
```

---

## Error Output Format (stderr)

All errors are written to stderr. In JSON mode, errors are structured:

```json
{
  "error": true,
  "code": "SQUAD_NOT_FOUND",
  "message": "Squad directory not found at .squad/",
  "suggestion": "Initialize Squad first, or use --squad-dir to specify a custom path."
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `SQUAD_NOT_FOUND` | Squad directory does not exist |
| `SPECKIT_NOT_FOUND` | Spec Kit directory does not exist |
| `SPEC_DIR_NOT_FOUND` | Target spec directory does not exist |
| `TASKS_NOT_FOUND` | Tasks file does not exist |
| `PERMISSION_DENIED` | Cannot read/write required files |
| `CONFIG_INVALID` | Configuration file has invalid values |
| `PARSE_ERROR` | Cannot parse a required markdown/YAML file |
