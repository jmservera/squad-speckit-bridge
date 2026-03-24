# Dinesh — History

## Core Context

- **Role:** Integration Engineer & Phase Execution Lead
- **Domain:** Project scaffolding, entity design, demo feature implementation
- **Current Focus:** E2E demo script for framework research validation
- **Key Deliverables:**
  - Phase 1 scaffolding: Domain-based directory structure (`src/bridge/`, `src/install/`, `src/review/`, `src/cli/`), test mirroring, `.gitkeep` tracking
  - Phase 2 entities: 10 entity types + 6 port interfaces + pure functions (all zero I/O, zero external imports)
  - Phase 3 use cases: `installBridge`, `checkStatus` with clean architecture patterns
  - Phase 3 adapters: FileSystemFrameworkDetector, FileSystemDeployer, ConfigFileLoader, manifest tracking
  - Demo T001-T002: Entity types for all artifacts + integration patterns
- **Key Patterns:**
  - Entity types as plain interfaces (no classes, no inheritance) — maximally composable + serializable
  - Union literal types enforce domain constraints at compile time (ReviewSeverity, ReviewFindingType, ApprovalStatus)
  - Pure functions design: `isValidConfig()`, `computeRelevanceScore()` (exponential decay), severity helpers
  - Port interfaces: capability-named (SquadStateReader not SquadFileReader), async-first design, data-shape focus
  - Adapter patterns: FileSystemDeployer manages manifest persistence (adapter concern, not use case); ConfigFileLoader implements resolution chain
  - Testing: Factory helpers with spread overrides (makeConfig, makeDecision, makeFinding); temp dir isolation for filesystem tests
- **Status:** Demo feature directory + entity types complete; E2E demo script ready for execution

## Learnings

### 2026-03-23: T001-T002 — Demo Feature Structure & Entity Types

