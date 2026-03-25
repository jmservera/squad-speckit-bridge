# Feature Specification: Fix CLI Version Display Inconsistency

**Feature Branch**: `008-fix-version-display`  
**Created**: 2025-07-14  
**Status**: Draft  
**Input**: User description: "The squask CLI displays incorrect/stale versions. `squask -V` shows 0.3.0 (hardcoded in src/cli/index.ts:26) and `squask install` shows v0.2.0 (from stale comment in src/main.ts:2 and bridge-manifest.json). The actual package version is 0.3.1. All version outputs should read dynamically from package.json as the single source of truth. See GitHub issue #332 for full details."

## Problem Statement

The CLI tool currently displays different version numbers depending on which command the user runs, eroding trust in the tool and creating confusion during debugging and support. There are at least three different version strings shown across different CLI commands and outputs, none of which match the actual released version. This is caused by version strings being hardcoded in multiple locations rather than being derived from a single authoritative source.

**Current state** (all incorrect):

| Surface | Displayed Version | Actual Version |
|---------|-------------------|----------------|
| `squask -V` | 0.3.0 | 0.3.1 |
| `squask install` output | 0.2.0 | 0.3.1 |
| Bridge manifest file | 0.2.0 | 0.3.1 |
| Internal status reports | 0.2.0 | 0.3.1 |

**Affected locations**: CLI version flag output, install command human-readable output, install command JSON output, bridge manifest written to disk, and status report output.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Checking the CLI Version (Priority: P1)

As a developer, I run `squask -V` or `squask --version` to check which version of the bridge tool I have installed so I can confirm compatibility with my project, report issues accurately, or verify an upgrade succeeded.

**Why this priority**: Version checking is the most fundamental user interaction for trust and support. Every bug report, compatibility check, and upgrade verification depends on the version flag returning the correct value.

**Independent Test**: Can be fully tested by running `squask -V` and comparing the output against the version declared in the package metadata. Delivers immediate confidence in the tool's correctness.

**Acceptance Scenarios**:

1. **Given** the tool is installed, **When** the user runs `squask -V`, **Then** the output displays the exact version from the package metadata (e.g., "0.3.1")
2. **Given** the tool is installed, **When** the user runs `squask --version`, **Then** the output is identical to `squask -V`
3. **Given** the package version is updated from 0.3.1 to 0.4.0, **When** the tool is rebuilt and the user runs `squask -V`, **Then** the output shows "0.4.0" without any code changes beyond the package metadata

---

### User Story 2 - Viewing Version in Install Output (Priority: P1)

As a developer running `squask install`, I expect the version shown in both human-readable and machine-readable (JSON) output to match the actual installed version, so that automation scripts and CI pipelines receive accurate version information.

**Why this priority**: Install output is consumed by both humans and automated pipelines. An incorrect version in install output causes cascading errors in CI/CD, deployment manifests, and audit trails.

**Independent Test**: Can be tested by running `squask install` and verifying the version in both human-readable and JSON output formats matches the package metadata.

**Acceptance Scenarios**:

1. **Given** the user runs `squask install`, **When** the install completes successfully, **Then** the human-readable output displays the correct version from the package metadata
2. **Given** the user runs `squask install --json`, **When** the install completes, **Then** the JSON output contains a `version` field matching the package metadata exactly
3. **Given** the package version is bumped, **When** the tool is rebuilt and `squask install` is run, **Then** all output reflects the new version automatically

---

### User Story 3 - Bridge Manifest Reflects Correct Version (Priority: P2)

As a developer or CI system inspecting the bridge manifest file after installation, I expect the version recorded in the manifest to match the actual version of the tool that was installed, so that version auditing and compatibility checks are reliable.

**Why this priority**: The manifest persists on disk and may be read by other tools, integrations, or future runs. A stale version in the manifest causes silent compatibility mismatches.

**Independent Test**: Can be tested by running `squask install`, then reading the bridge manifest file and confirming the version field matches the package metadata.

**Acceptance Scenarios**:

1. **Given** the user runs `squask install`, **When** the manifest file is written, **Then** the version field in the manifest matches the package metadata
2. **Given** the manifest already exists from a previous install, **When** the user upgrades and runs `squask install` again, **Then** the manifest version is overwritten with the new correct version

---

### User Story 4 - Consistent Status Report Version (Priority: P2)

As a developer running `squask status` or any diagnostic command, I expect the version reported in status output to match the actual installed version, so I can provide accurate information when reporting bugs or requesting support.

**Why this priority**: Status reports are critical for debugging and support. Incorrect versions in diagnostic output waste developer time and mislead support engineers.

**Independent Test**: Can be tested by running the status check and verifying the version matches the package metadata.

**Acceptance Scenarios**:

1. **Given** the tool is installed, **When** the user requests a status report, **Then** the reported version matches the package metadata
2. **Given** the user has upgraded the tool, **When** they check status, **Then** the version reflects the upgrade without manual intervention

---

### Edge Cases

- What happens if the package metadata file is missing or unreadable at runtime? The system should fail gracefully with a clear error message rather than displaying a blank or undefined version.
- What happens if the version field in the package metadata is empty or malformed? The system should report an error rather than silently displaying an empty string.
- How does version display behave when running from a development (unbuilt) environment versus a packaged distribution? Both should resolve to the same version.
- What happens when the tool is invoked via any of its aliases (`squask`, `sqsk`, `squad-speckit-bridge`)? All aliases should display the same version.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All CLI version outputs (version flag, install output, status output) MUST derive the displayed version from a single authoritative source — the package metadata — at runtime
- **FR-002**: The `squask -V` and `squask --version` commands MUST display the exact version string from the package metadata, with no hardcoded fallback
- **FR-003**: The `squask install` human-readable output MUST include the correct version from the package metadata
- **FR-004**: The `squask install` JSON output MUST include a `version` field containing the correct version from the package metadata
- **FR-005**: The bridge manifest file written during installation MUST record the correct version from the package metadata
- **FR-006**: Status/diagnostic reports MUST display the correct version from the package metadata
- **FR-007**: All CLI aliases (`squask`, `sqsk`, `squad-speckit-bridge`) MUST display identical version information
- **FR-008**: If the package metadata cannot be read or the version field is missing/empty, the system MUST display a clear error message rather than showing a blank, undefined, or fallback version
- **FR-009**: No version string literals MUST remain hardcoded in any source file that is displayed to users or written to output files; file header comments used purely for documentation purposes are exempt from this requirement
- **FR-010**: Bumping the version in the package metadata MUST be the only step required to update all version displays — no additional source file edits should be necessary

### Key Entities

- **Package Metadata**: The single source of truth for the tool's version number; read at runtime by all version-displaying components
- **Bridge Manifest**: A file written to disk during installation that records metadata about the installed bridge, including its version; consumed by other tools and future runs for compatibility checking
- **Status Report**: A diagnostic output object that includes the tool's version among other system health information

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running `squask -V` displays the exact version from the package metadata — verified by string comparison, with 100% match rate across all aliases
- **SC-002**: After a version bump in the package metadata and a rebuild, all version outputs reflect the new version with zero additional source file changes required
- **SC-003**: The install command's human-readable output and JSON output both contain the correct version — verified by parsing the output and comparing against the package metadata
- **SC-004**: The bridge manifest file written during install contains the correct version — verified by reading the file after installation
- **SC-005**: Zero hardcoded version string literals remain in source files that contribute to user-facing or file-written version output
- **SC-006**: All three CLI aliases (`squask`, `sqsk`, `squad-speckit-bridge`) produce identical version output when invoked with `-V`

## Assumptions

- The package metadata file (package.json) is always present and accessible at runtime, as it is part of the standard distribution
- The version field in the package metadata follows semantic versioning (e.g., "0.3.1")
- The tool is always run from its installed location where the package metadata is resolvable relative to the entry point
- The bridge manifest format is not consumed by external third-party tools that depend on a specific version schema — only by the tool itself and its ecosystem
- Comments in source files that mention version numbers for historical documentation purposes do not need to be dynamically generated, but should be clearly marked as documentation rather than functional references
