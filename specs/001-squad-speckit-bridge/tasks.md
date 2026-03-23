# Tasks: Squad-SpecKit Knowledge Bridge

**Input**: Design documents from `/specs/001-squad-speckit-bridge/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, research.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not explicitly requested in the specification — test tasks are omitted. The Clean Architecture design supports adding tests per layer (entity unit tests, use case tests with in-memory fakes, adapter integration tests with fixtures, E2E CLI tests) when needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Within each story, tasks follow **Clean Architecture layer ordering**: Entities → Use Cases → Adapters → Frameworks/Drivers (innermost first, per `.squad/skills/clean-architecture-bridge/SKILL.md`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` and `tests/` at repository root
- Clean Architecture layers within `src/`:
  - `src/types.ts` — Entities (innermost layer, zero imports)
  - `src/bridge/ports.ts` — Port interfaces (use case layer, imports only entities)
  - `src/bridge/context.ts`, `src/bridge/summarizer.ts` — Use cases (import entities + ports)
  - `src/bridge/adapters/`, `src/bridge/parser.ts` — Adapters (implement ports, use frameworks)
  - `src/cli/index.ts` — Framework/Driver (outermost layer, commander bootstrap)
  - `src/main.ts` — Composition root (wires adapters into use cases via constructor injection)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Clean Architecture directory structure, TypeScript + Node.js tooling

- [ ] T001 Create Clean Architecture directory structure: src/bridge/adapters/, src/install/adapters/, src/install/templates/, src/review/adapters/, src/cli/, tests/unit/, tests/integration/, tests/fixtures/squad/skills/, tests/fixtures/squad/agents/, tests/fixtures/specify/
- [ ] T002 Initialize npm project with package.json — name: squad-speckit-bridge, type: module, dependencies: commander, gray-matter, glob; devDependencies: typescript, vitest, @types/node, tsx
- [ ] T003 [P] Configure TypeScript in tsconfig.json — strict mode, ESM output (module: "Node16"), target: "ES2022", rootDir: "src", outDir: "dist", declaration: true, sourceMap: true
- [ ] T004 [P] Configure Vitest in vitest.config.ts — TypeScript support, test file pattern tests/**/*.test.ts, coverage reporter

---

## Phase 2: Foundational (Core Entities & Port Interfaces)

**Purpose**: Inner Clean Architecture layers — pure entity types, validation logic, and port interfaces that ALL user stories depend on. Zero I/O, zero framework imports. Dependencies point inward only.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. These are the innermost layers upon which all adapters and drivers depend.

- [ ] T005 Define all entity types in src/types.ts — BridgeConfig (with sources, summarization, hooks, paths sub-objects), ContextSummary (with metadata and content sections), SkillEntry (name, context, patterns, antiPatterns, rawSize), DecisionEntry (title, date, status, summary, relevanceScore, fullContent), LearningEntry (agentName, agentRole, entries: LearningItem[]), DesignReviewRecord (reviewedArtifact, timestamp, participants, findings, approvalStatus, summary), ReviewFinding (type, severity, description, reference, recommendation), InstallManifest (version, installedAt, updatedAt, components, files). Pure data types with zero imports.
- [ ] T006 [P] Implement BridgeConfig validation in src/types.ts — isValidConfig(config: BridgeConfig): boolean enforcing contextMaxBytes > 0 and ≤ 32768, recencyBiasWeight between 0.0 and 1.0, maxDecisionAge > 0. Pure function, no I/O.
- [ ] T007 [P] Implement relevance scoring in src/types.ts — computeRelevanceScore(decision: DecisionEntry, now: Date): number applying recency bias calculation using date distance and configured weight. Entries without parseable date get 0.5 (neutral). Pure function.
- [ ] T008 [P] Implement ReviewFinding severity helpers in src/types.ts — compareSeverity(a, b) for sorting, isHighSeverity(finding) predicate, categorizeFindings(findings) grouping by type. Pure functions.
- [ ] T009 Define all port interfaces in src/bridge/ports.ts — SquadStateReader (readSkills(): Promise<SkillEntry[]>, readDecisions(): Promise<DecisionEntry[]>, readLearnings(): Promise<LearningEntry[]>), ContextWriter (write(summary: ContextSummary): Promise<void>), TasksReader (readTasks(path: string): Promise<TaskEntry[]>), FrameworkDetector (detectSquad(dir: string): Promise<boolean>, detectSpecKit(dir: string): Promise<boolean>), FileDeployer (deploy(files: DeploymentFile[]): Promise<string[]>, listDeployed(): Promise<string[]>), ConfigLoader (load(): Promise<BridgeConfig>). Import only from types.ts.
- [ ] T010 [P] Create default BridgeConfig factory in src/types.ts — createDefaultConfig() returning all defaults per config-schema.md: contextMaxBytes 8192, all sources true, recencyBiasWeight 0.7, maxDecisionAgeDays 90, hooks.afterTasks true, paths.squadDir ".squad", paths.specifyDir ".specify"

