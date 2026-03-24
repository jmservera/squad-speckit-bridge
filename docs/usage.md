---
layout: default
---

# Usage Guide: Squad-SpecKit Bridge

The bridge is **automation-first**. After installation, most work happens automatically. Manual commands are available only when you need direct control.

## Quick Reference

**Most teams never run manual commands.** This is what normally happens:

```bash
# Step 1: One-time installation (v0.1+)
$ npx @jmservera/squad-speckit-bridge install
# Result: Bridge components deployed, automation hooks installed

# Step 2: Use Spec Kit normally (Squad context auto-injected)
$ cd specs/001-feature/
$ /speckit.specify && /speckit.plan && /speckit.tasks
# Automatic: memory injection + review generation

# Step 3: Team reviews (discuss, don't run commands)
# Open: specs/001-feature/review.md
# Approve when ready.

# Step 4: Create issues (v0.2+)
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md
# Result: GitHub issues created with labels and dependencies

# Step 5 (optional): Sync learnings back after execution (v0.2+)
$ npx @jmservera/squad-speckit-bridge sync
```

That's the normal flow. Everything else below is for advanced use cases.

---

## Demo Examples

These examples show real-world terminal output. Copy and paste to try them.

### Example 1: Basic Workflow (Install → Plan → Review → Issues)

```bash
# Step 1: Install the bridge
$ npx @jmservera/squad-speckit-bridge install
Squad-SpecKit Bridge v0.2.0

Installing to .squad/ and .specify/...
  ✓ Squad skill installed (.squad/skills/speckit-bridge/SKILL.md)
  ✓ Ceremony definition deployed (.squad/ceremonies/design-review.md)
  ✓ Spec Kit extension deployed (.specify/extensions/squad-speckit-bridge/extension.yml)
  ✓ Configuration file created (bridge.config.json)

Bridge components: 4/4 deployed
Hooks enabled: after_tasks, before_specify, after_implement
Status: Ready
```

```bash
# Step 2: Create a feature spec and run planning
$ mkdir -p specs/001-auth/ && cd specs/001-auth/
$ /speckit.specify && /speckit.plan && /speckit.tasks
# (Spec Kit runs, bridge automatically injects squad-context.md and generates review.md)
✓ Specification created
✓ Plan generated
✓ Tasks decomposed (8 tasks)
```

```bash
# Step 3: Inspect the generated context and review
$ cat squad-context.md
---
# Squad Context for Feature #001: User Authentication
Generated: 2025-07-25T10:30:00Z

## Team Decisions (3 included, 2 omitted — context budget: 8KB)
- 2025-07-20: Use OAuth2 + JWT for external auth (Richard, Squad)
- 2025-07-22: Prefer Postgres for session storage (Dinesh, Squad)

## Agent Skills (2 included)
- OAuth implementation patterns (Richard)
- Database schema design (Dinesh)
---

$ cat review.md
# Design Review: Feature #001 — User Authentication

## Pre-populated Findings

⚠ **Potential Conflicts:**
  - Task T003 (implement OAuth) overlaps with recent decision on JWT strategy (2025-07-20)
    → Recommendation: Review T003 against OAuth2+JWT decision

ℹ **Suggested Agent Reviews:**
  - Richard (OAuth expert) → Review T001-T003
  - Dinesh (Database expert) → Review T005-T006 (session storage schema)
```

