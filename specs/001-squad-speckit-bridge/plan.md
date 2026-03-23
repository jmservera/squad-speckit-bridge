# Implementation Plan: Squad-SpecKit Knowledge Bridge

**Branch**: `001-squad-speckit-bridge` | **Date**: 2025-07-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-squad-speckit-bridge/spec.md`

## Summary

Build a hybrid integration package that connects Squad's persistent team memory with Spec Kit's structured planning pipeline. The bridge is a dual-sided package: a Squad plugin (SKILL.md + ceremony definition), a Spec Kit extension (`after_tasks` hook), and a shared bridge script (~300 LOC TypeScript) that reads Squad state and produces context summaries for Spec Kit consumption. The core value is a bidirectional knowledge flywheel: Squad memory feeds planning, execution learnings feed back into Squad memory.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface)
**Storage**: File system (`.squad/` and `.specify/` directories) — no database
**Testing**: Vitest (fast, TypeScript-native, ESM-compatible)
**Target Platform**: Cross-platform CLI (Node.js 18+ — macOS, Linux, Windows)
**Project Type**: CLI tool + library (npm package, `npx`-installable)
**Performance Goals**: Context summary generation <30 seconds for repositories with 100KB+ Squad memory
**Constraints**: Context summary output ≤8KB default (configurable); read-only access to `.squad/`; zero modification to pre-existing framework files
**Scale/Scope**: Single-repository tool; handles 10+ agent histories, 100KB+ decisions files, arbitrary skill count

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: The project constitution (`.specify/memory/constitution.md`) is currently an uncustomized template. Applying reasonable defaults based on the project's established patterns:

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | ✅ PASS | Bridge is a standalone library with CLI entry point. Self-contained, independently testable. |
| CLI Interface | ✅ PASS | All bridge operations exposed as CLI commands. Text in/out protocol: args → stdout, errors → stderr. JSON + human-readable output supported. |
| Test-First | ✅ PASS | Vitest test suite planned. Contract tests for CLI interface, unit tests for parsers, integration tests for end-to-end bridge flow. |
| Simplicity | ✅ PASS | ~300 LOC total for v0.1. No external services, no database, no runtime daemons. File I/O only. |
| Additive-Only | ✅ PASS | FR-003 requires zero modification to pre-existing files. Bridge artifacts are strictly additive. |

**Post-Phase 1 Re-check**: All gates still pass. Design maintains library-first structure, CLI interface, and additive-only constraints.

## Project Structure

### Documentation (this feature)

```text
specs/001-squad-speckit-bridge/
├── plan.md              # This file
├── research.md          # Phase 0: resolved clarifications and technology decisions
├── data-model.md        # Phase 1: key entities and their relationships
├── quickstart.md        # Phase 1: getting started guide
├── contracts/           # Phase 1: CLI interface contracts
│   ├── cli-interface.md # Command definitions, args, output formats
│   └── config-schema.md # Bridge configuration format
└── tasks.md             # Phase 2 output (NOT created by plan phase)
```

### Source Code (repository root)

```text
src/
├── cli/
│   └── index.ts          # CLI entry point (commander-based)
├── bridge/
│   ├── context.ts        # Memory bridge: reads .squad/ → context summary
│   ├── summarizer.ts     # Progressive summarization logic
│   └── parser.ts         # Markdown/frontmatter parsing utilities
├── install/
│   ├── installer.ts      # Framework detection + file deployment
│   └── templates/        # Template files for SKILL.md, extension.yml, ceremony
├── review/
│   └── ceremony.ts       # Design Review ceremony definition generator
└── types.ts              # Shared type definitions

docs/                       # GitHub Pages documentation site (Jekyll)
├── _config.yml             # Jekyll configuration (theme, title, baseurl)
├── index.md                # Landing page / project overview
├── installation.md         # Step-by-step installation guide
├── usage.md                # CLI command usage with runnable examples
└── architecture.md         # Clean Architecture layers and knowledge flow loop

tests/
├── unit/
│   ├── context.test.ts   # Memory bridge unit tests
│   ├── summarizer.test.ts
│   └── parser.test.ts
├── integration/
│   └── bridge-flow.test.ts  # End-to-end bridge cycle test
└── fixtures/
    ├── squad/            # Mock .squad/ directory structures
    └── specify/          # Mock .specify/ directory structures
