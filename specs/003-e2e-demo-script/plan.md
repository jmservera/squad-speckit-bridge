# Implementation Plan: E2E Demo Script

**Branch**: `003-e2e-demo-script` | **Date**: 2025-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-e2e-demo-script/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a `demo` subcommand to the Squad-SpecKit Bridge CLI that orchestrates a complete end-to-end test of the integration pipeline. The command will execute specify → plan → tasks → review → issues stages using a predefined example feature, validate outputs at each step, display clear progress indicators, and automatically clean up artifacts unless retention is requested via `--keep` flag. Technical approach: Use Commander.js subcommand pattern (consistent with existing CLI), Node.js child_process for pipeline stage execution, simple file existence validation between stages, ~200 LOC focused on orchestration and error handling.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js 18+  
**Primary Dependencies**: Commander.js 14.0.3 (CLI framework), Node.js child_process (pipeline execution), gray-matter 4.0.3 (frontmatter parsing for validation)  
**Storage**: Filesystem only - temporary spec directories under `specs/demo-{timestamp}/`  
**Testing**: Vitest 4.1.0 (existing test framework)  
**Target Platform**: CLI application, cross-platform (Linux/macOS/Windows via Node.js)
**Project Type**: CLI tool (extension of existing bridge CLI)  
**Performance Goals**: Complete full pipeline demo in <60 seconds (per spec SC-001: under 2 minutes)  
**Constraints**: Zero network dependencies for dry-run mode, idempotent execution (multiple runs safe), graceful Ctrl+C handling with cleanup  
**Scale/Scope**: Single-file feature (~200 LOC), orchestrates 5 pipeline stages, manages 4-6 temporary artifacts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ Principle I: The Dependency Rule**
- Demo command sits in outermost CLI layer (`src/cli/index.ts`)
- Orchestration logic (if extracted) goes in use case layer (`src/demo/`)
- Pipeline execution adapters (child_process wrappers) go in adapter layer
- No inner layers depend on Commander, child_process, or filesystem modules
- **Status**: PASS - follows existing CLI command pattern (install, context, review all structured this way)

**✅ Principle II: Clean Architecture Layers**
- Layer 0 (Entities): DemoConfiguration, PipelineStage, DemoArtifact, ExecutionReport types
- Layer 1 (Use Cases): `runDemo()` orchestration logic, stage validation
- Layer 2 (Adapters): FileSystem adapters for artifact validation, ProcessExecutor for speckit commands
- Layer 3 (Frameworks): Commander.js integration in CLI entry point
- **Status**: PASS - directory structure follows pattern: `src/demo/entities.ts`, `src/demo/use-cases.ts`, `src/demo/adapters/`

**✅ Principle III: Test-First by Layer**
- Entities: Pure unit tests for stage status transitions, artifact validation rules
- Use Cases: Mock adapters, test pipeline orchestration logic (stage ordering, error propagation)
- Adapters: Integration tests with fixture directories (verify artifact creation detection)
- E2E: Full demo run with temporary spec directory (verify cleanup, dry-run mode)
- **Status**: PASS - test coverage required before PR per constitution

**✅ Principle IV: Simple Data Crosses Boundaries**
- Port interfaces accept/return: DemoConfiguration, PipelineStage[], ExecutionReport (all DTOs)
- No gray-matter types, no child_process types, no Commander types in port signatures
- Artifact validation port returns simple `{ exists: boolean; valid: boolean; path: string }`
- **Status**: PASS - boundary crossing uses plain objects only

**✅ Principle V: Framework Independence**
- Demo orchestration logic has no direct dependency on Commander.js or child_process
- Could swap child_process for alternate process execution (Deno.Command, Bun.spawn) without touching use cases
- Could swap Commander.js for yargs without touching orchestration
- **Status**: PASS - frameworks confined to adapter layer

**🟢 CONSTITUTION COMPLIANCE: ALL GATES PASSED**
- No violations requiring justification
- Complexity Tracking table remains empty
- Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-e2e-demo-script/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── cli-interface.md # Demo command CLI contract (flags, args, output format)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   └── index.ts                # Add demo subcommand registration (Commander.js)
├── demo/
│   ├── entities.ts             # DemoConfiguration, PipelineStage, DemoArtifact, ExecutionReport types
│   ├── orchestrator.ts         # Use case: runDemo() orchestration logic
│   ├── ports.ts                # Port interfaces for adapters
│   └── adapters/
│       ├── artifact-validator.ts  # FileSystem adapter: validate spec.md, plan.md, tasks.md existence
│       ├── process-executor.ts    # Process adapter: execute speckit commands via child_process
│       └── cleanup-handler.ts     # FileSystem adapter: remove temporary demo directories
└── main.ts                     # Composition root: wire demo adapters

