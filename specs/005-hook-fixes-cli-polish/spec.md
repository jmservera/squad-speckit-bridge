# Feature Specification: Hook Fixes and CLI Polish (v0.3.1)

**Feature Branch**: `005-hook-fixes-cli-polish`  
**Created**: 2026-03-24  
**Status**: Draft  
**Input**: User description: "Hook fixes and CLI polish for v0.3.1 — 3 P0 bugs from Gilfoyle's hooks audit plus documentation polish"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Hook Scripts Execute After Installation (Priority: P0)

A developer installs the bridge into their project. When SpecKit triggers lifecycle hooks (before-specify, after-tasks, after-implement), every hook script must execute without error. Currently, two of three hook templates are installed without executable permissions, causing them to silently fail. This means the bridge is completely bypassed at those pipeline steps — the v0.3.0 retrospective confirmed 0% bridge adoption as a direct result.

**Why this priority**: Without executable hooks, the bridge cannot participate in the SpecKit lifecycle at all. This is a total blocker for pipeline automation and the single biggest reason for 0% adoption.

**Independent Test**: Install the bridge in a fresh project and verify all three hook scripts can be executed directly from the command line without "permission denied" errors.

**Acceptance Scenarios**:

1. **Given** a fresh bridge installation, **When** the before-specify hook is triggered by SpecKit, **Then** the script executes successfully (no permission error)
2. **Given** a fresh bridge installation, **When** the after-implement hook is triggered by SpecKit, **Then** the script executes successfully (no permission error)
3. **Given** a fresh bridge installation, **When** listing all hook template files, **Then** every file has executable permissions
4. **Given** an existing installation that is updated, **When** hook templates are refreshed, **Then** the updated files also have executable permissions

---

### User Story 2 — After-Tasks Hook Automates the SpecKit→Squad Handoff (Priority: P0)

When a developer finishes task generation in SpecKit, the after-tasks hook should automatically invoke the issue-creation command to create GitHub issues from the generated tasks. Currently, the hook only prints a message telling the developer to run the command manually, which defeats the purpose of the bridge automation and requires manual intervention at every pipeline run.

**Why this priority**: Automated issue creation is the core value proposition of the bridge — turning SpecKit tasks into Squad-ready GitHub issues without human intervention. A "print a reminder" hook is functionally equivalent to having no hook at all.

**Independent Test**: Run SpecKit task generation in a project with the bridge installed and verify GitHub issues are created automatically without the developer needing to run any additional commands.

**Acceptance Scenarios**:

1. **Given** a project with the bridge installed and configured, **When** SpecKit completes task generation, **Then** the after-tasks hook automatically invokes the issue-creation command
2. **Given** a project with the bridge installed, **When** the after-tasks hook runs and issue creation succeeds, **Then** the developer sees a confirmation message indicating issues were created
3. **Given** a project with the bridge installed, **When** the after-tasks hook runs and issue creation fails (e.g., network error), **Then** the developer sees a clear error message but the SpecKit pipeline is not interrupted
4. **Given** a project where the developer has disabled automatic issue creation in the bridge configuration, **When** SpecKit completes task generation, **Then** the hook respects the configuration and does not create issues automatically

---

### User Story 3 — Consistent CLI Command References Across All Hooks (Priority: P0)

All hook scripts must reference the bridge CLI using consistent, portable command names. Currently, one hook uses the full scoped package name while all other hooks and documentation use the short alias. This inconsistency causes failures in environments where only the short alias is available on PATH and creates confusion for developers reading the hook scripts.

**Why this priority**: An inconsistent command reference causes a runtime failure in a specific (and common) environment configuration. Since hooks run automatically during the pipeline, a failed hook silently breaks the automation chain.

**Independent Test**: Search all hook template files for CLI invocations and verify they all use the same command reference pattern. Test execution in an environment where only the short alias is on PATH.

**Acceptance Scenarios**:

1. **Given** the set of hook template files, **When** inspecting all CLI invocations, **Then** every hook uses the same short alias for the bridge CLI
2. **Given** an environment where only the short CLI alias is available on PATH, **When** all hooks execute, **Then** none of them fail with "command not found" errors
3. **Given** the hook templates and CLI documentation, **When** comparing command references, **Then** hooks and documentation use the same alias consistently

---

### User Story 4 — Complete Demo Command Documentation (Priority: P2)

A developer reading the API reference can find complete documentation for the demo command, including all available options, exit codes, expected output format, and usage examples. Currently, the demo command exists and works but its documentation section lacks the same level of detail as other commands.

**Why this priority**: The demo command is an important onboarding tool that showcases the full bridge pipeline. Missing documentation makes it harder for new users to discover and use it effectively. However, this does not block pipeline functionality.

**Independent Test**: Open the API reference and verify the demo command section includes option descriptions, exit code definitions, output schema, and at least two usage examples.

**Acceptance Scenarios**:

1. **Given** the API reference documentation, **When** a developer looks up the demo command, **Then** they find a complete description of all available options
2. **Given** the API reference documentation, **When** a developer looks up the demo command, **Then** they find exit code definitions matching the pattern used by other documented commands
3. **Given** the API reference documentation, **When** a developer looks up the demo command, **Then** they find a documented output schema (including any structured output formats)
4. **Given** the API reference documentation, **When** a developer looks up the demo command, **Then** they find at least two usage examples covering common scenarios

---

### User Story 5 — Clean Architecture Compliance Verification (Priority: P2)

After the v0.3.0 merge introduced significant changes, the project must still adhere to all five Clean Architecture principles defined in the project constitution. This is a verification activity, not a feature — it ensures that bug fixes and new code introduced in this release do not violate architectural boundaries.

