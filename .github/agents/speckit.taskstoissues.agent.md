---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL

## Bridge Integration: From SpecKit Planning to Squad Execution

This command is the **primary bridge** between SpecKit planning and Squad execution:

**What this command does**:
- Converts tasks.md (specification-driven task breakdown) into GitHub issues
- Adds labels for traceability (Task IDs, User Story markers)
- Maps dependencies as issue links
- Creates "ready-to-assign" issues for Squad Coordinator

**Why use this command** (`sqsk issues` or `/speckit.taskstoissues`):
1. **Closes the loop** — Spec → Plan → Tasks → **Issues** (handoff point)
2. **Enables Squad coordination** — Coordinator assigns issues to agents with clear acceptance criteria
3. **Captures learnings** — Issues updated during execution feed insights back to next planning cycle
4. **Maintains traceability** — Link from requirement (spec) → task (tasks.md) → issue → code commit → learnings

**Pipeline**:
1. Spec generated (`/speckit.specify`)
2. Plan created (`/speckit.plan`, with automatic squad-context injection if bridge enabled)
3. Tasks generated (`/speckit.tasks`)
4. **Issues created** (this command: `/speckit.taskstoissues` = `sqsk issues`)
5. Squad execution (Coordinator assigns, agents implement, document learnings)
6. `sqsk sync` (learnings captured back to Squad memory)
7. **Next cycle**: Planning benefits from prior learnings via squad-context injection

**Expected outcome**: When this command completes, your team has GitHub issues ready for Squad assignment, with full traceability to planning artifacts.

