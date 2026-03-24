# Tasks: Hook Fixes and CLI Polish (v0.3.1)

**Input**: Design documents from `/specs/005-hook-fixes-cli-polish/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Task Sizing**: 12 total tasks. Each task groups related changes, affects 1–3 files, and is completable in one agent session.

**Tests**: REQUIRED — every task includes a Tests subsection describing how to verify completion.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description (X–Y files)`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **(X–Y files)**: Estimate of how many files this task affects (1–3 range)
- **Tests subsection**: Immediately after task line, describes verification approach

---

## Phase 1: Setup (1 task — baseline verification)

**Purpose**: Confirm the project builds and all existing tests pass before making any changes. This establishes a clean baseline so regressions are immediately detectable.

- [ ] T001 Verify baseline build and test suite pass before any changes (0 files)
  - **Tests**: Run `npm run build` — must exit 0 with no TypeScript errors. Run `npx vitest run` — all existing tests must pass. Run `git ls-files -s src/install/templates/hooks/` — document current permission state (expect `100644` for before-specify.sh and after-implement.sh, `100755` for after-tasks.sh). Run `grep -rn 'npx.*squad\|npx.*squask' src/install/templates/hooks/` — document current CLI alias usage per hook.

---

## Phase 2: Foundational (1 task — entity layer prerequisite)

**Purpose**: Add the `autoCreateIssues` config field to `BridgeConfig` that User Story 2 depends on. This is the only entity-layer change in the entire release.

**⚠️ CRITICAL**: US2 (after-tasks automation) cannot be implemented until this config field exists.

- [ ] T002 Add `autoCreateIssues` boolean to `BridgeConfig.hooks` in `src/types.ts` and update defaults and validation (1 file)
  - Add `autoCreateIssues: boolean` to the `hooks` section of the `BridgeConfig` interface (after the existing `afterImplement` field).
  - Update `createDefaultConfig()` (around line 670) to include `autoCreateIssues: true` in the hooks section — per spec assumption, auto-creation is enabled by default.
  - Review `isValidConfig()` (around line 146) — confirm it validates the `hooks` object. The new boolean field requires no additional range validation beyond what the existing type system provides.
  - **Tests**: Run `npx vitest run tests/unit/types.test.ts`. Add a test case verifying `createDefaultConfig().hooks.autoCreateIssues === true`. Add a test case verifying the `BridgeConfig` interface accepts `{ hooks: { ..., autoCreateIssues: false } }` without type errors. Run `npm run build` to confirm no TypeScript compilation errors.

---

## Phase 3: User Story 1 — Hook Scripts Execute After Installation (Priority: P0) 🎯 MVP

**Goal**: Ensure all three hook template files have executable permissions so they run without "permission denied" errors after a fresh bridge installation.

**Independent Test**: Run `git ls-files -s src/install/templates/hooks/` and verify all three entries show `100755`. After `npm run build`, run `ls -la dist/install/templates/hooks/` and verify all three files show `rwxr-xr-x`.

- [ ] T003 [P] [US1] Set git executable bit on `before-specify.sh` and `after-implement.sh` via `git update-index --chmod=+x` (2 files)
  - Run `git update-index --chmod=+x src/install/templates/hooks/before-specify.sh` to change the git-tracked mode from `100644` to `100755`.
  - Run `git update-index --chmod=+x src/install/templates/hooks/after-implement.sh` to change the git-tracked mode from `100644` to `100755`.
  - Run `git update-index --chmod=+x src/install/templates/hooks/after-tasks.sh` to confirm it remains `100755` (idempotent, no-op if already set).
  - **Tests**: Run `git ls-files -s src/install/templates/hooks/` — all three files must show `100755`. Run `npm run build` and then `ls -la dist/install/templates/hooks/` — all three files must have the executable bit set (`rwxr-xr-x` or equivalent). Run `stat -c '%a' dist/install/templates/hooks/*.sh` — all must output `755`.

- [ ] T004 [P] [US1] Add integration test verifying `deployExecutable()` applies `0o755` permissions in `tests/integration/file-deployer.test.ts` (1 file)
  - In the existing `tests/integration/file-deployer.test.ts`, add a test case within the `deployExecutable` describe block.
  - The test should: (1) create a `FileSystemDeployer` instance with a temp directory, (2) call `deployExecutable()` with a sample `DeploymentFile`, (3) use `fs.stat()` on the deployed file and assert `(stat.mode & 0o777) === 0o755`.
  - Add a second test case that deploys under a restrictive process umask (if platform supports `process.umask(0o077)`) and verifies `chmod` overrides the umask to still produce `0o755`. Reset umask in `afterEach`.
  - **Tests**: Run `npx vitest run tests/integration/file-deployer.test.ts` — new tests must pass. The umask test specifically validates the edge case from spec (restrictive umask environment).

