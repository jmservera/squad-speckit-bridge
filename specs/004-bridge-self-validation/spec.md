# Feature Specification: Bridge Self-Validation & Knowledge Loop

**Feature Branch**: `004-bridge-self-validation`
**Created**: 2025-07-17
**Status**: Draft
**Input**: User description: "Bridge Self-Validation & Knowledge Loop — Dog-food the bridge, close the knowledge loop, reduce process overhead"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Context-Driven Planning (Priority: P1)

As a team using the bridge, I want the `sqsk context` command to generate a `squad-context.md` file that summarizes agent learnings, decisions, skills, and patterns from past work, so that SpecKit planning agents can make better decisions informed by what the team has already learned.

Today, knowledge flows only one way (SpecKit → Squad via tasks.md). The reverse flow — Squad's accumulated wisdom feeding back into SpecKit planning — has never been activated. The `squad-context.md` file was designed as the primary value proposition of the bridge, yet it has never been generated in actual use.

**Why this priority**: This is the core value proposition of the bridge. Without context flowing from Squad memory into SpecKit planning, the bridge is a one-way pipe. Every other improvement builds on this foundation — if planning doesn't benefit from past learnings, the knowledge loop stays broken.

**Independent Test**: Can be fully tested by running `sqsk context` against the existing `.squad/` directory and verifying the output file contains structured summaries. Delivers immediate value by making this feature's own planning better-informed.

**Acceptance Scenarios**:

1. **Given** a project with `.squad/skills/`, `.squad/decisions/`, and `.squad/agents/` directories containing prior work artifacts, **When** a user runs `sqsk context`, **Then** a `squad-context.md` file is generated containing structured summaries of skills, decisions, and agent learnings.
2. **Given** a generated `squad-context.md` file exists in the expected location, **When** a SpecKit planning agent (e.g., `speckit.plan` or `speckit.specify`) runs, **Then** the agent reads and incorporates the context document into its planning output.
3. **Given** the `.squad/` directories are empty or missing, **When** a user runs `sqsk context`, **Then** a valid but minimal `squad-context.md` is produced with a note indicating no prior learnings are available.
4. **Given** a `squad-context.md` already exists, **When** `sqsk context` is run again, **Then** the file is overwritten with the latest content (no versioning or backup required — context is always regenerable from Squad memory, and cycle count metadata is preserved in the regenerated file).

---

### User Story 2 — Bridge-Native Issue Creation (Priority: P1)

As a team using the bridge, I want the `sqsk issues` command to reliably create GitHub issues from `tasks.md`, so that I never need to write custom shell scripts to create issues.

In v0, `sqsk issues` was bypassed entirely in favor of a 22KB shell script. The command needs to handle real-world task counts, support dry-run previews, and produce well-labeled issues so that teams trust it over manual workarounds.

**Why this priority**: Issue creation is the most visible bridge touchpoint — it's where SpecKit tasks become GitHub issues that agents work on. If teams don't trust this command, they'll continue to bypass the bridge entirely, as happened in v0.

**Independent Test**: Can be fully tested by running `sqsk issues --dry-run` against a real `tasks.md` file and verifying the output matches expected GitHub issue structure. Full end-to-end test creates actual issues via GitHub CLI.

**Acceptance Scenarios**:

1. **Given** a `tasks.md` file with unchecked tasks, **When** a user runs `sqsk issues`, **Then** GitHub issues are created for each unchecked task with proper titles, descriptions, and labels.
2. **Given** a `tasks.md` file with 20+ tasks, **When** a user runs `sqsk issues`, **Then** all issues are created reliably without timeouts or partial failures (using batching or rate-limit handling).
3. **Given** a user wants to preview issues before creation, **When** a user runs `sqsk issues --dry-run`, **Then** a summary of issues that would be created is displayed without making any changes to GitHub.
4. **Given** issues have already been created for some tasks, **When** a user runs `sqsk issues` again, **Then** duplicate issues are not created for tasks that already have linked issues.
5. **Given** a hierarchical label taxonomy is defined (e.g., `area/*`, `type/*`, `agent/*`), **When** issues are created, **Then** labels are applied following the defined hierarchy.

