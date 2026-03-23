---
layout: default
---

# Usage Guide: Squad-SpecKit Bridge Commands

Complete reference for all bridge commands with copy-pasteable examples and expected output. Each example is executable as-is.

## The Bridge Workflow Loop

```
Spec Kit Planning → Memory Bridge → Design Review → Issue Creation → Squad Execution → Learning Sync
```

## Command Reference

### Installation & Status

#### `install` — Deploy bridge to your project

Deploy bridge components to Squad and Spec Kit directories.

```bash
$ npx squad-speckit-bridge install
```

**Expected output:**
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/ceremonies/design-review.md
  ✓ Spec Kit extension: .specify/extensions/squad-bridge/extension.yml
  ✓ Manifest: .bridge-manifest.json
  ✓ Configuration: bridge.config.json

Installation complete. 5 files created.
Next: Run `npx squad-speckit-bridge status` to verify.
```

#### `status` — Check bridge installation and configuration

Verify all components are installed and operational.

```bash
$ npx squad-speckit-bridge status
```

**Expected output:**
```
Squad-SpecKit Bridge v0.1.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md)
  Ceremony def:     ✓ installed (.squad/ceremonies/design-review.md)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json)

Configuration:
  Context max size: 8192 bytes
  After-tasks hook: enabled
  Sources:          skills, decisions, histories

Last context run:   2025-07-24T10:30:00Z
```

**With `--json` flag:**
```bash
$ npx squad-speckit-bridge status --json
```

**With `--verbose` flag:**
```bash
$ npx squad-speckit-bridge status --verbose
# Shows detailed diagnostics and file paths
```

### Memory Bridge & Planning

#### `context` — Inject Squad memory for Spec Kit planning

Generate a context summary from Squad memory for Spec Kit planning.

```bash
$ npx squad-speckit-bridge context specs/001-feature/
```

**Expected output:**
```
Generating Squad context for specs/001-feature/...

Sources processed:
  Skills:    3 files (2.1KB)
  Decisions: 47 entries, 12 included (3.2KB)
  Histories: 5 files, 8 entries included (2.4KB)

Output: specs/001-feature/squad-context.md (7.7KB / 8.0KB limit)
```

**With `--max-size` flag:**
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --max-size 4096
```

**With `--json` flag:**
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --json
```

**Expected JSON output:**
```json
{
  "output": "specs/001-feature/squad-context.md",
  "sizeBytes": 7700,
  "maxBytes": 8192,
  "sources": {
    "skills": { "found": 3, "included": 3, "bytes": 2100 },
    "decisions": { "found": 47, "included": 12, "bytes": 3200 },
    "histories": { "found": 5, "entriesIncluded": 8, "bytes": 2400 }
  }
}
```

### Design Review

#### `review` — Generate Design Review ceremony template

Prepare a Design Review template for your team.

```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md
```

**Expected output:**
```
Design Review prepared for specs/001-feature/tasks.md

Pre-populated findings:
  ⚠ 2 potential decision conflicts detected
  ℹ 3 tasks may benefit from agent expertise

Review template written to: specs/001-feature/review.md
```

**With `--output` flag:**
```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md --output my-review.md
```

**With `--json` flag:**
```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md --json
```

### Issue Creation

#### `issues` — Create GitHub issues from reviewed tasks

Convert approved tasks into GitHub issues.

```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md
```

**Expected output:**
```
Creating issues from specs/001-feature/tasks.md...

Created 8 issues:
  #157: Task T1 — Set up database schema
  #158: Task T2 — Implement user authentication
  ... (6 more)

All issues labeled with: feature/001, squad-generated
```

**With `--dry-run` flag (preview only):**
```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md --dry-run
```

**With `--labels` flag:**
```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md --labels priority/high,team/backend
```

## Common Workflows

### Workflow 1: Full Planning-to-Execution Cycle

```bash
# Step 1: Inject memory
$ npx squad-speckit-bridge context specs/001-feature/

# Step 2: Run Spec Kit planning
$ cd specs/001-feature/ && /speckit.specify && /speckit.plan && /speckit.tasks

# Step 3: Design Review
$ npx squad-speckit-bridge review specs/001-feature/tasks.md

# Step 4: Create issues
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md

# Step 5: Squad executes
# (agents pick up issues and work)

# Step 6: Sync learnings
$ npx squad-speckit-bridge sync
```

### Workflow 2: Quiet Mode (CI/CD Integration)

```bash
$ npx squad-speckit-bridge install --quiet
$ npx squad-speckit-bridge context specs/001-feature/ --quiet
```

Exit codes: `0` = success, `1` = error

## Flags Reference

### Global Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--config <path>` | string | `./bridge.config.json` | Path to config file |
| `--json` | boolean | false | JSON output (machine-readable) |
| `--verbose` | boolean | false | Detailed debug output |
| `--quiet` | boolean | false | Suppress info, show errors only |

### Command-Specific Flags

**`install`:**
- `--force` — Overwrite existing files

**`context`:**
- `--max-size <bytes>` — Context budget (default: 8192)
- `--sources <list>` — Comma-separated sources (default: skills,decisions,histories)

**`issues`:**
- `--dry-run` — Preview without creating
- `--labels <list>` — Comma-separated labels to apply

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` missing | Run `npx squad init` |
| `SPECKIT_NOT_FOUND` | `.specify/` missing | Run `npx speckit init` |
| `PERMISSION_DENIED` | Can't read/write files | Check permissions with `chmod -R u+w .squad/` |

---

**For More Info:**
- Installation: [Installation Guide](installation.md)
- Architecture: [Architecture Overview](architecture.md)