**Checkpoint**: After T003 + T004, all hook templates are executable in git and the deployer's permission enforcement is verified. User Story 1 acceptance scenarios 1–4 should pass.

---

## Phase 4: User Story 2 — After-Tasks Hook Automates the SpecKit→Squad Handoff (Priority: P0)

**Goal**: The after-tasks hook automatically invokes `squask issues` to create GitHub issues from generated tasks, with configurable opt-out and graceful failure handling.

**Independent Test**: Set `SPECKIT_SPEC_DIR` to a directory containing a `tasks.md`, run `bash src/install/templates/hooks/after-tasks.sh`, and verify the hook invokes `npx squask issues` (observable via output or dry-run).

**Depends on**: T002 (autoCreateIssues config field must exist in BridgeConfig)

- [ ] T005 [US2] Rewrite `after-tasks.sh` to automate issue creation with config check and graceful failure in `src/install/templates/hooks/after-tasks.sh` (1 file)
  - Replace the current `review --notify` invocation with automatic issue creation using `npx squask issues`.
  - Keep the existing prerequisite checks (npx availability, SPECKIT_SPEC_DIR, config-based hook enable/disable) — they are correct.
  - Keep the existing squad-context.md generation block — it is useful.
  - **Add** a new config check for `hooks.autoCreateIssues` using the established inline Node.js pattern:
    ```bash
    AUTO_CREATE=$(node -e "
      try {
        const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
        console.log(c.hooks?.autoCreateIssues !== false ? 'true' : 'false');
      } catch { console.log('true'); }
    " 2>/dev/null || echo "true")
    ```
    If `AUTO_CREATE` is `"false"`, print `[squad-bridge] Auto-issue creation disabled — skipping.` and exit 0.
  - **Replace** the `npx @jmservera/squad-speckit-bridge review --notify "$TASKS_FILE"` line with:
    ```bash
    echo "[squad-bridge] Creating GitHub issues from ${TASKS_FILE}..."
    npx squask issues "$TASKS_FILE" || {
      echo "[squad-bridge] WARNING: Issue creation failed — create manually with:"
      echo "[squad-bridge]   npx squask issues ${TASKS_FILE}"
      exit 0
    }
    echo "[squad-bridge] Issues created successfully."
    ```
  - Also fix the CLI alias in the context generation block: change `npx @jmservera/squad-speckit-bridge context` to `npx squask context` (this is the US3 overlap for this file).
  - Update the script header comment from "Notifies the developer that a Design Review is available" to "Automatically creates GitHub issues from generated tasks (SpecKit→Squad handoff)."
  - **Tests**: Verify the file contains `npx squask issues` (not `review --notify`). Verify the file contains `autoCreateIssues` config check. Verify the file contains the `|| {` graceful failure pattern around the issues invocation. Verify the file does NOT contain `@jmservera/squad-speckit-bridge` or `squad-speckit-bridge` (only `squask`). Run `bash -n src/install/templates/hooks/after-tasks.sh` to confirm valid shell syntax.

- [ ] T006 [P] [US2] Add unit tests validating after-tasks hook content and automation behavior in `tests/unit/installer.test.ts` (1 file)
  - In the existing `tests/unit/installer.test.ts`, add a new `describe('after-tasks hook content')` block.
  - Read the after-tasks.sh template content from `src/install/templates/hooks/after-tasks.sh` using `fs.readFileSync()`.
  - Add test: hook content contains `npx squask issues` invocation.
  - Add test: hook content contains `autoCreateIssues` configuration check.
  - Add test: hook content does NOT contain `review --notify` (old behavior removed).
  - Add test: hook content contains graceful failure pattern (`|| {` followed by `exit 0`).
  - Add test: hook content does NOT contain `@jmservera/squad-speckit-bridge` (scoped package name removed).
  - Add test: hook content does NOT contain `npx squad-speckit-bridge` (unscoped full name removed).
  - **Tests**: Run `npx vitest run tests/unit/installer.test.ts` — all new tests must pass.

