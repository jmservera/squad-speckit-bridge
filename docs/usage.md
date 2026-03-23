---
layout: default
---

# Usage Guide: Squad-SpecKit Bridge

The bridge is **automation-first**. After installation, most work happens automatically. Manual commands are available only when you need direct control.

## Quick Reference

**Most teams never run manual commands.** This is what normally happens:

```bash
# Step 1: One-time installation
$ npx @jmservera/squad-speckit-bridge install
# Result: Bridge components deployed. That's it.

# Step 2: Use Spec Kit normally
$ cd specs/001-feature/
$ /speckit.specify && /speckit.plan && /speckit.tasks
# Automatic: memory injection + review generation

# Step 3: Team reviews (discuss, don't run commands)
# Open: specs/001-feature/review.md
# Approve when ready.

# Step 4: Create issues
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md
# Result: GitHub issues created (labeled, assigned)
```

That's the normal flow. Everything else below is for advanced use cases.

---

## What Happens Automatically After Install

The bridge operates **silently in the background**. You'll see it work through generated files.

### Generated Files Created During Workflow

| File | Created When | Contains | Your Action |
|------|--------------|----------|-------------|
| `squad-context.md` | Before or during planning | Team decisions + learnings (budgeted summary) | Reference during planning; commit with code |
| `review.md` | After `/speckit.tasks` | Conflict flags + risk findings | Discuss with team; approve or annotate |

**Commit both files.** They document the planning decisions and team review that informed execution.

### Automatic: Memory Injection (During Planning)

**When:** Before Spec Kit planning runs (or on-demand via `context` command)  
**What:** Bridge reads `.squad/` (decisions, learnings, skills) and creates `squad-context.md`  
**You see:** Planning context includes your team's experience; better task generation  
**File created:** `specs/YOUR-SPEC/squad-context.md` (available for reference during planning)  
**Config:** Controlled via `bridge.config.json` — can be disabled or customized  

### Automatic: Design Review Generation (After Tasks)

**When:** Immediately after `/speckit.tasks` completes  
**What:** Bridge analyzes tasks and generates a review template with pre-populated findings  
**You see:**
- `specs/YOUR-SPEC/review.md` with conflict flags and risk highlights
- Notification that review is ready for team discussion

**What you do:** Open the review with your team, discuss findings, approve when satisfied  
**File created:** `specs/YOUR-SPEC/review.md` (commit this with code)  
**Config:** Can be disabled via `bridge.config.json` → `hooks.afterTasks: false`

### Automatic: Context Budget Management

The bridge respects a configurable context size limit (default: 8KB). Recent and relevant items are prioritized.  
**What you might see:** "Included 12 of 47 decisions (budget: 8192 bytes)" — automatic prioritization.

---

## Manual Commands (When You Need Direct Control)

**Most teams don't use these.** They're available when you want to override automation or integrate with CI/CD.

### `context` — Manually Regenerate Memory Context

Override the automatic context injection or run it independently.

```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/
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

**When to use:**
- Testing different context budgets before planning
- Forcing context regeneration if Squad memory changed
- CI/CD pipelines where you need explicit step ordering

### `review` — Manually Generate Design Review

Override automatic review generation or create a standalone review.

```bash
$ npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
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
- `--output <path>` — Write to custom file (default: spec directory)
- `--json` — Machine-readable JSON output

**When to use:**
- Design Review hook is disabled and you want manual control
- Re-generating review after tasks change

### `issues` — Convert Tasks to GitHub Issues

Convert approved tasks into GitHub issues for Squad execution. **This is the only truly manual step** (after team approves review).

```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md
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
- `--dry-run` — Preview without creating
- `--labels <list>` — Additional labels: `--labels priority/high,team/backend`
- `--json` — Machine-readable JSON output

**When to use:**
- After team approves review (always use this)
- To add custom labels or assignments
- To preview what issues will be created before committing

### `status` — Check Bridge Health

Verify installation and configuration. Useful for debugging.

```bash
$ npx @jmservera/squad-speckit-bridge status
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