**Checkpoint**: Foundation ready — all entity types defined, all port interfaces specified, validation and scoring logic testable with zero setup. User story implementation can now begin.

---

## Phase 3: User Story 1 — Bridge Installation and Setup (Priority: P1) 🎯 MVP

**Goal**: A developer installs the bridge with a single command and both frameworks gain awareness of each other. Squad gets a skill file and ceremony definition; Spec Kit gets an extension with after_tasks hook. Covers FR-001 through FR-004.

**Independent Test**: Run `npx squad-speckit-bridge install` in a repo with both `.squad/` and `.specify/` — verify expected files appear in both directories without altering existing files. Run again to verify idempotent update. Run with only one framework to verify partial installation with guidance messaging.

### Implementation for User Story 1 (Entities → Use Cases → Adapters → Drivers)

- [ ] T011 [US1] Implement InstallBridge use case in src/install/installer.ts — orchestration logic: detect frameworks via FrameworkDetector port, determine applicable components, deploy via FileDeployer port, produce InstallManifest entity. Handle partial installation (one framework missing) with degraded mode per research.md RC-1. Depends only on types.ts and ports.ts.
- [ ] T012 [P] [US1] Implement CheckStatus use case in src/install/status.ts — read InstallManifest from FileDeployer port, detect current framework state via FrameworkDetector port, read config via ConfigLoader port, produce structured status report entity. Depends only on types.ts and ports.ts.
- [ ] T013 [US1] Implement FrameworkDetector adapter in src/install/adapters/framework-detector.ts — detect .squad/ and .specify/ directories using fs/promises stat(). Implements FrameworkDetector port from ports.ts. Supports custom directory paths.
- [ ] T014 [P] [US1] Create Squad skill template in src/install/templates/skill.md — SKILL.md with frontmatter (name: speckit-bridge, version: 0.1.0, tags: planning, spec-kit, integration). Content: Spec Kit artifact overview, bridge workflow reference. Placeholder for US6 expansion.
- [ ] T015 [P] [US1] Create ceremony definition template in src/install/templates/ceremony.md — Design Review ceremony definition for Squad: purpose, trigger conditions, participating agents, review checklist, approval criteria.
- [ ] T016 [P] [US1] Create Spec Kit extension template in src/install/templates/extension.yml — id: squad-bridge, name: Squad-SpecKit Bridge, version: 0.1.0, hooks.after_tasks definition per config-schema.md.
- [ ] T017 [US1] Implement FileDeployer adapter in src/install/adapters/file-deployer.ts — renders template files to target paths (.squad/skills/speckit-bridge/, .specify/extensions/squad-bridge/), creates/updates .bridge-manifest.json at repo root. Handles idempotent re-installation: update in place without duplication (FR-004). Uses fs/promises.
- [ ] T018 [US1] Implement ConfigFileLoader adapter in src/install/adapters/config-loader.ts — reads bridge.config.json or package.json "squad-speckit-bridge" key, merges with createDefaultConfig() defaults, validates via isValidConfig(). Supports BRIDGE_CONFIG env var override. Resolution order: CLI flags → env vars → config file → package.json → defaults.
- [ ] T019 [US1] Implement CLI entry point with install and status subcommands in src/cli/index.ts — commander program with global options (--config, --json, --quiet, --version, --help), `install` subcommand (--squad-dir, --specify-dir, --force), `status` subcommand. Human-readable default output and JSON output (--json) per contracts/cli-interface.md.
- [ ] T020 [US1] Create composition root in src/main.ts — wire real adapters (FrameworkDetector, FileDeployer, ConfigFileLoader) into use cases (InstallBridge, CheckStatus) via constructor injection. Export factory functions for CLI consumption. No business logic in this file.

**Checkpoint**: At this point, `squad-speckit-bridge install` and `squad-speckit-bridge status` are functional. The bridge can be installed in any repo with Squad and/or Spec Kit. Partial installations produce clear guidance. User Story 1 is independently testable.

---