```bash
# Step 4: Create GitHub issues (preview first with --dry-run)
$ npx @jmservera/squad-speckit-bridge issues tasks.md --dry-run
Previewing issue creation from tasks.md...

Issues that would be created:
  [1] T001 — Set up database schema (session_tokens table)
  [2] T002 — Implement OAuth2 provider integration
  [3] T003 — Add JWT token validation middleware
  [4] T004 — Write authentication tests
  [5] T005 — Document OAuth flow for frontend
  [6] T006 — Set up CI/CD auth environment variables
  [7] T007 — Implement token refresh endpoint
  [8] T008 — Add logout API endpoint

Total: 8 issues (ready to create)

$ npx @jmservera/squad-speckit-bridge issues tasks.md
Creating issues from tasks.md...

Created 8 issues:
  #201: T001 — Set up database schema
  #202: T002 — Implement OAuth2 provider integration
  #203: T003 — Add JWT token validation middleware
  #204: T004 — Write authentication tests
  #205: T005 — Document OAuth flow for frontend
  #206: T006 — Set up CI/CD auth environment variables
  #207: T007 — Implement token refresh endpoint
  #208: T008 — Add logout API endpoint

Labels applied: squad-generated, bridge
Status: ✓ Complete
```

### Example 2: Manual Context Injection with Verbose Output

```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-auth/ --verbose
Generating Squad context for specs/001-auth/...

Sources processed:
  Skills (searching .squad/skills/*/SKILL.md):
    ✓ .squad/skills/oauth-patterns/SKILL.md (1.2KB)
    ✓ .squad/skills/postgres-migration/SKILL.md (0.9KB)
    Total: 2 files (2.1KB)

  Decisions (reading .squad/decisions.md):
    Found 47 total entries
    Included 12 recent entries (3.2KB)
    Filtered: 35 entries exceeding age/relevance threshold

  Histories (searching .squad/agents/*/history.md):
    ✓ .squad/agents/richard/history.md (included 4 entries, 1.5KB)
    ✓ .squad/agents/dinesh/history.md (included 3 entries, 1.2KB)
    ✓ .squad/agents/monica/history.md (skipped — not oauth/auth related)
    ✓ .squad/agents/gilfoyle/history.md (skipped — not oauth/auth related)

Output: specs/001-auth/squad-context.md
  Size: 7.7KB / 8.0KB limit
  Status: ✓ Success
```

### Example 3: Checking Bridge Health

```bash
$ npx @jmservera/squad-speckit-bridge status
Squad-SpecKit Bridge v0.2.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md, 2.3KB)
  Ceremony def:     ✓ installed (.squad/ceremonies/design-review.md, 1.8KB)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-speckit-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json, v0.2.0)

Hooks Deployed:
  after_tasks:      ✓ enabled (triggers Design Review generation)
  before_specify:   ✓ enabled (injects Squad context before planning)
  after_implement:  ✓ enabled (syncs learnings to Squad)

Configuration:
  Config file:      ./bridge.config.json
  Context max:      8192 bytes
  Sources:          skills, decisions, histories
  Hooks enabled:    true

Recent Activity:
  Last context gen: 2025-07-25T10:30:00Z
  Last sync:        2025-07-24T15:45:00Z
  Constitution:     ✓ customized (not using template)

Status: ✓ Healthy (all components operational)
```

### Example 4: Syncing Execution Learnings Back to Squad

```bash
# After Squad finishes implementing a feature, sync learnings back
$ npx @jmservera/squad-speckit-bridge sync specs/001-auth/ --verbose
Syncing execution learnings from specs/001-auth/...

Searching for changes in .squad/ since 2025-07-24T15:45:00Z:
  ✓ decisions.md — 3 new entries (Dinesh, Richard, Gilfoyle)
  ✓ .squad/agents/richard/history.md — 8 new entries
  ✓ .squad/agents/dinesh/history.md — 2 new entries

Recording sync:
  New decisions: 3
  New learnings: 10 (agent history entries)
  Affected agents: Richard, Dinesh
  Timestamp: 2025-07-25T14:20:00Z

Sync record: .squad/.bridge-sync-state.json
Status: ✓ Success — Ready for next planning cycle
```

---

## What Happens Automatically After Install

The bridge operates **silently in the background**. You'll see it work through generated files.

### Generated Files Created During Workflow