---

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

### Common Configuration Tweaks

**Disable automatic hooks (fully manual mode):**
```json
{
  "hooks": {
    "afterTasks": false
  }
}
```
Then run all commands explicitly (see Workflow 3 below).

**Reduce context to 4KB (minimal memory footprint):**
```json
{
  "contextMaxBytes": 4096
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

**Use custom Squad directory:**
```json
{
  "paths": {
    "squadDir": "path/to/.squad"
  }
}
```

After editing `bridge.config.json`, changes take effect immediately on the next command.

---

## Common Workflows

### Workflow 1: Automatic (Recommended for Most Teams)

```bash
# Step 1: Install once
$ npx @jmservera/squad-speckit-bridge install

# Step 2: Plan normally — everything happens automatically
$ cd specs/001-feature/
$ /speckit.specify && /speckit.plan && /speckit.tasks
# ← bridge creates squad-context.md and review.md automatically

# Step 3: Team reviews (no command, just discussion)
# Open: specs/001-feature/review.md
# Discuss and approve

# Step 4: Create issues
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md

# Step 5: Squad executes, agents close issues, learnings sync back
```

**Result:** Full knowledge loop with minimal manual overhead.

### Workflow 2: Manual Control (If Automation Disabled)

If you've disabled the `afterTasks` hook:

```bash
# Disable hook in bridge.config.json first:
# "hooks": { "afterTasks": false }

# Then run commands explicitly:
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/
$ cd specs/001-feature/ && /speckit.specify && /speckit.plan && /speckit.tasks
$ npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md
```

**Result:** You control each step; useful for CI/CD or testing different parameters.

### Workflow 3: CI/CD Integration (Quiet Mode)

For automation pipelines, use `--quiet` to suppress info-level output:

```bash
$ npx @jmservera/squad-speckit-bridge install --quiet
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --quiet
```

Exit codes: `0` = success, `1` = error

### Workflow 4: Testing Different Context Budgets

```bash
# Test with small context
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --max-size 4096
$ cd specs/001-feature/ && /speckit.plan  # See how planning differs

# Test with full context
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --max-size 16384
$ cd specs/001-feature/ && /speckit.plan  # See how planning differs
```

Useful for understanding what knowledge is most important for planning.

---

## Generated Files Documentation

### Files Created by `install` (Commit These)

| File | Location | Purpose |
|------|----------|---------|
| `.bridge-manifest.json` | repo root | Tracks bridge version and installed components |
| `.squad/skills/speckit-bridge/SKILL.md` | .squad/ | Teaches agents about Spec Kit artifacts and Design Review |
| `.squad/ceremonies/design-review.md` | .squad/ | Ceremony definition for Design Review |
| `.specify/extensions/squad-bridge/extension.yml` | .specify/ | Hook definitions for automation |
| `bridge.config.json` | repo root | Configuration (customizable) |

**Why commit them?** They're part of your integration setup. Team members and future deployments need to know what's configured.

### Files Created During Workflow (Commit These Too)

| File | Location | Created By | Purpose |
|------|----------|------------|---------|
| `squad-context.md` | specs/{feature}/ | Automatic (or `context` command) | Squad memory summary fed into planning |
| `review.md` | specs/{feature}/ | Automatic (after `/speckit.tasks`) | Design Review template with findings |

**Why commit them?** They're part of your feature's planning record. Future planning cycles and team members benefit from seeing what knowledge informed decisions and what the review found.

---

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

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` missing | Run `npx squad init` |
| `SPECKIT_NOT_FOUND` | `.specify/` missing | Run `npx speckit init` |
| `PERMISSION_DENIED` | Can't read/write files | Check permissions: `chmod -R u+w .squad/ .specify/` |
| `HOOK_DISABLED` | `afterTasks` is false in config | Enable in `bridge.config.json` or use manual commands |