## Phase 4: User Story 2 — Memory Bridge: Squad Knowledge → Spec Kit (Priority: P1)

**Goal**: Squad's accumulated knowledge (skills, decisions, agent learnings) flows into a prioritized context summary for Spec Kit's planning phases. The summary stays under a configurable size limit using progressive summarization. Covers FR-005 through FR-010.

**Independent Test**: Run `squad-speckit-bridge context specs/001-feature/` in a repo with Squad memory artifacts — verify `squad-context.md` is produced with skills (highest priority), decisions (filtered by recency), and learnings (summarized), all under the 8KB default limit. Verify with empty `.squad/` produces minimal valid output.

### Implementation for User Story 2 (Entities → Use Cases → Adapters → Drivers)

- [ ] T021 [US2] Implement SummarizeContent use case in src/bridge/summarizer.ts — three-tier progressive summarization per research.md RC-4: (1) priority ordering: skills full content → decisions filtered → learnings summarized, (2) recency bias within sections using computeRelevanceScore, (3) content compression for large entries (first paragraph + bullet lists). Pure logic operating on entity arrays, enforcing contextMaxBytes budget. No I/O imports.
- [ ] T022 [US2] Implement BuildSquadContext use case in src/bridge/context.ts — orchestrate full pipeline: read squad state via SquadStateReader port → score and prioritize entries → apply SummarizeContent → produce ContextSummary entity → write via ContextWriter port. Accept BridgeConfig for size limits and source toggles. Handle empty state gracefully (FR-019). No I/O imports.
- [ ] T023 [US2] Implement MarkdownFrontmatterParser adapter in src/bridge/parser.ts — parse markdown files with gray-matter, convert raw parsed output to entity types (SkillEntry from SKILL.md, DecisionEntry from decisions.md H3 sections, LearningEntry from history.md). Handle malformed files gracefully: skip unparseable content and record warning string (FR-019).
- [ ] T024 [US2] Implement SquadFileReader adapter in src/bridge/adapters/squad-file-reader.ts — implements SquadStateReader port. Uses glob to discover .squad/skills/*/SKILL.md files, parses .squad/decisions.md by splitting on H3 headings (### ), reads .squad/agents/*/history.md files. Delegates parsing to MarkdownFrontmatterParser. Strictly read-only (FR-010). Handles ENOENT gracefully.
- [ ] T025 [P] [US2] Implement SpecKitContextWriter adapter in src/bridge/adapters/speckit-writer.ts — implements ContextWriter port. Converts ContextSummary entity to markdown document with YAML frontmatter (generated, sources, size_bytes, max_bytes) per research.md RC-3 format. Writes to <spec-dir>/squad-context.md using fs/promises.
- [ ] T026 [US2] Add `context` subcommand to CLI in src/cli/index.ts — required argument: <spec-dir>, options: --max-size <bytes>, --sources <comma-list>, --squad-dir <path>. Wire to BuildSquadContext use case via composition root. Human-readable and JSON output per contracts/cli-interface.md context contract.
- [ ] T027 [US2] Wire context use case in src/main.ts — add BuildSquadContext composition: inject SquadFileReader, SpecKitContextWriter, ConfigFileLoader into use case via constructor. Export factory for CLI consumption.

**Checkpoint**: At this point, `squad-speckit-bridge context <spec-dir>` produces a prioritized, size-limited context summary from Squad memory. The memory bridge is functional and independently testable. Combined with US1, developers can install the bridge and generate planning context.

---

## Phase 5: User Story 3 — Design Review Ceremony (Priority: P1)

**Goal**: Squad team reviews Spec Kit task breakdowns before issue creation, catching planning blind spots with accumulated team knowledge. The review cross-references tasks against decisions and agent learnings. Covers FR-011 through FR-013.

**Independent Test**: Run `squad-speckit-bridge review specs/001-feature/tasks.md` — verify a review document is produced that identifies potential risks, decision conflicts, and missing tasks by cross-referencing against Squad's accumulated knowledge.

**Dependencies**: Reuses SquadFileReader adapter from US2 (T024) for reading decisions and learnings.

### Implementation for User Story 3 (Entities → Use Cases → Adapters → Drivers)