---

### User Story 3 — Learning Sync After Implementation (Priority: P2)

As a team using the bridge, I want `sqsk sync` to capture implementation learnings from agent execution and feed them back into the Squad knowledge base, so that future planning cycles benefit from what was learned during implementation.

This is the "close the loop" story. After agents complete their implementation tasks, the patterns they discovered, decisions they made, and problems they solved should flow back into `.squad/` for future reference.

**Why this priority**: Without sync, the knowledge loop stays open. Each iteration starts from scratch instead of building on prior learnings. This is P2 because it requires context generation (P1) to be working first — sync is the return path of the same knowledge flow.

**Independent Test**: Can be fully tested by running `sqsk sync` after a simulated implementation phase and verifying that new entries appear in `.squad/decisions/` or `.squad/agents/` history.

**Acceptance Scenarios**:

1. **Given** agent execution logs exist in `.squad/agents/` with recent implementation work, **When** a user runs `sqsk sync`, **Then** key learnings, patterns, and decisions are extracted and written to Squad memory.
2. **Given** no new agent execution has occurred since the last sync, **When** a user runs `sqsk sync`, **Then** the command completes gracefully with a message indicating nothing new to sync.
3. **Given** a sync has completed, **When** `sqsk context` is subsequently run, **Then** the newly synced learnings appear in the generated `squad-context.md`.

---

### User Story 4 — Agent Prompt Bridge Integration (Priority: P2)

As a team using SpecKit agents through Copilot (not CLI), I want the agent prompts to explicitly invoke bridge commands at the right moments, so that the bridge's value is delivered even though CLI hooks don't fire in the agent workflow.

The three hooks (`before_specify`, `after_tasks`, `after_implement`) were designed for CLI usage, but SpecKit agents run through Copilot's agent framework, which never triggers these hooks. The result: zero hooks fired in v0.

**Why this priority**: This directly addresses why the bridge was unused in v0. Hooks are the mechanism for integration, and they simply don't fire. Without this fix, all other improvements remain invisible to users working through agents.

**Independent Test**: Can be verified by reading agent prompt files and confirming they contain bridge command instructions. End-to-end test: run a SpecKit agent and verify bridge commands are invoked as part of the workflow.

**Acceptance Scenarios**:

1. **Given** a user invokes `speckit.specify`, **When** the agent starts its workflow, **Then** the agent prompt includes instructions to run `sqsk context` to inject Squad knowledge before generating the spec.
2. **Given** a user invokes `speckit.tasks`, **When** task generation completes, **Then** the agent prompt includes instructions to run `sqsk issues` (or offer to run it) to create GitHub issues.
3. **Given** a user invokes `speckit.implement`, **When** implementation completes, **Then** the agent prompt includes instructions to run `sqsk sync` to capture learnings.
4. **Given** the bridge is not installed (i.e., `sqsk` command is unavailable), **When** a SpecKit agent runs, **Then** the agent detects the absence and displays a warning suggesting bridge installation, but continues its work normally.

---

### User Story 5 — Design Review Activation (Priority: P2)

As a team lead, I want `sqsk review` to work when invoked, cross-referencing the spec against the actual implementation, so that I can verify implementation fidelity before closing a feature.

The Design Review ceremony is documented in `.squad/skills/speckit-bridge/ceremony.md` but has never been exercised. This story ensures it functions end-to-end.

**Why this priority**: Design reviews are a quality gate. They catch drift between what was planned and what was built. Without an active review ceremony, there's no systematic way to verify implementation fidelity.

**Independent Test**: Can be fully tested by running `sqsk review` against an existing spec+implementation pair (e.g., the `003-e2e-demo-script` feature) and verifying a structured review output is produced.

**Acceptance Scenarios**:

1. **Given** a feature with a `spec.md` and corresponding implementation files, **When** a user runs `sqsk review`, **Then** a structured review document is produced comparing spec requirements against implementation.
2. **Given** the implementation is missing requirements from the spec, **When** the review runs, **Then** gaps are clearly identified with references to both the spec requirement and the missing implementation.
3. **Given** no implementation exists yet, **When** a user runs `sqsk review`, **Then** the command reports that no implementation is available to review and exits gracefully.

