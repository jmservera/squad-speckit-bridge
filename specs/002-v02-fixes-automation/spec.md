# Feature Specification: Squad-SpecKit Bridge v0.2.0 — Fixes, Commands & Automation

**Feature Branch**: `002-v02-fixes-automation`  
**Created**: 2025-07-25  
**Status**: Draft  
**Supersedes**: v0.1.0 (`specs/001-squad-speckit-bridge/spec.md`)  
**Input**: User description: "v0.2.0: Fix hook deployment, add issues/sync commands, automation hooks, and accumulated learnings from v0.1.0"

## Context & Motivation

This specification addresses critical bugs, missing commands, and workflow automation gaps discovered during the v0.1.0 dogfooding session. Learnings come from three sources: Richard's code review (6 findings), Gilfoyle's meta-analysis (4 actionable learnings), and the team's automation proposal (4 new capabilities). The v0.1.0 spec defined 4 CLI commands (install, context, review, status). v0.2.0 fixes deployment bugs that prevent 2 of those from working correctly, adds 2 new commands (issues, sync) that were referenced in documentation but never built, and introduces automation hooks that reduce manual steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fix Hook Deployment (Priority: P1)

A developer installs the bridge and expects the `after_tasks` hook to fire when Spec Kit generates tasks. Currently, the hook script (`after-tasks.sh`) exists in templates but the installer never copies it to the extensions directory. The developer discovers the automation simply doesn't work. After this fix, the installer deploys all hook scripts with correct executable permissions, and the `after_tasks` hook fires as documented.

**Why this priority**: This is a critical bug. The v0.1.0 spec promises automation via hooks (FR-014, US5), but the installer silently fails to deploy them. Users who follow the documentation get broken behavior with no error message.

**Independent Test**: Run the bridge installer in a fresh repository with both frameworks present. Verify that `after-tasks.sh` exists in `.specify/extensions/squad-speckit-bridge/hooks/`, has executable permissions, and is referenced in the extension manifest.

**Acceptance Scenarios**:

1. **Given** a repository with both Squad and Spec Kit initialized, **When** the developer runs the bridge installation, **Then** all hook scripts (including `after-tasks.sh`) are deployed to `.specify/extensions/squad-speckit-bridge/hooks/` with executable file permissions.
2. **Given** hook scripts are deployed, **When** Spec Kit completes task generation (`after_tasks` lifecycle event), **Then** the `after-tasks.sh` hook executes successfully and produces the expected notification output.
3. **Given** a previously installed bridge without hook scripts, **When** the developer re-runs installation (update), **Then** the missing hook scripts are added and a summary indicates what was newly deployed.
4. **Given** the installer runs on a system where file permission setting fails, **When** the hook script cannot be made executable, **Then** the installer warns the developer with a specific remediation command (e.g., `chmod +x <path>`) and continues installation.

---

### User Story 2 — Spec Kit Extension Model Alignment (Priority: P1)

A developer installs the bridge and expects Spec Kit to discover and invoke the extension's hooks during lifecycle events. Currently, the `extension.yml` manifest may not conform to Spec Kit's actual extension schema — fields like hook registration format, command definitions, and environment variable passing may be misaligned. After this fix, the extension manifest conforms exactly to Spec Kit's schema, and hooks are discovered and invoked without manual configuration.

**Why this priority**: If the extension manifest is malformed, Spec Kit silently ignores it. The entire automation layer (hooks, commands) becomes invisible. This compounds with US1 — even if hook scripts are deployed correctly, a bad manifest means Spec Kit never calls them.

**Independent Test**: Install the bridge, then run a Spec Kit lifecycle event that should trigger a hook. Verify Spec Kit discovers the extension, loads the manifest, and invokes the registered hook.

**Acceptance Scenarios**:

