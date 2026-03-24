# Changelog

All notable changes to this project are documented here. See [CONTRIBUTING.md](./CONTRIBUTING.md) for release and versioning information.

---

## [v0.3.0] - 2026-03-24

### Breaking Changes

- **CLI Rename:** Command renamed from `squad-speckit-bridge` to `squask` (alias: `sqsk`). The old command name is no longer available.

### New Features

- **Bridge Self-Validation Architecture (T001-T015):**
  - Entity types, port interfaces, and adapter hardening for layered architecture
  - Issue dedup engine with fingerprint hashing and batch creation
  - `listExisting` with paginated REST API and exponential backoff
  - `syncLearnings` with idempotent extraction and SyncStateAdapter
  - SpecReader + ImplementationScanner adapters for spec-to-code tracing
  - Fidelity review mode for spec compliance checking
  - `analyzeDistribution` with rebalancing warnings and skill matching pipeline

- **CLI Feature Flags (T018-T036):**
  - `--dry-run` — Full dry-run chain across all commands
  - `--keep` — Preserve temporary artifacts after pipeline run
  - `--verbose` — Detailed pipeline output with stage-by-stage reporting
  - Safety checks, graceful shutdown (SIGINT → cleanup), and structured error reporting

- **SpecKit Agent Prompts (T010):** Updated 9 agent prompt templates for SpecKit integration
- **Task Generation Template (T013):** Right-sized task generation (15-20 tasks)
- **Quickstart Guide (T049):** Comprehensive quickstart.md (576 lines)

### Bug Fixes

- `analyzeDistribution` now accepts `availableAgents` param — 0-assignment agents included in rebalancing
- SpecReader preserves multi-paragraph FR descriptions (collects until next FR or EOF)
- Skill matcher uses `\b` word boundaries instead of `includes()` — no more false positives
- `listExisting` paginated to handle 200+ issues (was hardcoded limit)
- SIGINT handler wired in CLI entry point with `process.exitCode = 130`
- `isSafeToDelete()` rejects zone roots (`specs`, `temp`) — requires subdirectory
- `program.name` updated to `squask` for consistent help output
- Removed accidental `test-baseline.log` from repository
- Threshold validation added to `analyzeDistribution` — must be in `(0, 1]`
- `listExisting` filters by `state=open` instead of `state=all`
- Module-level `TextEncoder` reuse in skill-matcher (was creating per-call)
- Truncation guard: skills only marked as included when content is non-empty

### Tests

- Entity tests (T037), port interface tests (T038)
- Orchestrator happy path, failure scenario, and cleanup tests (T039-T041)
- ProcessExecutor integration tests (T042)
- ArtifactValidator + CleanupHandler tests (T043-T044)
- E2E demo tests (T045)
- 200+ tests across all modules

### Documentation

- README demo section, usage docs, API reference
- Quickstart guide with step-by-step walkthrough

---

## [v0.2.0] - 2025-07-30

### Bug Fixes

