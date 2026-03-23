# Implementation Plan: Squad-SpecKit Bridge v0.2.0 — Fixes, Commands & Automation

**Branch**: `002-v02-fixes-automation` | **Date**: 2025-07-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-v02-fixes-automation/spec.md`
**Supersedes**: v0.1.0 plan (`specs/001-squad-speckit-bridge/plan.md`)

## Summary

Extend the v0.1.0 bridge with bug fixes for hook deployment (US1) and extension manifest alignment (US2), two new CLI commands — `issues` for GitHub issue creation from tasks.md (US3) and `sync` for execution learning capture (US4) — automation hooks for pipeline integration (US5), CLI contract alignment with documentation (US6), and developer experience warnings for common pitfalls (US7). Same TypeScript/Node.js/commander stack, same Clean Architecture layering, extended with new entities (IssueRecord, SyncRecord, HookScript), new use cases (CreateIssuesFromTasks, SyncLearnings, DeployHooks), and new adapters (GitHubIssueAdapter, SyncStateAdapter, HookDeployer).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface), @octokit/rest (GitHub API for issues command)
**Storage**: File system (`.squad/` and `.specify/` directories) + GitHub API (issues) — no database
**Testing**: Vitest (fast, TypeScript-native, ESM-compatible)
**Target Platform**: Cross-platform CLI (Node.js 18+ — macOS, Linux, Windows)
**Project Type**: CLI tool + library (npm package, `npx`-installable)
**Performance Goals**: Issues command creates 20 issues in <60 seconds; sync detection <5 seconds; context generation <30 seconds (unchanged from v0.1.0)
**Constraints**: Context summary output ≤8KB default (unchanged); read-only access to `.squad/` for context; read-write for sync state; GitHub API rate limits (5000 req/hr authenticated)
**Scale/Scope**: Single-repository tool; handles 50+ tasks in tasks.md, 10+ agent histories, 100KB+ decisions files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Constitution loaded from `.specify/memory/constitution.md` (v1.0.0, ratified).

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dependency Rule | ✅ PASS | New use cases (CreateIssuesFromTasks, SyncLearnings) define port interfaces; @octokit/rest confined to GitHubIssueAdapter; no outward dependencies from entities or use cases. |
| II. Clean Architecture Layers | ✅ PASS | New entities (IssueRecord, SyncRecord, HookScript) in entities layer. New use cases define ports. New adapters implement them. |
| III. Port Interface Strategy | ✅ PASS | IssueCreator, SyncStateReader, SyncStateWriter, HookDeployer ports defined in use case layer. Adapters implement. |
| IV. DTO Discipline | ✅ PASS | IssueCreateRequest, SyncRequest DTOs cross boundaries. No Octokit response types leak inward. |
| V. Anti-Pattern Prevention | ✅ PASS | 8 anti-patterns from v0.1.0 still enforced. No new violations introduced. |

**Post-Phase 1 Re-check**: All gates pass. New commands follow identical architectural patterns to v0.1.0 commands.

## Project Structure

### Documentation (this feature)

```text
specs/002-v02-fixes-automation/
├── plan.md              # This file
├── research.md          # Phase 0: resolved clarifications
├── data-model.md        # Phase 1: new/updated entities
├── contracts/           # Phase 1: updated CLI interface contracts
│   └── cli-interface.md # Extended with issues, sync commands
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types.ts                      # ENTITIES — extended with IssueRecord, SyncRecord, HookScript, ApprovalStatus fix
├── bridge/
│   ├── ports.ts                  # USE CASE — extended with IssueCreator, SyncStateReader, SyncStateWriter ports
│   ├── context.ts                # USE CASE — BuildSquadContext (unchanged)
│   ├── summarizer.ts             # USE CASE — SummarizeContent (unchanged)
│   ├── parser.ts                 # ADAPTER — MarkdownFrontmatterParser (unchanged)
│   └── adapters/
│       ├── squad-file-reader.ts  # ADAPTER — SquadStateReader implementation (unchanged)
│       └── speckit-writer.ts     # ADAPTER — ContextWriter implementation (unchanged)
├── issues/
│   ├── create-issues.ts          # USE CASE — CreateIssuesFromTasks
│   ├── task-parser.ts            # ADAPTER — TasksMarkdownParser (tasks.md → TaskEntry[])
│   └── adapters/
│       └── github-issue-adapter.ts  # ADAPTER — implements IssueCreator via @octokit/rest
├── sync/
│   ├── sync-learnings.ts         # USE CASE — SyncLearnings
│   └── adapters/
│       └── sync-state-adapter.ts # ADAPTER — implements SyncStateReader/Writer
├── install/
│   ├── installer.ts              # USE CASE — InstallBridge (extended: hook deployment, manifest validation)
│   ├── hook-deployer.ts          # ADAPTER — HookDeployer (new: deploys hook scripts with permissions)
│   └── templates/                # FRAMEWORK — hook script templates, extension.yml template
├── review/
│   └── ceremony.ts               # USE CASE — VetTasksWithTeam (unchanged)
├── status/
│   └── check-status.ts           # USE CASE — CheckStatus (extended: constitution detection)
└── cli/
    └── index.ts                  # FRAMEWORK/DRIVER — commander setup (extended: issues, sync, --verbose, --notify)

