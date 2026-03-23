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

## Complexity Tracking

> No constitution violations. All design choices align with established principles.
