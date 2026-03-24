# Tasks: Bridge Self-Validation & Knowledge Loop

**Input**: Design documents from `/specs/004-bridge-self-validation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/cli-interface.md, quickstart.md

**Tests**: Each task includes its own tests — there is no separate testing phase. Tests are bundled with implementation per SC-007.

**Organization**: Tasks are grouped by user story from spec.md to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add new entity types and pure functions required by multiple user stories

- [ ] T001 Add new entity types (DistributionAnalysis, AgentAssignment, DistributionWarning, RebalanceSuggestion, SkillMatch, SkillInjection, DeadCodeEntry, DeadCodeReport, SpecRequirement, RequirementCoverage, ImplementationReview) and pure functions (analyzeDistribution, matchSkillsToTask) to src/types.ts with unit tests in tests/unit/types.test.ts — see data-model.md for field definitions, validation rules, and test strategy per entity

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend port interfaces to define contracts for new capabilities across all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Extend port interfaces in src/bridge/ports.ts — add `listExisting(repo: string, labels: string[]): Promise<IssueRecord[]>` to IssueCreator port; add `readAgentCharters(): Promise<{agentName: string, skills: string[]}[]>` and `readSkillFiles(): Promise<{name: string, content: string, sizeBytes: number}[]>` to SquadStateReader port; add new SpecReader interface with `readRequirements(specPath: string): Promise<SpecRequirement[]>`; add new ImplementationScanner interface with `scanForEvidence(srcDir: string, requirement: SpecRequirement): Promise<string[]>` — all method signatures use only DTOs from src/types.ts per constitution rule IV

**Checkpoint**: Foundation ready — entity types, pure functions, and port contracts are in place for all user stories

---

## Phase 3: User Story 1 — Context-Driven Planning (Priority: P1) 🎯 MVP

**Goal**: Make `sqsk context` reliably generate squad-context.md from Squad memory with graceful handling of partial `.squad/` structures

**Independent Test**: Run `sqsk context specs/004-bridge-self-validation/` against the existing `.squad/` directory and verify output contains structured skills, decisions, and learnings sections

### Implementation for User Story 1

- [ ] T003 [P] [US1] Harden buildSquadContext use case in src/bridge/context.ts — add graceful handling for missing/partial `.squad/` subdirectories (skills/, decisions/, agents/), produce valid output with available data plus warnings for skipped sources, support empty-source scenarios that generate a minimal squad-context.md with an informational note; add unit tests in tests/unit/context.test.ts covering: partial `.squad/` structure (skills exist but decisions missing), completely empty `.squad/`, all sources present, and cycle-count increment on regeneration

- [ ] T004 [P] [US1] Harden SquadFileReader adapter in src/bridge/adapters/squad-file-reader.ts for missing directories (return empty arrays instead of throwing), empty files, and malformed frontmatter (skip with warning); harden SpecKitContextWriter in src/bridge/adapters/speckit-writer.ts for cycle metadata persistence (read previous `squad-context.md` metadata, increment cycleCount) and overwrite with latest content; add integration tests in tests/integration/squad-file-reader.test.ts for missing dirs and malformed files, and tests/integration/speckit-writer.test.ts for cycle metadata roundtrip — use realistic fixture data matching actual `.squad/` directory structure (7 agents, 2 skills, decisions.md)

**Checkpoint**: `sqsk context` generates valid squad-context.md from any `.squad/` state (full, partial, or empty)

---

## Phase 4: User Story 2 — Bridge-Native Issue Creation (Priority: P1)

**Goal**: Make `sqsk issues` reliably create GitHub issues with deduplication, batch handling, dry-run preview, and hierarchical labels

**Independent Test**: Run `sqsk issues --dry-run` against a real tasks.md and verify structured preview output with label taxonomy; run without `--dry-run` and verify issues created without duplicates

### Implementation for User Story 2

- [ ] T005 [P] [US2] Extend createIssuesFromTasks use case in src/issues/create-issues.ts — add deduplication logic (accept existing issues from IssueCreator.listExisting, match on task title, skip duplicates with "skipped" status in result), batch sequential creation with configurable delay (200ms default between calls), and hierarchical label enrichment (map task metadata to `area/*`, `type/*`, `agent/*` label prefixes per CLI contract); add unit tests in tests/unit/create-issues.test.ts covering: dedup skips existing issues, batch creates all non-duplicates, label enrichment maps correctly, empty task list produces empty result

- [ ] T006 [P] [US2] Implement IssueCreator.listExisting in src/issues/adapters/github-issue-adapter.ts — query existing issues via `gh issue list --label <labels> --state open --json title,number,labels` for deduplication, parse JSON response into IssueRecord[]; add rate-limited sequential batch execution (200ms delay between `gh issue create` calls); add integration tests in tests/integration/github-issue-adapter.test.ts with mocked `gh` CLI responses for both listExisting and batch creation scenarios

- [ ] T007 [US2] Wire deduplication and batch flow in src/main.ts createIssueCreator factory — call listExisting before createBatch, pass existing issues to use case for dedup filtering; update dry-run output formatting in src/main.ts (human format: numbered list with labels and "would be created"/"skipped (duplicate)" status; JSON format: `{created: [], skipped: [], dryRun: boolean, total: number}` per CLI contract); add tests verifying composition root correctly chains listExisting → dedup → createBatch

**Checkpoint**: `sqsk issues` creates, deduplicates, and previews issues reliably for 20+ tasks

---

## Phase 5: User Story 3 — Learning Sync (Priority: P2)

**Goal**: Make `sqsk sync` capture implementation learnings from agent execution and write them to Squad memory with idempotency

**Independent Test**: Run `sqsk sync specs/004-bridge-self-validation/` after agent execution and verify new learning entries appear in `.squad/agents/` history files

### Implementation for User Story 3

- [ ] T008 [P] [US3] Extend syncLearnings use case in src/sync/sync-learnings.ts — add agent history file parsing (read `.squad/agents/*/history.md` for timestamped entries), timestamp-based filtering (only entries newer than SyncState.lastSyncTimestamp), learning categorization into types (pattern, decision, problem, insight) based on entry content markers, and idempotency guarantee (update lastSyncTimestamp after write, skip on re-run); add unit tests in tests/unit/sync-learnings.test.ts covering: new entries synced, no-new-entries exits cleanly, duplicate entries skipped, category classification accuracy

- [ ] T009 [P] [US3] Extend SyncStateAdapter in src/sync/adapters/sync-state-adapter.ts — implement reading agent history files from `.squad/agents/*/history.md` with timestamp parsing, filtering entries by date comparison against last sync, and writing categorized learning entries via SquadMemoryWriter port; add integration tests in tests/integration/sync-state-adapter.test.ts with fixture history files containing timestamped entries across multiple agents

**Checkpoint**: `sqsk sync` extracts and writes learnings idempotently; subsequent `sqsk context` includes synced learnings

---

## Phase 6: User Story 4 — Agent Prompt Bridge Integration (Priority: P2)

**Goal**: Embed bridge command invocations in SpecKit agent prompts to close the hook gap where CLI hooks don't fire in the Copilot agent workflow

**Independent Test**: Read agent prompt files and confirm they contain `sqsk` command instructions with `command -v sqsk` detection and graceful fallback warning

### Implementation for User Story 4

- [ ] T010 [P] [US4] Modify SpecKit agent prompts to invoke bridge commands — add `sqsk context <spec-dir>` invocation instruction to .github/agents/speckit.specify.agent.md and .github/agents/speckit.plan.agent.md (run before generating spec/plan); add `sqsk issues <tasks-file>` offer to .github/agents/speckit.tasks.agent.md (offer after task generation); add `sqsk sync <spec-dir>` invocation to .github/agents/speckit.implement.agent.md (run after implementation completes); include `command -v sqsk` detection with graceful fallback warning ("Bridge not installed — run `sqsk install` for knowledge loop integration") in each modified agent file; update corresponding .github/prompts/speckit.specify.prompt.md, .github/prompts/speckit.plan.prompt.md, .github/prompts/speckit.tasks.prompt.md, and .github/prompts/speckit.implement.prompt.md with matching instructions

**Checkpoint**: SpecKit agents invoke bridge commands during their workflows (or warn if bridge is not installed)

---

## Phase 7: User Story 5 — Design Review Activation (Priority: P2)

**Goal**: Make `sqsk review` produce spec-vs-implementation fidelity comparisons in addition to existing design reviews

**Independent Test**: Run `sqsk review --mode fidelity` against an existing spec+implementation pair and verify requirement coverage matrix with gap identification

### Implementation for User Story 5

- [ ] T011 [P] [US5] Create SpecReader adapter in src/review/adapters/spec-reader.ts — implement SpecReader port by parsing spec.md for lines matching `- **FR-XXX**:` pattern, extracting requirement ID, text, and category; create ImplementationScanner adapter in src/review/adapters/impl-scanner.ts — implement ImplementationScanner port by scanning source files for keyword evidence of requirement implementation (match requirement keywords against file contents, check test file presence); add integration tests in tests/integration/spec-reader.test.ts (parse fixture spec.md with FR-001 through FR-028) and tests/integration/impl-scanner.test.ts (scan fixture source tree for matching evidence)

- [ ] T012 [US5] Add fidelity review mode to prepareReview use case in src/review/ceremony.ts — implement reviewImplementation function that accepts SpecReader + ImplementationScanner ports, iterates SpecRequirement[] to build RequirementCoverage[] with evidence/gaps, computes coveragePercent, produces ImplementationReview result with human-readable summary; add `--mode <design|fidelity>` flag to review CLI command in src/cli/index.ts; wire fidelity mode in src/main.ts createReviewer factory (instantiate SpecFileReader + ImplementationFileScanner, pass to reviewImplementation); add unit tests in tests/unit/ceremony.test.ts for fidelity mode with mocked ports (100% coverage, partial coverage, no implementation) and tests/unit/implementation-review.test.ts for RequirementCoverage aggregation

**Checkpoint**: `sqsk review --mode fidelity` produces structured requirement coverage report; `sqsk review --mode design` continues to work as before

---

## Phase 8: User Story 6 — Right-Sized Task Generation (Priority: P2)

**Goal**: Calibrate task generation to produce 15–20 tasks per feature with tests bundled into each task

**Independent Test**: Run `/speckit.tasks` on a feature spec and verify output contains 15–20 tasks, each with a "Tests" subsection

### Implementation for User Story 6

- [ ] T013 [P] [US6] Update task generation template in .specify/templates/tasks-template.md — add explicit granularity guidance (15–20 tasks target, not 50+), test co-location rules (each task MUST include a "Tests" subsection describing validation tests), grouping rules (entity creation + validation + registration + tests = single task, not 4 separate tasks), and examples of well-scoped vs over-split tasks; update .github/prompts/speckit.tasks.prompt.md with calibration instructions reinforcing the 15–20 task target and the "each task includes its own tests" mandate

**Checkpoint**: Task generation template enforces coarser-grained tasks with bundled tests

---

## Phase 9: User Story 7 — Balanced Agent Distribution (Priority: P3)

**Goal**: Detect agent assignment imbalance (>50% to one agent) and suggest rebalancing after issue creation

**Independent Test**: Create mock assignments with one agent holding >50% and verify warning output with rebalancing suggestions

### Implementation for User Story 7

- [ ] T014 [US7] Wire analyzeDistribution into issues pipeline — after issue creation (or dry-run) in src/main.ts, collect AgentAssignment[] from created/previewed issues' `agent/*` labels, call analyzeDistribution() from src/types.ts, display DistributionWarning[] in CLI output (human: "⚠️ Agent 'dinesh' assigned 65% of issues — consider rebalancing"; JSON: include `distribution` field in output); add readAgentCharters to SquadFileReader in src/bridge/adapters/squad-file-reader.ts for skill-based RebalanceSuggestion generation; add unit tests in tests/unit/distribution.test.ts verifying warning display for imbalanced and balanced scenarios, and suggestion generation referencing agent skills

**Checkpoint**: `sqsk issues` displays distribution imbalance warnings with skill-aware rebalancing suggestions

---

## Phase 10: User Story 8 — Skills-Aware Agent Routing (Priority: P3)

**Goal**: Match relevant skills to tasks for context-aware agent spawn prompts with budget-aware content injection

**Independent Test**: Match a clean-architecture task against `.squad/skills/` files and verify relevant skills returned with correct relevance scores and size-aware truncation

### Implementation for User Story 8

- [ ] T015 [US8] Implement skill matching pipeline — add readSkillFiles() method to SquadFileReader in src/bridge/adapters/squad-file-reader.ts (read `.squad/skills/*/SKILL.md`, return name + content + sizeBytes); create src/bridge/skill-matcher.ts with matchSkillsToTask implementation (score keyword overlap between TaskEntry description and SkillEntry patterns/context/antiPatterns, return SkillMatch[] sorted by relevance) and buildSkillInjection function (select top-N skills, sum contentSize against budgetBytes limit, truncate lowest-scoring if over budget, return SkillInjection); add unit tests in tests/unit/skill-matching.test.ts covering: keyword matching scores, budget truncation, no-match returns empty array, multiple skills ranked correctly; add integration test in tests/integration/squad-file-reader.test.ts for readSkillFiles against fixture SKILL.md files

**Checkpoint**: Skill matching scores tasks against skills; injection respects configurable context budget (default 8 KB)

---

## Phase 11: User Story 9 — Dead Code Cleanup (Priority: P3)

**Goal**: Audit, exercise, or remove ~1,500 lines of dead code to improve codebase coverage

**Independent Test**: Run `npm run test:coverage` before and after cleanup; verify coverage percentage increase and all remaining code has active usage paths or test coverage

### Implementation for User Story 9

- [ ] T016 [US9] Dead code audit and cleanup — run `npx vitest run --coverage` to generate baseline V8 coverage report; identify uncovered code paths and categorize each as untested (has tests elsewhere but not covered), unreachable (no call path), or unused_export (exported but never imported); for commands being fixed in this feature (context, issues, sync, review): exercise dead code paths with new tests in the corresponding test files; for orphan code not associated with any active command: remove and document removals in CHANGELOG.md with line counts; verify coverage improvement by running `npm run test:coverage` after changes; target: account for 100% of ~1,500 identified dead lines per SC-008

**Checkpoint**: Dead code is exercised (active commands) or removed (orphans); test coverage has increased from baseline

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final wiring, validation, and documentation updates

- [ ] T017 Wire all new features in src/main.ts composition root — ensure createContextBuilder, createIssueCreator, createSyncer, createReviewer factories instantiate new adapters (SpecFileReader, ImplementationFileScanner, extended SquadFileReader with readSkillFiles/readAgentCharters) and pass them to use cases; update package version to 0.3.0 in package.json; run full test suite (`npm test`) and verify all tests pass; run `npm run build` and verify TypeScript compilation succeeds; validate quickstart.md scenarios end-to-end; update CHANGELOG.md with feature summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 → T002)
- **User Stories (Phases 3–11)**: All depend on Phase 2 completion
  - User stories CAN proceed in parallel after Phase 2
  - Recommended sequential order: P1 stories first (US-1, US-2), then P2 (US-3, US-4, US-5, US-6), then P3 (US-7, US-8, US-9)
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

- **US-1 (Context)**: Independent — can start after Phase 2
- **US-2 (Issues)**: Independent — can start after Phase 2
- **US-3 (Sync)**: Logically follows US-1 (synced learnings appear in context output), but can be implemented independently
- **US-4 (Prompts)**: Independent — prompt text changes only, no code dependencies
- **US-5 (Review)**: Independent — new adapters and review mode, no dependency on other stories
- **US-6 (Task Calibration)**: Independent — template and prompt text changes only
- **US-7 (Distribution)**: Soft dependency on US-2 (wired into issues pipeline in main.ts); can share the createIssueCreator factory
- **US-8 (Skills Routing)**: Independent — new matching logic with its own adapter extension
- **US-9 (Dead Code)**: Best done last — cleanup benefits from all prior tests adding coverage to previously-dead paths

### Within Each User Story

- Entity types (T001) before port interfaces (T002) before implementations
- Adapters can be parallel [P] with use case work when they touch different files
- CLI wiring comes after use case + adapter are complete
- Each task includes its own tests — no separate test phase

### Parallel Opportunities

- **Phase 3 (US-1)**: T003 ‖ T004 (context.ts vs adapter files)
- **Phase 4 (US-2)**: T005 ‖ T006 (create-issues.ts vs github-issue-adapter.ts), then T007 sequential
- **Phase 5 (US-3)**: T008 ‖ T009 (sync-learnings.ts vs sync-state-adapter.ts)
- **Phase 7 (US-5)**: T011 before T012 (adapters provide ports consumed by use case)
- **Cross-story**: After Phase 2, US-1 ‖ US-2 (both P1, independent files). US-4 ‖ US-6 (both text-only, no code conflicts). US-7 ‖ US-8 (different modules)

---

## Parallel Example: User Story 2 (Issue Creation)

```bash
# Launch use case + adapter in parallel (different files):
Task T005: "Extend create-issues use case in src/issues/create-issues.ts"
Task T006: "Implement listExisting in src/issues/adapters/github-issue-adapter.ts"

