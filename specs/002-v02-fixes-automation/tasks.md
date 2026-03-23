# Tasks: Squad-SpecKit Bridge v0.2.0 — Fixes, Commands & Automation

**Input**: Design documents from `/specs/002-v02-fixes-automation/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, research.md ✓, contracts/ ✓

**Tests**: Not explicitly requested in the specification — test tasks are omitted. Clean Architecture test pyramid (entity unit tests, use case mocked-port tests, adapter integration tests, CLI snapshot tests, E2E pipeline tests) can be added per layer when needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Within each story, tasks follow **Clean Architecture layer ordering**: Entities → Use Cases → Adapters → Frameworks/Drivers (innermost first, per `.squad/skills/clean-architecture-bridge/SKILL.md`).

**Note**: This is v0.2.0 — the v0.1.0 foundation (entities, ports, use cases, adapters for install/context/review/status commands) already exists. Tasks reference extending existing files rather than creating from scratch.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` and `tests/` at repository root
- Clean Architecture layers within `src/`:
  - `src/types.ts` — Entities (innermost layer, zero imports)
  - `src/bridge/ports.ts` — Port interfaces (use case layer, imports only entities)
  - `src/issues/create-issues.ts`, `src/sync/sync-learnings.ts` — Use cases (import entities + ports)
  - `src/issues/adapters/`, `src/sync/adapters/`, `src/install/` — Adapters (implement ports, use frameworks)
  - `src/cli/index.ts` — Framework/Driver (outermost layer, commander bootstrap)
  - `src/main.ts` — Composition root (wires adapters into use cases via constructor injection)

---

## Phase 1: Setup

**Purpose**: New directory structure and dependencies for v0.2.0 features

- [ ] T001 Create v0.2.0 directory structure: src/issues/adapters/, src/sync/adapters/, src/status/, tests/fixtures/tasks/ (sample tasks.md files for issues command testing)
- [ ] T002 Add @octokit/rest dependency to package.json for GitHub issue creation (US3)

---

## Phase 2: Foundational (Extended Entities & Ports)

**Purpose**: Extend the inner Clean Architecture layers with new entity types and port interfaces required by ALL v0.2.0 user stories. Zero I/O, zero framework imports.

**⚠️ CRITICAL**: No v0.2.0 user story work can begin until this phase is complete. These are the innermost layers upon which all new adapters and drivers depend.

- [ ] T003 [P] Add IssueRecord entity type to src/types.ts — issueNumber (number), title (string), body (string), labels (string[]), dependencyRefs (string[]), sourceTaskId (string matching T\d{3}), createdAt (ISO 8601), url (string). Include validation: sourceTaskId pattern check, non-empty labels array.
- [ ] T004 [P] Add TaskEntry entity type to src/types.ts — id (string), title (string), isParallelizable (boolean), storyLabel (string | null), phase (string), dependencies (string[]), filePath (string | null), isComplete (boolean). Include circular dependency detection: detectCircularDeps(tasks: TaskEntry[]): string[][] returning cycles.
- [ ] T005 [P] Add SyncRecord entity type to src/types.ts — syncTimestamp (ISO 8601), previousSyncTimestamp (ISO 8601 | null), newDecisionsCount (number), newLearningsCount (number), affectedAgentIds (string[]), syncStatus ("success" | "partial" | "failed"), changes (SyncChange[]). Add SyncChange type: file (string), changeType ("added" | "modified"), summary (string).
- [ ] T006 [P] Add SyncState entity type to src/types.ts — lastSyncTimestamp (ISO 8601), fileHashes (Record<string, string>), version (string). Include validation: non-empty version, valid ISO timestamp.
- [ ] T007 [P] Add HookScript entity type to src/types.ts — hookPoint ("before_specify" | "after_tasks" | "after_implement"), scriptPath (string), isExecutable (boolean), enabled (boolean), supported (boolean).
- [ ] T008 Fix ApprovalStatus type in src/types.ts — change from "approved" | "changes_requested" | "blocked" to "pending" | "approved" | "changes_requested". Add initial state constant: INITIAL_APPROVAL_STATUS = "pending". Remove any references to "blocked".
- [ ] T009 Add new port interfaces to src/bridge/ports.ts — IssueCreator (create(task: TaskEntry, labels: string[]): Promise<IssueRecord>, updateCrossRefs(issue: IssueRecord, refs: Map<string, number>): Promise<void>), TasksReader (readTasks(path: string): Promise<TaskEntry[]>), SyncStateReader (loadState(): Promise<SyncState | null>), SyncStateWriter (saveState(state: SyncState): Promise<void>), HookDeployer (deployHook(hook: HookScript): Promise<void>, setExecutable(path: string): Promise<void>), ManifestValidator (validate(manifestPath: string): Promise<ValidationResult>). Import only from types.ts.
- [ ] T010 [P] Extend BridgeConfig entity in src/types.ts — add sync config (sync.enabled: boolean, sync.stateFile: string), issues config (issues.defaultLabels: string[], issues.phaseLabels: boolean), hooks config (hooks.beforeSpecify: boolean, hooks.afterImplement: boolean). Update createDefaultConfig() and isValidConfig() accordingly.

