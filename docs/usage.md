---
layout: default
---

# Usage Guide

This guide walks through the Squad-SpecKit Bridge workflow: from planning to execution to learning sync.

## The Bridge Workflow Loop

```
┌─────────────────────────────────────────────────────────────┐
│  Spec Kit Planning Cycle                                    │
│  /speckit.specify → /speckit.plan → /speckit.tasks         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │ Memory Bridge               │
        │ (context injection)         │
        └────────┬───────────────────┘
                 │ Injects Squad learnings
                 │ to inform planning
                 ↓
        ┌────────────────────────────┐
        │ Design Review Ceremony      │
        │ (squad-speckit-bridge       │
        │  review)                    │
        └────────┬───────────────────┘
                 │ Team reviews tasks
                 │ Refines if needed
                 ↓
        ┌────────────────────────────┐
        │ Issue Creation              │
        │ (Spec Kit tasks →           │
        │  GitHub Issues)             │
        └────────┬───────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Squad Execution                                            │
│  Ralph (triage) → Agents (work) → Review & Close Issues    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │ Learning Sync               │
        │ (squad-speckit-bridge       │
        │  sync)                      │
        └────────┬───────────────────┘
                 │ Execution learnings
                 │ flow back to Squad
                 ↓
        [Loop back to planning]
```

## 1. Memory Bridge: Injecting Squad Context

### Before Planning

Before starting a new Spec Kit planning cycle, inject learnings from Squad's execution:

```bash
npx squad-speckit-bridge context
```

**What it does:**
- Reads Squad memory artifacts (`.squad/skills/*/`, `.squad/decisions.md`, `.squad/agents/*/history.md`)
- Summarizes them into a `squad-context.md` file in the spec directory
- Applies relevance scoring and context budgets to prevent overwhelming the planner
- Spec Kit's planning templates automatically reference this context

**Example: squad-context.md generated**

```markdown
# Squad Context for Planning

## Recent Team Learnings (Prioritized by Recency)

### Database Integration (From Ralph's History)
- PostgreSQL connection pooling works well under load
- N+1 queries are our biggest performance bottleneck
- Use DataLoader pattern for batch queries

### API Design Decisions
- RESTful endpoints more maintainable than GraphQL for this team size
- Error responses standardized: {code, message, details}

## Team Decisions Relevant to New Planning

- Framework Choice: Squad + Spec Kit complementary (not competing)
- GitHub Integration: Progressive adoption (don't force all features)
- Code Review: All PRs require at least one approver before merge
```

### Configuration

Control context injection in `bridge.config.json`:

```json
{
  "memory": {
    "contextBudget": 8000,
    "prioritizeRecent": true,
    "maxAgentHistories": 3,
    "relevanceThreshold": 0.6
  }
}
```

## 2. Design Review Ceremony

### After Spec Kit Generates Tasks

Once `/speckit.tasks` completes and generates `specs/NNN/tasks.md`, run the design review:

```bash
npx squad-speckit-bridge review specs/NNN/tasks.md
```

**What the ceremony does:**
1. Parses Spec Kit's task breakdown (from `tasks.md`)
2. Displays each task with context and dependencies
3. Opens interactive review session where the Squad lead:
   - Sees task descriptions and effort estimates
   - Checks against team's recent learnings
   - Flags inconsistencies or missed dependencies
   - Adds team notes and constraints
4. Exports a reviewed `tasks-reviewed.md` with team annotations
5. (Optionally) Creates GitHub issues from the reviewed tasks

**Interactive review example:**

```
┌────────────────────────────────────────────┐
│  Design Review: Feature 032-Auth-Refactor  │
└────────────────────────────────────────────┘

Task 1: Extract shared auth middleware
───────────────────────────────────────
Effort: 3 points
Dependencies: Task 2
Context: Team has learned that middleware ordering matters (see learnings)

[Review Options]
(a) Approve  (m) Add note  (f) Flag concern  (s) Skip  (q) Quit

> m
Note: "Check our middleware order learnings in Ralph's history"

Task 2: Add rate limiting to API routes
...
```

### Reviewing Tasks Checklist

When reviewing tasks, check:

- ✅ Task descriptions match team's context and learnings
- ✅ Effort estimates are realistic given recent velocity
- ✅ Dependencies are clearly marked and sequenced
- ✅ No contradictions with prior decisions (check squad-context.md)
- ✅ Acceptance criteria are testable
- ✅ Blocked or risky tasks are flagged

## 3. Issue Creation

### Automatic Issue Creation

After design review, create GitHub issues:

```bash
npx squad-speckit-bridge issues specs/NNN/tasks-reviewed.md
```

