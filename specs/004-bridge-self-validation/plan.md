# Implementation Plan: Bridge Self-Validation & Knowledge Loop

**Branch**: `004-bridge-self-validation` | **Date**: 2025-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-bridge-self-validation/spec.md`

## Summary

This feature activates the bridge's core value proposition — the **knowledge loop** — and dog-foods every bridge command during its own development. The work encompasses: (1) activating `sqsk context` to generate `squad-context.md` from Squad memory for SpecKit planning, (2) hardening `sqsk issues` for reliable batch GitHub issue creation with deduplication and dry-run, (3) building `sqsk sync` to capture post-implementation learnings back into Squad memory, (4) activating `sqsk review` for spec-vs-implementation fidelity checks, (5) embedding bridge command invocations in SpecKit agent prompts to close the hook gap, (6) calibrating task generation for 15–20 tasks per feature, (7) adding agent distribution awareness, (8) enabling skills-aware routing in coordinator spawn prompts, and (9) cleaning up ~1,500 lines of dead code. The approach extends the existing Clean Architecture (entities → use cases → adapters → CLI) with new capabilities primarily in the use-case and adapter layers.

## Technical Context

**Language/Version**: TypeScript 5.9+ / Node.js ≥18 (ESM, `"type": "module"`)
**Primary Dependencies**: commander ^14.0.3 (CLI), gray-matter ^4.0.3 (frontmatter parsing), glob ^13.0.6 (file matching)
**Storage**: File system only — `.squad/` (Squad memory), `.specify/` (SpecKit config), `specs/` (feature artifacts)
**Testing**: Vitest 4.1+ with V8 coverage provider; unit tests mock ports, integration tests use fixture files
**Target Platform**: Node.js ≥18, Linux/macOS/Windows (CLI tool)
**Project Type**: CLI tool + npm library (`@jmservera/squad-speckit-bridge`)
**Performance Goals**: Context generation <2s for typical `.squad/` directories; issue creation handles 20+ tasks without timeout
**Constraints**: 8 KB default context budget (configurable to 32 KB); must work offline except `sqsk issues` (requires GitHub API via `gh` CLI)
**Scale/Scope**: ~5,600 LOC source, ~1,500 LOC tests, 20 test files, 7 CLI commands, 9 user stories in this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate (Initial Assessment)

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Dependency Rule** | ✅ PASS | All use cases (`context.ts`, `create-issues.ts`, `sync-learnings.ts`, `ceremony.ts`) import only from `../types.js` and `../bridge/ports.js`. Zero outward dependencies. New use cases will follow the same pattern. |
| **II. Clean Architecture Layers** | ✅ PASS | Four layers present: `types.ts` (entities), `bridge/`, `issues/`, `sync/`, `review/` (use cases + ports), `*/adapters/` (adapters), `cli/index.ts` + `main.ts` (frameworks/composition). New code follows existing layer placement. |
| **III. Test-First by Layer** | ✅ PASS | `tests/unit/` mirrors use cases, `tests/integration/` mirrors adapters. New code will maintain 1:1 test file mapping. |
| **IV. Simple Data Crosses Boundaries** | ✅ PASS | Port interfaces in `bridge/ports.ts` use only DTOs from `types.ts`. No framework types in signatures. |
| **V. Framework Independence** | ✅ PASS | `commander`, `gray-matter`, `glob`, `fs` confined to adapters and composition root. Entities/use cases are framework-free. |

**Gate Result**: ✅ ALL PASS — Proceed to Phase 0.

### Post-Phase 1 Gate (Design Verification)

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Dependency Rule** | ✅ PASS | New entities (`DistributionAnalysis`, `SkillMatch`, `DeadCodeReport`) are pure types. New use cases define port interfaces; adapters implement them. No outward imports. |
| **II. Clean Architecture Layers** | ✅ PASS | New code maps cleanly: entities in `types.ts`, use cases in `bridge/`, `issues/`, `sync/`, `review/`, adapters in `*/adapters/`, agent prompt modifications in outermost layer. |
| **III. Test-First by Layer** | ✅ PASS | Data model specifies test strategy per entity. Every new use case gets a `tests/unit/` file; every new adapter gets a `tests/integration/` file. |
| **IV. Simple Data Crosses Boundaries** | ✅ PASS | New port methods use `SkillEntry[]`, `DistributionAnalysis`, `DeadCodeReport` — all DTOs defined in entity layer. |
| **V. Framework Independence** | ✅ PASS | GitHub CLI interaction isolated in `GitHubIssueAdapter`. FS operations isolated in `SquadFileReader`, `SpecKitContextWriter`, `SyncStateAdapter`. No framework leakage into use cases. |

**Gate Result**: ✅ ALL PASS — Design is constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/004-bridge-self-validation/
├── plan.md              # This file
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Entity & relationship definitions
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: CLI interface contracts
│   └── cli-interface.md # Command schemas, flags, exit codes
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── types.ts                          # Layer 0: Entities (pure types, validation, scoring)
├── bridge/                           # Layer 1: Context use case + ports
│   ├── ports.ts                      #   Port interfaces for all use cases
│   ├── context.ts                    #   BuildSquadContext use case
│   ├── parser.ts                     #   Markdown/frontmatter parsing logic
│   ├── summarizer.ts                 #   Progressive summarization algorithm
│   └── adapters/                     # Layer 2: Context adapters
│       ├── squad-file-reader.ts      #   SquadStateReader implementation (fs)
│       └── speckit-writer.ts         #   ContextWriter implementation (fs)
├── issues/                           # Layer 1: Issue creation use case
│   ├── create-issues.ts              #   CreateIssuesFromTasks use case
│   ├── task-parser.ts                #   TasksMarkdownReader implementation
│   └── adapters/                     # Layer 2: Issue adapters
│       └── github-issue-adapter.ts   #   IssueCreator implementation (gh CLI)
├── sync/                             # Layer 1: Learning sync use case
│   ├── sync-learnings.ts             #   SyncLearnings use case
│   └── adapters/                     # Layer 2: Sync adapters
│       └── sync-state-adapter.ts     #   SyncStateReader implementation (fs)
├── review/                           # Layer 1: Design review use case
│   ├── ceremony.ts                   #   PrepareReview use case
│   └── adapters/                     # Layer 2: Review adapters
│       ├── review-writer.ts          #   Review output writer (fs)
│       └── tasks-parser.ts           #   TasksReader implementation (fs)
├── install/                          # Layer 1: Install use case
│   ├── installer.ts                  #   InstallBridge use case
│   ├── status.ts                     #   CheckStatus use case
│   └── adapters/                     # Layer 2: Install adapters
│       ├── config-loader.ts          #   ConfigLoader implementation
│       ├── file-deployer.ts          #   FileDeployer implementation
│       └── framework-detector.ts     #   FrameworkDetector implementation
├── demo/                             # Layer 1: Demo orchestration
│   ├── orchestrator.ts               #   Demo pipeline runner
│   ├── entities.ts                   #   Demo-specific entities
│   ├── factory.ts                    #   Demo composition root
│   ├── formatters.ts                 #   Output formatting
│   ├── ports.ts                      #   Demo ports
│   ├── utils.ts                      #   Demo utilities
│   └── adapters/                     # Layer 2: Demo adapters
│       ├── artifact-validator.ts
│       ├── cleanup-handler.ts
│       └── process-executor.ts
├── cli/                              # Layer 3: CLI framework
│   ├── index.ts                      #   Commander entry point
│   └── logger.ts                     #   CLI logger utility
└── main.ts                           # Composition root (wires adapters → use cases)

tests/
├── unit/                             # Use case + entity tests (mocked ports)
│   ├── ceremony.test.ts
│   ├── constitution.test.ts
│   ├── context.test.ts
│   ├── create-issues.test.ts
│   ├── error-codes.test.ts
│   ├── installer.test.ts
│   ├── parser.test.ts
│   ├── setup.test.ts
│   ├── status.test.ts
│   ├── summarizer.test.ts
│   ├── sync-learnings.test.ts
│   └── types.test.ts
└── integration/                      # Adapter tests (real fixtures)
    ├── config-loader.test.ts
    ├── file-deployer.test.ts
    ├── fixtures.test.ts
    ├── framework-detector.test.ts
    ├── review-writer.test.ts
    ├── speckit-writer.test.ts
    ├── squad-file-reader.test.ts
    └── tasks-parser.test.ts

.github/
├── agents/                           # SpecKit agent definitions (modified for hook gap)
│   ├── speckit.specify.agent.md      #   + sqsk context invocation
│   ├── speckit.plan.agent.md         #   + sqsk context invocation
│   ├── speckit.tasks.agent.md        #   + sqsk issues invocation
│   └── speckit.implement.agent.md    #   + sqsk sync invocation
└── prompts/                          # SpecKit prompt files (modified for hook gap)
    ├── speckit.specify.prompt.md
    ├── speckit.plan.prompt.md
    ├── speckit.tasks.prompt.md
    └── speckit.implement.prompt.md
```

**Structure Decision**: Existing Clean Architecture layout is preserved. No new top-level directories needed. Changes are additive within existing modules (`bridge/`, `issues/`, `sync/`, `review/`) plus modifications to agent prompt files in `.github/`.

## Complexity Tracking

> No constitution violations detected. All changes follow existing Clean Architecture patterns.
