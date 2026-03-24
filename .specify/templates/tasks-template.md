---

description: "Task list template for feature implementation"
critical: "TARGET 15-20 TASKS PER FEATURE, NOT 50+. Group related changes into single compound tasks (1-3 files each, completable in one agent session). Every task MUST include a Tests subsection."
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Task Sizing**: 15-20 total tasks (not 50+). Each task groups related changes, affects 1-3 files, and is completable in one agent session.

**Tests**: REQUIRED — every task must include a Tests subsection (beneath the task) describing how to verify completion. Tests subsections are not separate tasks; they are part of the task description.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description (X-Y files)`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **(X-Y files)**: Estimate of how many files this task affects (1-3 range)
- **Tests subsection**: Immediately after task line, describe verification approach

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  **RIGHT-SIZING IS CRITICAL**: Generate 15-20 compound tasks, NOT 50+.
  - Group related changes (e.g., Models + validation = 1 task, Services = 1 task)
  - Each task should affect 1-3 files max
  - Each task should be completable in one agent session (~4-8 hours)
  - Tests are subsections of tasks, not separate task entries
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (1 task - shared infrastructure)

**Purpose**: Project initialization, directory structure, tooling (typescript, linting, testing)

- [ ] T001 Initialize project: create directory structure, npm/package.json, tsconfig.json, vitest.config.ts, .gitignore (3 files)
  - **Tests**: Verify npm install succeeds, tsc --version works, npx vitest --help runs, project structure exists as planned

---

## Phase 2: Foundational (1-2 tasks - blocking prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Implement authentication/authorization framework, database schema, core entities (3 files)
  - **Tests**: Verify core entities can be instantiated, auth validation logic works, DB schema is valid for target DB

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

- [ ] T003 [P] [US1] Create data models and validation for [story feature] (2 files)
  - **Tests**: Models instantiate correctly, validation catches invalid inputs, no circular dependencies, types are exported

- [ ] T004 [US1] Implement service layer and business logic for [story feature] (2 files)
  - **Tests**: Service methods work with valid inputs, handle edge cases, return expected types, pass mocked port tests

- [ ] T005 [P] [US1] Implement API endpoints/UI for [story feature] and wire to services (2 files)
  - **Tests**: Endpoints respond correctly to valid requests, return correct HTTP status codes, error cases return appropriate responses

- [ ] T006 [US1] Write integration tests for [story feature] user journey (1-2 files)
  - **Tests**: Full end-to-end test passes, database state verified, external services mocked appropriately

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

- [ ] T007 [P] [US2] Create data models and implement service logic for [story feature] (2 files)
  - **Tests**: Models work with US1 entities if needed, service integrates correctly with existing infrastructure

- [ ] T008 [US2] Implement API endpoints/UI and integrate with User Story 1 (2 files)
  - **Tests**: Endpoints work independently and correctly interact with US1 components, no regression in US1

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently and together

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

- [ ] T009 [P] [US3] Implement core feature and integrate with previous stories (2 files)
  - **Tests**: Feature works independently, integrates cleanly with US1 and US2 without regressions

- [ ] T010 [US3] Add configuration and optional enhancements (1-2 files)
  - **Tests**: Configuration options work as documented, enhancements are optional and don't break base functionality

**Checkpoint**: All user stories should now be independently functional and integrated

---

[Add more user story phases as needed, following the same pattern - aim for 15-20 total tasks]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, optional hardening, performance optimization

- [ ] T011 [P] Documentation updates (docs/, README, CONTRIBUTING) and code cleanup (1-3 files)
  - **Tests**: README is accurate, CONTRIBUTING is complete, code follows project style guide

- [ ] T012 Add performance optimization and security hardening (1-3 files)
  - **Tests**: Performance benchmarks show improvement, no new security vulnerabilities, existing tests still pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