**Checkpoint**: After T005 + T006, the after-tasks hook automates issue creation. US2 acceptance scenarios 1–4 should pass. Combined with T003, the hook is executable and uses the correct CLI alias.

---

## Phase 5: User Story 3 — Consistent CLI Command References Across All Hooks (Priority: P0)

**Goal**: All hook scripts reference the bridge CLI using the canonical short alias `squask` — no scoped or unscoped long names.

**Independent Test**: Run `grep -rn 'npx.*squad' src/install/templates/hooks/` and verify every match shows `npx squask` — no `@jmservera/squad-speckit-bridge` or `squad-speckit-bridge`.

**Note**: The after-tasks.sh alias fix is included in T005 (US2). This phase fixes the remaining two hooks.

- [ ] T007 [P] [US3] Replace `npx squad-speckit-bridge` with `npx squask` in `before-specify.sh` and `after-implement.sh` (2 files)
  - In `src/install/templates/hooks/before-specify.sh`: Change `npx squad-speckit-bridge context "$SPEC_DIR" --quiet` to `npx squask context "$SPEC_DIR" --quiet` (line ~38).
  - In `src/install/templates/hooks/after-implement.sh`: Change `npx squad-speckit-bridge sync "$SPEC_DIR" --quiet` to `npx squask sync "$SPEC_DIR" --quiet` (line ~35).
  - Verify no other occurrences of `squad-speckit-bridge` or `@jmservera/squad-speckit-bridge` remain in either file.
  - **Tests**: Run `grep -c 'squad-speckit-bridge' src/install/templates/hooks/before-specify.sh` — must output `0`. Run `grep -c 'squad-speckit-bridge' src/install/templates/hooks/after-implement.sh` — must output `0`. Run `grep -c 'npx squask' src/install/templates/hooks/before-specify.sh` — must output `1`. Run `grep -c 'npx squask' src/install/templates/hooks/after-implement.sh` — must output `1`. Run `bash -n src/install/templates/hooks/before-specify.sh && bash -n src/install/templates/hooks/after-implement.sh` — valid shell syntax.

- [ ] T008 [P] [US3] Add cross-hook CLI alias consistency test in `tests/unit/installer.test.ts` (1 file)
  - In the existing `tests/unit/installer.test.ts`, add a `describe('hook CLI alias consistency')` block.
  - Read all three hook templates from `src/install/templates/hooks/`.
  - Add test: NO hook template contains the string `@jmservera/squad-speckit-bridge`.
  - Add test: NO hook template contains `npx squad-speckit-bridge` (unscoped full name — note the `npx ` prefix to avoid matching comments or echo strings that mention the project name generically).
  - Add test: Every hook template that invokes `npx` uses `npx squask` as the command.
  - This test acts as a regression guard — any future hook change that introduces an inconsistent alias will be caught.
  - **Tests**: Run `npx vitest run tests/unit/installer.test.ts` — all consistency tests pass.

**Checkpoint**: After T005 + T007 + T008, all hooks use `npx squask` consistently. US3 acceptance scenarios 1–3 should pass.

---

## Phase 6: User Story 4 — Complete Demo Command Documentation (Priority: P2)

**Goal**: The API reference includes complete demo command documentation with detailed option descriptions, exit codes, output schema, and usage examples.

**Independent Test**: Open `docs/api-reference.md`, find the demo command section, and verify it includes: (1) option table with types and defaults, (2) exit code definitions, (3) JSON output schema with field descriptions, (4) at least two usage examples.

- [ ] T009 [P] [US4] Complete demo command documentation in `docs/api-reference.md` with options, exit codes, schema, and examples (1 file)
  - Review the existing demo section in `docs/api-reference.md` (around line 552+) and compare against FR-006 requirements.
  - Ensure the **options table** includes: `--dry-run` (boolean, default false — simulates pipeline without side effects), `--keep` (boolean, default false — preserves generated artifacts on success instead of auto-cleanup), `--verbose` (boolean, default false — shows detailed stage execution output), `--json` (boolean, default false — outputs results as structured JSON instead of human-readable format).
  - Ensure **exit codes** section exists with: `0` = all pipeline stages completed successfully, `1` = one or more pipeline stages failed or invalid options provided.
  - Ensure **JSON output schema** has field-level descriptions for: `success` (boolean), `totalElapsedMs` (number — total pipeline duration), `stages` (array of stage objects: `name`, `displayName`, `status`, `elapsedMs`, `artifact`/`error`), `summary.total`, `summary.passed`, `summary.failed`.
  - Ensure at least **two usage examples**: (1) CI smoke test: `npx squask demo --dry-run --json` with expected output showing dry-run stage results; (2) Interactive developer onboarding: `npx squask demo --verbose --keep` with expected output showing detailed stage progress and preserved artifacts.
  - Match the documentation style/depth of other commands already in the file (options tables, code blocks, scenario descriptions).
  - Source of truth for accurate values: `src/demo/entities.ts` (types), `src/demo/orchestrator.ts` (pipeline stages), `src/cli/index.ts` lines 341–404 (CLI command definition), `src/demo/formatters.ts` (output formatting).
  - **Tests**: Verify the demo section contains an options table with all four flags. Verify the section contains exit code `0` and `1` definitions. Verify the section contains at least two fenced code blocks with `squask demo` examples. Run any markdown linter if available (`npx markdownlint docs/api-reference.md` or similar).