tests/
├── entities/                     # Pure unit tests for new entity types
├── use-cases/                    # Mocked port tests for new use cases
├── adapters/                     # Integration tests for new adapters
├── cli/                          # Snapshot tests for new commands
├── e2e/                          # Full pipeline tests
└── fixtures/
    ├── squad/                    # Mock .squad/ structures
    ├── specify/                  # Mock .specify/ structures
    └── tasks/                    # Sample tasks.md files for issues command
```

**Structure Decision**: Same single-project Clean Architecture layout as v0.1.0. New domain modules (`src/issues/`, `src/sync/`) follow the same entity → use case → adapter pattern. The `src/install/` module grows to include hook deployment.

## Architecture

*Same Clean Architecture as v0.1.0. Extensions documented below.*

### New Entities (Innermost)

| Entity | Purpose | Source Story |
|--------|---------|-------------|
| `IssueRecord` | GitHub issue created from a task entry | US3 |
| `SyncRecord` | Snapshot of Squad memory changes since last sync | US4 |
| `HookScript` | Deployed automation script tied to Spec Kit lifecycle | US1, US5 |
| `ApprovalStatus` (fix) | Enum: `pending`, `approved`, `changes_requested` — removes `blocked` | US6 |

### New Use Cases

| Use Case | Orchestrates | Ports Required | Source Story |
|----------|-------------|----------------|-------------|
| `CreateIssuesFromTasks` | Parses tasks.md, resolves dependencies, creates issues | `TasksReader` (input), `IssueCreator` (output) | US3 |
| `SyncLearnings` | Detects new Squad memory entries since last sync, produces sync record | `SyncStateReader` (input), `SyncStateWriter` (output) | US4 |
| `DeployHooks` | Copies hook scripts, sets permissions, validates manifest | `HookDeployer` (output), `ManifestValidator` (input) | US1, US5 |
| `DetectConstitution` | Scans constitution for placeholder markers | (pure logic, no ports) | US7 |

### New Adapters

| Adapter | Implements Port | Converts | Source Story |
|---------|----------------|----------|-------------|
| `TasksMarkdownParser` | `TasksReader` | `tasks.md` → `TaskEntry[]` (parses checklist format) | US3 |
| `GitHubIssueAdapter` | `IssueCreator` | `TaskEntry[]` → GitHub API calls via @octokit/rest | US3 |
| `SyncStateAdapter` | `SyncStateReader` + `SyncStateWriter` | `.bridge-sync-state.json` ↔ sync timestamps | US4 |
| `HookScriptDeployer` | `HookDeployer` | Template scripts → `.specify/extensions/` with chmod +x | US1, US5 |
| `ManifestAdapter` | `ManifestValidator` | `extension.yml` → schema validation result | US2 |

### Dependency Diagram (Extended)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Frameworks & Drivers                                                    │
│  Node.js fs · gray-matter · commander · glob · @octokit · vitest · gh    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Interface Adapters                                              │    │
│  │  SquadFileReader · SpecKitContextWriter · CLIAdapter             │    │
│  │  MarkdownParser · ConfigLoader · GitHubIssueAdapter (NEW)        │    │
│  │  TasksMarkdownParser (NEW) · SyncStateAdapter (NEW)              │    │
│  │  HookScriptDeployer (NEW) · ManifestAdapter (NEW)                │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │  Use Cases                                                │   │    │
│  │  │  BuildSquadContext · SummarizeContent                    │   │    │
│  │  │  VetTasksWithTeam · InstallBridge                        │   │    │
│  │  │  CreateIssuesFromTasks (NEW) · SyncLearnings (NEW)       │   │    │
│  │  │  DeployHooks (NEW) · DetectConstitution (NEW)            │   │    │
│  │  │                                                          │   │    │
│  │  │  ┌──────────────────────────────────────────────────┐   │   │    │
│  │  │  │  Entities (Core)                                 │   │   │    │
│  │  │  │  ContextSummary · SkillEntry · DecisionEntry     │   │   │    │
│  │  │  │  LearningEntry · BridgeConfig                    │   │   │    │
│  │  │  │  DesignReviewRecord · InstallManifest            │   │   │    │
│  │  │  │  IssueRecord (NEW) · SyncRecord (NEW)            │   │   │    │
│  │  │  │  HookScript (NEW) · ApprovalStatus (FIX)         │   │   │    │
│  │  │  └──────────────────────────────────────────────────┘   │   │    │
│  │  │         ▲ dependencies point inward only                │   │    │
│  │  └─────────┼───────────────────────────────────────────────┘   │    │
│  │            ▲                                                    │    │
│  └────────────┼────────────────────────────────────────────────────┘    │
│               ▲                                                         │
└───────────────┼─────────────────────────────────────────────────────────┘
```