| File | Created When | Contains | Your Action |
|------|--------------|----------|-------------|
| `squad-context.md` | Before/during planning | Team decisions + learnings (budgeted summary) | Reference during planning; commit with code |
| `review.md` | After `/speckit.tasks` | Conflict flags + risk findings | Discuss with team; approve or annotate |

**Commit both files.** They document the planning decisions and team review that informed execution.

### Automatic: Memory Injection (During Planning)

**When:** Before Spec Kit planning runs (v0.2+ via `before_specify` hook, or on-demand via `context` command)  
**What:** Bridge reads `.squad/` (decisions, learnings, skills) and creates `squad-context.md`  
**You see:** Planning context includes your team's experience; better task generation  
**File created:** `specs/YOUR-SPEC/squad-context.md` (available for reference during planning)  
**Config:** Controlled via `bridge.config.json` — can be disabled or customized  

### Automatic: Design Review Generation (After Tasks)

**When:** Immediately after `/speckit.tasks` completes (via `after_tasks` hook)  
**What:** Bridge analyzes tasks and generates a review template with pre-populated findings  
**You see:**
- `specs/YOUR-SPEC/review.md` with conflict flags and risk highlights
- Notification that review is ready for team discussion

**What you do:** Open the review with your team, discuss findings, approve when satisfied  
**File created:** `specs/YOUR-SPEC/review.md` (commit this with code)  
**Config:** Can be disabled via `bridge.config.json` → `hooks.afterTasks: false`

### Automatic: Execution Learning Sync (After Implementation, v0.2+)

**When:** After Spec Kit's implement phase completes (via `after_implement` hook, or manual `sync` command)  
**What:** Bridge captures new Squad decisions and learnings and marks them for next planning cycle  
**You see:** Sync record with count of new decisions and learnings  
**Result:** Next planning cycle's context includes this execution's learnings  
**Config:** Can be disabled via `bridge.config.json` → `hooks.afterImplement: false`

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
- `--verbose` — Show file paths and detailed processing
- `--notify` — Send status notification to Squad agents

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
- `--verbose` — Show detailed analysis steps

**When to use:**
- Design Review hook is disabled and you want manual control
- Re-generating review after tasks change

### `issues` — Convert Tasks to GitHub Issues (v0.2+)

Convert approved tasks into GitHub issues for Squad execution. **This is the primary manual step** (after team approves review).

```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md
```

**Expected output:**
```
Creating issues from specs/001-feature/tasks.md...

Created 8 issues:
  #157: T001 — Set up database schema
  #158: T002 — Implement user authentication
  #159: T003 — Add API endpoints
  ... (5 more)

All issues labeled with: feature/001, squad-generated, bridge
```

**Flags:**
- `--dry-run` — Preview without creating issues:
  ```bash
  $ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --dry-run
  
  # Output shows issues that would be created:
  # Issue 1: "T001 — Set up database schema"
  # Issue 2: "T002 — Implement user authentication"
  # ... (total: 8 issues)
  ```

- `--labels <list>` — Add custom labels (comma-separated):
  ```bash
  $ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --labels priority/high,team/backend
  ```

- `--json` — Machine-readable JSON output (returns array of created issues with numbers, URLs, labels)

- `--verbose` — Show detailed processing (task parsing, dependency resolution, issue creation details)

**When to use:**
- After team approves review (primary workflow)
- To preview issues before committing with `--dry-run`
- To add custom labels or assignments
- To integrate with CI/CD pipelines with `--json`

### `sync` — Sync Execution Learnings (v0.2+)

Capture Squad execution learnings and mark them for the next planning cycle.

```bash
$ npx @jmservera/squad-speckit-bridge sync
```

**Expected output:**
```
Syncing Squad learnings...

Learnings since last sync (2025-07-25T10:30:00Z):
  New decisions:  3 entries
  New learnings:  8 entries (agent histories)
  Affected agents: Richard, Dinesh, Monica

Sync record written to: .squad/.bridge-sync-state.json
Ready for next planning cycle.
```