- **Hook Deployment:** Fixed missing hook script deployment in `.specify/extensions/squad-speckit-bridge/hooks/`. The installer now correctly copies `after-tasks.sh`, `before-specify.sh`, and `after-implement.sh` with executable permissions. Existing installations should re-run `install` to add missing hooks. *(Fixes US1, #101)*

- **Spec Kit Extension Model Alignment:** Fixed `extension.yml` manifest to conform exactly to Spec Kit's extension schema. Hooks are now correctly discovered and invoked by Spec Kit during lifecycle events. *(Fixes US2, #102)*

- **CLI Contract Gaps:** Added missing CLI contract definitions for `--verbose`, `--notify`, and `--dry-run` flags across all commands. These flags were documented but not implemented in v0.1.0. *(Fixes #103)*

### New Features

- **`issues` Command (v0.2.0):** Convert approved `tasks.md` into GitHub issues with a single command.
  - `npx @jmservera/squad-speckit-bridge issues <tasks-file>` — Creates one issue per task with proper labels and dependency references
  - `--dry-run` — Preview issues before creating (recommended safety check)
  - `--labels <list>` — Add custom labels (e.g., `--labels priority/high,team/backend`)
  - `--json` — Machine-readable output for CI/CD integration
  - *(Implements US3)*

- **`sync` Command (v0.2.0):** Capture Squad execution learnings and mark them for the next planning cycle.
  - `npx @jmservera/squad-speckit-bridge sync` — Records new decisions and learnings from Squad agents
  - `--dry-run` — Preview what would be synced without modifying
  - `--since <timestamp>` — Sync changes after a specific point in time
  - `--json` — Machine-readable output
  - Closes the knowledge loop: Squad memory → planning → execution → learnings → back to Squad
  - *(Implements US4)*

- **Automation Hooks (v0.2.0):** New hooks to reduce manual workflow steps.
  - `before_specify` — Auto-injects Squad context before planning starts (no manual `context` command needed)
  - `after_implement` — Auto-captures execution learnings after Spec Kit implements (no manual `sync` command needed)
  - Both hooks are optional and configurable via `bridge.config.json`
  - *(Implements US5)*

### Improvements

- **Enhanced `context` Command:** Added flags to support production workflows.
  - `--verbose` — Show detailed processing (file paths, budget breakdown, item selection logic)
  - `--notify` — Send status notifications to Squad agents (requires `notifications.enabled: true` in config)
  - Output now shows context quality metrics and processing details

- **Enhanced `status` Command:** Now reports comprehensive bridge health including hook deployment status, constitution customization, and last sync timestamp.
  - `--verbose` — Shows file paths, permission checks, and detailed hook state
  - Reports if Squad constitution is using template (uncustomized) and recommends customization

- **Constitution Detection (v0.2.0):** `status` command now warns if Squad constitution template is uncustomized (contains placeholder markers). Reminds teams to personalize their principles.

- **Enhanced `issues` Command Output:** Shows created issue numbers, URLs, and phase labels. JSON output includes full issue details for scripting.

- **Package Naming Clarification:** All documentation updated to use correct scoped package name: `@jmservera/squad-speckit-bridge` (npm publish as scoped package for clarity and namespace management).

- **Improved Error Messages:** Error messages now include specific remediation steps and config examples, reducing support burden.

### Documentation

- **README.md:** Updated with v0.2.0 features, new command overview, automation hooks, and installation using scoped package name
- **docs/usage.md:** Comprehensive update with:
  - New `issues` and `sync` command documentation with copy-pasteable examples
  - 6 common workflows (automatic, manual control, dry-run preview, CI/CD, context testing, verbose debugging)
  - v0.2.0 configuration options (issues labels, sync state, notifications)
  - Complete `--verbose` and `--notify` flag documentation
  - Enhanced error handling table with GitHub auth and task file validation errors
- **CHANGELOG.md:** Created (this file)

---

## [v0.1.0] - 2025-07-23

### Initial Release

Squad-SpecKit Bridge v0.1.0 establishes the core memory injection and design review workflow.

### Features

- **`install` Command:** Deploy bridge components (Squad skill, ceremony definitions, Spec Kit extension manifest, configuration file)

- **`context` Command:** Manually generate and inject Squad memory context into Spec Kit planning phases
  - Reads Squad decisions, learnings, and skills
  - Applies relevance scoring and recency bias
  - Respects configurable context budget (default: 8KB)
  - Produces `squad-context.md` for Spec Kit planning phases

- **`review` Command:** Manually generate Design Review templates with pre-populated findings
  - Analyzes task conflicts and dependencies
  - Flags potential risk areas
  - Creates `review.md` for team discussion

- **`status` Command:** Check bridge health and verify installation
  - Detects Squad and Spec Kit presence
  - Verifies component deployment
  - Shows configuration state and last context run timestamp

- **Automation Hook (`after_tasks`):** Automatically generates Design Reviews when Spec Kit completes task breakdown
  - No manual command needed
  - Optional, can be disabled via configuration

- **Squad Plugin (SKILL.md):** Teaches agents about Spec Kit workflow and Design Review participation

- **Clean Architecture:** Core logic organized into entities, use cases, adapters, and frameworks for testability and maintainability

### Configuration

- **bridge.config.json:** User-customizable settings for context budget, sources, summarization, hooks, and paths

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **PATCH version** (0.0.x) — Bug fixes and documentation
- **MINOR version** (0.x.0) — New features, backward-compatible
- **MAJOR version** (x.0.0) — Breaking changes

Current status: **v0.2.0** — Early development, APIs may change. First stable release planned for v1.0.0.

---

## How to Read This Changelog

- **Bug Fixes** — Corrections to documented behavior or security issues
- **New Features** — Additions that enable new workflows
- **Improvements** — Enhancements to existing features (performance, UX, diagnostics)
- **Documentation** — Updates to README, guides, and inline documentation

All changes reference corresponding user stories (US1, US2, etc.) and GitHub issues for full context.