- [ ] T028 [US3] Implement PrepareReview use case in src/review/ceremony.ts — parse tasks via TasksReader port, read squad state via SquadStateReader port (reused), cross-reference task descriptions against decision titles and learning entries to detect conflicts and risks. Produce DesignReviewRecord entity with ReviewFinding[] categorized by type (missing_task, risk, ordering, decision_conflict, scope). No I/O imports.
- [ ] T029 [US3] Implement TasksParser adapter in src/review/adapters/tasks-parser.ts — implements TasksReader port. Parse Spec Kit tasks.md checklist format: extract task IDs (T001 pattern), [P] markers, [USn] story labels, descriptions with file paths, phase structure. Handle malformed files gracefully.
- [ ] T030 [US3] Implement ReviewWriter adapter in src/review/adapters/review-writer.ts — convert DesignReviewRecord entity to human-readable markdown review document with sections for findings by severity, decision conflicts with references, and recommendations. Write to specified output path (default: <tasks-dir>/review.md).
- [ ] T031 [US3] Add `review` subcommand to CLI in src/cli/index.ts — required argument: <tasks-file>, options: --output <path>. Wire to PrepareReview use case. Output per contracts/cli-interface.md review contract (finding counts, review path).
- [ ] T032 [US3] Wire review use case in src/main.ts — add PrepareReview composition: inject TasksParser, SquadFileReader (reused instance from US2 wiring), ReviewWriter. Export factory for CLI.

**Checkpoint**: All three P1 user stories are functional. The core value loop is complete: install → generate context → plan with context → generate tasks → review tasks. This is the full bridge workflow minus automation and feedback.

---

## Phase 6: User Story 4 — Feedback Loop: Execution Learnings (Priority: P2)

**Goal**: Execution learnings from Squad agents automatically appear in the next planning cycle's context summary, completing the knowledge flywheel. Each cycle's context improves because it incorporates learnings from prior execution. Covers FR-016 and FR-017.

**Independent Test**: Generate context twice with Squad state changes between runs — verify the second cycle's output includes new learnings written after the first cycle, and that progressive summarization prevents unbounded growth.

**Dependencies**: Requires US2 (Memory Bridge) — extends the context generation pipeline.

### Implementation for User Story 4

- [ ] T033 [US4] Enhance SummarizeContent in src/bridge/summarizer.ts — add cycle-aware progressive summarization: when previous context exists, weight newly-added learnings (since last run) higher than already-summarized content. Apply recencyBiasWeight to prevent older cycle content from dominating budget (FR-017).
- [ ] T034 [US4] Implement cycle detection in src/bridge/context.ts — before generating new context, read previous squad-context.md metadata (if exists) to extract last generation timestamp. Pass timestamp to SquadStateReader.readLearnings() for incremental filtering. Track cycle count in output metadata.
- [ ] T035 [US4] Enhance SquadFileReader in src/bridge/adapters/squad-file-reader.ts — add optional date filtering to readLearnings(since?: Date): filter agent history entries by date heading, returning only entries newer than the provided timestamp. Existing behavior (no filter) remains default.

**Checkpoint**: The feedback loop is functional. Each planning cycle's context summary compounds knowledge from prior execution. Running the bridge across multiple cycles produces progressively richer (but size-bounded) planning context.

---

## Phase 7: User Story 5 — Automated Hook Trigger (Priority: P2)

**Goal**: When Spec Kit generates tasks, the bridge's after_tasks hook automatically notifies the developer that a Design Review is available. Reduces friction by eliminating the need to remember to trigger reviews manually. Covers FR-014 and FR-015.

**Independent Test**: Run Spec Kit task generation in a repo with the bridge extension installed — verify the after_tasks hook fires and produces a notification with the tasks.md path. Disable the hook in config and verify no notification.

**Dependencies**: Requires US1 (extension.yml deployed) and US3 (review subcommand exists).

### Implementation for User Story 5

- [ ] T036 [US5] Create after_tasks hook script in src/install/templates/hooks/after-tasks.sh — shell script executed by Spec Kit after task generation. Detects tasks.md path from Spec Kit environment, calls `npx squad-speckit-bridge review --notify <tasks-path>`, prints Design Review availability notification. Checks hooks.afterTasks config before executing (FR-015). Cross-platform compatible.
- [ ] T037 [US5] Update extension.yml template in src/install/templates/extension.yml — reference the after-tasks.sh hook script, set enabled: true default. Ensure the hook definition matches Spec Kit extension manifest format per config-schema.md.
- [ ] T038 [US5] Add --notify flag to review subcommand in src/cli/index.ts — when --notify is passed, output a brief notification message (tasks.md path + "Design Review available" prompt) instead of generating a full review document. Used by the after_tasks hook for lightweight notification.

**Checkpoint**: After Spec Kit generates tasks, developers automatically receive a notification about the available Design Review. The hook is disablable via configuration without uninstalling the bridge.

