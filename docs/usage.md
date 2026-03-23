---
layout: default
---

# Usage Guide: Squad-SpecKit Bridge

This guide explains what the bridge does **automatically** (the common case) and how to use **manual commands** when you need them.

## Automated Workflow (What Happens After Install)

The bridge is designed to stay in the background. After `npx squad-speckit-bridge install`, **most work happens automatically**.

### Automatic: Memory Injection During Planning

**When:** Before Spec Kit's `/speckit.plan` runs  
**What:** The bridge reads your team's decisions, learnings, and skills from `.squad/` and injects them as context  
**You see:** Spec Kit's planning is informed by prior execution experience  
**File created:** `specs/YOUR-SPEC/squad-context.md` (available for reference)  
**Config:** Controlled via `bridge.config.json` — see [Configuration](#configuration) below

### Automatic: Design Review Template After Tasks

**When:** Immediately after `/speckit.tasks` completes  
**What:** The bridge analyzes `tasks.md` and generates a review template with pre-populated findings  
**You see:** 
- Notification that review is ready
- Potential decision conflicts flagged
- Tasks that may need agent expertise highlighted  

**File created:** `specs/YOUR-SPEC/review.md`  
**What you do next:** Open the review, discuss with your team, mark tasks as approved or flag for revision

### Automatic: Context Budget Management

**What:** The bridge respects a context size budget (default: 8192 bytes)  
**Why:** Keeps planning context focused and efficient  
**What you might see:** "Included 12 of 47 decisions (budget: 8192 bytes)" — recent and relevant items prioritized

## Manual Commands

You'll rarely need these, but they're available when you want **direct control**:

### When You Want to Override Automation

#### `context` — Manually Regenerate Context

Override the automatic context injection or run it independently.

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

**Flags:**
- `--max-size <bytes>` — Override context budget (default: 8192)
- `--sources <list>` — Comma-separated sources: `skills,decisions,histories` (default: all)
- `--json` — Machine-readable JSON output

#### `review` — Manually Generate Design Review

Override automatic review generation or create a standalone review.

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

**Flags:**
- `--output <path>` — Write to custom file (default: `specs/YOUR-SPEC/review.md`)
- `--json` — Machine-readable JSON output

#### `issues` — Convert Tasks to GitHub Issues

The only manual step after design review approval. Convert approved tasks into GitHub issues for Squad execution.

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

**Flags:**
- `--dry-run` — Preview without creating issues
- `--labels <list>` — Additional labels: `--labels priority/high,team/backend`
- `--json` — Machine-readable JSON output

#### `status` — Check Bridge Health

Verify installation and configuration.

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

**Flags:**
- `--json` — Machine-readable JSON output
- `--verbose` — Detailed diagnostics and file paths

## Command Reference

## Configuration

### Bridge Configuration File

After `install`, a `bridge.config.json` file is created. Customize it to change default behavior:

```json
{
  "contextMaxBytes": 8192,
  "sources": {
    "skills": true,
    "decisions": true,
    "histories": true
  },
  "summarization": {
    "recencyBiasWeight": 0.7,
    "maxDecisionAgeDays": 90
  },
  "hooks": {
    "afterTasks": true
  },
  "paths": {
    "squadDir": ".squad",
    "specifyDir": ".specify"
  }
}
```

### Common Configuration Changes

**Reduce context to 4KB (minimal memory footprint):**
```json
{
  "contextMaxBytes": 4096
}
```

**Disable automatic hooks (manual mode only):**
```json
{
  "hooks": {
    "afterTasks": false
  }
}
```

**Include only skills (no decisions or histories):**
```json
{
  "sources": {
    "skills": true,
    "decisions": false,
    "histories": false
  }
}
```

After editing `bridge.config.json`, the changes take effect immediately on the next command.

## Common Workflows

### Workflow 1: Standard Planning Cycle (Mostly Automatic)

```bash
# Step 1: Install (one time)
$ npx squad-speckit-bridge install

# Step 2: Plan normally — automation handles memory injection + review generation
$ cd specs/001-feature/
$ /speckit.specify
$ /speckit.plan
$ /speckit.tasks
# ← bridge automatically generates squad-context.md and review.md

# Step 3: Your team reviews (no command needed)
# Open: specs/001-feature/review.md
# Discuss: Are these tasks right?
# Approve in the review file

# Step 4: Create issues when ready
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md

# Step 5: Squad executes (agents pick up issues)
# Ralph distributes issues to agents...
```

### Workflow 2: Manual Context Override

If you need to control context generation (e.g., testing different context budgets):

```bash
# Regenerate context with custom budget
$ npx squad-speckit-bridge context specs/001-feature/ --max-size 4096

# Then run planning
$ cd specs/001-feature/ && /speckit.specify && /speckit.plan && /speckit.tasks
```

### Workflow 3: No Automation (Fully Manual)

If you prefer to control everything:

```bash
# Disable the after-tasks hook in bridge.config.json:
# "hooks": { "afterTasks": false }

# Then run commands explicitly:
$ npx squad-speckit-bridge context specs/001-feature/
$ cd specs/001-feature/ && /speckit.specify && /speckit.plan && /speckit.tasks
$ npx squad-speckit-bridge review specs/001-feature/tasks.md
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md
```

### Workflow 4: CI/CD Integration (Quiet Mode)

For automation pipelines, use `--quiet` to suppress info-level output:

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
- `--check` — Verify installation without modifying

**`context`:**
- `--max-size <bytes>` — Context budget (default: 8192)
- `--sources <list>` — Comma-separated sources (default: skills,decisions,histories)

**`review`:**
- `--output <path>` — Custom output file (default: spec directory)

**`issues`:**
- `--dry-run` — Preview without creating
- `--labels <list>` — Comma-separated labels to apply

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` missing | Run `npx squad init` |
| `SPECKIT_NOT_FOUND` | `.specify/` missing | Run `npx speckit init` |
| `PERMISSION_DENIED` | Can't read/write files | Check permissions: `chmod -R u+w .squad/ .specify/` |
| `HOOK_DISABLED` | `afterTasks` is false in config | Enable in `bridge.config.json` |

## Installation & Verification

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
