# Changelog

All notable changes to this project are documented here. See [CONTRIBUTING.md](./CONTRIBUTING.md) for release and versioning information.

---

## [v0.4.0] - 2026-03-25

### New Features

- **Reverse sync CLI command:** `squask sync-reverse <spec-dir>` closes the knowledge feedback loop by syncing Squad implementation learnings back to spec artifacts (#349–#365)
- **Privacy filtering:** Automatic redaction of secrets (API keys, tokens, passwords, connection strings, AWS keys) and PII (emails, phone numbers) before writing learnings
- **Constitution enrichment:** Only spec/plan-level non-negotiables are written to `.specify/memory/constitution.md` — coding patterns stay in team charters/skills (FR-004a classification gate)
- **Dry-run mode:** Preview reverse sync output without writing files (`--dry-run`)
- **Source selection:** Choose which knowledge sources to sync (`--sources histories,decisions,skills`)
- **Cooldown filtering:** Exclude recent learnings to allow agents to finish documenting (`--cooldown <hours>`)
- **Constitution opt-out:** Skip constitution enrichment with `--no-constitution`
- **JSON output:** Machine-readable output for CI/CD integration (`--json`)

### Architecture

- **Clean Architecture compliance:** 3 new port interfaces, 4 adapter implementations, 1 use case function
- **Entity-layer pure functions:** `applyPrivacyFilter()`, `classifyLearning()` (FR-004a), `categorizeLearning()`, `generateLearningsMarkdown()`
- **Fingerprint deduplication:** Reuses existing `computeLearningFingerprint()` pattern for idempotent syncs
- **Separate state tracking:** `.bridge-sync-reverse.json` for reverse sync state (independent from forward sync)

### Tests

- **169 new tests** (866 → 1035 total) across 12 new test files
- Unit tests for privacy filter, learning classifier, markdown generator, use case
- Integration tests for all adapters and constitution enrichment
- E2E tests for full pipeline including dry-run, source filtering, and cooldown

### Documentation

- README updated with reverse sync usage, options, examples, and post-cycle workflow
- JSDoc added to all new public exports

---

## [v0.3.2] - 2026-03-25

### Bug Fixes

- **Dynamic version resolution:** All CLI version displays (`squask -V`, `squask install`, `squask status`) now read dynamically from `package.json` instead of hardcoded strings (#332)
- **Removed stale version literals:** Zero hardcoded version strings remain in `src/` — `'0.2.0'` and `'0.3.0'` replaced with runtime resolution
- **Version parameter threading:** `installBridge()`, `checkStatus()`, and `FileSystemDeployer` now require explicit `version: string` parameter — no defaults, no fallbacks

### Improvements

- **Internal version resolver:** `resolveVersion()` in `src/version.ts` — shared by CLI, install, and status surfaces with proper error handling
- **CI matrix:** Dropped Node 18 (EOL April 2025) — CI now tests Node 20 and 22 only

### Tests

- New: `tests/unit/version.test.ts` — 5 tests for `resolveVersion()` including error paths
- New: `tests/e2e/version-consistency.test.ts` — 5 tests verifying all CLI surfaces report identical version
- Updated: installer, file-deployer, status tests — dynamic version assertions (856 → 866)

---

## [v0.3.1] - 2026-03-24

### Bug Fixes

- **AgentHistoryReaderAdapter wiring:** Fully implemented but never wired in `createSyncer()` factory — now properly instantiated and used
- **Checkbox parsing:** `readSpecResults()` regex only matched `[x]` (checked) — fixed to match both `[x]` and `[ ]` (checked and unchecked) to capture all task states
- **Constitution output:** Added `ConstitutionWriter` port + `ConstitutionAdapter` to write amended constitution to `.specify/memory/constitution.md` (was only going to squad memory)

### New Features

- `--agent-dir` CLI option to specify custom agent history directory (defaults to `.squad/agents/`)
- `--no-constitution` CLI option to skip constitution amendment during sync
- `ConstitutionAdapter` with automatic version bumping (1.0.0 → 1.1.0) and date updates

### Tests

- 13 new tests (843 → 856): 9 unit tests for adapters + 4 integration tests for sync pipeline
- All tests pass; no regressions

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