**Flags:**
- `--dry-run` — Show what would be synced without modifying:
  ```bash
  $ npx @jmservera/squad-speckit-bridge sync --dry-run
  
  # Output: What changed since last sync (counts, timestamps, summaries)
  ```

- `--since <timestamp>` — Sync changes after a specific ISO 8601 timestamp:
  ```bash
  $ npx @jmservera/squad-speckit-bridge sync --since 2025-07-25T10:00:00Z
  ```

- `--json` — Machine-readable output (returns sync record with change counts and summaries)

- `--verbose` — Show file-by-file details of what changed in `.squad/`

**When to use:**
- After Squad completes a feature implementation (optional but recommended)
- Before starting the next planning cycle (helps context command include latest learnings)
- In CI/CD to ensure learnings flow back automatically with `after_implement` hook
- Testing different sync points with `--dry-run`

### `status` — Check Bridge Health

Verify installation and configuration. Useful for debugging.

```bash
$ npx @jmservera/squad-speckit-bridge status
```

**Expected output:**
```
Squad-SpecKit Bridge v0.2.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md)
  Ceremony def:     ✓ installed (.squad/ceremonies/design-review.md)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-speckit-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json)

Hooks Deployed:
  after_tasks:      ✓ enabled
  before_specify:   ✓ enabled (v0.2+)
  after_implement:  ✓ enabled (v0.2+)

Configuration:
  Context max size: 8192 bytes
  Sources:          skills, decisions, histories
  Hooks enabled:    true

Last context run:   2025-07-24T10:30:00Z
Last sync:          2025-07-24T15:45:00Z
Constitution:       ⚠ using template (not customized)
```

**Flags:**
- `--json` — Machine-readable JSON output
- `--verbose` — Detailed diagnostics including file paths, permission checks, and hook deployment details