**What it does:**
- Converts each reviewed task into a GitHub issue
- Adds `squad` label (configurable)
- Links related issues via GitHub issue references
- Assigns to agents based on strategy (round-robin, random, or manual)
- Populates issue body with task description, acceptance criteria, and effort estimate

**Generated Issue Example:**

```markdown
# Extract shared auth middleware

Squad effort estimate: 3 points
Related tasks: #532, #535

## Description
Move authentication logic into a shared middleware module so all
routes can reuse it without duplication. This will reduce the
attack surface and make security updates easier.

## Acceptance Criteria
- [ ] Shared middleware module created in `src/middleware/auth.ts`
- [ ] All routes updated to use shared middleware
- [ ] Middleware handles errors gracefully
- [ ] Existing tests continue to pass
- [ ] New middleware has >90% coverage

## Dependencies
- Requires #530 (Add rate limiting)

## Squad Context
From recent learnings, middleware ordering is critical.
See .squad/agents/*/history.md for authentication patterns.

Labels: squad, auth, refactor
```

### Configuration

Control issue creation in `bridge.config.json`:

```json
{
  "review": {
    "autoCreateIssues": false,
    "issueTemplate": "tasks-to-issues.hbs",
    "defaultLabel": "squad",
    "additionalLabels": ["engineering"],
    "assignmentStrategy": "round-robin",
    "assignmentPool": []
  }
}
```

## 4. Learning Sync

### After Squad Executes Tasks

Once Squad completes a cycle and agents close issues, sync learnings back:

```bash
npx squad-speckit-bridge sync
```

**What it does:**
- Reads closed issues and their associated Squad activity
- Extracts learnings from agent histories (`.squad/agents/*/history.md`)
- Injects them into Squad's memory system
- Prepares them for injection into the next Spec Kit planning cycle (closing the loop)
- Logs sync results

**Learnings captured:**
- What worked well (positive signal)
- What was harder than expected (effort estimation feedback)
- Blockers and decisions made during execution
- New patterns discovered by agents
- Performance or quality observations

## CLI Reference

### `npx squad-speckit-bridge init`

Initialize the bridge in your project.

```bash
npx squad-speckit-bridge init [options]

Options:
  --squad-path <path>         Path to Squad directory (default: .squad/)
  --speckit-path <path>       Path to Spec Kit directory (default: .specify/)
  --config-file <path>        Config file location (default: bridge.config.json)
  --auto-workflow             Set up GitHub Actions workflow (default: false)
  --verbose                   Verbose output
```

### `npx squad-speckit-bridge context`

Inject Squad memory before planning.

```bash
npx squad-speckit-bridge context [options]

Options:
  --spec-dir <path>           Spec Kit directory (default: .specify/)
  --output <path>             Output file for context (default: squad-context.md)
  --budget <tokens>           Context budget (default: from config)
  --format <json|markdown>    Output format (default: markdown)
```

### `npx squad-speckit-bridge review <task-file>`

Run design review ceremony.

```bash
npx squad-speckit-bridge review <path-to-tasks.md> [options]

Options:
  --interactive               Interactive review mode (default: true)
  --output <path>             Save reviewed tasks to file
  --focus <pattern>           Review only tasks matching pattern
```

### `npx squad-speckit-bridge issues <task-file>`

Create GitHub issues from reviewed tasks.

```bash
npx squad-speckit-bridge issues <path-to-tasks-reviewed.md> [options]

Options:
  --dry-run                   Show what would be created without creating
  --auto-assign               Assign issues (default: from config)
  --labels <label1,label2>    Additional labels to apply
```

### `npx squad-speckit-bridge sync`

Sync learnings back to Squad.

```bash
npx squad-speckit-bridge sync [options]

Options:
  --since <date>              Sync learnings since date (ISO 8601)
  --closed-issues             Sync from closed GitHub issues
  --output <path>             Save sync report
```

### `npx squad-speckit-bridge status`

Check bridge status and configuration.

```bash
npx squad-speckit-bridge status [--verbose]
```

## Example: Complete Workflow

### Day 1: Planning

```bash
# Inject learnings from previous cycles
npx squad-speckit-bridge context

# Run Spec Kit planning cycle
npx speckit specify
npx speckit plan
npx speckit tasks

# Review with team
npx squad-speckit-bridge review specs/032/tasks.md

# Create issues
npx squad-speckit-bridge issues specs/032/tasks-reviewed.md
```

### Days 2-5: Execution

Squad agents pick up issues and execute. They document learnings as they go.

### Day 6: Sync Learnings

```bash
# Sync learnings back to Squad memory
npx squad-speckit-bridge sync

# Prepare for next cycle
npx squad-speckit-bridge context --output next-cycle-context.md
```

---

**Note:** 🚧 This guide documents the planned usage experience. The commands and workflows described are not yet implemented.