---

## Phase 8: User Story 6 — Squad Agents Learn Spec Kit Methodology (Priority: P3)

**Goal**: Squad agents with the bridge skill understand Spec Kit's artifact structure and methodology. They can reference Spec Kit concepts during discussions and Design Reviews. Covers FR-018.

**Independent Test**: Verify the installed SKILL.md contains comprehensive Spec Kit artifact descriptions that teach agents about spec.md, plan.md, tasks.md, constitution.md — their structure, purpose, and relationship to Squad workflow.

**Dependencies**: Extends US1 (SKILL.md template created in T014).

### Implementation for User Story 6

- [ ] T039 [US6] Expand Squad skill content in src/install/templates/skill.md — comprehensive SKILL.md covering all Spec Kit artifact types: spec.md (user stories, requirements, acceptance criteria), plan.md (tech stack, architecture, project structure), tasks.md (phased task breakdown, checklist format, dependency ordering), constitution.md (governance rules, quality gates), research.md (resolved clarifications), data-model.md (entities), contracts/ (interface definitions). Include purpose, structure conventions, and relationship to Squad workflow for each.
- [ ] T040 [US6] Add bridge workflow knowledge to skill in src/install/templates/skill.md — document the complete bridge workflow (context → specify → plan → tasks → review → execute → learn), the knowledge flywheel concept, how agents should contribute during Design Reviews, patterns for reading/interpreting Spec Kit artifacts, and anti-patterns (common misinterpretations of Spec Kit output).

**Checkpoint**: All user stories are implemented. Squad agents are "bilingual" — they understand both frameworks' artifacts and can participate meaningfully in cross-framework workflows.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple user stories, error handling hardening, and build/distribution setup

- [ ] T041 [P] Define error code constants in src/types.ts — SQUAD_NOT_FOUND, SPECKIT_NOT_FOUND, SPEC_DIR_NOT_FOUND, TASKS_NOT_FOUND, PERMISSION_DENIED, CONFIG_INVALID, PARSE_ERROR per contracts/cli-interface.md error codes
- [ ] T042 [P] Implement structured error output in src/cli/index.ts — stderr JSON error format per contracts/cli-interface.md: { error: true, code, message, suggestion } for all error paths across install, context, review, and status subcommands
- [ ] T043 Configure package.json bin entry and build scripts — "bin": { "squad-speckit-bridge": "./dist/cli/index.js" }, scripts: "build" (tsc), "dev" (tsx src/cli/index.ts), "test" (vitest). Add "files" array for npm publish.
- [ ] T044 [P] Create test fixtures in tests/fixtures/ — mock .squad/ directory with sample skills/project-conventions/SKILL.md, decisions.md (with 3+ H3 decision entries), agents/richard/history.md, agents/dinesh/history.md; mock .specify/ directory with extensions/ structure. Support all user story test scenarios.
- [ ] T045 Update quickstart.md in specs/001-squad-speckit-bridge/quickstart.md — replace placeholder examples with actual CLI output from implemented commands, verify all documented workflows match real behavior
- [ ] T046 Run quickstart.md validation — execute the complete quickstart workflow (install → context → review) against test fixtures, verify all documented commands produce expected output

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Stories (Phases 3–8)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start immediately after Foundational
  - US2 (Phase 4): Can start immediately after Foundational (independent of US1)
  - US3 (Phase 5): Depends on US2 adapter T024 (reuses SquadFileReader)
  - US4 (Phase 6): Depends on US2 completion (extends summarizer + context)
  - US5 (Phase 7): Depends on US1 + US3 (needs extension.yml + review command)
  - US6 (Phase 8): Depends on US1 T014 (expands SKILL.md template)
- **Polish (Phase 9)**: Can start after US1 + US2; fully completes after all stories

### User Story Dependencies

```
     Phase 1 (Setup)
          │
     Phase 2 (Foundational)
          │
    ┌─────┼───────────┐
    ▼     ▼           ▼
  US1   US2         US6 (P3, expands US1 SKILL.md)
    │     │
    │     ├───▶ US3 (reuses SquadFileReader from US2)
    │     │      │
    │     ├───▶ US4 (extends summarizer from US2)
    │     │
    └──┬──┘
       │
       ▼
     US5 (needs US1 extension.yml + US3 review command)
       │
       ▼
     Polish
```

### Within Each User Story (Clean Architecture Order)