**When to use:**
- After installation to verify all components are deployed
- Troubleshooting automation issues
- Checking constitution customization status (v0.2+)
- Monitoring hook and sync state in CI/CD

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
    "afterTasks": true,
    "beforeSpecify": true,
    "afterImplement": true
  },
  "issues": {
    "defaultLabels": ["squad-generated", "bridge"],
    "phaseLabels": true
  },
  "sync": {
    "enabled": true,
    "stateFile": ".squad/.bridge-sync-state.json"
  },
  "notifications": {
    "enabled": false,
    "channels": ["console"]
  },
  "paths": {
    "squadDir": ".squad",
    "specifyDir": ".specify"
  }
}
```

### Common Configuration Tweaks

**Disable all automation (fully manual mode):**
```json
{
  "hooks": {
    "afterTasks": false,
    "beforeSpecify": false,
    "afterImplement": false
  }
}
```
Then run all commands explicitly.

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

**Customize issue labels (v0.2+):**
```json
{
  "issues": {
    "defaultLabels": ["my-team", "v0.2.0"],
    "phaseLabels": true
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

**Enable notifications (v0.2+):**
```json
{
  "notifications": {
    "enabled": true,
    "channels": ["console", "squad-agents"]
  }
}
```

After editing `bridge.config.json`, changes take effect immediately on the next command.
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
# ← bridge creates squad-context.md (v0.2+ via before_specify hook)
# ← bridge creates review.md (via after_tasks hook)

# Step 3: Team reviews (no command, just discussion)
# Open: specs/001-feature/review.md
# Discuss and approve

# Step 4: Create issues from approved tasks
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md

# Step 5: Squad executes, agents close issues, learnings sync back
# (Optional v0.2+: learnings automatically synced via after_implement hook)
```

**Result:** Full knowledge loop with minimal manual overhead.

### Workflow 2: Manual Control (If Automation Disabled)

If you've disabled the automation hooks:

```bash
# Disable hooks in bridge.config.json first:
# "hooks": { "afterTasks": false, "beforeSpecify": false, "afterImplement": false }

# Then run commands explicitly:
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/
$ cd specs/001-feature/ && /speckit.specify && /speckit.plan && /speckit.tasks
$ npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md

# After Squad execution, sync learnings manually (v0.2+):
$ npx @jmservera/squad-speckit-bridge sync
```

**Result:** You control each step; useful for CI/CD or testing different parameters.

### Workflow 3: Preview Issues Before Creating (Dry Run)

```bash
# First, preview what issues will be created
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --dry-run

# Once satisfied, actually create them
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md

# Or create with custom labels
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --labels priority/high,team/backend
```

**Result:** Safe issue creation with preview capability.

### Workflow 4: CI/CD Integration (Quiet Mode)

For automation pipelines, use standard flags for controlled output:

```bash
$ npx @jmservera/squad-speckit-bridge install --quiet
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --json
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --json
$ npx @jmservera/squad-speckit-bridge sync --json
```

Exit codes: `0` = success, `1` = error

**Result:** Machine-readable output for scripting and pipeline integration.

### Workflow 5: Testing Different Context Budgets

```bash
# Test with small context
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --max-size 4096
$ cd specs/001-feature/ && /speckit.plan  # See how planning differs

# Test with full context
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --max-size 16384
$ cd specs/001-feature/ && /speckit.plan  # See how planning differs
```

Useful for understanding what knowledge is most important for planning.

### Workflow 6: Knowledge Debugging with Verbose Mode

```bash
# See which decisions/skills/histories were included in context
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --verbose

# See issue creation details and dependency resolution
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --verbose

# See what changed in the sync
$ npx @jmservera/squad-speckit-bridge sync --verbose
```

**Result:** Detailed tracing for understanding bridge behavior and debugging planning issues.

---

## Generated Files Documentation

### Files Created by `install` (Commit These)

| File | Location | Purpose |
|------|----------|---------|
| `.bridge-manifest.json` | repo root | Tracks bridge version and installed components |
| `.squad/skills/speckit-bridge/SKILL.md` | .squad/ | Teaches agents about Spec Kit artifacts and Design Review |
| `.squad/ceremonies/design-review.md` | .squad/ | Ceremony definition for Design Review |
| `.specify/extensions/squad-speckit-bridge/extension.yml` | .specify/ | Hook definitions for automation (after_tasks, before_specify, after_implement) |
| `bridge.config.json` | repo root | Configuration (customizable) |

**Why commit them?** They're part of your integration setup. Team members and future deployments need to know what's configured.

### Files Created During Workflow (Commit These Too)

| File | Location | Created By | Purpose |
|------|----------|------------|---------|
| `squad-context.md` | specs/{feature}/ | Automatic (v0.2+ via `before_specify` hook) or `context` command | Squad memory summary fed into planning |
| `review.md` | specs/{feature}/ | Automatic (via `after_tasks` hook) or `review` command | Design Review template with findings |
| `.squad/.bridge-sync-state.json` | .squad/ | Automatic (v0.2+ via `after_implement` hook) or `sync` command | Tracks last sync point for learnings capture |

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
- `--notify` — Send status notification to Squad (v0.2+)

**`review`:**
- `--output <path>` — Custom output file (default: spec directory)

**`issues` (v0.2+):**
- `--dry-run` — Preview without creating
- `--labels <list>` — Comma-separated labels to apply
- `--json` — JSON output with created issue details

**`sync` (v0.2+):**
- `--dry-run` — Preview without syncing
- `--since <timestamp>` — Sync changes after timestamp
- `--json` — JSON output with sync record

---

## Troubleshooting Guide

### Common Errors & Solutions

| Error | Cause | Diagnostic | Fix |
|-------|-------|-----------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` directory missing | `ls -la .squad/` | Run `npx squad init` in your repository root |
| `SPECKIT_NOT_FOUND` | `.specify/` directory missing | `ls -la .specify/` | Run `npx speckit init` in your repository root |
| `PERMISSION_DENIED` | Read/write permission issue | `ls -ld .squad/ .specify/` | Run `chmod -R u+w .squad/ .specify/` |
| `HOOK_DISABLED` | Automation hook is disabled in config | `grep -A5 "hooks" bridge.config.json` | Set hook to `true` in bridge.config.json or run command manually |
| `GITHUB_AUTH_FAILED` (v0.2+) | Missing/invalid GitHub token for issue creation | Check `echo $GITHUB_TOKEN` | Set environment: `export GITHUB_TOKEN=ghp_xxxx` |
| `INVALID_TASKS_FILE` (v0.2+) | tasks.md format not recognized | Check file exists and has proper frontmatter | Ensure `tasks.md` is generated by Spec Kit (check for `---` delimiters) |
| `CONFIG_PARSE_ERROR` | Invalid JSON in bridge.config.json | `cat bridge.config.json \| jq .` | Fix JSON syntax (check for trailing commas, missing quotes) |

### Detailed Troubleshooting Steps

#### Symptom: "Bridge installed but context isn't being injected"

**Step 1: Verify installation**
```bash
$ npx @jmservera/squad-speckit-bridge status
# Should show: ✓ Hook (before_specify) enabled
```

**Step 2: Check hook configuration**
```bash
$ cat bridge.config.json | grep -A3 '"hooks"'
# Output should show: "beforeSpecify": true
```

**Step 3: Verify Squad directory structure**
```bash
$ ls -la .squad/
# Should see: agents/, decisions.md, skills/, ceremonies/

$ ls -la .squad/skills/
# Should see: speckit-bridge/ directory
```

**Step 4: Run context command manually to see detailed output**
```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --verbose
# Look for: ✓ Sources processed, ✓ Output created
# If sources show 0 items: ensure .squad/skills/ has SKILL.md files
```

**Resolution:** If manual context command works, the hook may not be executing. Check that Spec Kit's extension loader is finding the hook definition:
```bash
$ cat .specify/extensions/squad-speckit-bridge/extension.yml
# Should contain: hooks section with before_specify definition
```

---

#### Symptom: "Design Review isn't being generated after tasks.md created"

**Step 1: Verify the hook is enabled**
```bash
$ npx @jmservera/squad-speckit-bridge status | grep after_tasks
# Should show: ✓ enabled
```

**Step 2: Try manual review generation**
```bash
$ npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md --verbose
# Look for: ✓ Pre-populated findings, ✓ Review written to
```

**Step 3: Check if tasks.md exists and is valid**
```bash
$ head -20 specs/001-feature/tasks.md
# Should start with YAML frontmatter (---)
# Should have task entries
```

**Step 4: Check Squad memory has content**
```bash
$ wc -l .squad/decisions.md
# If 0 lines: Squad hasn't recorded any decisions yet
# If very small (<100): context may be sparse
```

**Resolution:** If manual review works but automation doesn't, Spec Kit's hook loader may not be calling the extension. Check file permissions and hook syntax in `.specify/extensions/`.

---

#### Symptom: "Issues created but without expected labels or structure"

**Step 1: Verify labels in configuration**
```bash
$ grep -A3 '"issues"' bridge.config.json
# Check: defaultLabels array should contain your custom labels
```

**Step 2: Test with explicit labels**
```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md \
  --labels team/backend,priority/high --verbose
# Should show: Labels applied: squad-generated, bridge, team/backend, priority/high
```

**Step 3: Check GitHub API permissions**
```bash
$ gh repo view  # Verifies token and access
$ echo $GITHUB_TOKEN | wc -c
# Token should be ~40+ characters
```

**Step 4: Run in dry-run mode to debug structure**
```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md \
  --dry-run --verbose
# Review: Does preview show all 8 tasks? Are dependencies detected?
```

**Resolution:** If `--dry-run` looks wrong, issue is in task parsing. Verify tasks.md format matches Spec Kit output.

---

#### Symptom: "Context budget is too small (says only 4 of 20 decisions included)"

**Step 1: Check current budget**
```bash
$ grep contextMaxBytes bridge.config.json
# Default: 8192 bytes
```

**Step 2: Test with larger budget**
```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ \
  --max-size 16384 --verbose
# Check: How many decisions now included?
```

**Step 3: Analyze which decisions are being excluded**
```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ \
  --max-size 16384 --verbose | grep "Included\|omitted"
# Look for: Which entries are being filtered?
```

**Step 4: Adjust configuration permanently**
```bash
# Edit bridge.config.json:
# "contextMaxBytes": 16384
```

**Resolution:** Increase `contextMaxBytes` in bridge.config.json. Rule of thumb: 8KB per team member, up to 32KB. Larger contexts = slower but richer planning.

---

### Quick Debug Command

Run this to get a full diagnostic of your bridge installation:

```bash
$ npx @jmservera/squad-speckit-bridge status --json | jq .
# JSON output with all version, hook, and path information
# Useful for sharing with maintainers if something is broken
```

### Getting Help

If none of these steps resolve your issue:

1. **Save your diagnostics:**
   ```bash
   npx @jmservera/squad-speckit-bridge status --json > bridge-diagnostic.json
   cat bridge.config.json >> bridge-diagnostic.json
   cat .bridge-manifest.json >> bridge-diagnostic.json
   ```

2. **Check logs:**
   ```bash
   npx @jmservera/squad-speckit-bridge context specs/001-feature/ --verbose 2>&1 | tee bridge-debug.log
   ```

3. **Open an issue:** Include the diagnostic output and debug log in your GitHub issue.

---

## Error Reference

| Error | Error Code | Meaning |
|-------|-----------|---------|
| `SQUAD_NOT_FOUND` | 1001 | Squad directory (.squad/) doesn't exist |
| `SPECKIT_NOT_FOUND` | 1002 | Spec Kit directory (.specify/) doesn't exist |
| `PERMISSION_DENIED` | 1003 | Missing read/write permissions on Squad or Spec Kit directories |
| `HOOK_DISABLED` | 1004 | Requested hook is disabled in bridge.config.json |
| `GITHUB_AUTH_FAILED` | 2001 | GitHub token missing, invalid, or insufficient permissions |
| `INVALID_TASKS_FILE` | 3001 | tasks.md format not recognized or missing required structure |
| `CONFIG_INVALID` | 4001 | bridge.config.json is malformed or contains invalid values |
| `PARSE_ERROR` | 4002 | Internal parsing error (usually tasks.md or config parsing) |
| `SPEC_DIR_NOT_FOUND` | 5001 | Spec directory argument doesn't exist |
| `TASKS_NOT_FOUND` | 5002 | tasks.md file doesn't exist at specified path |
| `SYNC_FAILED` | 6001 | Execution learnings sync failed (check permissions and Squad directory) |

---

## Tips & Best Practices

### Memory Management

**Keep decisions.md lean:** If your decisions file grows over 500KB, context prioritization becomes less effective. Archive old decisions:
```bash
# Copy older entries to decisions.ARCHIVE.md (keep only recent 90 days)
# Bridge's recencyBiasWeight = 0.7 prefers recent decisions
```

**Label decisions for easy filtering:** In your Squad workflow, tag decisions with keywords:
```markdown
## 2025-07-25: OAuth2 strategy [auth, security]
```
Then filter context by topic:
```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ \
  --sources skills,decisions --max-size 8192
```

**Archive skills that are outdated:** Don't delete old SKILL.md files; move them to `.squad/skills/archived/`:
```bash
mv .squad/skills/old-pattern/ .squad/skills/archived/
# Bridge won't include archived skills, but they're still readable if needed
```

### Automation vs. Manual

**Use automation (default) for consistency:**
- All specs get the same context sources and budget
- All tasks get consistent Design Reviews
- Learnings sync at regular points

**Use manual mode for special cases:**
- `--verbose` when debugging why a decision wasn't included
- `--dry-run` when you want to preview before committing
- `--json` when integrating with CI/CD pipelines

### Design Review Best Practices

**Review.md is for team discussion, not individual approval:**
- Commit review.md so your team can see what was discussed
- Update review.md if the team decides to override a finding
- Use it to document trade-offs and decisions made during execution

**Pre-populate review.md with context for async teams:**
```bash
# Generate review, then add decision references
$ npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
# Then manually add in review.md:
# "Discussed 2025-07-25 async; team approved via Slack thread #12345"
```

### Issue Creation Tips

**Always use `--dry-run` first for important features:**
```bash
$ npx @jmservera/squad-speckit-bridge issues specs/feature-001/tasks.md --dry-run
# Verify count matches what Spec Kit generated
```

**Use custom labels for project/phase tracking:**
```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md \
  --labels v0.3,priority/high,team/platform
# Now you can filter GitHub issues by release version
```

**Batch issue creation for better dependency tracking:**
```bash
# Create all issues for a feature at once, not piecemeal
# Bridge properly links dependencies when all tasks are seen together
```

### Sync & Learnings Capture

**Sync after the feature is deployed, not just when code is done:**
```bash
# Step 1: Code merged (agents close issues)
# Step 2: Deploy to staging/production (learnings recorded in squad agents)
# Step 3: Run sync (captures those learnings)
$ npx @jmservera/squad-speckit-bridge sync specs/001-feature/
```

**Sync multiple specs if you want cross-feature learnings:**
```bash
# If you did auth (001) and then API (002):
$ npx @jmservera/squad-speckit-bridge sync specs/001-auth/
$ npx @jmservera/squad-speckit-bridge sync specs/002-api/
# Both sets of learnings now available for next planning cycle
```

**Check what was synced:**
```bash
$ npx @jmservera/squad-speckit-bridge sync specs/001-feature/ --verbose --dry-run
# Preview: "Would sync 5 decisions, 12 learnings"
# Then run without --dry-run to commit the sync
```

### CI/CD Integration

**For automated pipelines, use JSON output:**
```bash
#!/bin/bash
set -e

# Generate context and capture JSON
CONTEXT=$(npx @jmservera/squad-speckit-bridge context specs/001-feature/ --json)
CONTEXT_SIZE=$(echo "$CONTEXT" | jq '.metadata.outputSize')

echo "Context generated: $CONTEXT_SIZE bytes"

# Create issues with JSON output
RESULT=$(npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --json)
ISSUE_COUNT=$(echo "$RESULT" | jq '.created | length')

echo "Created $ISSUE_COUNT issues"
exit 0  # Success
```

**For GitHub Actions, set GITHUB_TOKEN from secrets:**
```yaml
jobs:
  bridge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx @jmservera/squad-speckit-bridge install --quiet
      - run: npx @jmservera/squad-speckit-bridge context specs/001-feature/ --json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Monitoring & Health Checks

**Run status before each planning cycle:**
```bash
$ npx @jmservera/squad-speckit-bridge status
# ✓ All components operational? Then proceed
# ⚠ Constitution not customized? Teams may want to create one
```

**Track context quality over time:**
```bash
# Before planning, run:
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --verbose | tee context.log
# Extract: "Included X of Y decisions" — should trend upward
# If trending downward, decisions are aging out; review and archive
```

**Use `--notify` for agent awareness (v0.2+):**
```bash
# If you want Squad agents to know context was generated:
$ npx @jmservera/squad-speckit-bridge context specs/001-feature/ --notify
# Bridge writes notification to .squad/, agents see it next turn
```
