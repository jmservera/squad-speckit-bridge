# Implementation Plan: Knowledge Feedback Loop (Reverse Sync)

**Branch**: `009-knowledge-feedback-loop` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/009-knowledge-feedback-loop/spec.md`

## Summary

Implement a reverse sync mechanism (`squask sync-reverse`) that reads Squad implementation state (agent histories, decisions, skills) and writes a structured `learnings.md` to the spec directory and optionally enriches the project constitution with spec/plan-level non-negotiables. The system applies fingerprint-based deduplication (existing DJB2 pattern), regex-based privacy filtering (secrets + PII), and a classification gate (FR-004a) to separate constitution-worthy principles from implementation-detail learnings. Phase 1 is a manual ceremony — no automation hooks.

## Technical Context

**Language/Version**: TypeScript 5.9, ES2022 target, ESM (`"type": "module"`)  
**Primary Dependencies**: commander 14.x (CLI), glob 13.x (file discovery), gray-matter 4.x (markdown frontmatter)  
**Storage**: File-based (markdown output, JSON state files: `.bridge-sync-reverse.json`)  
**Testing**: vitest 4.x (`npm test` / `vitest run`)  
**Target Platform**: Node.js 20+ (Linux, macOS, Windows)  
**Project Type**: CLI tool + library (`squask` / `sqsk` binary)  
**Performance Goals**: <30s for typical project with 5 agents and 50 learning entries (SC-001)  
**Constraints**: Privacy filtering MUST catch 100% of common secret/PII patterns before any disk write  
**Scale/Scope**: Single-project CLI; agent histories up to 12KB each, decisions files up to 475KB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Dependency Rule** | ✅ PASS | New entity types in `types.ts` (zero imports). Use case `sync-reverse.ts` imports only from `types.ts` and port interfaces. All `fs`, `glob`, `gray-matter` usage confined to adapter files under `src/sync/adapters/`. |
| **II. Clean Architecture Layers** | ✅ PASS | Entities → `src/types.ts`. Use case → `src/sync/sync-reverse.ts`. Ports → defined in use case file (mirrors `sync-learnings.ts` pattern). Adapters → `src/sync/adapters/`. CLI → `src/cli/index.ts`. Composition → `src/main.ts`. |
| **III. Test-First by Layer** | ✅ PASS | Unit tests for entity functions (privacy filter, classifier, fingerprinting, markdown generator). Use case tests with mocked ports. Integration tests for adapters against fixture files. E2E test for full `sync-reverse` command. |
| **IV. Simple Data Crosses Boundaries** | ✅ PASS | All port signatures accept/return DTOs and primitives only. No `Buffer`, `GrayMatterFile`, or `ReadStream` in port interfaces. `ReverseSyncOptions` and `ReverseSyncResult` are plain objects. |
| **V. Framework Independence** | ✅ PASS | `fs/promises`, `commander`, `gray-matter` confined to adapters and CLI layer. Replacing `gray-matter` with `remark-frontmatter` would only change adapter implementations. |

**Result: All gates pass. No violations. No complexity tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/009-knowledge-feedback-loop/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Gilfoyle's architecture research (complete, 800 lines)
├── squad-context.md     # Project context snapshot (complete)
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — developer onboarding
├── contracts/           # Phase 1 output — CLI + output format contracts
│   ├── cli-sync-reverse.md
│   └── learnings-format.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── types.ts                          # Entity layer: new types + pure functions
│   ├── ReverseSyncOptions            # (new) Config DTO for reverse sync
│   ├── ReverseSyncResult             # (new) Outcome DTO
│   ├── ReverseSyncState              # (new) Persistent state entity
│   ├── LearningClassification        # (new) 'constitution-worthy' | 'learnings-only'
│   ├── PrivacyFilterResult           # (new) Redaction result DTO
│   ├── applyPrivacyFilter()          # (new) Regex-based secret/PII masking
│   ├── classifyLearning()            # (new) FR-004a classification gate
│   ├── generateLearningsMarkdown()   # (new) Structured markdown builder
│   └── computeLearningFingerprint()  # (existing, reused from sync-learnings.ts)
│
├── sync/
│   ├── sync-learnings.ts             # (existing) Forward sync use case — unchanged
│   ├── sync-reverse.ts               # (new) Reverse sync use case + port interfaces
│   └── adapters/
│       ├── sync-state-adapter.ts     # (existing) Forward sync state — unchanged
│       ├── agent-history-reader.ts   # (existing) History extraction — unchanged
│       ├── constitution-adapter.ts   # (existing) Constitution writer — unchanged
│       ├── reverse-sync-state-adapter.ts  # (new) Reads/writes .bridge-sync-reverse.json
│       ├── learning-extractor.ts     # (new) Reads histories, decisions, skills
│       └── spec-learnings-writer.ts  # (new) Writes specs/{id}/learnings.md
│
├── cli/
│   └── index.ts                      # (modify) Add sync-reverse subcommand
│
└── main.ts                           # (modify) Add createReverseSyncer() factory

tests/
├── unit/
│   ├── privacy-filter.test.ts        # (new) Entity: secret/PII masking
│   ├── learning-classifier.test.ts   # (new) Entity: FR-004a classification gate
│   ├── learnings-markdown.test.ts    # (new) Entity: markdown generation
│   └── sync-reverse.test.ts          # (new) Use case: mocked ports
├── integration/
│   ├── reverse-sync-state.test.ts    # (new) Adapter: JSON state persistence
│   ├── learning-extractor.test.ts    # (new) Adapter: history/decision/skill parsing
│   └── spec-learnings-writer.test.ts # (new) Adapter: markdown file writing
├── e2e/
│   └── sync-reverse.test.ts          # (new) Full pipeline test
└── fixtures/
    └── reverse-sync/                 # (new) Test fixture files
        ├── squad/                    # Mock .squad/ directory structure
        │   ├── agents/gilfoyle/history.md
        │   ├── agents/dinesh/history.md
        │   ├── decisions.md
        │   └── skills/clean-architecture-bridge/SKILL.md
        └── specs/001-test/           # Mock spec directory
            └── tasks.md
```

