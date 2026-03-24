# Research: Hook Fixes and CLI Polish (v0.3.1)

**Feature**: 005-hook-fixes-cli-polish  
**Date**: 2026-03-24  
**Status**: Complete

## Research Tasks

### R1: File Permission Handling in npm Packages

**Context**: Two of three hook templates (`before-specify.sh`, `after-implement.sh`) lack executable permissions in the source repository, while `after-tasks.sh` has them. The installer's `deployExecutable()` method applies `chmod 0o755` at deployment time, but the source templates themselves are inconsistent.

**Findings**:

1. **npm preserves file permissions during `npm pack` and `npm publish`** — files in the `files` array retain their original permissions from the source repo. However, `git` on some platforms (notably Windows) does not preserve the executable bit reliably.

2. **The installer already handles this correctly at deployment time** via `FileSystemDeployer.deployExecutable()` in `src/install/adapters/file-deployer.ts` (line 37-51). It calls `chmod(fullPath, 0o755)` after writing each hook file. This means deployed hooks get correct permissions regardless of source permissions.

3. **The source templates need the +x bit set anyway** for two reasons:
   - Developers running hooks directly from the source tree (development/testing) will encounter "permission denied"
   - It's a correctness issue — shell scripts should be executable in source control
   - Git does track the executable bit via `git update-index --chmod=+x`

4. **The build script `cp -r src/install/templates dist/install/`** preserves permissions. Setting +x on source templates ensures the `dist/` copies are also executable.

**Decision**: Set executable permissions on all three hook template source files using `git update-index --chmod=+x`. This is a two-layer defense: source files are correct AND the installer enforces permissions at deployment time.

**Rationale**: Defense-in-depth for permissions. Source correctness benefits developers working with the repo directly and ensures `cp -r` in the build script propagates correct permissions to `dist/`.

**Alternatives Considered**:
- *Only rely on `deployExecutable()` chmod* — Rejected because source files should be self-consistent, and direct execution from source tree would still fail.
- *Add a postinstall script to fix permissions* — Rejected as over-engineering; the deployer already handles this.

---

### R2: npx Command Resolution and CLI Alias Strategy

**Context**: The spec identifies that `after-tasks.sh` uses `npx @jmservera/squad-speckit-bridge` (scoped package name) while `before-specify.sh` and `after-implement.sh` use `npx squad-speckit-bridge` (unscoped full name). The spec assumption states `squask` is the canonical short alias.

**Findings**:

1. **The package.json `bin` field defines three aliases**: `squask`, `sqsk`, and `squad-speckit-bridge`. All resolve to `./dist/cli/index.js`.