1. **Entities** (if story-specific) — already done in Phase 2 for this project
2. **Use Cases** (business logic, port orchestration) — no I/O, no framework imports
3. **Adapters** (port implementations, format conversion) — use framework libraries
4. **CLI/Drivers** (commander integration) — outermost layer
5. **Composition root** (src/main.ts wiring) — connects adapters to use cases

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel (tsconfig + vitest config)
- **Phase 2**: T006, T007, T008, T010 can all run in parallel (independent pure functions); T009 can run in parallel with entity tasks
- **US1**: T012 can run in parallel with T013; T014, T015, T016 can all run in parallel (independent template files)
- **US2**: T025 can run in parallel with T023 (independent adapters)
- **US1 and US2**: Can run in parallel after Foundational phase (independent feature slices)
- **US6**: Can start in parallel with US2/US3 (only needs T014 from US1)
- **Polish**: T041, T042, T044 can all run in parallel (different files)

---

## Parallel Example: User Story 1

```text
# After Foundational phase, launch use cases:
Task T011: "Implement InstallBridge use case in src/install/installer.ts"
Task T012: "Implement CheckStatus use case in src/install/status.ts"  [P]

# Launch all templates in parallel (independent files):
Task T014: "Create Squad skill template in src/install/templates/skill.md"  [P]
Task T015: "Create ceremony definition template in src/install/templates/ceremony.md"  [P]
Task T016: "Create Spec Kit extension template in src/install/templates/extension.yml"  [P]

# After use cases + templates, launch adapters:
Task T013: "Implement FrameworkDetector adapter"
Task T017: "Implement FileDeployer adapter" (needs templates)
Task T018: "Implement ConfigFileLoader adapter"

# Finally: CLI (T019) and composition root (T020)
```

## Parallel Example: User Story 2

```text
# After Foundational phase, launch use cases sequentially (T022 depends on T021):
Task T021: "Implement SummarizeContent use case in src/bridge/summarizer.ts"
Task T022: "Implement BuildSquadContext use case in src/bridge/context.ts"

# Launch independent adapters in parallel:
Task T023: "Implement MarkdownFrontmatterParser in src/bridge/parser.ts"
Task T025: "Implement SpecKitContextWriter in src/bridge/adapters/speckit-writer.ts"  [P]

# After parser: T024 (SquadFileReader uses parser)
Task T024: "Implement SquadFileReader in src/bridge/adapters/squad-file-reader.ts"

# Finally: CLI (T026) and composition root (T027)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational entities and ports (T005–T010)
3. Complete Phase 3: User Story 1 — Install & Status (T011–T020)
4. **STOP and VALIDATE**: Test installation in a repo with both frameworks, one framework, and neither
5. Deploy/demo if ready — developers can install the bridge and inspect status

### Incremental Delivery

1. **Setup + Foundational** → Inner Clean Architecture layers ready (types, ports, validation)
2. **Add US1** → Install works → Demo (MVP!)
3. **Add US2** → Context generation works → Knowledge bridge functional
4. **Add US3** → Design Review works → Full core value loop complete (install → context → review)
5. **Add US4** → Feedback loop → Knowledge compounds across planning cycles
6. **Add US5** → Automation → Reduced friction, no manual review triggers
7. **Add US6** → Agent literacy → Team coherence across both frameworks
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Installation & Setup)
   - **Developer B**: User Story 2 (Memory Bridge)
3. After US2's SquadFileReader adapter exists (T024):
   - **Developer C**: User Story 3 (Design Review, reuses SquadFileReader)
4. After US2 is complete:
   - **Developer B**: User Story 4 (extends summarizer for feedback loop)
5. After US1 + US3 are complete:
   - **Developer A**: User Story 5 (hook trigger, needs extension.yml + review)
6. US6 can run anytime after T014 (skill template exists)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **Clean Architecture enforcement**: Within each story, tasks go Entities → Use Cases → Adapters → Drivers. Inner layers never import from outer layers.
- **Dependency Rule**: `src/types.ts` has zero imports. `src/bridge/ports.ts` imports only from `types.ts`. Use cases import from `types.ts` and `ports.ts` only. Adapters import from `types.ts`, `ports.ts`, and framework libraries (`gray-matter`, `fs`, `glob`). `commander` is confined to `src/cli/index.ts`.
- **Anti-patterns to avoid**: Importing `fs`/`gray-matter`/`commander` in entity or use case files; adapter-to-adapter calls; business logic (scoring, prioritization, budget allocation) in adapters; passing framework types (`GrayMatterFile`, `fs.Stats`) across layer boundaries.
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
