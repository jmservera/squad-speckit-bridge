# Tasks: Fix CLI Version Display Inconsistency

**Input**: Design documents from `/specs/008-fix-version-display/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Task Sizing**: 14 total tasks. Each task groups related changes, affects 1–3 files, and is completable in one agent session.

**Tests**: REQUIRED — every task includes a Tests subsection describing how to verify completion.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description (X-Y files)`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- **(X-Y files)**: Estimate of how many files this task affects
- **Tests subsection**: Immediately after task line, describes verification approach

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (confirmed by plan.md)

---

## Phase 1: Setup (1 task — shared infrastructure)

**Purpose**: Create the version resolution utility that all subsequent tasks depend on.

- [ ] T001 Create `resolveVersion()` function in `src/main.ts` using `createRequire(import.meta.url)` to read version from `package.json` at runtime, with error handling for missing file and empty/missing version field (1 file)
  - **Tests**: Manually verify `resolveVersion()` returns `'0.3.1'` (current package.json version). Verify the function throws a descriptive `Error` when the version field would be missing or empty (per FR-008 and research.md R3). Confirm no new exports are added to the library's public surface — the function is internal to the composition root.

---

## Phase 2: Foundational (2 tasks — blocking prerequisites)

**Purpose**: Add `version: string` parameter to use case and adapter function signatures so they accept a dynamically resolved version instead of using hardcoded literals. These signature changes MUST be complete before any user story wiring can proceed.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `version: string` parameter to `installBridge()` in `src/install/installer.ts` and replace the hardcoded `'0.2.0'` at line 139 with the new parameter value (1 file)
  - **Tests**: Run `npm test` — existing tests will fail because callers don't pass version yet (expected). Verify the function signature now requires a `version` parameter. Verify no hardcoded `'0.2.0'` remains in `installer.ts` for version assignment.

- [ ] T003 [P] Add `version: string` parameter to `checkStatus()` in `src/install/status.ts` and replace the hardcoded `'0.2.0'` at line 86 with the new parameter value (1 file)
  - **Tests**: Run `npm test` — existing tests will fail because callers don't pass version yet (expected). Verify the function signature now requires a `version` parameter. Verify no hardcoded `'0.2.0'` remains in `status.ts` for version assignment.

---

## Phase 3: User Story 1 — Checking the CLI Version (Priority: P1) 🎯 MVP

**Goal**: `squask -V` and `squask --version` display the exact version from `package.json` (e.g., `"0.3.1"`) with no hardcoded fallback. All aliases (`squask`, `sqsk`, `squad-speckit-bridge`) produce identical output.

**Independent Test**: Run `node dist/cli/index.js --version` and compare output against `package.json` version field. Must be an exact string match with no prefix.

- [ ] T004 [US1] Replace hardcoded `'0.3.0'` in `program.version()` call at `src/cli/index.ts:26` with a `resolveVersion()` call using `createRequire(import.meta.url)` to read `package.json` version at framework layer (1 file)
  - **Tests**: Run `npx tsx src/cli/index.ts --version` and verify output is `0.3.1` (or current package.json version). Run `npx tsx src/cli/index.ts -V` and verify identical output. Verify `grep -n "'0.3.0'" src/cli/index.ts` returns no matches. Confirm the version is read dynamically — temporarily change package.json version to `9.9.9`, run the command, see `9.9.9`, then revert.

- [ ] T005 [P] [US1] Create `tests/unit/version.test.ts` with unit tests for `resolveVersion()`: valid version read, missing package.json scenario, empty version field scenario, and non-string version field scenario (1 file)
  - **Tests**: Run `npx vitest run tests/unit/version.test.ts` — all tests pass. Verify test covers at minimum: (1) returns correct version string from real package.json, (2) throws Error with message containing `"version"` when version field is empty, (3) throws Error with message containing `"package.json"` when file is unreadable. Coverage of `resolveVersion` paths should be ≥90%.

**Checkpoint**: At this point, `squask -V` returns the correct dynamic version. This alone delivers trust in the CLI.

---

## Phase 4: User Story 2 — Viewing Version in Install Output (Priority: P1)

**Goal**: `squask install` human-readable output shows `v{version}` and `squask install --json` output contains a `"version"` field matching `package.json` — both derived dynamically.

**Independent Test**: Run `squask install --dry-run` and verify the version in human output. Run `squask install --dry-run --json | jq .version` and verify it matches `package.json`.