**Structure Decision**: Follows existing single-project layout with Clean Architecture layers. New reverse sync code lives alongside forward sync in `src/sync/` module (shared domain). New adapters in `src/sync/adapters/` (3 new files). Entity additions in `src/types.ts` (4 new types + 3 new pure functions). Mirrors `sync-learnings.ts` → `createSyncer()` pattern with `sync-reverse.ts` → `createReverseSyncer()`.

## Design Decisions

### D1: `computeLearningFingerprint` Sharing Strategy

**Decision**: Import `computeLearningFingerprint` from `sync-learnings.ts` into `sync-reverse.ts` (use case → use case import, same layer).

**Rationale**: The function is pure (no I/O, deterministic) and both use cases need identical fingerprinting. Duplicating it violates DRY. Promoting it to `types.ts` is an option but would change the existing module's exports — unnecessary churn for Phase 1.

**Alternative rejected**: Duplicating the function in `sync-reverse.ts` — creates divergence risk.

### D2: Separate State File for Reverse Sync

**Decision**: Use `.bridge-sync-reverse.json` (not share `.bridge-sync.json` with forward sync).

**Rationale**: Forward and reverse sync have different state schemas, different fingerprint sets, and different lifecycle. Sharing would create coupling between independent features. Separate files mean either can be cleared/reset without affecting the other.

### D3: Privacy Filter in Entity Layer

**Decision**: `applyPrivacyFilter()` is a pure function in `src/types.ts` (entity layer).

**Rationale**: Privacy filtering is a core business rule — secrets must never reach disk. Being pure (regex-only, no I/O) qualifies it for entity layer. This also makes it trivially unit-testable with zero mocks.

### D4: Classification Gate (FR-004a) is Keyword-Based

**Decision**: Use keyword heuristics for constitution-worthy vs learnings-only classification. No LLM involvement.

**Rationale**: Phase 1 is manual ceremony — operator reviews output via `--dry-run` before committing. Keyword heuristics are transparent, deterministic, fast, and testable. Conservative default (`learnings-only`) prevents constitution bloat. LLM-based classification can be explored in Phase 2.

### D5: Append-Only for Constitution and Learnings

**Decision**: Never overwrite existing content. Append new entries only.

**Rationale**: Both `learnings.md` and `constitution.md` are append-only artifacts. This prevents data loss across multiple runs and supports idempotency via fingerprint deduplication.

## Post-Design Constitution Re-Check

*Re-checked after Phase 1 design artifacts are complete.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| **I. Dependency Rule** | ✅ PASS | `sync-reverse.ts` imports from `types.ts`, `bridge/ports.ts`, and `sync-learnings.ts` (all same or inner layers). Adapters import `node:fs/promises` + port types. No outward dependencies. |
| **II. Clean Architecture Layers** | ✅ PASS | 5 new types in entity layer. 1 new use case in use case layer. 3 new adapters in adapter layer. 1 new CLI command in driver layer. 1 new factory in composition root. Each in correct directory. |
| **III. Test-First by Layer** | ✅ PASS | 3 entity unit test files. 1 use case unit test file (mocked ports). 3 adapter integration test files. 1 E2E test file. Fixture directory defined. |
| **IV. Simple Data Crosses Boundaries** | ✅ PASS | Port interfaces accept/return DTOs: `ReverseSyncOptions`, `ExtractedReverseLearning[]`, `ReverseSyncResult`, `ReverseSyncState`. No framework types in signatures. |
| **V. Framework Independence** | ✅ PASS | `fs/promises` and `gray-matter` confined to adapters. `commander` confined to CLI. Pure functions in entity layer have zero imports. |

**Result: All gates pass post-design. Design is constitution-compliant.**

## Complexity Tracking

> No violations detected. All five constitutional principles are satisfied without exceptions.