**Why this priority**: Architectural compliance prevents technical debt accumulation and ensures the bridge remains maintainable and framework-independent. It is important for long-term health but does not affect immediate functionality.

**Independent Test**: Review the project structure, dependency graph, and test organization against each of the five constitutional principles and document compliance status.

**Acceptance Scenarios**:

1. **Given** the project after v0.3.0 and the current bug fixes, **When** reviewing dependency direction, **Then** all dependencies point inward (Principle I: The Dependency Rule)
2. **Given** the project source structure, **When** reviewing layer boundaries, **Then** four distinct layers (entities, use cases, interface adapters, frameworks & drivers) exist and are separated (Principle II: Clean Architecture Layers)
3. **Given** the project test suite, **When** reviewing test organization, **Then** tests follow the layer-specific testing strategy — pure unit tests for entities, mocked port tests for use cases, integration tests for adapters (Principle III: Test-First by Layer)
4. **Given** the project boundary crossings, **When** reviewing data that crosses layer boundaries, **Then** only simple data objects or DTOs are passed between layers (Principle IV: Simple Data Crosses Boundaries)
5. **Given** the project's external dependencies, **When** reviewing framework usage, **Then** frameworks are confined to the outer layer and could be swapped with only adapter changes (Principle V: Framework Independence)

---

### Edge Cases

- What happens when hook scripts are installed on a system with a restrictive umask (e.g., 0077) that could override intended file permissions?
- How does the system behave when the after-tasks hook's issue-creation command fails mid-execution (e.g., some issues created, then a network timeout)?
- What happens if the CLI alias is not available on PATH at all when a hook runs (neither short alias nor full package name)?
- How should hooks behave when run outside a git repository context (e.g., in a CI environment with a detached HEAD)?
- What happens when the bridge configuration file is missing or malformed when a hook executes?
- How does the after-tasks hook handle being invoked when no tasks were actually generated (empty tasks file)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All hook template files MUST be distributed with executable permissions so they can run as shell scripts immediately after installation
- **FR-002**: All hook scripts MUST reference the CLI using the short binary alias consistently across every template — no hook may use the scoped package name for CLI invocation
- **FR-003**: The after-tasks hook MUST automatically invoke the issue-creation command when triggered, rather than only printing a reminder message
- **FR-004**: The after-tasks hook MUST handle failures in the issue-creation command gracefully — displaying a clear error message to the developer without interrupting or blocking the SpecKit pipeline
- **FR-005**: All hook scripts MUST continue to fail gracefully (warn and continue) when prerequisites are not met (e.g., CLI not installed, configuration missing, no network)
- **FR-006**: The demo command MUST be fully documented in the API reference, including: all available options with descriptions, exit codes and their meanings, output schema (for any structured output), and at least two usage examples
- **FR-007**: The project MUST maintain verifiable compliance with all five Clean Architecture principles defined in the project constitution after all changes in this release are applied
- **FR-008**: When the bridge configuration disables automatic issue creation, the after-tasks hook MUST respect that setting and skip invocation

### Key Entities

- **Hook Template**: A lifecycle script distributed with the bridge that executes at a specific point in the SpecKit pipeline. Key attributes: trigger point (before-specify, after-tasks, after-implement), file permissions, CLI command invoked, failure behavior (warn-and-continue vs. hard-fail).
- **CLI Alias**: A short command name that maps to the bridge executable. The bridge supports three aliases that all resolve to the same entry point. Hooks must use the canonical short alias for portability.
- **Bridge Configuration**: A per-project configuration file that controls bridge behavior, including whether hooks are enabled and whether automatic issue creation is active. Hooks must read and respect this configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of hook template files execute successfully on first invocation after a fresh installation (up from 33% — currently only one of three templates has executable permissions)
- **SC-002**: The SpecKit→Squad handoff completes automatically without manual developer intervention when hooks are installed and enabled (currently requires a manual command after every task generation)
- **SC-003**: All hook scripts succeed in environments where only the short CLI alias is available on PATH (currently the after-tasks hook fails in this configuration)
- **SC-004**: The API reference documents 100% of CLI commands with options, exit codes, output format, and usage examples — including the demo command
- **SC-005**: All five Clean Architecture principles pass compliance verification after all v0.3.1 changes are applied
- **SC-006**: Bridge pipeline adoption rate increases from 0% to >0% — at least one full SpecKit→Squad pipeline run completes end-to-end using hooks without manual CLI invocations

## Assumptions

- The short binary alias (`squask`) is the canonical way users invoke the CLI and will remain available in all officially supported environments
- Hook scripts should always fail gracefully (warn and continue) rather than hard-fail and block the SpecKit pipeline, unless the bridge configuration explicitly requests strict mode
- The demo command already exists and functions correctly in the CLI; only its API reference documentation needs to be added or expanded
- Constitution compliance is verified through manual structural review of the codebase, not through automated tooling
- The after-tasks hook should invoke issue creation by default; users who want the old "notification only" behavior can disable automation in the bridge configuration
- The v0.3.0 retrospective finding of 0% bridge adoption is primarily caused by the three bugs described in this specification, not by broader usability issues

## Out of Scope

- Adding new CLI commands or subcommands beyond what already exists
- Changing the hook registration mechanism or how SpecKit discovers and invokes lifecycle hooks
- Modifying the issue-creation logic itself (only the hook's invocation of it is in scope)
- Performance optimizations for hook execution or issue creation
- Adding new bridge configuration options beyond what may already exist for controlling hook behavior
- Migrating hooks to a different scripting language or execution model
- Addressing any bridge usability issues beyond the three specific bugs and documentation gaps described here
