---
agent: speckit.tasks
right_sizing: "Target 15-20 tasks per feature, not 50+. Group related changes into single compound tasks. Each task should affect 1-3 files and be completable in one agent session."
tests_required: "Every task MUST include a Tests subsection describing how to verify completion."
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_tasks` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    
    Wait for the result of the hook command before proceeding to the Outline.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (interface contracts), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map interface contracts to user stories
   - If research.md exists: Extract decisions for setup tasks
   - **RIGHT-SIZE CRITICAL**: Generate 15-20 compound tasks total (not 50+)
   - Group related changes: (e.g., Models + validation = 1 task, Services = 1 task, not 1 task per file)
   - Each task affects 1-3 files max
   - Each task is completable in one agent session (~4-8 hours)
   - Create parallel execution examples per user story
   - **EVERY TASK MUST HAVE A TESTS SUBSECTION** describing how to verify it

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - Phase 1: ONE compound Setup task (project initialization, structure, all tooling)
   - Phase 2: ONE-TWO foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: User Stories in priority order (P1, P2, P3...)
     - Per story: 2-3 compound tasks (models+validation, services, endpoints, integration)
     - Each task affects 1-3 files
     - Each task has Tests subsection (beneath task line, not a separate task)
   - Final Phase: ONE Polish task (documentation, cleanup, optional hardening)
   - Total: **15-20 tasks** (not 50+)
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file path descriptions with file count estimate (X-Y files)
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Report**: Output path to generated tasks.md and summary:
   - Total task count (should be 15-20)
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file count, Tests subsection)

6. **Check for extension hooks**: After tasks.md is generated, check if `.specify/extensions.yml` exists in the project root.
   - If it exists, read it and look for entries under the `hooks.after_tasks` key
   - If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
   - Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
   - For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
     - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
     - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
   - For each executable hook, output the following based on its `optional` flag:
     - **Optional hook** (`optional: true`):
       ```
       ## Extension Hooks

       **Optional Hook**: {extension}
       Command: `/{command}`
       Description: {description}

       Prompt: {prompt}
       To execute: `/{command}`
       ```
     - **Mandatory hook** (`optional: false`):
       ```
       ## Extension Hooks

       **Automatic Hook**: {extension}
       Executing: `/{command}`
       EXECUTE_COMMAND: {command}
       ```
   - If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules — Right-Sizing for 15-20 Tasks

**CRITICAL CONSTRAINT**: Generate **15-20 tasks total per feature**, NOT 50+. This is the primary design constraint that drives all other decisions.

**Tests are REQUIRED**: Every task MUST include a Tests subsection (beneath the task, not a separate task entry). The Tests subsection describes how to verify the task is complete.

### Right-Sizing Strategy

- **Group related changes**: Don't create separate tasks for each file. Example:
  - WRONG: T001 Create User model, T002 Create validation, T003 Create factory
  - RIGHT: T001 Create User model, validation, and factory (3 files)
  
- **Each task should affect 1-3 files MAX**: Balance granularity with compound tasks
  
- **Each task is completable in one agent session** (~4-8 hours of focused work):
  - WRONG: T001 Implement entire auth system (auth.py, jwt.py, permissions.py, schema.py, routes.py = 5 files)
  - RIGHT: T001 Implement auth models and validation (auth.py, schema.py = 2 files), T002 Implement JWT and routes (jwt.py, routes.py = 2 files)

- **Consolidate test tasks with implementation**: Tests are subsections of implementation tasks, not separate tasks
  - WRONG: T001 Create User model, T002 Write tests for User model
  - RIGHT: T001 Create User model (2 files: model.py, test_model.py) with Tests subsection describing what to verify

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description (X-Y files)
  - **Tests**: [Description of verification approach]
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label  
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with file count estimate (X-Y files)
6. **Tests subsection**: Immediately indented, describes verification (not a separate task)

**Examples**:

- ✅ CORRECT: 
  ```
  - [ ] T001 Create project structure and initialize Node.js with TypeScript config (3 files)
    - **Tests**: Verify npm install succeeds, tsc --version works, npx vitest --help runs
  ```
  
- ✅ CORRECT: 
  ```
  - [ ] T005 [P] [US1] Create User and Product models with validation (2 files)
    - **Tests**: Import models, verify types, validation catches invalid inputs, no circular dependencies
  ```

- ✅ CORRECT: 
  ```
  - [ ] T014 [US1] Implement auth middleware and login endpoint (2 files)
    - **Tests**: POST /login with valid credentials returns token, invalid returns 401, middleware rejects requests without token
  ```

- ❌ WRONG: `- [ ] T001 Create User model, Product model, Category model, Tag model, Review model` (5 files - too many for one task)

- ❌ WRONG:
  ```
  - [ ] T001 Create User model
  - [ ] T002 Write unit tests for User model
  ```
  Should combine into one task with Tests subsection

### Task Organization — Right-Sizing Strategy

**Rule: Aim for 15-20 total tasks. Use compound tasks to group related work.**

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets **2-3 compound tasks** (not 5-10)
   - Compound task groupings per story:
     - Task A: Data models + validation (1-2 files)
     - Task B: Service layer + business logic (1-2 files)
     - Task C: API endpoints/UI + wiring (1-2 files)
     - Task D (optional): Integration tests (1-2 files)
   - Total per story: 2-3 tasks
   - Total for 5 stories: 10-15 tasks
   - Add 1 Setup task + 1-2 Foundational + 1 Polish = 13-20 tasks

2. **From Contracts**:
   - Group related interface contracts together (1 task per contract family, not per endpoint)
   - Contract tests: included as Tests subsection in implementation task, not separate tasks

3. **From Data Model**:
   - Group related entities in one task (not one task per entity)
   - Example: "Create User, Profile, Preferences models and shared validation" = 1 task (2-3 files)

4. **From Setup/Infrastructure**:
   - **Phase 1**: 1 compound Setup task covering project init + all tooling
   - **Phase 2**: 1-2 compound Foundational tasks covering all blocking infrastructure
   - **Polish**: 1 compound task covering docs + cleanup

### Phase Structure

- **Phase 1**: Setup (1 task: project init + structure + all tooling)
- **Phase 2**: Foundational (1-2 tasks: all blocking infrastructure)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Each user story: 2-3 compound tasks
  - Each task covers 1-3 related files
  - Each task includes Tests subsection describing verification
- **Final Phase**: Polish (1 task: docs, cleanup, optional hardening)

**Target**: 15-20 total tasks (not 50+)
