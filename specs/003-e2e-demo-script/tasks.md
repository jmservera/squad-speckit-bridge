# Tasks: E2E Demo Script

**Feature Branch**: `003-e2e-demo-script`  
**Input**: Design documents from `/home/jmservera/source/squadvsspeckit/specs/003-e2e-demo-script/`  
**Prerequisites**: plan.md (tech stack, Clean Architecture layers), spec.md (user stories with priorities), data-model.md (entities), contracts/cli-interface.md (CLI contract), quickstart.md (implementation guide)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure following Clean Architecture

- [ ] T001 Create demo feature directory structure: `src/demo/`, `src/demo/adapters/`, `tests/demo/`, `tests/demo/adapters/`, `tests/e2e/`
- [ ] T002 Define entity types in `src/demo/entities.ts`: DemoConfiguration, DemoFlags, PipelineStage, StageStatus enum, DemoArtifact, ArtifactType enum, ExecutionReport, ArtifactSummary
- [ ] T003 Define port interfaces in `src/demo/ports.ts`: ProcessExecutor, ArtifactValidator, CleanupHandler with method signatures using DTOs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core adapters and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement ProcessExecutor adapter in `src/demo/adapters/process-executor.ts`: NodeProcessExecutor class using child_process.spawn(), timeout handling, stdout/stderr capture
- [ ] T005 [P] Implement ArtifactValidator adapter in `src/demo/adapters/artifact-validator.ts`: FileSystemArtifactValidator class using gray-matter for frontmatter parsing
- [ ] T006 [P] Implement CleanupHandler adapter in `src/demo/adapters/cleanup-handler.ts`: FileSystemCleanupHandler class using fs.rm() with recursive option
- [ ] T007 [P] Create helper utility in `src/demo/utils.ts`: timestamp generation (YYYYMMDD-HHMMSS format), file size formatting (KB), elapsed time formatting

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Pipeline Validation (Priority: P1) 🎯 MVP

**Goal**: Developer can run `npm run demo` or `sqsk demo` and verify the entire integration pipeline works end-to-end with all stages completing successfully.

**Independent Test**: Run `npm run demo --dry-run` and observe console output showing successful completion of all 5 pipeline stages (specify → plan → tasks → review → issues) with clear status indicators.

### Implementation for User Story 1

- [ ] T008 [US1] Implement core orchestration logic in `src/demo/orchestrator.ts`: runDemo() function that creates demo directory, defines 5 pipeline stages, executes sequentially, validates artifacts after each stage
- [ ] T009 [US1] Add stage execution loop to `src/demo/orchestrator.ts`: iterate through stages, call processExecutor.run(), update stage status (pending → running → success/failed), halt on first failure
- [ ] T010 [US1] Implement artifact validation step in `src/demo/orchestrator.ts`: call artifactValidator.validate() after each stage completes, check exists + valid, collect validation errors
- [ ] T011 [US1] Add execution timing tracking in `src/demo/orchestrator.ts`: capture startTime/endTime for each stage, calculate elapsedMs, format as elapsedSeconds (e.g., "3.1s")
- [ ] T012 [US1] Generate ExecutionReport in `src/demo/orchestrator.ts`: aggregate totalTimeMs, stagesCompleted, stagesFailed, artifacts array, cleanupPerformed status
- [ ] T013 [US1] Add automatic cleanup logic in `src/demo/orchestrator.ts`: call cleanupHandler.cleanup() if keep flag is false, set cleanupPerformed in report
- [ ] T014 [US1] Implement human-readable output formatter in `src/demo/formatters.ts`: formatHumanOutput() with emoji indicators (🚀, ⏳, ✓, ✗, ✅, ❌), stage progress, artifact paths, timing
- [ ] T015 [US1] Implement JSON output formatter in `src/demo/formatters.ts`: formatJsonOutput() converting ExecutionReport to JSON schema per contracts/cli-interface.md
- [ ] T016 [US1] Create composition root factory in `src/main.ts`: createDemoRunner() that wires NodeProcessExecutor, FileSystemArtifactValidator, FileSystemCleanupHandler to runDemo()
- [ ] T017 [US1] Register demo subcommand in `src/cli/index.ts`: add `.command('demo')` with description, default action calling createDemoRunner().run(), error handling with emitError()

**Checkpoint**: At this point, User Story 1 should be fully functional - `sqsk demo --dry-run` completes all stages and shows success report

---

## Phase 4: User Story 2 - Dry-Run Testing (Priority: P2)

**Goal**: Developer can test the integration pipeline with `--dry-run` flag to validate workflow without creating actual GitHub issues, enabling safe testing offline or in CI/CD.

**Independent Test**: Run `npm run demo --dry-run` and verify no GitHub issues are created (check GitHub repo), while all other stages complete successfully and show simulated issue creation output.