**Checkpoint**: Foundation extended — all new entity types defined, all new port interfaces specified. v0.2.0 user story implementation can begin.

---

## Phase 3: User Story 1 — Fix Hook Deployment (Priority: P1) 🎯

**Goal**: The installer deploys all hook scripts to `.specify/extensions/squad-speckit-bridge/hooks/` with correct executable permissions. Re-installation detects and deploys missing hooks. Covers FR-001, FR-002, FR-004, FR-005.

**Independent Test**: Run the bridge installer in a fresh repository with both frameworks. Verify that `after-tasks.sh` exists in the hooks directory, has executable permissions, and is referenced in extension.yml. Re-run installer and verify missing hooks are added.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T011 [US1] Implement DeployHooks use case in src/install/hook-deployer-usecase.ts — orchestration logic: receive list of HookScript entities, call HookDeployer port for each, verify executable permissions via port, report deployment results. Handle permission failures gracefully (warn with remediation command, continue). Depends only on types.ts and ports.ts.
- [ ] T012 [US1] Extend InstallBridge use case in src/install/installer.ts — add DeployHooks step after component deployment. After deploying SKILL.md, ceremony.md, extension.yml, call DeployHooks with all hook scripts. Update InstallManifest to include deployed hooks.
- [ ] T013 [US1] Create hook script templates in src/install/templates/ — after-tasks.sh (triggers clarify + review notification per FR-026), before-specify.sh (auto-runs context command), after-implement.sh (auto-runs sync command). Each script checks for npx availability before invocation (FR-023).
- [ ] T014 [US1] Implement HookScriptDeployer adapter in src/install/adapters/hook-deployer.ts — implements HookDeployer port. Copies template scripts to `.specify/extensions/squad-speckit-bridge/hooks/`, sets chmod +x via fs/promises. Handles permission errors with specific remediation message. Verifies hook references in extension.yml.
- [ ] T015 [US1] Extend FileDeployer adapter in src/install/adapters/file-deployer.ts — add method to detect missing hooks on re-installation (compare deployed files against expected hooks list). Report newly deployed hooks in installation summary.
- [ ] T016 [US1] Wire DeployHooks into composition root in src/main.ts — inject HookScriptDeployer into InstallBridge use case. Update install CLI output to include hook deployment results.

**Checkpoint**: After `squad-speckit-bridge install`, all hook scripts exist with executable permissions. Re-installation deploys missing hooks. US1 independently testable.

---

## Phase 4: User Story 2 — Spec Kit Extension Model Alignment (Priority: P1) 🎯

**Goal**: The `extension.yml` manifest conforms exactly to Spec Kit's extension schema. Hooks are discovered and invoked by Spec Kit without manual configuration. Covers FR-003, FR-005.

**Independent Test**: Install the bridge, then run a Spec Kit lifecycle event that triggers a hook. Verify Spec Kit discovers the extension and invokes the registered hook.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T017 [US2] Define SpecKit extension schema interface in src/types.ts — ExtensionManifest type: name (string), version (string), description (string), hooks (Record<string, HookDefinition>), commands (Record<string, CommandDefinition>). HookDefinition: script (string), env (Record<string, string>), enabled (boolean). Ensure structure matches Spec Kit's actual discovery format.
- [ ] T018 [US2] Implement ManifestValidator adapter in src/install/adapters/manifest-validator.ts — implements ManifestValidator port. Reads extension.yml, validates against ExtensionManifest schema. Checks: all required fields present, hook script paths exist on disk, environment variables correctly declared. Returns ValidationResult with errors and warnings.
- [ ] T019 [US2] Update extension.yml template in src/install/templates/extension.yml — align hook registration format with Spec Kit's expected schema. Include: after_tasks hook with correct env vars (FEATURE_DIR, TASKS_FILE), before_specify and after_implement hooks, command definitions for bridge CLI commands.
- [ ] T020 [US2] Extend InstallBridge use case in src/install/installer.ts — add manifest validation step after deployment. Call ManifestValidator port, report validation errors/warnings. Fail installation if critical schema violations detected.
- [ ] T021 [US2] Wire ManifestValidator into composition root in src/main.ts — inject ManifestAdapter into InstallBridge use case. Add validation results to install output.

