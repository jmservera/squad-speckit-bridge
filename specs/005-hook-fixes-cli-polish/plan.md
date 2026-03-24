# Implementation Plan: Hook Fixes and CLI Polish (v0.3.1)

**Branch**: `005-hook-fixes-cli-polish` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-hook-fixes-cli-polish/spec.md`

## Summary

Fix three P0 bugs that caused 0% bridge pipeline adoption in v0.3.0: (1) two of three hook templates lack executable permissions, (2) the after-tasks hook only prints a reminder instead of automating issue creation, and (3) one hook uses the scoped package name `@jmservera/squad-speckit-bridge` while others use the unscoped name — causing failures when only the short alias is on PATH. Additionally, complete demo command API documentation and verify Clean Architecture compliance. All changes are confined to hook template shell scripts (`src/install/templates/hooks/`), the file deployer adapter, and documentation files — no entity or use case layer modifications required.

## Technical Context

**Language/Version**: TypeScript (ES2022 target), Node.js ≥ 18  
**Primary Dependencies**: commander 14.0.3, glob 13.0.6, gray-matter 4.0.3  
**Storage**: File system (Markdown, JSON, YAML files)  
**Testing**: Vitest 4.1.0 (`npx vitest run`), Build: `npm run build`  
**Target Platform**: Node.js CLI tool / npm package (cross-platform)  
**Project Type**: CLI tool + npm library (bridge between Squad and SpecKit)  
**Performance Goals**: N/A (CLI tool, not a service)  
**Constraints**: Hooks must execute in < 1s for non-network operations; graceful failure required  
**Scale/Scope**: ~4000 LOC across 25 source files, 60+ test files, 3 hook templates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I: The Dependency Rule** | ✅ PASS | Changes target shell scripts in `src/install/templates/hooks/` and the `FileSystemDeployer` adapter. No entity or use case imports are affected. The deployer adapter (`src/install/adapters/file-deployer.ts`) already uses `node:fs/promises` — a framework dependency correctly confined to Layer 2 (Adapters). |
| **II: Clean Architecture Layers** | ✅ PASS | Four layers confirmed: Entities (`src/types.ts`), Use Cases (`src/{bridge,review,demo,issues,sync,install}/*.ts`), Adapters (`src/*/adapters/*.ts`), Frameworks (`commander`, `fs`, `gray-matter`, `glob`). This feature modifies only Layer 2 (deployer adapter) and Layer 3 (hook templates are framework-level scripts). |
| **III: Test-First by Layer** | ✅ PASS | Existing tests cover all layers: unit tests for entities/use cases (`tests/unit/`), integration tests for adapters (`tests/integration/`), E2E tests for workflows (`tests/e2e/`). New tests will follow the same pattern: integration tests for file-deployer permission changes, unit tests for hook content validation. |
| **IV: Simple Data Crosses Boundaries** | ✅ PASS | No new boundary crossings introduced. Hook templates are deployed as `DeploymentFile` DTOs (targetPath + content string). The existing `deployExecutable()` interface already handles permission setting. |
| **V: Framework Independence** | ✅ PASS | Hook scripts are shell scripts (framework-level). The deployer adapter's `chmod 0o755` uses `node:fs/promises` — confined to the adapter layer. Swapping the file system library requires changing only `file-deployer.ts`. |

**Gate Result**: ✅ ALL FIVE PRINCIPLES PASS — Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-hook-fixes-cli-polish/
├── plan.md              # This file
├── squad-context.md     # Squad team context (pre-generated)
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Entity/data model analysis
├── quickstart.md        # Phase 1: Implementation quickstart
├── contracts/           # Phase 1: Hook script contracts
│   └── hook-scripts.md  # Hook template behavioral contracts
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (affected files)

```text
src/
├── install/
│   ├── templates/
│   │   └── hooks/
│   │       ├── before-specify.sh    # FIX: Add +x permission in source
│   │       ├── after-tasks.sh       # FIX: Replace notification with automation + fix CLI alias
│   │       └── after-implement.sh   # FIX: Add +x permission in source
│   ├── installer.ts                 # USE CASE: May need config flag for auto-issues
│   └── adapters/
│       └── file-deployer.ts         # ADAPTER: Verify deployExecutable chmod behavior
├── types.ts                         # ENTITY: Check BridgeConfig for autoCreateIssues flag
└── cli/
    └── index.ts                     # DRIVER: No changes expected

docs/
├── api-reference.md                 # UPDATE: Complete demo command documentation
└── architecture.md                  # VERIFY: Post-change compliance documentation

tests/
├── unit/
│   └── installer.test.ts            # ADD: Hook permission validation tests
├── integration/
│   └── file-deployer.test.ts        # ADD: Permission preservation tests
└── e2e/                             # ADD: Hook execution E2E tests (optional)
```

**Structure Decision**: Existing Clean Architecture structure is preserved. All changes target the outermost two layers (Adapters and Frameworks/Drivers). No new directories needed.

## Complexity Tracking

> No constitution violations. All changes are confined to outer layers (Adapters + Frameworks).

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | — | — |

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design artifacts are complete.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| **I: The Dependency Rule** | ✅ PASS | The only entity-layer change is adding `autoCreateIssues: boolean` to `BridgeConfig` in `types.ts`. This is a pure data field addition with no outward import. All other changes are in Layer 2 (file-deployer adapter) and Layer 3 (hook templates, docs). No new outward dependencies. |
| **II: Clean Architecture Layers** | ✅ PASS | Changes map correctly to layers: `types.ts` → Entity (Layer 0), `file-deployer.ts` → Adapter (Layer 2), `hooks/*.sh` → Framework/Driver (Layer 3), `docs/*.md` → Documentation (outside code layers). No file crosses layer boundaries. |
| **III: Test-First by Layer** | ✅ PASS | Design specifies tests for each layer: `tests/unit/types.test.ts` for entity changes, `tests/integration/file-deployer.test.ts` for adapter behavior, and hook content validation tests. Existing test suite (60+ files) remains untouched. |
| **IV: Simple Data Crosses Boundaries** | ✅ PASS | The new `autoCreateIssues` field is a `boolean` primitive on an existing DTO. `DeploymentFile` (targetPath + content strings) continues to be the only data crossing the deployment boundary. No framework types leak across boundaries. |
| **V: Framework Independence** | ✅ PASS | No new framework dependencies introduced. Hook templates are shell scripts (Layer 3) that invoke the CLI binary. The `chmod(0o755)` call in `file-deployer.ts` uses `node:fs/promises` — already confined to the adapter layer. Replacing `fs` with another file system library would only require changing `file-deployer.ts`. |

**Post-Design Gate Result**: ✅ ALL FIVE PRINCIPLES PASS — Design is constitution-compliant.

## Design Decisions Summary

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| Use `squask` as canonical CLI alias in all hooks | Per spec assumption; locally installed packages resolve correctly via npx | [research.md#R2](./research.md) |
| Add `autoCreateIssues` config flag (default: true) | FR-008 requires configurable auto-issue creation; default true per spec assumptions | [data-model.md](./data-model.md) |
| Keep review notification in after-tasks hook | Useful developer feedback; spec doesn't ask for removal | [research.md#R3](./research.md) |
| Two-layer permission defense (git +x AND chmod) | Source correctness + runtime enforcement; defense-in-depth | [research.md#R1](./research.md) |
| Rely on existing `issues` command dedup for idempotency | Re-running after partial failure safely creates only remaining issues | [research.md#R6](./research.md) |
| Expand existing api-reference.md for demo docs | Consistency with other documented commands; single documentation source | [research.md#R4](./research.md) |