### Implementation for User Story 2

- [ ] T018 [US2] Add --dry-run flag option in `src/cli/index.ts`: register `.option('--dry-run', 'Simulate GitHub issue creation...', false)`
- [ ] T019 [US2] Modify issues stage in `src/demo/orchestrator.ts`: detect dryRun flag in config, pass `--dry-run` argument to `sqsk issues` command when enabled
- [ ] T020 [US2] Update stage validation in `src/demo/orchestrator.ts`: skip artifact validation for issues stage when dryRun is true (no artifact file created in dry-run mode)
- [ ] T021 [US2] Add dry-run indicator to formatHumanOutput in `src/demo/formatters.ts`: show "(dry-run)" suffix on issues stage output, display simulated issue count
- [ ] T022 [US2] Add dryRun field to JSON output in `src/demo/formatters.ts`: include `"dryRun": true/false` in stages array and flags object

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - `--dry-run` works without GitHub credentials

---

## Phase 5: User Story 3 - Artifact Inspection (Priority: P3)

**Goal**: Developer can run demo with `--keep` flag to inspect generated artifacts (spec.md, plan.md, tasks.md, review.md) and understand pipeline output before using for real features.

**Independent Test**: Run `npm run demo --keep --dry-run` and verify a timestamped directory exists in `specs/` containing all 4 generated files with valid content.

### Implementation for User Story 3

- [ ] T023 [US3] Add --keep flag option in `src/cli/index.ts`: register `.option('--keep', 'Preserve demo artifacts...', false)`
- [ ] T024 [US3] Update cleanup logic in `src/demo/orchestrator.ts`: check config.flags.keep before calling cleanupHandler.cleanup(), skip cleanup if true, set cleanupPerformed = false in report
- [ ] T025 [US3] Add artifact preservation message to formatHumanOutput in `src/demo/formatters.ts`: show retained directory path when keep=true, suggest inspection steps
- [ ] T026 [US3] Update cleanup status in JSON output in `src/demo/formatters.ts`: ensure "cleanupPerformed" field accurately reflects keep flag behavior

**Checkpoint**: All core user stories should now be independently functional - artifacts can be inspected with `--keep`

---

## Phase 6: User Story 4 - Verbose Debugging (Priority: P4)

**Goal**: Developer troubleshooting a pipeline failure can use `--verbose` flag to get detailed logging showing file paths, command outputs, timing, and context about what failed.

**Independent Test**: Run `npm run demo --verbose --dry-run` and verify detailed log output appears for each stage including command invocations, stdout/stderr, artifact validation details, and timing information.

### Implementation for User Story 4

- [ ] T027 [US4] Add verbose flag support in `src/demo/orchestrator.ts`: accept verbose from config.flags, pass to processExecutor.run() options
- [ ] T028 [US4] Enhance ProcessExecutor in `src/demo/adapters/process-executor.ts`: when verbose=true, log command being executed, full stdout/stderr streams, exit codes
- [ ] T029 [US4] Enhance ArtifactValidator in `src/demo/adapters/artifact-validator.ts`: when verbose=true, log frontmatter keys found, section counts, validation checks performed
- [ ] T030 [US4] Add verbose logging to formatHumanOutput in `src/demo/formatters.ts`: include command invocations, intermediate results, validation details when verbose flag set

**Checkpoint**: All user stories complete - verbose debugging works

---

## Phase 7: Error Handling & Edge Cases

**Purpose**: Robust error handling and edge case coverage for production readiness

- [ ] T031 [P] Add prerequisite validation in `src/demo/orchestrator.ts`: check squadDir and specifyDir exist before starting pipeline, throw clear error if missing
- [ ] T032 [P] Add SIGINT handler in `src/demo/orchestrator.ts`: register process.on('SIGINT', cleanup) to handle Ctrl+C interruption, ensure cleanup runs before exit
- [ ] T033 [P] Add timeout handling in `src/demo/adapters/process-executor.ts`: implement 30-second timeout per stage, kill subprocess on timeout, return error with "timed out" message
- [ ] T034 [P] Add path safety check in `src/demo/adapters/cleanup-handler.ts`: verify demoDir is under specs/ directory before deletion, prevent accidental deletion outside project
- [ ] T035 Add error summary to formatHumanOutput in `src/demo/formatters.ts`: include troubleshooting section on failure with common fixes, suggest --verbose flag
- [ ] T036 Add failure details to JSON output in `src/demo/formatters.ts`: include failedStage, errorSummary fields, preserve error messages from failed stages

---

## Phase 8: Testing

**Purpose**: Comprehensive test coverage following Test-First principle

### Unit Tests (Entities & Ports)

- [ ] T037 [P] Write entity validation tests in `tests/demo/entities.test.ts`: test DemoConfiguration validation rules, stage status transitions, ExecutionReport derived properties
- [ ] T038 [P] Write port interface tests in `tests/demo/ports.test.ts`: verify port signatures accept only DTOs, no framework types leaked