---

### User Story 6 — Right-Sized Task Generation (Priority: P2)

As a team using SpecKit for task planning, I want the task generation process to produce 15–20 well-scoped tasks per feature (instead of 50+), with each task including its associated tests, so that agents can complete tasks efficiently without being overwhelmed or under-utilized.

In v0, features generated ~50 tasks with a separate testing phase. This led to a 7:1 planning-to-implementation ratio and a long tail of 33 orphaned issues. Tasks should be coarser-grained, group related changes, and include their own test expectations.

**Why this priority**: Task granularity directly affects everything downstream — agent assignment, issue management, and implementation velocity. Too many tasks creates coordination overhead; too few loses trackability. The retrospective's P0 recommendation was to reduce by 3x.

**Independent Test**: Can be verified by running `speckit.tasks` on a feature spec and counting the output tasks. Pass criteria: 15–20 tasks, each with a test section.

**Acceptance Scenarios**:

1. **Given** a feature specification, **When** `speckit.tasks` generates a task breakdown, **Then** the output contains between 15 and 20 tasks.
2. **Given** a generated task list, **When** reviewing individual tasks, **Then** each task includes a "Tests" subsection describing the unit or integration tests that validate the task's implementation.
3. **Given** related changes that could be separate tasks (e.g., "create entity" + "create entity tests" + "register entity in container"), **When** tasks are generated, **Then** these are grouped into a single task rather than split across multiple tasks.
4. **Given** the previous task template produced 50 tasks, **When** the updated template is used, **Then** the output is at least 50% fewer tasks while covering the same scope.

---

### User Story 7 — Balanced Agent Distribution (Priority: P3)

As a team coordinator, I want the system to detect when one agent is assigned more than 50% of implementation tasks and suggest rebalancing, so that work is distributed more evenly across the team.

In v0, Dinesh handled 92% of implementation (193 of 210 issues). This creates a single point of failure and underutilizes other agents' capabilities.

**Why this priority**: Distribution awareness is important but is a monitoring/advisory concern rather than a blocking functional requirement. The team can function with imbalanced distribution — it's just suboptimal.

**Independent Test**: Can be tested by creating a mock issue assignment where one agent has >50% and verifying the system produces a rebalancing warning.

**Acceptance Scenarios**:

1. **Given** issues are assigned to agents, **When** one agent has more than 50% of the total issues, **Then** the coordinator produces a warning with a suggested redistribution.
2. **Given** issues are evenly distributed (no agent above 50%), **When** distribution is checked, **Then** no warning is produced.
3. **Given** a rebalancing warning is produced, **When** the coordinator displays it, **Then** the suggestion includes which issues could be moved and to which agent, based on agent skills.

---

### User Story 8 — Skills-Aware Agent Routing (Priority: P3)

As a team using the Squad coordinator, I want the coordinator to include relevant skills from `.squad/skills/` in agent spawn prompts, so that agents have access to documented patterns and conventions when executing tasks.

Skills files exist (clean-architecture-bridge, speckit-bridge, project-conventions) but were never referenced in v0 spawn prompts. Skill-aware routing is documented but not implemented.

**Why this priority**: Skills improve agent output quality, but agents can function without them (they did in v0). This is an optimization that enhances quality rather than unblocking functionality.

**Independent Test**: Can be verified by inspecting agent spawn prompts after coordinator assignment and confirming relevant skill content is included.

**Acceptance Scenarios**:

1. **Given** an agent is assigned a task related to clean architecture, **When** the coordinator spawns the agent, **Then** the spawn prompt includes content from `.squad/skills/clean-architecture-bridge/SKILL.md`.
2. **Given** an agent is assigned a task involving SpecKit integration, **When** the coordinator spawns the agent, **Then** the spawn prompt includes content from `.squad/skills/speckit-bridge/SKILL.md`.
3. **Given** no relevant skills exist for a task, **When** the coordinator spawns the agent, **Then** the agent is spawned without additional skill content and no error occurs.

---

### User Story 9 — Dead Code Cleanup (Priority: P3)