1. **Given** the bridge is installed, **When** Spec Kit reads `.specify/extensions/squad-speckit-bridge/extension.yml`, **Then** the manifest parses without errors and all registered hooks appear in Spec Kit's extension discovery output.
2. **Given** the extension manifest registers an `after_tasks` hook, **When** Spec Kit completes task generation, **Then** Spec Kit invokes the hook script at the path specified in the manifest, passing the expected environment variables (feature directory, tasks file path).
3. **Given** the extension manifest defines bridge commands, **When** a developer runs a bridge command through Spec Kit's extension system, **Then** the command executes with the correct arguments and produces expected output.

---

### User Story 3 — Issues Command (Priority: P1)

A developer has completed the Design Review ceremony and has an approved `tasks.md`. They want to create GitHub issues from those tasks without manually copying each one. They run `squad-speckit-bridge issues <tasks-file>` and the bridge creates one issue per task, with proper labels, dependencies as issue references, and phase grouping. A `--dry-run` flag lets them preview what would be created before committing.

**Why this priority**: The `issues` command is referenced in project documentation and the v0.1.0 evolution roadmap as a core capability, but was never implemented. Without it, the pipeline breaks at the most critical handoff: turning approved plans into trackable work. This is the missing step between Design Review and execution.

**Independent Test**: Run the issues command with `--dry-run` against a sample `tasks.md` and verify the output shows correctly structured issue previews. Then run without `--dry-run` against a test repository and verify issues are created with correct content.

**Acceptance Scenarios**:

1. **Given** an approved `tasks.md` file with task entries including titles, descriptions, dependencies, and phase assignments, **When** the developer runs `squad-speckit-bridge issues <tasks-file>`, **Then** one GitHub issue is created per task, with the task title as issue title, description as issue body, and phase as a label.
2. **Given** the developer runs `squad-speckit-bridge issues <tasks-file> --dry-run`, **When** the command completes, **Then** it outputs a preview of all issues that would be created (title, labels, body excerpt, dependency references) without actually creating any issues.
3. **Given** the developer runs `squad-speckit-bridge issues <tasks-file> --labels "bridge,v0.2"`, **When** issues are created, **Then** each issue includes the specified custom labels in addition to auto-generated phase labels.
4. **Given** tasks in `tasks.md` have dependency references (e.g., "Depends on: T003"), **When** issues are created, **Then** each issue body includes references to the GitHub issues created for its dependencies (using `#N` notation).
5. **Given** the developer runs `squad-speckit-bridge issues <tasks-file> --json`, **When** the command completes, **Then** it outputs a JSON array of created issue objects (number, title, URL, labels) for machine consumption.
6. **Given** some tasks in `tasks.md` are malformed or missing required fields, **When** the command runs, **Then** it skips malformed tasks with a warning and processes all valid tasks.

---

### User Story 4 — Sync Command (Priority: P2)

After Squad agents complete work on tasks from a Spec Kit plan, the developer wants to capture execution learnings back into Squad's memory to close the knowledge loop. They run `squad-speckit-bridge sync` and the bridge reads execution artifacts (git history, completed issues, agent history updates since last sync) and produces a structured learning summary that agents can reference in the next planning cycle.

**Why this priority**: This is the missing half of the knowledge flywheel. v0.1.0 built Squad→SpecKit (context command). Without sync, execution learnings don't flow back, and the system doesn't compound. However, the manual workaround (agents writing to history.md directly) works, making this P2.

**Independent Test**: Run two planning cycles. After the first cycle's execution, run `sync`. Verify that the second cycle's context summary includes learnings from the first cycle.

**Acceptance Scenarios**:

1. **Given** Squad agents have completed tasks and written new entries to `history.md` and `decisions.md` since the last sync, **When** the developer runs `squad-speckit-bridge sync`, **Then** a sync record is produced summarizing what changed: new decisions count, new learnings count, and a timestamp marking the sync point.
2. **Given** the developer runs `squad-speckit-bridge sync --dry-run`, **When** the command completes, **Then** it outputs what would be synced without modifying any files.
3. **Given** no changes have occurred in Squad memory since the last sync, **When** the developer runs `sync`, **Then** it reports "No new learnings to sync" and exits cleanly.
4. **Given** the sync command has run, **When** the memory bridge (`context` command) runs for the next planning cycle, **Then** the context summary includes a "Recent Learnings" section with entries from the sync.