# Then sequential — wiring requires both:
Task T007: "Wire dedup + batch in src/main.ts + dry-run output formatting"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US-1 Context (T003, T004)
4. Complete Phase 4: US-2 Issues (T005, T006, T007)
5. **STOP and VALIDATE**: Both core commands work end-to-end
6. Self-validate: run `sqsk context` + `sqsk issues --dry-run` on this feature's own artifacts

### Incremental Delivery

1. Setup + Foundational → entity types and port contracts defined
2. US-1 + US-2 → core knowledge loop commands working (**MVP! Self-validate here**)
3. US-3 → loop closure (sync learnings back to Squad memory)
4. US-4 + US-5 → agent integration + quality gate (review ceremony active)
5. US-6 → template calibration (task generation improved)
6. US-7 + US-8 → smart distribution + skill routing (agent quality improved)
7. US-9 → codebase health (dead code removed, coverage up)
8. Polish → final validation, version bump, release

### Self-Validation Checkpoints

- **After US-1**: Run `sqsk context specs/004-bridge-self-validation/` — verify squad-context.md generated
- **After US-2**: Run `sqsk issues --dry-run specs/004-bridge-self-validation/tasks.md` — verify issue preview
- **After US-3**: Run `sqsk sync specs/004-bridge-self-validation/` — verify learnings captured
- **After US-5**: Run `sqsk review --mode fidelity specs/004-bridge-self-validation/tasks.md` — verify coverage matrix
- **After US-9**: Run `npm run test:coverage` — verify coverage increased from baseline

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- This feature dog-foods its own tools — use bridge commands at self-validation checkpoints