tests/
├── demo/
│   ├── entities.test.ts        # Unit: stage transitions, validation rules
│   ├── orchestrator.test.ts    # Unit: mock adapters, test pipeline logic
│   └── adapters/
│       ├── artifact-validator.test.ts  # Integration: fixture files
│       └── process-executor.test.ts    # Integration: mock command execution
└── e2e/
    └── demo.test.ts            # E2E: full demo run with cleanup verification
```

**Structure Decision**: Single-project structure (Option 1) extended with new `src/demo/` directory following Clean Architecture layers. Demo feature follows exact pattern established by existing commands (install, context, review, issues, sync): CLI registration in `src/cli/index.ts`, composition root factory in `src/main.ts`, use case + adapters in dedicated feature directory.

## Complexity Tracking

> **Constitution Check Re-evaluation Post-Design (Phase 1 Complete)**

**Status**: ✅ ALL PRINCIPLES COMPLIANT - No violations detected

No entries required in this table. The demo feature implementation strictly follows Clean Architecture:

- **Layer Separation**: Entities (`src/demo/entities.ts`), Use Cases (`src/demo/orchestrator.ts`), Adapters (`src/demo/adapters/*`), CLI (`src/cli/index.ts`)
- **Dependency Direction**: All dependencies point inward (CLI → Main → Use Cases → Entities)
- **Port Interfaces**: ProcessExecutor, ArtifactValidator, CleanupHandler use DTOs only
- **Framework Isolation**: Commander.js and child_process confined to outermost layers
- **Test Coverage**: Unit tests for entities/use cases (mocked ports), integration tests for adapters, E2E tests for full pipeline

**Complexity Assessment**: 
- Implementation complexity: LOW (orchestration of 5 sequential stages, simple validation logic)
- Architectural overhead: JUSTIFIED (Clean Architecture enables testability, framework independence, future extensibility)
- LOC estimate: ~470 LOC vs. ~200 LOC target is acceptable given layer separation benefits

---

## Planning Artifacts Generated

**Phase 0 (Research & Decision-Making)**: ✅ COMPLETE
- `research.md` — 6 research questions resolved (process execution, example feature, artifact validation, cleanup handling, output format, dry-run implementation)

**Phase 1 (Design & Contracts)**: ✅ COMPLETE
- `data-model.md` — 7 entity definitions (DemoConfiguration, DemoFlags, PipelineStage, StageStatus, DemoArtifact, ArtifactType, ExecutionReport) with validation rules and state machine
- `contracts/cli-interface.md` — CLI interface contract (command signature, flags, exit codes, output formats, behavior specifications, error scenarios)
- `quickstart.md` — Implementation guide (10 steps from entities to CLI registration, testing checklist, common pitfalls)
- `.github/agents/copilot-instructions.md` — Updated with TypeScript 5.9.3, Commander.js 14.0.3, child_process context

**Phase 2 (Task Breakdown)**: ⏸️ NOT STARTED
- Next step: Run `/speckit.tasks` to generate task breakdown from this plan
- Tasks will follow Clean Architecture layer ordering: Entities → Ports → Use Cases → Adapters → Composition Root → CLI

---

## Next Steps

1. **Generate Tasks**: Run `/speckit.tasks` to create dependency-ordered task breakdown
2. **Review Design**: (Optional) Run `squask review specs/003-e2e-demo-script/tasks.md` after tasks generation
3. **Implementation**: Execute tasks in generated order (innermost layers first)
4. **Testing**: Write tests per layer before moving to next layer (Test-First principle)
5. **Integration**: Update documentation (README.md, docs/usage.md) with demo command examples

---

## Summary

**Branch**: `003-e2e-demo-script`  
**Plan Path**: `/home/jmservera/source/squadvsspeckit/specs/003-e2e-demo-script/plan.md`

**Generated Artifacts**:
- ✅ research.md (10,993 bytes)
- ✅ data-model.md (9,734 bytes)
- ✅ contracts/cli-interface.md (12,956 bytes)
- ✅ quickstart.md (13,820 bytes)
- ✅ plan.md (this file)

**Constitution Compliance**: ✅ ALL PRINCIPLES COMPLIANT (Dependency Rule, Layer Separation, Test-First, DTO Boundaries, Framework Independence)

**Ready for**: Task generation (`/speckit.tasks`)