```

**Structure Decision**: Single project layout. The bridge is a self-contained CLI tool with library internals. No frontend, no backend separation, no multi-package structure. The `src/` directory organizes by domain concern (bridge, install, review) rather than technical layer.

## Architecture

*Applying Uncle Bob's Clean Architecture (2012) to the Squad-SpecKit bridge.*

### Layer Mapping

#### Entities (Core) — Innermost

Pure business objects. No dependencies on file formats, frameworks, GitHub, or Node.js APIs. Defined in `src/types.ts` (and potentially split into `src/entities/` as the project grows).

| Entity | Purpose |
|--------|---------|
| `ContextSummary` | The knowledge document produced by the memory bridge |
| `SkillEntry` | A parsed skill with name, patterns, and anti-patterns |
| `DecisionEntry` | A parsed team decision with relevance scoring |
| `LearningEntry` | A summarized agent learning |
| `BridgeConfig` | Configuration controlling bridge behavior |
| `DesignReviewRecord` | Structured output of a Design Review ceremony |
| `ReviewFinding` | An individual issue found during review |
| `InstallManifest` | Tracks what the bridge has deployed |

**Rule**: These types contain only data and pure business logic (validation, scoring). They import nothing — no `fs`, no `path`, no `gray-matter`, no `@octokit`.

#### Use Cases — Application Logic

Application-specific operations that orchestrate entities. They define **input/output port interfaces** (abstract boundaries) but never implement I/O directly. Located in the business logic portions of `src/bridge/`, `src/review/`, and `src/install/`.

| Use Case | Orchestrates | Ports Required |
|----------|-------------|----------------|
| `BuildSquadContext` | Reads squad state → scores, prioritizes, budgets → produces `ContextSummary` | `SquadStateReader` (input), `ContextWriter` (output) |
| `SummarizeContent` | Applies progressive summarization (priority → recency → compression) to fit budget | None (pure logic on entities) |
| `VetTasksWithTeam` | Runs Design Review ceremony, produces `DesignReviewRecord` | `TasksReader` (input), `TeamReviewer` (input) |
| `CreateIssuesFromTasks` | Converts approved tasks into issue creation commands | `IssueCreator` (output) |
| `InstallBridge` | Detects frameworks, deploys components idempotently | `FrameworkDetector` (input), `FileDeployer` (output) |
| `SyncLearnings` | Feeds execution learnings back into Squad memory | `LearningReader` (input), `LearningWriter` (output) |

**Rule**: Use cases import entities and port interfaces only. They never import `fs`, `path`, `commander`, `gray-matter`, or any GitHub library. They are fully testable with in-memory fakes.

#### Interface Adapters — Boundary Converters

Convert between the use case world (entities, ports) and the external world (files, APIs, CLI). These implement the port interfaces defined by use cases. Located in the I/O portions of `src/bridge/`, `src/install/`, and `src/cli/`.

| Adapter | Implements Port | Converts |
|---------|----------------|----------|
| `SquadFileReader` | `SquadStateReader` | `.squad/` files → `SkillEntry[]`, `DecisionEntry[]`, `LearningEntry[]` |
| `SpecKitContextWriter` | `ContextWriter` | `ContextSummary` → `squad-context.md` file |
| `MarkdownFrontmatterParser` | (utility) | Raw markdown text → structured frontmatter + content |
| `ConfigFileLoader` | (utility) | `bridge.config.json` → `BridgeConfig` entity |
| `GitHubIssueAdapter` | `IssueCreator` | Approved tasks → GitHub API calls |
| `CLIAdapter` | (entry point) | CLI args → use case invocations → stdout/stderr |
| `TemplateRenderer` | `FileDeployer` | Entity data → SKILL.md, extension.yml, ceremony files |

**Rule**: Adapters depend inward on use cases and entities. They use framework libraries (`gray-matter`, `fs`, `commander`) but isolate that usage — the rest of the system never sees framework types.

#### Frameworks & Drivers — Outermost

External tools and libraries. Pure glue code. The bridge doesn't own these — it wraps them via adapters.

| Framework/Driver | Used By (Adapter) |
|-----------------|-------------------|
| Node.js `fs/promises` | `SquadFileReader`, `SpecKitContextWriter`, `ConfigFileLoader` |
| `gray-matter` | `MarkdownFrontmatterParser` |
| `commander` | `CLIAdapter` (in `src/cli/index.ts`) |
| `glob` | `SquadFileReader` (file discovery) |
| `@octokit/rest` / GitHub CLI | `GitHubIssueAdapter` |
| `vitest` | Test infrastructure only |

### Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frameworks & Drivers                                               │
│  Node.js fs · gray-matter · commander · glob · @octokit · vitest    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Interface Adapters                                         │    │
│  │  SquadFileReader · SpecKitContextWriter · CLIAdapter        │    │
│  │  MarkdownParser · ConfigLoader · GitHubIssueAdapter         │    │
│  │  TemplateRenderer                                           │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  Use Cases                                           │   │    │
│  │  │  BuildSquadContext · SummarizeContent                │   │    │
│  │  │  VetTasksWithTeam · CreateIssuesFromTasks            │   │    │
│  │  │  InstallBridge · SyncLearnings                       │   │    │
│  │  │                                                      │   │    │
│  │  │  ┌──────────────────────────────────────────────┐   │   │    │
│  │  │  │  Entities (Core)                             │   │   │    │
│  │  │  │  ContextSummary · SkillEntry · DecisionEntry │   │   │    │
│  │  │  │  LearningEntry · BridgeConfig                │   │   │    │
│  │  │  │  DesignReviewRecord · InstallManifest        │   │   │    │
│  │  │  └──────────────────────────────────────────────┘   │   │    │
│  │  │         ▲ dependencies point inward only            │   │    │
│  │  └─────────┼───────────────────────────────────────────┘   │    │
│  │            ▲                                                │    │
│  └────────────┼────────────────────────────────────────────────┘    │
│               ▲                                                     │
└───────────────┼─────────────────────────────────────────────────────┘
```