- [ ] T006 [US2] Thread resolved version from `resolveVersion()` through the install command handler in `src/main.ts`, passing it to `installBridge()` at lines ~119 and ~131 where `version: '0.2.0'` is currently hardcoded (1 file)
  - **Tests**: Run `npx tsx src/cli/index.ts install --dry-run` and verify the human-readable output contains the correct version (e.g., `v0.3.1`). Run with `--json` flag and verify the JSON output contains `"version": "0.3.1"`. Verify `grep -n "'0.2.0'" src/main.ts` returns no matches for version-related assignments (documentation comments are exempt per FR-009).

- [ ] T007 [P] [US2] Update `tests/unit/installer.test.ts` to read expected version from `package.json` dynamically and replace the hardcoded `'0.2.0'` assertion at line ~108 with the dynamic value. Update test setup to pass version parameter to `installBridge()` (1 file)
  - **Tests**: Run `npx vitest run tests/unit/installer.test.ts` — all tests pass. Verify `grep -n "'0.2.0'" tests/unit/installer.test.ts` returns no matches. Verify the test reads version from package.json (e.g., via `createRequire` or direct import) rather than asserting a new hardcoded value.

**Checkpoint**: At this point, US1 and US2 are functional — CLI version flag and install output both show the correct dynamic version.

---

## Phase 5: User Story 3 — Bridge Manifest Reflects Correct Version (Priority: P2)

**Goal**: The `.bridge-manifest.json` file written during `squask install` records the correct version from `package.json` in its `version` field, so downstream tools and future runs see the accurate version.

**Independent Test**: Run `squask install`, then `cat .bridge-manifest.json | jq .version` — must match `package.json` version.

- [ ] T008 [US3] Add `version: string` parameter to `FileSystemDeployer.writeManifest()` private method in `src/install/adapters/file-deployer.ts`, replacing the hardcoded `'0.2.0'` at line ~69. Update the call site inside `installBridge()` in `src/install/installer.ts` to propagate the version parameter through to `writeManifest()` (2 files)
  - **Tests**: Run `npx vitest run tests/integration/file-deployer.test.ts` — may need temporary fix to pass version. Verify `grep -n "'0.2.0'" src/install/adapters/file-deployer.ts` returns no matches. Verify `grep -n "'0.2.0'" src/install/installer.ts` returns no matches for version-related code.

- [ ] T009 [P] [US3] Update `tests/integration/file-deployer.test.ts` to pass version parameter to the deployer and replace the hardcoded `'0.2.0'` assertion at line ~57 with a dynamic version read from `package.json` (1 file)
  - **Tests**: Run `npx vitest run tests/integration/file-deployer.test.ts` — all tests pass. Verify `grep -n "'0.2.0'" tests/integration/file-deployer.test.ts` returns no matches. Verify the manifest written during the test contains the correct version string.

**Checkpoint**: At this point, US1, US2, and US3 are functional — version flag, install output, and bridge manifest all reflect the correct version.

---

## Phase 6: User Story 4 — Consistent Status Report Version (Priority: P2)

**Goal**: `squask status` and any diagnostic commands report the version from `package.json` dynamically, so bug reports and support interactions reference the correct installed version.

**Independent Test**: Run `squask status --json | jq .version` — must match `package.json` version.

- [ ] T010 [US4] Thread resolved version from `resolveVersion()` through the status command handler in `src/main.ts` to the `checkStatus()` call, ensuring the StatusReport version field is populated dynamically (1 file)
  - **Tests**: Run the status command and verify the JSON output contains the correct version. Verify `grep -n "'0.2.0'" src/main.ts` returns no matches for version assignments (documentation comments exempt). Run `npm test` — status-related tests may need temporary fix to pass version.

- [ ] T011 [P] [US4] Update `tests/unit/status.test.ts` to read expected version from `package.json` dynamically and replace the hardcoded `'0.2.0'` assertion at line ~122 with the dynamic value. Update test setup to pass version parameter to `checkStatus()` (1 file)
  - **Tests**: Run `npx vitest run tests/unit/status.test.ts` — all tests pass. Verify `grep -n "'0.2.0'" tests/unit/status.test.ts` returns no matches. Verify the test reads version dynamically rather than asserting a new hardcoded value.

**Checkpoint**: All four user stories are now independently functional and integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, cleanup of stale references, documentation updates.

- [ ] T012 [P] Create `tests/e2e/version-consistency.test.ts` that verifies all CLI surfaces (`--version`, `install --dry-run --json`, `status --json`) report the same version and that version matches `package.json` (1 file)
  - **Tests**: Run `npx vitest run tests/e2e/version-consistency.test.ts` — all tests pass. Test should verify at minimum: (1) `--version` output matches package.json, (2) install JSON `version` field matches, (3) status JSON `version` field matches, (4) all three are identical to each other.