## Phase Planning — User Story Breakdown

### Phase 1: US1 — Fix Hook Deployment (P1)

Fix the installer to deploy all hook scripts with correct permissions. The `InstallBridge` use case is extended to include a `DeployHooks` step. The `HookScriptDeployer` adapter handles file copying and `chmod +x`. The manifest validator ensures every hook referenced in `extension.yml` has a corresponding script on disk.

**Approach**: Modify `src/install/installer.ts` to call new `DeployHooks` use case after component deployment. Add `HookScriptDeployer` adapter. Update `InstallManifest` entity to track deployed hook scripts.

### Phase 2: US2 — Extension Model Alignment (P1)

Ensure `extension.yml` conforms to Spec Kit's actual schema. The `ManifestAdapter` validates the generated manifest against Spec Kit's expected structure. Hook registration format, command definitions, and environment variable declarations are verified.

**Approach**: Define the expected Spec Kit extension schema as a TypeScript interface. Build `ManifestAdapter` to validate generated manifests. Update the extension template to match Spec Kit's actual format.

### Phase 3: US3 — Issues Command (P1)

Add `squad-speckit-bridge issues <tasks-file>` command. Parses tasks.md checklist format, resolves dependencies into GitHub issue cross-references, creates issues via GitHub API. Supports `--dry-run`, `--labels`, `--json`.

**Approach**: `TasksMarkdownParser` adapter reads tasks.md and produces `TaskEntry[]`. `CreateIssuesFromTasks` use case handles dependency resolution and ordering. `GitHubIssueAdapter` wraps @octokit/rest for issue creation. CLI adapter adds the `issues` subcommand.

### Phase 4: US4 — Sync Command (P2)

Add `squad-speckit-bridge sync` command. Reads Squad memory changes since last sync, produces a structured `SyncRecord` consumable by the `context` command.

**Approach**: `SyncStateAdapter` persists sync timestamps in `.bridge-sync-state.json`. `SyncLearnings` use case compares current state against last sync point, identifies new decisions and learnings. Output feeds into the next `context` command cycle.

### Phase 5: US5 — Automation Hooks (P2)

Deploy `before_specify` and `after_implement` hooks that auto-run `context` and `sync` commands respectively. Graceful handling of unsupported hook points.

**Approach**: Hook scripts are shell scripts that invoke `npx squad-speckit-bridge context` / `sync`. The installer detects which hook points the installed Spec Kit version supports and skips unsupported ones with a warning. Each hook is independently disablable via `enabled: false` in extension.yml.

### Phase 6: US6 — CLI Contract Alignment (P2)

Add `--verbose` global flag (diagnostic stderr output), `--notify` on `review` command, fix `ApprovalStatus` to remove `blocked` state, add tool availability checks to hook scripts.

**Approach**: `--verbose` wires into a diagnostic logger that emits to stderr. `--notify` integrates with a pluggable notification adapter (initially console-based). `ApprovalStatus` type update in entities. Hook scripts get `command -v npx` checks with fallback messaging.

### Phase 7: US7 — Constitution & Workflow Warnings (P3)

Extend `status` command to detect uncustomized constitutions (placeholder markers). Add `setup-plan.sh` overwrite detection (warn if plan.md exists).

**Approach**: `DetectConstitution` is pure entity-layer logic (regex scan for `[PLACEHOLDER]`, `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`). Status command adapter calls it and formats the warning. Overwrite detection added to installer/status flow.

## Complexity Tracking

> No constitution violations. All new commands follow identical architectural patterns to v0.1.0 commands. The @octokit/rest dependency (US3) is confined to the GitHubIssueAdapter — no leakage into use cases or entities.