---

## Phase 7: User Story 5 — Clean Architecture Compliance Verification (Priority: P2)

**Goal**: Verify all v0.3.1 changes comply with the five constitutional principles. This is a review/verification activity, not a code change.

**Independent Test**: Review the dependency graph, layer boundaries, test organization, boundary data types, and framework confinement after all changes are applied.

- [ ] T010 [US5] Verify all v0.3.1 changes comply with the five Clean Architecture constitutional principles (1–2 files)
  - **Principle I — The Dependency Rule**: Verify that `src/types.ts` (entity layer) has no new outward imports. The `autoCreateIssues` field is a primitive boolean — no framework types leak in. Verify hook templates (driver layer) only call the CLI binary, not internal modules.
  - **Principle II — Clean Architecture Layers**: Confirm changes map to correct layers: `src/types.ts` → Entity (Layer 0), `src/install/adapters/file-deployer.ts` → Adapter (Layer 2), `src/install/templates/hooks/*.sh` → Framework/Driver (Layer 3), `docs/*.md` → Documentation (not a code layer).
  - **Principle III — Test-First by Layer**: Verify new tests exist for each changed layer: entity tests in `tests/unit/types.test.ts`, adapter tests in `tests/integration/file-deployer.test.ts`, hook content tests in `tests/unit/installer.test.ts`.
  - **Principle IV — Simple Data Crosses Boundaries**: Verify `autoCreateIssues` is a boolean primitive on an existing DTO. No new complex types cross layer boundaries. `DeploymentFile` remains the only DTO crossing the deployment boundary.
  - **Principle V — Framework Independence**: Verify no new framework dependencies were introduced. `chmod(0o755)` in file-deployer.ts uses `node:fs/promises` — already confined to the adapter layer. Hook templates are shell scripts (Layer 3) that invoke the CLI binary — correct layer placement.
  - If all five principles pass, add a brief compliance note to `docs/architecture.md` (if the file exists) or create a verification comment in the PR description documenting the result.
  - **Tests**: Run `npx vitest run` — full test suite passes. Review `src/types.ts` imports — must only import from Node.js built-ins or have no imports at all. Run `grep -r 'import.*from' src/types.ts` — verify no framework imports.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, build verification, and documentation updates.

- [ ] T011 [P] Run full build and test suite, verify hook permissions propagate to `dist/` (0 files)
  - Run `npm run build` — must complete with no errors.
  - Run `npx vitest run` — all tests (existing + new from T002, T004, T006, T008) must pass.
  - Run `git ls-files -s src/install/templates/hooks/` — all three must show `100755`.
  - Run `ls -la dist/install/templates/hooks/` — all three must have executable permissions.
  - Run `grep -rn 'npx.*squad' src/install/templates/hooks/` — every match must show `npx squask`, nothing else.
  - Run `grep -rn 'npx.*squad' dist/install/templates/hooks/` — same verification on built output.
  - **Tests**: All verification commands above pass. This task produces no file changes — it is a validation gate.

- [ ] T012 [P] Update hook scripts contract documentation to reflect v0.3.1 changes in `specs/005-hook-fixes-cli-polish/contracts/hook-scripts.md` (1 file)
  - Update the after-tasks hook behavioral contract to reflect the new automation behavior: issue creation instead of review notification.
  - Add `hooks.autoCreateIssues` to the Configuration Interaction section.
  - Verify the CLI Invocation Pattern section already specifies `npx squask` (it does per current contracts/hook-scripts.md).
  - Verify the File Permissions section documents the two-layer defense (git +x AND deployExecutable chmod).
  - **Tests**: Review the contract document for accuracy against the actual hook implementations. Each behavioral contract must match what the corresponding hook template actually does after T005 and T007.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS User Story 2