- [ ] T013 Remove stale version comment `v0.2.0` from `src/main.ts:2` header and run comprehensive grep to verify zero hardcoded version string literals remain in any `src/` file that contributes to user-facing output (1-2 files)
  - **Tests**: Run `grep -rn "'0\.2\.0'" src/` — must return zero matches. Run `grep -rn "'0\.3\.0'" src/` — must return zero matches. Run `grep -rn "v0\.2\.0" src/` — must return zero matches (stale comment removed). Run full test suite `npm test` — all tests pass. Verify SC-005: zero hardcoded version string literals remain.

- [ ] T014 [P] Add version consistency fix entry to `CHANGELOG.md` documenting the change: single source of truth for version, affected surfaces, and reference to GitHub issue #332 (1 file)
  - **Tests**: Verify CHANGELOG.md contains an entry referencing the version consistency fix. Verify the entry mentions the affected surfaces (CLI version flag, install output, bridge manifest, status report). Verify the entry references issue #332.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — T002 and T003 can run in parallel after T001 completes
- **US1 (Phase 3)**: Depends on T001 — T004 and T005 can run in parallel
- **US2 (Phase 4)**: Depends on T001 and T002 — T006 then T007 (or T007 in parallel if T002 is complete)
- **US3 (Phase 5)**: Depends on T002 — T008 then T009 (or T009 in parallel after T008)
- **US4 (Phase 6)**: Depends on T001 and T003 — T010 then T011 (or T011 in parallel if T003 is complete)
- **Polish (Phase 7)**: Depends on all user story phases being complete. T012, T013, T014 can run in parallel.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 only — can start as soon as resolveVersion() exists
- **User Story 2 (P1)**: Depends on T001 + T002 — needs resolveVersion() and installer signature change
- **User Story 3 (P2)**: Depends on T002 — needs installer signature to propagate version to deployer
- **User Story 4 (P2)**: Depends on T001 + T003 — needs resolveVersion() and status signature change

### Within Each User Story

- Source changes before test updates
- Implementation task before assertion updates
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different files: installer.ts vs. status.ts)
- T004 and T005 can run in parallel (cli/index.ts vs. new test file)
- T006 and T007 can run in parallel once T002 is complete
- T008 and T009 can run in parallel for US3
- T010 and T011 can run in parallel once T003 is complete
- T012, T013, and T014 can all run in parallel in the Polish phase
- **Cross-story parallelism**: US1 and US4 can run in parallel (no shared files). US2 and US4 can run in parallel after foundational phase.

---

## Parallel Example: After Foundational Phase

```bash
# Launch US1 and US4 in parallel (no file conflicts):
Agent A: T004 — Wire resolveVersion() into cli/index.ts
Agent B: T010 — Thread version into main.ts status handler

# Within US2, launch source + test in parallel:
Agent C: T006 — Pass version in main.ts install handler
Agent D: T007 — Update installer.test.ts assertions (after T002 complete)

# Polish phase — all three tasks in parallel:
Agent E: T012 — Create e2e version-consistency.test.ts
Agent F: T013 — Remove stale comments, verify no hardcoded versions
Agent G: T014 — Update CHANGELOG.md
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 — resolveVersion function)
2. Complete Phase 2: Foundational (T002 + T003 — signature changes)
3. Complete Phase 3: User Story 1 (T004 + T005 — CLI version flag)
4. **STOP and VALIDATE**: Run `squask -V` → must show package.json version
5. Deploy/demo if ready — CLI version trust is restored

### Incremental Delivery

1. Complete Setup + Foundational → resolveVersion exists, signatures ready
2. Add User Story 1 → `squask -V` shows correct version → **MVP delivered!**
3. Add User Story 2 → `squask install` output correct → Deploy/Demo
4. Add User Story 3 → Bridge manifest correct → Deploy/Demo
5. Add User Story 4 → Status report correct → Deploy/Demo
6. Each story adds a surface of version consistency without breaking previous stories

### Parallel Team Strategy

With multiple developers after Foundational phase:

1. Team completes Setup + Foundational together (T001 → T002 ∥ T003)
2. Once Foundational is done:
   - Developer A: User Story 1 (T004, T005) — CLI version
   - Developer B: User Story 2 (T006, T007) — Install output
   - Developer C: User Story 3 (T008, T009) — Manifest
   - Developer D: User Story 4 (T010, T011) — Status report
3. All developers: Polish phase in parallel (T012, T013, T014)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The feature affects 7 source files and 5 test files total (per quickstart.md)
- All hardcoded version locations documented in data-model.md Affected Code Locations table
- Error handling contract defined in contracts/cli-version.md Error Contract section
- No new ports, no new adapters, no new abstractions — this is a wiring fix (per plan.md Summary)