### Unit Tests (Use Cases with Mocked Ports)

- [ ] T039 Write orchestrator happy path test in `tests/demo/orchestrator.test.ts`: mock all ports, verify all stages execute in order, success report generated
- [ ] T040 [P] Write orchestrator failure test in `tests/demo/orchestrator.test.ts`: mock stage failure, verify pipeline halts, error propagates correctly
- [ ] T041 [P] Write orchestrator cleanup test in `tests/demo/orchestrator.test.ts`: verify cleanup called when keep=false, skipped when keep=true

### Integration Tests (Adapters with Real I/O)

- [ ] T042 [P] Write ProcessExecutor integration tests in `tests/demo/adapters/process-executor.test.ts`: test with echo command, verify stdout capture, test timeout handling, test error handling
- [ ] T043 [P] Write ArtifactValidator integration tests in `tests/demo/adapters/artifact-validator.test.ts`: create fixture markdown files, test validation rules, test frontmatter parsing errors
- [ ] T044 [P] Write CleanupHandler integration tests in `tests/demo/adapters/cleanup-handler.test.ts`: create temporary directories, verify deletion, test path safety checks

### E2E Tests

- [ ] T045 Write full demo E2E test in `tests/e2e/demo.test.ts`: run actual demo command with --dry-run --keep, verify all artifacts created, parse JSON output, verify cleanup behavior

---

## Phase 9: Documentation & Polish

**Purpose**: User-facing documentation and final refinements

- [ ] T046 [P] Add demo command to README.md usage section: examples of `npm run demo`, `--dry-run`, `--keep`, `--verbose` flags
- [ ] T047 [P] Update docs/usage.md with demo examples: show typical workflows, troubleshooting tips, expected output
- [ ] T048 [P] Add demo to API reference in docs/api-reference.md: document command options, exit codes, JSON schema
- [ ] T049 Validate quickstart.md checklist: run through verification checklist in quickstart.md, ensure all items pass
- [ ] T050 Run constitution compliance check: verify all 5 Clean Architecture principles upheld, update Complexity Tracking if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion - Core pipeline implementation
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) completion - Extends with --dry-run flag
- **User Story 3 (Phase 5)**: Depends on User Story 1 (Phase 3) completion - Extends with --keep flag
- **User Story 4 (Phase 6)**: Depends on User Story 1 (Phase 3) completion - Extends with --verbose flag
- **Error Handling (Phase 7)**: Depends on User Story 1 (Phase 3) completion - Can run in parallel with US2-4
- **Testing (Phase 8)**: Depends on all implementation phases (1-7) - Tests must match implemented behavior
- **Documentation (Phase 9)**: Depends on testing (Phase 8) completion - Final polish before PR

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - no other story dependencies
- **User Story 2 (P2)**: Builds on User Story 1 - adds --dry-run flag handling
- **User Story 3 (P3)**: Builds on User Story 1 - adds --keep flag handling (independent of US2)
- **User Story 4 (P4)**: Builds on User Story 1 - adds --verbose flag handling (independent of US2, US3)

### Within Each User Story

**User Story 1**: Sequential execution required
- T008-T013: Core orchestration (sequential - each builds on previous)
- T014-T015: Output formatters (parallel after T013)
- T016: Composition root (after T008-T015)
- T017: CLI registration (after T016)

**User Story 2**: Sequential execution required
- T018-T022: All depend on T017 completion (demo command exists)

**User Story 3**: Sequential execution required
- T023-T026: All depend on T017 completion (demo command exists)

**User Story 4**: Sequential execution required
- T027-T030: All depend on T017 completion (demo command exists)

### Parallel Opportunities

- **Setup (Phase 1)**: T002 and T003 can run in parallel (different files)
- **Foundational (Phase 2)**: T005, T006, T007 can all run in parallel after T004 (different files, no dependencies)
- **Error Handling (Phase 7)**: T031, T032, T033, T034 can all run in parallel (different files)
- **Testing (Phase 8)**:
  - T037, T038 can run in parallel (unit tests, different files)
  - T040, T041 can run in parallel after T039 (different test cases)
  - T042, T043, T044 can all run in parallel (integration tests, different adapters)
- **Documentation (Phase 9)**: T046, T047, T048 can all run in parallel (different files)

---

## Parallel Example: Foundational Phase

```bash
# After T004 completes, launch these 3 tasks together:
Task T005: "Implement ArtifactValidator adapter in src/demo/adapters/artifact-validator.ts"
Task T006: "Implement CleanupHandler adapter in src/demo/adapters/cleanup-handler.ts"
Task T007: "Create helper utility in src/demo/utils.ts"
```

---

## Parallel Example: Testing Phase