2. **How `npx` resolves commands**:
   - `npx squask` — Works if the package is installed locally (npx finds it in `node_modules/.bin/squask`)
   - `npx squad-speckit-bridge` — Works the same way (it's a bin name)
   - `npx @jmservera/squad-speckit-bridge` — Resolves via the scoped package name, may trigger a remote install prompt if not found locally

3. **The `squask` alias is NOT suitable for hooks using `npx`** because:
   - `npx squask` requires the package to already be installed locally — `npx` cannot auto-install by bin name alone
   - `npx @jmservera/squad-speckit-bridge` can auto-install from npm registry if needed
   - However, hooks already check for `npx` availability and fail gracefully if not found

4. **The real inconsistency** is that `after-tasks.sh` uses `@jmservera/squad-speckit-bridge` while the other two use `squad-speckit-bridge` (without scope). The scoped name is more reliable for `npx` resolution because:
   - It uniquely identifies the package
   - It works for auto-install scenarios
   - But the hooks already assume local installation (the bridge must be installed for hooks to exist)

5. **For locally installed packages**, all three work identically with `npx`: `npx squask`, `npx squad-speckit-bridge`, and `npx @jmservera/squad-speckit-bridge` all resolve to the same CLI entry point via `node_modules/.bin/`.

**Decision**: Standardize all hooks to use `squask` — the canonical short alias per project assumptions. Since hooks are only deployed by the bridge installer (meaning the package is already installed locally), `npx squask` will always resolve correctly. This also aligns with documentation and is the most user-recognizable alias.

**Rationale**: The spec explicitly states `squask` is the canonical alias. Hooks only execute in environments where the bridge is installed (the installer deploys the hooks), so local resolution is guaranteed. Using the short alias is more readable and consistent with documentation examples.

**Alternatives Considered**:
- *Use scoped name `@jmservera/squad-speckit-bridge` everywhere* — Rejected: verbose, not how documentation references the CLI, and the scoped name is an npm publishing detail not a user-facing identity.
- *Use unscoped `squad-speckit-bridge` everywhere* — Rejected: the spec assumption explicitly identifies `squask` as canonical. The long name adds no benefit when the package is locally installed.
- *Use `sqsk` (ultra-short)* — Rejected: `squask` is the documented primary alias. `sqsk` is a convenience alias that may not be as widely recognized.

---

### R3: After-Tasks Hook Automation Strategy

**Context**: The after-tasks hook currently calls `review --notify` (prints a notification) instead of `issues` (creates GitHub issues). The spec requires automatic issue creation with graceful failure handling.

**Findings**:

1. **Current hook behavior** (`after-tasks.sh` lines 43-47):
   ```bash
   npx @jmservera/squad-speckit-bridge review --notify "$TASKS_FILE"
   ```
   This only notifies the developer about available design review. No issues are created.

2. **The `issues` CLI command already exists** (`src/cli/index.ts` lines 251-297) and supports:
   - `issues <tasks-file>` — Creates GitHub issues from unchecked tasks
   - `--dry-run` — Preview without creating
   - `--labels <labels>` — Custom labels (default: `squad,speckit`)
   - `--repo <owner/repo>` — Target GitHub repository
   - Built-in deduplication against existing issues
   - Sequential batch creation with 200ms delay

3. **Graceful failure pattern already established** in other hooks:
   ```bash
   npx squask <command> || {
     echo "[squad-bridge] WARNING: <action> failed — <fallback>."
     exit 0  # Don't block SpecKit pipeline
   }
   ```

4. **Configuration check for auto-issue creation**: The `BridgeConfig` type (`src/types.ts`) has `hooks.afterTasks: boolean` which controls whether the hook runs at all. For controlling automatic issue creation specifically, the hook should check a config flag. Currently `config.issues.repository` and `config.issues.defaultLabels` exist.

5. **The after-tasks hook should**:
   - Keep the existing design review notification (it's useful feedback)
   - Add automatic issue creation AFTER the notification
   - Check configuration for whether auto-issue-creation is enabled
   - Handle failures gracefully (warn-and-continue)
   - Handle empty tasks files (skip silently)

**Decision**: Modify the after-tasks hook to call `squask issues "$TASKS_FILE" --dry-run` by default for safety, with a configuration flag `hooks.autoCreateIssues` (defaulting to `true`) that controls whether `--dry-run` is omitted. The hook will:
1. Validate tasks file exists (existing behavior)
2. Generate squad-context.md if missing (existing behavior)
3. Call `squask issues "$TASKS_FILE"` to create issues (NEW)
4. Wrap in error handler that warns and continues on failure (NEW)
5. Check `hooks.autoCreateIssues` config flag (NEW)

**Rationale**: The spec says "automatically invoke the issue-creation command" (FR-003) and "handle failures gracefully" (FR-004). Using the existing `issues` command provides deduplication, label management, and dry-run support out of the box. Keeping the review notification preserves useful feedback.

**Alternatives Considered**:
- *Remove review notification, only create issues* — Rejected: the notification is valuable feedback to the developer, and the spec doesn't ask for its removal.
- *Always run in dry-run mode* — Rejected: defeats the purpose of automation. The spec explicitly wants automatic creation.
- *Call the issues use case directly via Node.js instead of CLI* — Rejected: hooks are shell scripts; calling the CLI maintains Clean Architecture (outer layer calling outer layer).

---

### R4: Demo Command Documentation Completeness

**Context**: The demo command exists in the API reference (`docs/api-reference.md`) but needs completion per FR-006.

**Findings**:

1. **Current demo documentation** includes:
   - Basic command syntax with `npx @jmservera/squad-speckit-bridge demo [options]`
   - Four options: `--dry-run`, `--keep`, `--verbose`, `--json`
   - Human-readable output example
   - JSON output structure example

2. **Missing per FR-006**:
   - **Exit codes**: Not documented. The CLI uses `process.exit(1)` on errors (seen in cli/index.ts). Need to document exit 0 (success) and exit 1 (failure).
   - **Detailed option descriptions**: Current descriptions are brief one-liners. Need fuller explanations of what each flag controls.
   - **Output schema**: JSON structure exists but needs formal field descriptions
   - **Usage examples**: Only has basic invocation. Need at least two concrete usage scenarios.
   - **Error behavior**: What happens when stages fail mid-pipeline

3. **Source of truth for documentation** is the demo implementation:
   - `src/demo/orchestrator.ts` — pipeline stage execution
   - `src/demo/entities.ts` — `DemoConfiguration`, `PipelineStage`, `ExecutionReport` types
   - `src/demo/formatters.ts` — output formatting
   - `src/cli/index.ts` lines 341-404 — CLI command definition

**Decision**: Expand the demo command section in `docs/api-reference.md` to include: full option descriptions with defaults and types, exit code table (0=success, 1=pipeline failure, 1=invalid options), JSON output schema with field descriptions, and two usage examples (CI smoke test with --dry-run --json, and interactive developer demo with --verbose --keep).

**Rationale**: Matches the documentation depth of other commands in the API reference (which have options tables, exit codes, and multiple examples). The demo command is an important onboarding tool per the spec.

**Alternatives Considered**:
- *Create a separate demo guide instead of expanding api-reference.md* — Rejected: other commands are documented in api-reference.md; consistency matters.
- *Auto-generate documentation from commander definitions* — Rejected: over-engineering for a single command documentation gap; manual documentation matches existing style.

---

### R5: Clean Architecture Compliance Verification Approach

**Context**: The spec requires verification that all v0.3.1 changes maintain compliance with the five constitutional principles.

**Findings**:

1. **All changes in this feature are confined to outer layers**:
   - Hook templates: `src/install/templates/hooks/*.sh` → Layer 3 (Frameworks/Drivers)
   - File deployer: `src/install/adapters/file-deployer.ts` → Layer 2 (Adapters)
   - Documentation: `docs/api-reference.md` → Not a code layer
   - Types: `src/types.ts` → Layer 0 (Entities) — only if `autoCreateIssues` config field is added

2. **Potential Principle I risk**: If we add `autoCreateIssues` to `BridgeConfig` in `types.ts`, this is a legitimate entity-layer change (configuration is a domain concept). It does NOT violate Principle I because the entity layer has no outward dependencies — we're adding a field to an existing DTO.

3. **Potential Principle III risk**: New behavior in hooks needs new tests. The test structure already has:
   - `tests/unit/installer.test.ts` — unit tests for installer use case
   - `tests/integration/file-deployer.test.ts` — integration tests for deployer

4. **No Principle IV or V risks**: No new boundary crossings or framework introductions.

**Decision**: Compliance verification will be a review activity during task implementation. No structural changes needed to maintain compliance. The only entity-layer change (adding `autoCreateIssues` to config type) is a pure data addition with no outward dependencies.

**Rationale**: This is a bug-fix and documentation feature. The changes are naturally confined to outer layers. Constitution compliance is maintained by design.

**Alternatives Considered**:
- *Add automated import-graph checks* — Rejected: out of scope per spec ("Constitution compliance is verified through manual structural review").
- *Skip compliance verification entirely* — Rejected: the spec explicitly requires it (User Story 5).

---

### R6: Edge Case Analysis — Restrictive umask and Partial Failures

**Context**: The spec lists several edge cases. Key ones requiring research.

**Findings**:

1. **Restrictive umask (e.g., 0077)**: The `deployExecutable()` method calls `chmod(fullPath, 0o755)` AFTER `writeFile()`. `chmod` sets absolute permissions, overriding umask effects on the file. So even with `umask 0077`, the deployed hooks will have `0o755`. **No issue**.

2. **Partial issue creation failure**: The `createIssuesFromTasks()` function creates issues sequentially. If one fails mid-batch, the function throws. The hook's error handler catches this. Already-created issues persist on GitHub. **Mitigation**: The dedup logic means re-running the hook after a partial failure will skip already-created issues and create only the remaining ones. This is idempotent recovery.

3. **CLI alias not on PATH**: Hooks use `npx squask` which relies on `node_modules/.bin/squask`. If the package isn't installed at all, hooks already check `command -v npx` and exit gracefully. If npx exists but the package isn't installed, `npx squask` will fail and the error handler will catch it. **Covered by existing graceful failure pattern**.

4. **Detached HEAD / CI environment**: Hooks don't use git directly. The bridge CLI commands (`issues`, `context`, `sync`) handle git context internally. **No hook-level concern**.

5. **Missing/malformed config file**: Hooks already read `bridge.config.json` with a fallback pattern. Missing file → defaults. Malformed JSON → caught by `try/catch` in the inline Node.js expression → defaults to `true`. **Already handled**.

6. **Empty tasks file**: The `issues` command already handles this — `createIssuesFromTasks()` returns an empty result if no unchecked tasks are found. The hook validates `tasks.md` exists before calling. **Already handled**.

**Decision**: No additional edge case handling needed in the hook scripts. The existing graceful failure pattern and the `issues` command's built-in dedup/idempotency cover all identified edge cases.

**Rationale**: The combination of the hook's `|| { warn; exit 0; }` pattern and the issues command's dedup logic provides robust error handling without adding complexity to the shell scripts.

**Alternatives Considered**:
- *Add retry logic to hooks for transient network failures* — Rejected: over-engineering for shell scripts; re-running the SpecKit pipeline naturally retries.
- *Add lock files to prevent concurrent hook execution* — Rejected: hooks are invoked by SpecKit sequentially; concurrency is not a real scenario.