**Checkpoint**: Extension manifest conforms to Spec Kit's schema. Spec Kit discovers and invokes hooks without manual configuration. US2 independently testable.

---

## Phase 5: User Story 3 — Issues Command (Priority: P1) 🎯

**Goal**: `squad-speckit-bridge issues <tasks-file>` creates GitHub issues from approved tasks.md. Supports --dry-run, --labels, --json. Dependencies resolved into cross-references. Covers FR-006 through FR-011.

**Independent Test**: Run `issues --dry-run` against a sample tasks.md and verify correct issue previews. Run without --dry-run against a test repo and verify issues created with correct content, labels, and dependency references.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T022 [US3] Implement CreateIssuesFromTasks use case in src/issues/create-issues.ts — orchestration: receive TaskEntry[] from TasksReader port, validate entries (skip malformed with warning per FR-010), detect circular dependencies (error per edge case), resolve dependencies into creation order, call IssueCreator port for each valid task (pass 1: create, pass 2: update cross-refs). Support dry-run mode (skip API calls, return preview IssueRecord[] with issueNumber=0). Depends only on types.ts and ports.ts.
- [ ] T023 [US3] Implement TasksMarkdownParser adapter in src/issues/task-parser.ts — implements TasksReader port. Parses tasks.md checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`. Extracts: task ID, parallelizable flag, story label, description, file path. Detects dependencies from "Depends on:" or "depends on T0xx" patterns. Skips malformed entries, records warnings.
- [ ] T024 [US3] Implement GitHubIssueAdapter in src/issues/adapters/github-issue-adapter.ts — implements IssueCreator port. Uses @octokit/rest to create issues. Auto-detects repo from git remote (parse origin URL). Authenticates via GITHUB_TOKEN env var or `gh auth token` fallback. Formats issue body with task description, file path, dependency cross-references (#N). Applies labels: auto-generated phase label + user-specified labels.
- [ ] T025 [US3] Add `issues` subcommand to CLI in src/cli/index.ts — required argument: <tasks-file>, options: --dry-run (boolean), --labels <labels> (comma-separated string), --repo <owner/repo> (string, auto-detected). Wire to CreateIssuesFromTasks use case via composition root. Human-readable, JSON, and dry-run output per contracts/cli-interface.md.
- [ ] T026 [US3] Wire issues use case in src/main.ts — add CreateIssuesFromTasks composition: inject TasksMarkdownParser and GitHubIssueAdapter into use case via constructor. Export factory for CLI consumption. Handle GitHub auth errors with clear message.

**Checkpoint**: `squad-speckit-bridge issues <tasks-file>` creates GitHub issues with correct labels, descriptions, and cross-referenced dependencies. --dry-run, --labels, --json all work. US3 independently testable.

---

## Phase 6: User Story 4 — Sync Command (Priority: P2)

**Goal**: `squad-speckit-bridge sync` captures execution learnings from Squad memory for the knowledge flywheel. Tracks sync state, detects changes since last sync, produces structured SyncRecord. Covers FR-012 through FR-015.

**Independent Test**: Run sync after Squad agents have written new learnings. Verify SyncRecord captures correct change counts. Run sync again with no changes and verify "no new learnings" response.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T027 [US4] Implement SyncLearnings use case in src/sync/sync-learnings.ts — orchestration: load previous sync state via SyncStateReader port (or initialize if first sync), scan Squad memory files for changes (compare content hashes), produce SyncRecord entity with change counts and affected agents, save new sync state via SyncStateWriter port. Handle locked files gracefully (partial sync with warning). Depends only on types.ts and ports.ts.
- [ ] T028 [US4] Implement SyncStateAdapter in src/sync/adapters/sync-state-adapter.ts — implements SyncStateReader and SyncStateWriter ports. Persists sync state in `.bridge-sync-state.json`. Reads: lastSyncTimestamp, fileHashes, version. Writes: updated state after successful sync. Computes content hashes (MD5) for change detection. Uses fs/promises.
- [ ] T029 [US4] Add `sync` subcommand to CLI in src/cli/index.ts — options: --dry-run (boolean), --squad-dir <path> (string). Wire to SyncLearnings use case via composition root. Human-readable, JSON, and no-changes output per contracts/cli-interface.md.
- [ ] T030 [US4] Wire sync use case in src/main.ts — add SyncLearnings composition: inject SyncStateAdapter and SquadFileReader into use case via constructor. Export factory for CLI consumption.

**Checkpoint**: `squad-speckit-bridge sync` captures changes since last sync. Next `context` command includes synced learnings. US4 independently testable.

---

## Phase 7: User Story 5 — Automation Hooks (Priority: P2)

**Goal**: Automation hooks reduce manual steps. `before_specify` auto-injects context. `after_implement` auto-captures learnings. `after_tasks` triggers clarify + review. Covers FR-016 through FR-019.

**Independent Test**: Install bridge with hooks. Run Spec Kit specify and verify context auto-injected. Run implement and verify sync triggered. Disable a hook and verify it doesn't fire.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T031 [US5] Implement before-specify.sh hook script in src/install/templates/hooks/before-specify.sh — checks npx availability (FR-023), runs `npx squad-speckit-bridge context` with the active spec directory. Reports failure to stderr with non-zero exit code but doesn't block Spec Kit lifecycle (advisory, not gate). Outputs timing info if --verbose passed.
- [ ] T032 [P] [US5] Implement after-implement.sh hook script in src/install/templates/hooks/after-implement.sh — checks npx availability, runs `npx squad-speckit-bridge sync`. Advisory execution: stderr on failure, non-blocking. Outputs sync summary.
- [ ] T033 [US5] Update after-tasks.sh hook script in src/install/templates/hooks/after-tasks.sh — extend to trigger both clarify pass prompt AND Design Review notification (FR-026), not just review. Order: clarify first, then review notification. Check npx availability.
- [ ] T034 [US5] Extend InstallBridge use case in src/install/installer.ts — detect which hook points are supported by the installed Spec Kit version. For unsupported hook points (e.g., before_specify), skip deployment with a warning and manual workaround message (FR-018). Mark HookScript.supported = false.
- [ ] T035 [US5] Add hook enable/disable support to extension.yml template — each hook has `enabled: true/false` per FR-019. HookScriptDeployer reads this setting and skips disabled hooks during lifecycle events.

**Checkpoint**: Automation hooks reduce manual workflow steps. Unsupported hooks gracefully degrade. Each hook independently disablable. US5 independently testable.

---

## Phase 8: User Story 6 — CLI Contract Alignment (Priority: P2)

**Goal**: CLI matches documentation. `--verbose` and `--notify` flags accepted. ApprovalStatus type complete. Hook scripts handle missing tools. Covers FR-020 through FR-023.

**Independent Test**: Run each CLI command with --verbose and verify diagnostic output on stderr. Run review with --notify and verify notification. Run hook scripts without npx and verify graceful failure.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T036 [US6] Implement --verbose diagnostic logger in src/cli/logger.ts — when --verbose is set, emit to stderr: files being processed, files skipped with reason, byte counts, timing information. Create a VerboseLogger class that wraps stderr writes. Wire into all CLI commands via dependency injection.
- [ ] T037 [US6] Add --verbose global option to CLI in src/cli/index.ts — register --verbose flag in commander global options. Pass verbose state to all use case invocations via config or logger injection. Ensure --verbose output goes to stderr (not stdout) so JSON/piped output remains clean.
- [ ] T038 [US6] Add --notify option to review command in src/cli/index.ts — register --notify flag on review subcommand. On review completion, emit notification to configured adapter. If no notification adapter configured, warn on stderr and proceed. Notification content: review status + finding count.
- [ ] T039 [US6] Add npx availability check to all hook scripts — update after-tasks.sh, before-specify.sh, after-implement.sh to check `command -v npx` before invocation. On failure: emit diagnostic message to stderr with "Install Node.js to enable bridge hooks" and exit with non-zero code.

**Checkpoint**: CLI contract matches documentation. All commands accept --verbose. Review accepts --notify. Hook scripts fail gracefully. US6 independently testable.

---

## Phase 9: User Story 7 — Constitution & Workflow Warnings (Priority: P3)

**Goal**: `status` command detects uncustomized constitutions. Bridge warns about setup-plan.sh overwrite risk. Covers FR-024 through FR-026.

**Independent Test**: Run `status` with uncustomized constitution and verify warning. Run `status` with customized constitution and verify no warning.

### Implementation (Entities → Use Cases → Adapters → Drivers)

- [ ] T040 [US7] Implement DetectConstitution pure function in src/types.ts — isConstitutionCustomized(content: string): boolean that scans for placeholder markers ([PLACEHOLDER], [PROJECT_NAME], [PRINCIPLE_1_NAME]). Returns false if any markers found. Pure function, no I/O.
- [ ] T041 [US7] Extend CheckStatus use case in src/status/check-status.ts — add constitution detection step. Read constitution file content via port, call isConstitutionCustomized(). If uncustomized: include warning in status output with remediation: "Run /speckit.constitution to customize."
- [ ] T042 [US7] Add constitution file reading to SquadFileReader adapter — extend to read `.specify/memory/constitution.md` content. Return raw string for constitution detection. Handle ENOENT (no constitution file) gracefully.
- [ ] T043 [US7] Add plan.md overwrite warning to status output — when status detects an existing plan.md in the active spec directory, include advisory: "Existing plan.md detected. Running setup-plan.sh will overwrite it. Commit or stash changes first."

**Checkpoint**: Status command warns about uncustomized constitutions and plan.md overwrite risk. US7 independently testable.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation updates, and quality improvements

- [ ] T044 Update README.md with v0.2.0 features — document new commands (issues, sync), new flags (--verbose, --notify), hook deployment improvements, constitution detection
- [ ] T045 Update docs/usage.md with v0.2.0 CLI examples — add issues command usage (--dry-run, --labels, --json), sync command usage, --verbose examples
- [ ] T046 [P] Update package.json version to 0.2.0
- [ ] T047 [P] Update CHANGELOG.md with v0.2.0 changes — group by: Bug Fixes (US1, US2, US6), New Features (US3, US4, US5), Improvements (US7)

---

## Dependencies

```text
Phase 1 (Setup) ──▶ Phase 2 (Foundational) ──▶ Phases 3-9 (User Stories)
                                                    │
                                                    ├── Phase 3 (US1: Hook Deploy) ──▶ Phase 4 (US2: Extension Alignment)
                                                    │                                      │
                                                    │                                      ▼
                                                    │                               Phase 7 (US5: Automation Hooks)
                                                    │
                                                    ├── Phase 5 (US3: Issues) ──────── independent
                                                    │
                                                    ├── Phase 6 (US4: Sync) ─────────── independent
                                                    │
                                                    ├── Phase 8 (US6: CLI Alignment) ── independent (but benefits from US1-US5)
                                                    │
                                                    └── Phase 9 (US7: Warnings) ─────── independent
                                                    
