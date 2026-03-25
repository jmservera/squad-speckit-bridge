# Implementation Plan: Fix CLI Version Display Inconsistency

**Branch**: `008-fix-version-display` | **Date**: 2025-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-fix-version-display/spec.md`

## Summary

All CLI version outputs (`squask -V`, install output, bridge manifest, status reports) display incorrect/stale hardcoded version strings (0.3.0 or 0.2.0) instead of the actual package version (0.3.1). The fix creates a single `getVersion()` utility in the entity layer that reads version from `package.json` at runtime, then threads the resolved version string through the composition root into every use case and adapter that displays or writes a version. No new ports, no new adapters — this is a wiring fix routed through existing Clean Architecture patterns.

## Technical Context

**Language/Version**: TypeScript 5.x, ES2022 target, Node16 module system  
**Primary Dependencies**: Commander.js (CLI), Vitest (testing), tsx (dev runner)  
**Storage**: File system — `.bridge-manifest.json` written during install  
**Testing**: Vitest (`npm test` = `vitest run`)  
**Target Platform**: Node.js (Linux/macOS/Windows)  
**Project Type**: CLI tool + npm library  
**Performance Goals**: N/A (version lookup is a single synchronous read at startup)  
**Constraints**: Must work in both built (`dist/`) and dev (`tsx`) modes  
**Scale/Scope**: ~4,700 LOC across 30+ source files, 48 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Dependency Rule** | ✅ PASS | Version reading uses `createRequire` from Node.js stdlib in the composition root (`main.ts`). No framework imports in entities or use cases. Version flows inward as a plain `string` parameter. |
| **II. Clean Architecture Layers** | ✅ PASS | No new layers. Entity layer (`types.ts`) already has `version: string` in `InstallManifest`. Use cases receive version as a function parameter. Composition root resolves the concrete value. |
| **III. Test-First by Layer** | ✅ PASS | Entity: pure validation tests for version string. Use case: mock version passed as parameter. Integration: verify manifest file contains correct version. E2E: verify `--version` output. |
| **IV. Simple Data Crosses Boundaries** | ✅ PASS | Version crosses boundaries as a plain `string`. No framework types, no `package.json` objects, no `Buffer`. |
| **V. Framework Independence** | ✅ PASS | `createRequire`/`readFileSync` is confined to `main.ts` (composition root, outermost layer). Swapping the version source requires changes only in `main.ts`. |

**Gate result: PASS — all five principles satisfied. No violations to track.**

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-version-display/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── cli-version.md   # CLI version contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files)

```text
src/
├── types.ts                          # Entity layer — add getVersion() utility
├── main.ts                           # Composition root — resolve version, pass to factories
├── cli/
│   └── index.ts                      # Framework layer — use resolved version for Commander
├── install/
│   ├── installer.ts                  # Use case — accept version parameter
│   ├── status.ts                     # Use case — accept version parameter
│   └── adapters/
│       └── file-deployer.ts          # Adapter — accept version parameter for manifest

tests/
├── unit/
│   ├── version.test.ts               # NEW — entity-layer version utility tests
│   ├── installer.test.ts             # UPDATE — pass version, verify propagation
│   └── status.test.ts                # UPDATE — pass version, verify propagation
├── integration/
│   └── file-deployer.test.ts         # UPDATE — verify manifest version
└── e2e/
    └── version-consistency.test.ts   # NEW — end-to-end version output verification
```

**Structure Decision**: Single project (existing). No new directories needed. All changes fit within the established Clean Architecture layout.

## Complexity Tracking

> No violations. All changes follow existing patterns. No complexity justification needed.