As a maintainer of the bridge codebase, I want the ~1,500 lines of dead code identified in the integration analysis to be either exercised (covered by tests or active usage paths) or removed, so that the codebase is lean and every line serves a purpose.

From Richard's analysis: only 1 of 7 commands was ever used, creating a substantial amount of code that has never been exercised in a real workflow.

**Why this priority**: Dead code is a maintenance burden but doesn't block functionality. This is a codebase health concern best addressed alongside the functional changes that will exercise previously-dead paths.

**Independent Test**: Can be verified by running test coverage analysis before and after cleanup, and confirming that remaining code has active usage paths or test coverage.

**Acceptance Scenarios**:

1. **Given** the bridge codebase, **When** a dead code audit is performed, **Then** a report identifies code paths that have no tests and no active usage (unreachable or never-invoked code).
2. **Given** identified dead code, **When** the code is related to a command being fixed in this iteration (context, issues, sync, review), **Then** the code is exercised by adding tests or activating the usage path.
3. **Given** identified dead code that is not related to any active command, **When** the cleanup is performed, **Then** the code is removed with a note in the changelog.
4. **Given** cleanup is complete, **When** test coverage is measured, **Then** overall code coverage has increased compared to the baseline.

---

### Edge Cases

- What happens when `.squad/` directory structure is partially present (e.g., `skills/` exists but `decisions/` doesn't)? Context generation should handle partial structures gracefully, producing context from whatever is available.
- What happens when `tasks.md` contains tasks from a previous feature that already have issues? Deduplication MUST match on task title only (not content). Title matching is deterministic and sufficient — task descriptions may evolve between runs, making content matching unreliable. The `gh issue list --label <labels> --json title` query returns existing titles for exact-match comparison.
- What happens when GitHub rate limits are hit during batch issue creation? The system should pause and retry with backoff, providing clear progress feedback to the user.
- What happens when `sqsk review` is invoked mid-implementation (not at the end)? The review should report on what's been implemented so far, noting incomplete areas.
- What happens when agent spawn prompts exceed context window limits after skill injection? The system should prioritize the most relevant skills and truncate or summarize lower-priority content.
- What happens when `sqsk sync` is run but no agents have actually executed (empty history)? The command should exit cleanly with an informational message, no error.
- What happens when multiple features are being worked on simultaneously and `sqsk context` is run? The context should be project-wide (not feature-scoped) since Squad memory is shared.
- What happens when the label taxonomy has labels that don't exist in the GitHub repository? `sqsk issues` MUST warn the user about missing labels but MUST NOT auto-create them (auto-creation risks orphaned or misspelled labels; the user should create labels deliberately via GitHub settings).

## Requirements *(mandatory)*

### Functional Requirements

#### Context Generation & Consumption

- **FR-001**: `sqsk context` MUST generate a `squad-context.md` file that summarizes agent learnings, decisions, skills, and patterns from the `.squad/` directory.
- **FR-002**: The generated `squad-context.md` MUST include sections for: team skills summary, recent decisions, agent learnings, and recurring patterns.
- **FR-003**: SpecKit planning agents (`speckit.specify`, `speckit.plan`, `speckit.tasks`) MUST read and incorporate `squad-context.md` when it is present.
- **FR-004**: `sqsk context` MUST handle missing or partial `.squad/` structures gracefully, producing a valid output with available information.

#### Issue Creation

- **FR-005**: `sqsk issues` MUST create GitHub issues from unchecked tasks in a `tasks.md` file.
- **FR-006**: `sqsk issues` MUST support a `--dry-run` flag that previews issues without creating them.
- **FR-007**: `sqsk issues` MUST handle large task counts (20+ tasks) without timeouts or partial failures.
- **FR-008**: `sqsk issues` MUST prevent duplicate issue creation when run multiple times against the same `tasks.md`.
- **FR-009**: `sqsk issues` MUST apply labels following a hierarchical taxonomy (e.g., `area/*`, `type/*`, `agent/*`).

#### Learning Sync

- **FR-010**: `sqsk sync` MUST extract learnings from agent execution histories in `.squad/agents/` and write them back to Squad memory.
- **FR-011**: `sqsk sync` MUST be idempotent — running it multiple times without new execution data produces no duplicate entries.
- **FR-012**: Learnings captured by `sqsk sync` MUST be available in the next `sqsk context` generation.

#### Design Review

- **FR-013**: `sqsk review` MUST produce a structured comparison between a feature's `spec.md` requirements and the corresponding implementation.
- **FR-014**: `sqsk review` MUST identify gaps where spec requirements are not addressed by implementation.
- **FR-015**: `sqsk review` MUST handle the case where no implementation exists by reporting the absence without error.

#### Hook Gap Workaround

- **FR-016**: SpecKit agent prompts (`speckit.specify`, `speckit.plan`, `speckit.tasks`, `speckit.implement`) MUST include explicit instructions to invoke the corresponding bridge commands (`sqsk context`, `sqsk issues`, `sqsk sync`).
- **FR-017**: Each modified agent prompt MUST include an advisory check: if the `sqsk` command is unavailable (e.g., bridge not installed), the agent MUST display a user-facing warning suggesting bridge installation but MUST continue its workflow normally. This is implemented as conditional logic in the agent prompt text, not as a runtime detection system (SpecKit agents run in Copilot's agent framework, which has no hook mechanism for external tooling checks).

#### Task Granularity & Test Co-location

- **FR-018**: The task generation process MUST produce between 15 and 20 tasks per feature.
- **FR-019**: Each generated task MUST include a "Tests" subsection describing the tests that validate the task's implementation.
- **FR-020**: Related changes (e.g., entity creation, registration, and testing) MUST be grouped into single tasks rather than split across separate tasks.

#### Agent Distribution

- **FR-021**: The coordinator MUST detect when a single agent is assigned more than 50% of total implementation issues (detection threshold). Note: SC-006 uses a 60% ceiling as the *success criterion* for this feature — 50% triggers advisory warnings, while exceeding 60% represents a failure to rebalance.
- **FR-022**: When distribution imbalance is detected (>50% threshold), the coordinator MUST suggest a rebalancing plan that considers agent skills.

#### Skills Integration

- **FR-023**: The coordinator MUST include relevant skill content from `.squad/skills/` in agent spawn prompts when assigning tasks.
- **FR-024**: Skill inclusion MUST be based on task-to-skill relevance matching (not all skills for all tasks).
- **FR-025**: Skill injection MUST respect context window limits by prioritizing the most relevant skills.

#### Dead Code Cleanup

- **FR-026**: A dead code audit MUST identify bridge code paths with no test coverage and no active usage.
- **FR-027**: Dead code associated with commands being fixed in this iteration MUST be exercised (via tests or activation), not removed.
- **FR-028**: Dead code not associated with any active command MUST be removed.

### Key Entities

- **Squad Context Document** (`squad-context.md`): A generated summary of the Squad team's accumulated knowledge — skills, decisions, learnings, and patterns. Serves as the bridge between Squad memory and SpecKit planning. Key attributes: generation timestamp, source directories summarized, sections for each knowledge type.
- **Agent Learning**: A recorded insight, pattern, decision, or problem-solution pair captured during agent execution. Stored in `.squad/agents/` history. Key attributes: agent name, timestamp, feature context, learning content, category (pattern/decision/problem/insight).
- **Task**: An implementation work item produced by SpecKit task generation. Key attributes: title, description, acceptance criteria, associated tests, assigned agent, priority, labels.
- **Skill**: A documented capability, pattern, or convention in `.squad/skills/`. Key attributes: skill name, applicable contexts, content, version.
- **Design Review**: A structured comparison document produced by `sqsk review` that cross-references spec requirements against implementation. Key attributes: feature reference, requirement coverage map, identified gaps, overall assessment.
- **Label Taxonomy**: A hierarchical system for categorizing GitHub issues. Organized by prefix (e.g., `area/bridge`, `type/bug`, `agent/dinesh`). Key attributes: prefix category, label name, description, color.

## Assumptions

- GitHub CLI (`gh`) is installed and authenticated in the development environment for issue creation.
- The Squad agent roster (Ralph/Coordinator, Dinesh, Gilfoyle, Richard) continues as the team composition for this iteration.
- The `.squad/` directory structure follows the conventions established in v0 (`skills/`, `decisions/`, `agents/`, `orchestration-log/`).
- SpecKit agent prompt files (`.github/agents/*.agent.md` and `.github/prompts/*.prompt.md`) can be modified without breaking Copilot agent framework compatibility.
- The label taxonomy will follow the prefix-based hierarchy shown in the v0 retrospective: `area/*`, `type/*`, `agent/*` (e.g., `area/bridge`, `type/feature`, `agent/dinesh`).
- "15–20 tasks" is a target range — features with genuinely smaller or larger scope may fall slightly outside this range with documented justification.
- Skills are matched to tasks by keyword and topic relevance rather than a formal taxonomy or tagging system.
- The bridge will dog-food its own tools during this feature's lifecycle — this feature serves as both the specification and the validation of the bridge.

## Out of Scope

- MCP server implementation (deferred to v1.0 Phase 3)
- New SpecKit agents beyond modifying existing agent prompts
- Constitution customization gate (P1, deferred to a future iteration)
- Changes to the Squad agent framework itself (only coordinator behavior changes)
- Automated agent skill generation (skills are manually authored for now)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: This feature itself is specified, planned, tasked, and implemented using the bridge tools — `sqsk context`, `sqsk issues`, `sqsk sync`, and `sqsk review` are all invoked during the feature lifecycle (self-validation).
- **SC-002**: `squad-context.md` is generated and consumed during this feature's planning phase — the planning output references or incorporates at least one insight from the generated context.
- **SC-003**: 100% of GitHub issues for this feature are created via `sqsk issues` — zero custom shell scripts are used for issue creation.
- **SC-004**: `sqsk sync` runs after implementation completes and captures at least one learning entry that appears in subsequent `sqsk context` output.
- **SC-005**: Task generation for this feature produces between 15 and 20 tasks (not 50+), representing a ≥50% reduction from v0 task counts.
- **SC-006**: At least 2 different agents each handle ≥20% of implementation tasks — no single agent handles more than 60%.
- **SC-007**: Every implementation task includes its associated tests — there is no separate "testing phase" in the task breakdown.
- **SC-008**: Test coverage of the bridge codebase increases from baseline after dead code cleanup, and the dead code audit report accounts for 100% of the ~1,500 lines identified in the integration analysis.
- **SC-009**: `sqsk review` successfully produces a design review for at least one feature, cross-referencing spec requirements against implementation.

## Clarifications

### Session 2026-03-24

- Q: Context versioning vs overwrite — should `sqsk context` preserve previous versions of `squad-context.md`? → A: Overwrite-only. Context is always regenerable from Squad memory (the source of truth). Versioning adds complexity with no value. Cycle count metadata is preserved in the regenerated file. This aligns with the CLI contract which specifies "reads metadata for cycle count, then overwrites."
- Q: Should `sqsk issues` auto-create missing GitHub labels or only warn? → A: Warn-only, no auto-creation. Auto-creating labels risks orphaned or misspelled labels in the repository. Users should create labels deliberately via GitHub settings. This aligns with the CLI contract specification.
- Q: Should issue deduplication match on task title only or title + content? → A: Title-only matching. Title matching is deterministic and sufficient for deduplication. Content/description matching is unreliable because descriptions may evolve between runs. This aligns with the CLI contract (`gh issue list --label <labels> --json title`) and research findings.
- Q: Contradiction between 50% detection threshold (FR-021/US-7) and 60% success criterion (SC-006) for agent distribution — which is correct? → A: Both are correct but serve different purposes. 50% is the *detection/warning threshold* — the system warns when any agent exceeds this. 60% is the *success criterion for this feature* — a softer ceiling acknowledging that perfect balance across 4 agents isn't always achievable. FR-021 updated with clarifying note.
- Q: How does FR-017 detect that a bridge command was "expected but not invoked" in a Copilot agent context? → A: Advisory prompt text, not runtime detection. SpecKit agents run in Copilot's agent framework which has no hook mechanism. The "warning" is implemented as conditional logic in agent prompt text: check if `sqsk` is available, warn if not, but continue normally. FR-017 rewritten to specify this mechanism.