Phase 10 (Polish) ◀── all user story phases complete
```

### Critical Path

1. Setup → Foundational → US1 (Hook Deploy) → US2 (Extension Alignment) → US5 (Automation Hooks)
2. Setup → Foundational → US3 (Issues) — can run parallel to critical path
3. Setup → Foundational → US4 (Sync) — can run parallel to critical path

### Parallel Opportunities

- **Phase 2**: T003, T004, T005, T006, T007, T010 are all [P] — different entity types in the same file but independent sections
- **Phase 3 (US1) + Phase 5 (US3) + Phase 6 (US4)**: After foundational, these three user stories can start in parallel (different source directories)
- **Phase 8 (US6) + Phase 9 (US7)**: Independent of each other, can run in parallel
- **Phase 10**: T046, T047 are [P] — independent files

## Implementation Strategy

### MVP Scope
- **Phase 1-2**: Setup + Foundational (must complete first)
- **Phase 3 (US1)**: Fix hook deployment — highest impact bug fix
- **Phase 4 (US2)**: Extension alignment — compounds US1 fix

### Incremental Delivery
1. **v0.2.0-alpha**: US1 + US2 (bug fixes that unblock automation)
2. **v0.2.0-beta**: US3 (issues command — most requested feature)
3. **v0.2.0-rc**: US4 + US5 + US6 (sync + automation + CLI alignment)
4. **v0.2.0**: US7 + Polish (warnings + docs)

### Task Summary
- **Total tasks**: 47
- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (US1)**: 6 tasks
- **Phase 4 (US2)**: 5 tasks
- **Phase 5 (US3)**: 5 tasks
- **Phase 6 (US4)**: 4 tasks
- **Phase 7 (US5)**: 5 tasks
- **Phase 8 (US6)**: 4 tasks
- **Phase 9 (US7)**: 4 tasks
- **Phase 10 (Polish)**: 4 tasks