---

### User Story 5 — Automation Hooks (Priority: P2)

A developer wants the bridge to reduce manual steps in the Spec Kit pipeline. Instead of remembering to run `bridge context` before `speckit specify` and `bridge sync` after implementation, automation hooks handle these steps. A `before_specify` hook auto-injects Squad context before planning starts. An `after_implement` hook auto-captures execution learnings. The 4-step manual workflow becomes 1 step.

**Why this priority**: Automation reduces friction and prevents the most common workflow mistake (forgetting to inject context before planning). However, the manual commands work, and Spec Kit may not support all hook points yet — making this P2.

**Independent Test**: Install the bridge with hooks enabled. Run a Spec Kit specify command and verify that Squad context is auto-injected before the specify phase begins. Run implement and verify sync triggers after completion.

**Acceptance Scenarios**:

1. **Given** the bridge is installed with the `before_specify` hook enabled, **When** the developer runs Spec Kit's specify phase, **Then** the hook auto-runs the `context` command, injecting a fresh `squad-context.md` into the active spec directory before the specify agent starts.
2. **Given** the bridge is installed with the `after_implement` hook enabled, **When** Spec Kit's implement phase completes, **Then** the hook auto-runs the `sync` command, capturing execution learnings.
3. **Given** a hook point is not supported by the installed version of Spec Kit (e.g., `before_specify` doesn't exist), **When** the bridge installer detects this, **Then** it skips the unsupported hook with a clear warning explaining the manual workaround and continues installing other hooks.
4. **Given** the developer wants to disable a specific hook, **When** they set `enabled: false` in the extension manifest for that hook, **Then** the hook does not fire during the corresponding lifecycle event.

---

### User Story 6 — CLI Contract Alignment (Priority: P2)

A developer uses the bridge CLI and encounters inconsistencies: `--notify` and `--verbose` flags are documented in some places but not accepted by the CLI, the `ApprovalStatus` type in the Design Review record is missing the `pending` state, and `npx` calls in hook scripts fail silently when npx is not available. After this fix, the CLI contract matches documentation, types are complete, and hook scripts handle tool availability gracefully.

**Why this priority**: These are quality issues that erode developer trust. Each one alone is minor, but together they create a "death by a thousand cuts" experience. P2 because workarounds exist for each.

**Independent Test**: Run each CLI command with `--verbose` and `--notify` flags and verify they are accepted. Inspect the ApprovalStatus type definition and verify all states are present. Run hook scripts in an environment without npx and verify graceful failure.

**Acceptance Scenarios**:

1. **Given** the developer runs any bridge CLI command with `--verbose`, **When** the command executes, **Then** diagnostic output is emitted to stderr showing files processed, skip reasons, byte counts, and timing.
2. **Given** the developer runs the `review` command with `--notify`, **When** the review completes, **Then** a notification is emitted (format defined by notification adapter) indicating the review status.
3. **Given** the Design Review use case creates a review record, **When** the record is initialized, **Then** its status is `pending`. Valid status transitions are: `pending` → `approved` and `pending` → `changes_requested`.
4. **Given** a hook script invokes `npx` to run a tool, **When** `npx` is not available in the PATH, **Then** the script emits a warning to stderr with instructions to install Node.js and exits with a non-zero code (rather than failing silently with an unclear error).

---

### User Story 7 — Constitution & Workflow Warnings (Priority: P3)

A developer runs the bridge in a repository where Spec Kit's constitution has never been customized (still contains `[PLACEHOLDER]` markers). The bridge's `status` command detects this and warns that planning quality may be reduced. Additionally, the bridge warns when `setup-plan.sh` would overwrite an existing `plan.md`, preventing accidental data loss during incremental pipeline re-runs.

**Why this priority**: These are developer experience improvements that prevent known pitfalls discovered during dogfooding. They don't block any workflow but save developers from mistakes the team already made.

**Independent Test**: Run `status` in a repository with an uncustomized constitution and verify the warning appears. Simulate a `setup-plan.sh` re-run on an existing plan.md and verify the overwrite warning.

**Acceptance Scenarios**:

1. **Given** the Spec Kit constitution at `.specify/memory/constitution.md` contains placeholder markers (`[PLACEHOLDER]`, `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`), **When** the developer runs `squad-speckit-bridge status`, **Then** the output includes a warning: "Spec Kit constitution is uncustomized. Planning quality may be reduced. Run /speckit.constitution to customize."
2. **Given** a `plan.md` already exists in the active spec directory with user-authored content, **When** the bridge detects that `setup-plan.sh` would overwrite it, **Then** it warns the developer and suggests committing or stashing changes before re-running the pipeline.
3. **Given** the constitution is fully customized (no placeholder markers), **When** the developer runs `status`, **Then** no constitution warning appears and the status reports "Constitution: customized."

---

### Edge Cases

- What happens when the developer runs `issues` but has no GitHub authentication configured? The command MUST fail with a clear error message explaining how to configure authentication (e.g., `gh auth login` or setting `GITHUB_TOKEN`) before attempting any API calls.
- What happens when `tasks.md` contains tasks with circular dependencies? The `issues` command MUST detect circular dependency chains and report them as errors, refusing to create issues until the cycle is broken.
- What happens when the `sync` command runs but Squad memory files are locked by another process? The command MUST wait briefly (configurable timeout, default 5 seconds), then fail with a clear error message if the lock persists.
- What happens when automation hooks are installed but the target commands (context, sync) fail during execution? The hook MUST report the failure to stderr and exit with a non-zero code, but MUST NOT block the Spec Kit lifecycle event from continuing (hooks are advisory, not gates).
- What happens when `--notify` is used but no notification adapter is configured? The CLI MUST emit a warning that notification was requested but no adapter is available, and proceed without notification.
- What happens when the extension manifest references hook scripts that don't exist on disk? Spec Kit extension discovery MUST report the missing scripts as warnings during `status`, and the installer MUST verify file presence after deployment.

## Requirements *(mandatory)*

### Functional Requirements

**Hook Deployment & Extension Alignment (US1, US2)**

- **FR-001**: The installer MUST deploy all hook scripts from the bridge templates directory to `.specify/extensions/squad-speckit-bridge/hooks/` during installation.
- **FR-002**: The installer MUST set executable file permissions on all deployed hook scripts.
- **FR-003**: The `extension.yml` manifest MUST conform to Spec Kit's extension schema, including correct hook registration format, command definitions, and environment variable declarations.
- **FR-004**: Re-installation MUST detect and deploy any hook scripts that were missing from a previous installation, reporting what was added.
- **FR-005**: The installer MUST verify that deployed hook scripts are referenced in the extension manifest and that referenced scripts exist on disk.

**Issues Command (US3)**

- **FR-006**: The bridge MUST provide an `issues` subcommand that reads a `tasks.md` file and creates one GitHub issue per task entry.
- **FR-007**: The `issues` command MUST support a `--dry-run` flag that previews issue creation without making API calls.
- **FR-008**: The `issues` command MUST support a `--labels` flag accepting comma-separated label names to apply to all created issues in addition to auto-generated labels.
- **FR-009**: The `issues` command MUST resolve task dependencies into GitHub issue cross-references (`#N` notation) in the issue body.
- **FR-010**: The `issues` command MUST skip malformed task entries with a warning and continue processing valid tasks.
- **FR-011**: The `issues` command MUST support `--json` output mode, emitting a JSON array of created issue objects.
- **FR-011a**: The `issues` command MUST only create issues for unchecked tasks (`- [ ]`). Completed tasks (`- [x]`) are silently skipped.
- **FR-011b**: Auto-generated phase labels MUST use kebab-case format: `phase-N-name` (e.g., `phase-3-hook-deploy`, `phase-5-issues-command`).

**Sync Command (US4)**

- **FR-012**: The bridge MUST provide a `sync` subcommand that captures execution learnings from Squad memory artifacts changed since the last sync.
- **FR-012a**: The `sync` command MUST track changes to all three Squad memory artifact types: `.squad/skills/*/SKILL.md`, `.squad/decisions.md`, and `.squad/agents/*/history.md`.
- **FR-012b**: The sync state file (`.bridge-sync-state.json`) MUST be added to `.gitignore` by the installer, as sync state is per-developer.
- **FR-013**: The `sync` command MUST track sync points (timestamps) to identify what changed since the last sync.
- **FR-014**: The `sync` command MUST support a `--dry-run` flag showing what would be synced without modifying files.
- **FR-015**: The `sync` command MUST produce a structured sync record (new decisions count, new learnings count, timestamp) consumable by the `context` command in subsequent planning cycles.

**Automation Hooks (US5)**

- **FR-016**: The bridge MUST provide a `before_specify` hook that auto-runs the `context` command, injecting `squad-context.md` before Spec Kit's specify phase begins.
- **FR-017**: The bridge MUST provide an `after_implement` hook that auto-runs the `sync` command after Spec Kit's implement phase completes.
- **FR-018**: When a hook point is not supported by the installed Spec Kit version, the installer MUST skip it with a warning and suggest the manual workaround.
- **FR-019**: Each hook MUST be independently disablable via `enabled: false` in the extension manifest.

**CLI Contract Alignment (US6)**

- **FR-020**: The bridge CLI MUST accept `--verbose` as a global flag on all commands, emitting diagnostic output to stderr (files processed, files skipped with reason, byte counts, timing).
- **FR-021**: The bridge CLI MUST accept `--notify` on the `review` command, emitting a notification on review completion. The v0.2.0 notification adapter emits structured messages to stderr (human-readable by default, JSON when `--json` is active). The adapter interface is pluggable for future extensibility.
- **FR-022**: The `ApprovalStatus` type MUST include three states: `pending`, `approved`, `changes_requested`. `pending` is the initial state. `blocked` is NOT a valid status.
- **FR-023**: Hook scripts that invoke external tools (e.g., `npx`) MUST check tool availability before invocation and fail gracefully with a diagnostic message and non-zero exit code when the tool is missing.

**Constitution & Workflow Warnings (US7)**

- **FR-024**: The `status` command MUST detect uncustomized Spec Kit constitutions by scanning for placeholder markers (`[PLACEHOLDER]`, `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`) and emit a warning with remediation guidance.
- **FR-025**: The bridge SHOULD detect when `setup-plan.sh` would overwrite an existing `plan.md` and warn the developer to commit or stash before re-running the pipeline.
- **FR-026**: The `after_tasks` hook MUST trigger both a clarify pass prompt and a Design Review notification (in that order), not just the review notification alone.

### Key Entities

- **IssueRecord**: A GitHub issue created from a task entry. Attributes: issue number, title, body, labels, dependency references (issue numbers), source task ID, creation timestamp.
- **SyncRecord**: A snapshot of what changed in Squad memory since the last sync. Attributes: sync timestamp, previous sync timestamp, new decisions count, new learnings count, affected agent IDs, sync status (success, partial, failed).
- **HookScript**: A deployed automation script tied to a Spec Kit lifecycle event. Attributes: hook point (before_specify, after_tasks, after_implement), script path, executable permission status, enabled flag.
- **ApprovalStatus** *(clarified from v0.1.0)*: Enumeration with exactly three values: `pending` (initial state on review creation), `approved` (review passed), `changes_requested` (review found issues). No `blocked` state — blocking is a workflow concern, not a review outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After installation, 100% of hook scripts exist in the extensions directory with executable permissions — verified by running the installer and checking file presence and permissions.
- **SC-002**: The `extension.yml` manifest passes Spec Kit's extension schema validation without errors or warnings.
- **SC-003**: The `issues` command creates GitHub issues from a 20-task `tasks.md` in under 60 seconds, with correct labels, descriptions, and dependency cross-references.
- **SC-004**: The `issues --dry-run` output matches the actual issues that would be created, with zero discrepancies in title, labels, or dependency references.
- **SC-005**: After running `sync` followed by `context`, the context summary includes learnings from the most recent execution cycle — verified by checking for entries timestamped after the previous sync point.
- **SC-006**: The `before_specify` hook reduces the manual workflow from 4 steps (context → specify → plan → tasks) to 3 steps (specify → plan → tasks) by auto-injecting context — a 25% step reduction.
- **SC-007**: Hook scripts fail gracefully when required tools are missing: exit code is non-zero, stderr contains a diagnostic message with remediation instructions, and the Spec Kit lifecycle event continues.
- **SC-008**: The `status` command correctly identifies uncustomized constitutions in 100% of test cases (fresh template, partially customized, fully customized).
- **SC-009**: All CLI commands accept `--verbose` without error, and verbose output includes at minimum: files being processed, skip reasons, and timing information.

## Assumptions

- The v0.1.0 bridge is already implemented and installed. This spec extends it — it does not redefine the `install`, `context`, `review`, or `status` commands from v0.1.0 unless explicitly modifying their behavior.
- GitHub CLI (`gh`) or `GITHUB_TOKEN` environment variable is available for the `issues` command. The bridge does not implement its own GitHub authentication.
- Spec Kit's extension schema is stable and documented. If the schema changes between Spec Kit versions, the bridge's extension manifest may need updates.
- The `before_specify` hook point may not exist in all Spec Kit versions. The bridge handles its absence gracefully (FR-018) and documents the manual workaround.
- Squad's memory artifact formats (decisions.md, history.md) remain backward-compatible with v0.1.0 parsing logic.

## Clarifications

### From v0.1.0 Dogfooding

- Q: Should `after_tasks` hook only notify about Design Review, or also trigger clarification? → A: **Both.** The hook triggers a clarify pass prompt first, then the Design Review notification (FR-026). Evidence: Juanma's directive "always run clarify after tasks" and Gilfoyle's L-1 learning. Clarify catches spec/task misalignment that review cannot.

- Q: Is `blocked` a valid ApprovalStatus? → A: **No.** The v0.1.0 code introduced `blocked` but it was never in the spec. ApprovalStatus has exactly three values: `pending`, `approved`, `changes_requested` (FR-022). Blocking is a workflow/scheduling concern handled outside the review system.

- Q: Should automation hooks block the Spec Kit lifecycle if they fail? → A: **No.** Hooks are advisory, not gates. If a hook fails, it reports to stderr and exits non-zero, but the Spec Kit lifecycle event continues. Developers can inspect hook output and re-run manually if needed.

### Session 2025-07-25

- Q: What notification format does `--notify` (FR-021) use? → A: **Console stderr.** The notification adapter emits a structured message to stderr (human-readable by default, JSON when `--json` is active). The adapter interface is pluggable for future extensibility (webhook, OS notification), but v0.2.0 ships with stderr-only.

- Q: Should `.bridge-sync-state.json` be gitignored or committed? → A: **Gitignored.** Sync state is per-developer (each developer's last sync point differs). The installer should add `.bridge-sync-state.json` to `.gitignore` if not already present. Teams that want shared sync state can remove the gitignore entry manually.

- Q: Should the `issues` command create issues for completed (`- [x]`) tasks or only unchecked (`- [ ]`) tasks? → A: **Only unchecked tasks.** Completed tasks already have their work done and don't need tracking issues. The command skips `- [x]` entries silently (no warning needed — this is expected filtering).

- Q: What format should auto-generated phase labels use on created issues? → A: **Kebab-case: `phase-N-name`** (e.g., `phase-3-hook-deploy`, `phase-5-issues-command`). This is consistent with GitHub label conventions and machine-parseable.

- Q: Does the `sync` command track changes to skills/ files in addition to decisions.md and history.md? → A: **Yes.** Sync tracks all three Squad memory artifact types: `.squad/skills/*/SKILL.md`, `.squad/decisions.md`, and `.squad/agents/*/history.md`. This matches the same source set used by the `context` command, ensuring the knowledge flywheel captures all artifact types.