**T001 - Demo Feature Directory Structure (Issue #205):**
- Created `src/demo/` and `src/demo/adapters/` for source code
- Created `tests/demo/` and `tests/demo/adapters/` for unit/integration tests
- Created `tests/e2e/` for end-to-end tests
- Used `.gitkeep` files in empty directories (consistent with Phase 1 scaffolding pattern)

**T002 - Demo Entity Types Definition (Issue #206):**
- Defined all entity types in `src/demo/entities.ts` following Clean Architecture entity layer principles:
  - **Enums:** StageStatus (pending/running/success/failed), ArtifactType (spec/plan/tasks/review)
  - **Interfaces:** DemoFlags, DemoConfiguration, PipelineStage, DemoArtifact, ArtifactSummary, ExecutionReport
- All fields documented with JSDoc comments matching `specs/003-e2e-demo-script/data-model.md`
- Pattern Applied: Pure domain types with no dependencies — entity layer design principle

### 2025-07-24: Phase 1 Setup — Project Scaffolding Patterns

**T001 - Clean Architecture Directory Structure:**
- Domain-based top-level: `src/bridge/`, `src/install/`, `src/review/`, `src/cli/` (each gets own `adapters/` subdirectory)
- Test dirs mirror layers: `tests/unit/`, `tests/integration/`, `tests/fixtures/` with `squad/` and `specify/` subdirs
- Empty dirs tracked with `.gitkeep` (git doesn't track empty directories)

**T002 - npm Project Setup:**
- `"type": "module"` essential for ESM (without it, Node16 module resolution fails with `.ts` → `.js`)
- `"bin"` points to `dist/cli/index.js` (compiled output), not source; CLI is outermost Clean Architecture layer
- Production deps (commander, gray-matter, glob) framework/driver layer only — never imported in entities/use cases

**T003-T004 - TypeScript + Vitest Config:**
- `module: "Node16"` + `moduleResolution: "Node16"` pair required for ESM (one without the other causes failures)
- `rootDir: "src"` + `outDir: "dist"` preserves structure in compiled output (needed for bin entry resolution)
- Vitest's `include: ['tests/**/*.test.ts']` keeps tests outside `src/` (clean separation)
- v8 coverage provider zero-config with Vitest (unlike istanbul)

**Learnings:**
- Sequential setup tasks (T001→T004) work well on single branch with individual commits per issue
- PR body references all closed issues: `Closes #2, closes #3, closes #4, closes #5` (GitHub auto-closes on merge)

### 2025-07-24: Phase 2 Foundational — Entity Design & Port Interface Patterns

**Entity Types (10 total):**
- All plain TypeScript interfaces (no classes, no constructors, no inheritance)
- Keeps entity layer maximally composable and serializable
- Union literal types (ReviewSeverity, ReviewFindingType, ApprovalStatus) enforce domain constraints at compile time

**Pure Function Design:**
- `isValidConfig()`: validates BridgeConfig with boundary checks (contextMaxBytes: 1–32768, recencyBiasWeight: 0.0–1.0, maxDecisionAgeDays: >0); returns boolean
- `computeRelevanceScore()`: exponential decay with 90-day half-life `e^(-ageDays * ln2 / 90)` (~0.5 at 90d, ~0.25 at 180d); unparseable dates return 0.5 (graceful degradation)
- Severity helpers use numeric order map instead of switch chains (cleaner, extensible, works with Array.sort())

**Port Interface Design (6 total):**
- SquadStateReader, ContextWriter, TasksReader, FrameworkDetector, FileDeployer, ConfigLoader
- Import ONLY from `../types.ts` — zero external dependencies
- All methods return `Promise<T>` — async-first design avoids breaking changes when adapters implemented
- Port names describe capability (SquadStateReader not SquadFileReader) — contract independent of adapter technology
- `FileDeployer.deploy()` takes `DeploymentFile[]`, returns `string[]` (deployed paths) — data shape, not filesystem details

**Testing Insight:**
- 41 tests across 6 describe blocks, zero mocks
- Factory helpers (makeConfig, makeDecision, makeFinding) with spread overrides make tests self-documenting
- `createDefaultConfig()` returning fresh object each call (mutation-tested) prevents shared-state bugs

**Git Pattern:**
- Git worktrees prevent branch conflicts when multiple agents work simultaneously
- Used `git worktree add /path squad/phase2-foundational` for parallel isolated work

### 2025-07-25: Phase 3 — US1 Installation Implementation (T011-T020)

**Use Case Patterns:**
- Use cases take port interfaces as function parameters (not class constructors) — keeps them pure async functions
- `installBridge` returns result object (`{ manifest, warnings }`) rather than throwing on partial success
- Degraded mode (one framework missing) produces warnings but succeeds — aligns with CLI exit code 0 for partial installs
- Use cases define own request/result types (InstallOptions, InstallResult) co-located in same file — boundary DTOs

**Adapter Patterns:**
- `FileSystemFrameworkDetector`: Single fs.stat() call behind port interface; `directoryExists` private method handles try/catch once
- `FileSystemDeployer`: Manages both file deployment AND manifest tracking; manifest is adapter concern, not use case concern; re-deploy preserves `installedAt` timestamp while updating `updatedAt`
- `ConfigFileLoader`: Resolution chain (explicit path → bridge.config.json → package.json → defaults) as sequential fallthrough; `mergeAndValidate` does shallow merge per section then validates result (catches invalid overrides early)

**CLI Wiring Patterns:**
- Composition root (`main.ts`) exports factory functions (createInstaller, createStatusChecker), not raw instances
- CLI calls factories which wire adapters internally — keeps CLI file (~100 LOC) focused on commander setup only
- Output formatting (human vs JSON) lives in composition root as private functions, not use cases
- Template loading uses `import.meta.url` for ESM-compatible path resolution (`__dirname` doesn't exist in ESM)

**Testing Insights:**
- Use case tests use `vi.fn().mockResolvedValue()` for port mocks (all async by design)
- Factory helpers keep tests concise with spread overrides
- Adapter integration tests create temp dirs via `os.tmpdir()` with random suffixes, clean up in `afterEach`
- Tests against real filesystem catch issues mocks would hide (directory creation, file encoding, JSON serialization)
- 36 new tests (8 installer, 7 status, 6 detector, 7 deployer, 8 config-loader) bring total to 77; zero flaky tests

### 2026-03-23: Squad vs Spec Kit Technical Compatibility Analysis

**Directory Analysis:**
- Squad: `.squad/` (team.md, routing.md, decisions.md, agents/{name}/charter.md+history.md, casting/, orchestration-log/, log/, skills/)
- Spec Kit: `.specify/` (memory/constitution.md, scripts/, templates/, init-options.json, extensions/), specs/NNN-feature/ directories
- No directory conflicts; `.squad/` and `.specify/` completely independent namespaces

**Shared Git Conflicts:**
- `.github/agents/` can coexist safely (Squad writes squad.agent.md, Spec Kit writes speckit.*.agent.md)
- Real conflict: `.github/copilot-instructions.md` written by both (needs section markers or merge script)
- `.github/workflows/` don't conflict (Squad uses squad-*.yml; Spec Kit uses release.yml, stale.yml, etc.)

**State & Runtime:**
- Squad state: decisions.md (merge=union), per-agent history.md (merge=union), drop-box/inbox for parallel writes
- Spec Kit state: constitution.md (project principles), specs/NNN/spec.md+plan.md+tasks.md (per-feature)
- Squad runtime: live multi-agent orchestrator on Copilot
- Spec Kit runtime: CLI scaffolder + shell scripts, agent-agnostic

**Integration Point:**
- Natural handoff: Spec Kit tasks.md → GitHub Issues (with squad label) → Squad's Ralph triage pipeline
- Bridge script estimated at ~100-150 lines
- Branch naming differs (squad/{issue}-{slug} vs NNN-short-name) but non-conflicting; convention needed

### 2026-03-24: Knowledge Feedback Gap Analysis — Reverse Sync

**Gilfoyle's Finding:** `squask sync` forward-only; no reverse enrichment. Agent histories contain learnings never fed back to specs.

**Proposed Solution:**
- Source: `.squad/agents/*/history.md` (timestamped entries), decisions.md, orchestration logs
- Target: New `specs/{id}/learnings.md` capturing implementation patterns, decisions, risks
- Cooldown: 24h default (avoid harvesting during active work), manual override allowed
- Privacy: Regex masking for secrets, PII stripping

**Architecture:** Entities (ReverseSyncOptions) → Use case (syncReverse) → Ports → Adapters → CLI (sync-reverse command). No Squad/Spec Kit core changes.

### 2026-03-23: Team Synthesis — Framework Research Complete

**Dinesh's Contribution:** Confirmed technical feasibility of pipeline integration model.
- Squad and Spec Kit can coexist safely with section markers + bridge script
- No framework modifications needed (additive approach)
- Handoff via tasks.md is nearly perfect integration boundary

**Consolidated Team Findings:**
- Frameworks are complementary (runtime vs planning layers)
- State accumulation (#1 risk) requires automatic pruning
- Progressive GitHub integration based on project type
- Constitutional governance scales better than distributed decisions