- **US1 (Phase 3)**: Depends on Phase 1 — can start in parallel with Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (T002 config field) — BLOCKS on foundational
- **US3 (Phase 5)**: Depends on Phase 1 — can start in parallel with Phases 2, 3, 4
- **US4 (Phase 6)**: No code dependencies — can start any time after Phase 1
- **US5 (Phase 7)**: Depends on ALL code changes being complete (Phases 2–5)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P0 — Permissions)**: Independent — only modifies git metadata and adds a test
- **US2 (P0 — Automation)**: Depends on T002 (autoCreateIssues config field). Also includes the after-tasks.sh alias fix, so implicitly delivers part of US3 for that file.
- **US3 (P0 — CLI Alias)**: Independent for before-specify.sh and after-implement.sh. The after-tasks.sh alias fix is handled by T005 (US2).
- **US4 (P2 — Demo Docs)**: Fully independent — documentation only, no code dependencies
- **US5 (P2 — Compliance)**: Depends on all code changes — verification activity

### Within Each User Story

- Implementation tasks before validation tests
- Entity changes (T002) before driver changes that depend on them (T005)
- File modifications before content validation tests
- All code changes before compliance verification (T010)

### Parallel Opportunities

- **After T001 completes**: T002, T003, T004, T007, T009 can ALL start in parallel
- **After T002 completes**: T005 and T006 can start (T005 depends on T002; T006 depends on T005)
- **T003 + T004 + T007 + T008 + T009**: All parallelizable (different files, no dependencies)
- **T010**: Must wait for T002–T009 to complete (verification of all changes)
- **T011 + T012**: Parallelizable with each other, but must wait for T002–T010

---

## Parallel Example: After Phase 1 Baseline

```text
# These five tasks can launch simultaneously after T001:
Agent A: T002 — Add autoCreateIssues to BridgeConfig in src/types.ts
Agent B: T003 — Set git +x on hook templates (git update-index)
Agent C: T004 — Add deployExecutable permission test in tests/integration/file-deployer.test.ts
Agent D: T007 — Fix CLI alias in before-specify.sh and after-implement.sh
Agent E: T009 — Complete demo docs in docs/api-reference.md

# After T002 completes:
Agent A: T005 — Rewrite after-tasks.sh with automation

# After T005 completes:
Agent A: T006 — Add after-tasks content validation tests

# After T007 completes:
Agent D: T008 — Add CLI alias consistency tests

# After all code tasks complete:
Agent A: T010 — Architecture compliance verification
Agent B: T011 + T012 — Polish (parallel)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Baseline verification
2. Complete Phase 2: Foundational config change
3. Complete Phase 3: US1 — Hook permissions fix
4. **STOP and VALIDATE**: All three hooks execute without permission errors
5. This alone moves hook success from 33% → 100%

### Incremental Delivery

1. Setup + Foundational → Config ready
2. Add US1 (permissions) → Test: all hooks executable → **Immediate adoption unblock**
3. Add US3 (CLI alias) → Test: all hooks use `squask` → **Environment compatibility fix**
4. Add US2 (automation) → Test: issues created automatically → **Core value proposition delivered**
5. Add US4 (docs) → Test: demo fully documented → **Onboarding improvement**
6. Add US5 (compliance) → Test: five principles verified → **Architecture health confirmed**

### Parallel Team Strategy

With multiple developers:

1. All complete Phase 1 (baseline) together
2. Once baseline verified:
   - Developer A: US1 (T003, T004) + US2 (T005, T006) — sequential due to T002 dependency
   - Developer B: US3 (T007, T008) + US4 (T009) — fully independent
   - Developer C: T002 (foundational) then US5 (T010) after all code is in
3. Final: T011 + T012 (polish) by anyone

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US1 and US3 both modify hook template files but different aspects (permissions vs. content) — no conflict
- US2 (T005) includes the alias fix for after-tasks.sh, so US3 only needs to fix the other two hooks
- The `deployExecutable()` method already enforces `0o755` at deployment time — T003 (git permissions) is defense-in-depth for source tree correctness
- All hook exit paths must return `exit 0` — hooks MUST NOT block the SpecKit pipeline
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