**The Dependency Rule**: Every arrow points inward. `SquadFileReader` imports `SkillEntry` — never the reverse. `BuildSquadContext` calls the `SquadStateReader` interface — it never imports `fs` or `gray-matter`. `CLIAdapter` calls `BuildSquadContext` — the use case doesn't know it was invoked from a CLI.

### Crossing Boundaries — Dependency Inversion

Use cases define **port interfaces** (TypeScript interfaces) for any I/O they need:

```typescript
// Defined in use-cases layer (src/bridge/ports.ts)
interface SquadStateReader {
  readSkills(): Promise<SkillEntry[]>;
  readDecisions(): Promise<DecisionEntry[]>;
  readLearnings(): Promise<LearningEntry[]>;
}

interface ContextWriter {
  write(summary: ContextSummary): Promise<void>;
}
```

Adapters **implement** these interfaces using framework-specific code:

```typescript
// Defined in adapter layer (src/bridge/adapters/squad-file-reader.ts)
class SquadFileSystemReader implements SquadStateReader {
  async readSkills(): Promise<SkillEntry[]> {
    // Uses fs, glob, gray-matter — frameworks stay here
  }
}
```

**Data crossing boundaries**: Only plain entity objects cross layer boundaries. Never pass `fs.Stats`, `gray-matter` output, or Octokit response objects into use cases. Convert to entities at the adapter boundary.

### Module Mapping to Existing Project Structure

The existing domain-based structure (`src/bridge/`, `src/install/`, `src/review/`) works with Clean Architecture by separating concerns *within* each module:

```text
src/
├── types.ts                    # ENTITIES — pure types, no imports
├── bridge/
│   ├── ports.ts                # USE CASE — port interfaces
│   ├── context.ts              # USE CASE — BuildSquadContext orchestration
│   ├── summarizer.ts           # USE CASE — SummarizeContent (pure logic)
│   ├── parser.ts               # ADAPTER — MarkdownFrontmatterParser
│   └── adapters/
│       ├── squad-file-reader.ts  # ADAPTER — implements SquadStateReader
│       └── speckit-writer.ts     # ADAPTER — implements ContextWriter
├── install/
│   ├── installer.ts            # USE CASE + ADAPTER (split if complex)
│   └── templates/              # FRAMEWORK detail (template files)
├── review/
│   └── ceremony.ts             # USE CASE + ADAPTER (split if complex)
└── cli/
    └── index.ts                # FRAMEWORK/DRIVER — commander setup + CLIAdapter
```

### Testing Each Layer

| Layer | Testing Strategy | Dependencies in Tests |
|-------|-----------------|----------------------|
| **Entities** | Pure unit tests. Validate construction, defaults, scoring logic. | None — entities have no deps |
| **Use Cases** | Unit tests with **in-memory fakes** implementing port interfaces. No file system, no network. | Fake implementations of ports |
| **Adapters** | Integration tests with **real files** in `tests/fixtures/`. Verify parsing, writing, format conversion. | `tests/fixtures/squad/` mock data |
| **End-to-End** | Full pipeline test: fixture files → CLI command → output files verified. | All layers integrated |

## Complexity Tracking

> No constitution violations. All design choices align with established principles.

## Phase Planning — Documentation Site (US7)

User Story 7 adds a GitHub Pages documentation site deployed from the `docs/` directory on the main branch. The site uses Jekyll (GitHub Pages default) with minimal configuration.

**Scope**: Installation guide, usage guide with runnable CLI examples, architecture overview covering Clean Architecture layers and the knowledge flow loop.

**Approach**: Static markdown pages in `docs/` with a `_config.yml` for Jekyll. Auto-deployed by GitHub Pages from the `docs/` folder on `main`. No custom build step — GitHub Pages handles Jekyll natively.

**Phase placement**: After all P1 stories and alongside other P2 stories (US4, US5). Documentation can be written once the CLI commands are stable (post-US1/US2/US3).