```bash
# After implementation complete, launch all integration tests together:
Task T042: "Write ProcessExecutor integration tests in tests/demo/adapters/process-executor.test.ts"
Task T043: "Write ArtifactValidator integration tests in tests/demo/adapters/artifact-validator.test.ts"
Task T044: "Write CleanupHandler integration tests in tests/demo/adapters/cleanup-handler.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) - ~15 minutes
2. Complete Phase 2: Foundational (T004-T007) - ~45 minutes (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T008-T017) - ~90 minutes
4. **STOP and VALIDATE**: Test `sqsk demo --dry-run` works end-to-end
5. Deploy/demo basic functionality

**MVP Deliverable**: Working demo command that runs full pipeline and reports success/failure

### Incremental Delivery

1. Complete Setup + Foundational (Phases 1-2) → Foundation ready (~60 minutes)
2. Add User Story 1 (Phase 3) → Test `sqsk demo --dry-run` → Deploy/Demo (MVP!) (~90 minutes)
3. Add User Story 2 (Phase 4) → Test `--dry-run` flag → Deploy/Demo (~30 minutes)
4. Add User Story 3 (Phase 5) → Test `--keep` flag → Deploy/Demo (~20 minutes)
5. Add User Story 4 (Phase 6) → Test `--verbose` flag → Deploy/Demo (~30 minutes)
6. Add Error Handling (Phase 7) → Test edge cases → Deploy/Demo (~45 minutes)
7. Add Testing (Phase 8) → Achieve test coverage targets → Deploy/Demo (~90 minutes)
8. Add Documentation (Phase 9) → Polish and finalize → Release (~30 minutes)

**Total Time Estimate**: ~6.5 hours from start to fully tested, documented feature

### Parallel Team Strategy

With 2 developers:

1. **Both**: Complete Setup + Foundational together (Phases 1-2)
2. **Once Foundational done**:
   - **Developer A**: User Story 1 (Phase 3) - Core implementation
   - **Developer B**: Error Handling (Phase 7) - Edge cases (can start after Phase 2)
3. **After US1 complete**:
   - **Developer A**: User Stories 2-4 (Phases 4-6) - Flag support
   - **Developer B**: Testing (Phase 8) - Test coverage
4. **Both**: Documentation (Phase 9) - Final polish

**Parallel Time Estimate**: ~4 hours with 2 developers

---

## Notes

- **[P] tasks**: Different files, no dependencies between them
- **[Story] label**: Maps task to specific user story for traceability (US1, US2, US3, US4)
- **Each user story**: Independently completable and testable after foundational phase
- **Test-First principle**: For Phase 8, write tests that fail before implementing (though implementation already done)
- **Commit strategy**: Commit after each task or logical group
- **Checkpoints**: Use to validate story independently before proceeding
- **Clean Architecture**: Strict layer separation maintained throughout (Entities → Ports → Use Cases → Adapters → CLI)
- **No tests requested**: This feature does NOT specify TDD approach, so tests are grouped in dedicated Phase 8 (not before implementation)
- **Estimated complexity**: ~470 LOC total across 10 files (entities, ports, orchestrator, 3 adapters, utils, formatters, main, cli)

---

## Constitution Compliance

- ✅ **Principle I (Dependency Rule)**: All dependencies point inward - CLI depends on Main, Main depends on Use Cases, Use Cases depend on Entities
- ✅ **Principle II (Clean Architecture Layers)**: Strict layer separation: entities.ts (Layer 0), ports.ts + orchestrator.ts (Layer 1), adapters/* (Layer 2), cli/index.ts (Layer 3)
- ✅ **Principle III (Test-First by Layer)**: Tests cover all layers (entities, use cases with mocked ports, adapter integration, E2E)
- ✅ **Principle IV (Simple Data Crosses Boundaries)**: Port interfaces use only DTOs (DemoConfiguration, ExecutionReport, ValidationResult - no framework types)
- ✅ **Principle V (Framework Independence)**: Commander.js and child_process confined to adapter/CLI layers, use cases have zero framework dependencies

---

## Success Criteria Validation

- **SC-001**: Pipeline completes in <2 minutes ✓ (5 stages × 30s timeout = max 2.5min, typical ~15s)
- **SC-002**: Zero user interaction required ✓ (single command, hardcoded example feature)
- **SC-003**: Clear visual feedback ✓ (emoji indicators, progress display, timing in formatters)
- **SC-004**: Valid artifacts generated ✓ (artifact validation after each stage)
- **SC-005**: Dry-run works offline ✓ (no GitHub credentials required with --dry-run)
- **SC-006**: Cleanup leaves zero files ✓ (unless --keep flag used)
- **SC-007**: Actionable error messages ✓ (error summary with suggestions in formatters)
- **SC-008**: Idempotent execution ✓ (unique timestamped directories, collision handling)
