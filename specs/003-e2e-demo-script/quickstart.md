# Quickstart: E2E Demo Script

**Feature**: 003-e2e-demo-script | **Audience**: Developers implementing the demo command

## Overview

This guide walks you through implementing the E2E demo script feature in ~30 minutes. You'll create a new `demo` subcommand that orchestrates the Squad-SpecKit integration pipeline.

---

## Prerequisites

- TypeScript 5.9.3 and Node.js 18+ installed
- Familiarity with the existing bridge CLI structure (`src/cli/index.ts`, `src/main.ts`)
- Understanding of Clean Architecture layers (entities → use cases → adapters → CLI)

---

## Implementation Steps

### Step 1: Define Entity Types (Layer 0)

**File**: `src/demo/entities.ts`

**What to create**:
- `DemoConfiguration` interface (flags, paths, example feature description)
- `DemoFlags` interface (dryRun, keep, verbose)
- `PipelineStage` interface (name, status, timing, artifact path)
- `StageStatus` enum (pending, running, success, failed)
- `DemoArtifact` interface (path, type, validation status)
- `ExecutionReport` interface (summary, timing, cleanup status)

**Key rules**:
- ZERO imports from external packages (pure types only)
- No I/O logic, no business logic, just data structures
- Use `readonly` modifiers for immutability where appropriate

**Reference**: See `data-model.md` for complete field definitions

---

### Step 2: Define Port Interfaces (Layer 1)

**File**: `src/demo/ports.ts`

**What to create**:
```typescript
export interface ProcessExecutor {
  run(command: string, args: string[], options: RunOptions): Promise<ProcessResult>;
}

export interface ArtifactValidator {
  validate(artifactPath: string, expectedType: ArtifactType): Promise<ValidationResult>;
}

export interface CleanupHandler {
  cleanup(demoDir: string): Promise<void>;
}
```

**Key rules**:
- Port interfaces accept/return only DTOs or primitives (no framework types)
- Method signatures must be testable with mocks
- No implementation details (those go in adapters)

**Why**: Dependency Inversion Principle — use cases depend on interfaces, adapters implement them

---

### Step 3: Implement Use Case Orchestration (Layer 1)

**File**: `src/demo/orchestrator.ts`

**What to create**:
```typescript
export async function runDemo(
  config: DemoConfiguration,
  ports: {
    processExecutor: ProcessExecutor;
    artifactValidator: ArtifactValidator;
    cleanupHandler: CleanupHandler;
  }
): Promise<ExecutionReport> {
  // 1. Create demo directory
  // 2. Define pipeline stages
  // 3. For each stage:
  //    a. Execute command via processExecutor
  //    b. Validate artifact via artifactValidator
  //    c. Update stage status
  //    d. If failure, halt pipeline
  // 4. Generate ExecutionReport
  // 5. Cleanup if !config.flags.keep
}
```

**Key logic**:
- Sequential stage execution (not parallel)
- Halt on first failure
- Calculate elapsed time for each stage
- Register SIGINT handler for cleanup on interrupt

**Testing**: Mock all ports, verify stage ordering, error propagation, cleanup logic

---

### Step 4: Implement Process Executor Adapter (Layer 2)

**File**: `src/demo/adapters/process-executor.ts`

**What to create**:
```typescript
import { spawn } from 'node:child_process';
import type { ProcessExecutor, ProcessResult, RunOptions } from '../ports.js';

export class NodeProcessExecutor implements ProcessExecutor {
  async run(command: string, args: string[], options: RunOptions): Promise<ProcessResult> {
    // Wrap child_process.spawn()
    // Capture stdout/stderr
    // Handle exit codes, timeouts, errors
  }
}
```

**Key details**:
- Use `spawn()` not `exec()` (better for streaming output)
- Set timeout (30s default)
- Handle process errors, non-zero exit codes
- Return structured result (exitCode, stdout, stderr)

**Testing**: Integration tests with fixture scripts (e.g., echo commands)

---

### Step 5: Implement Artifact Validator Adapter (Layer 2)

**File**: `src/demo/adapters/artifact-validator.ts`

**What to create**:
```typescript
import { readFile, stat } from 'node:fs/promises';
import matter from 'gray-matter';
import type { ArtifactValidator, ValidationResult } from '../ports.js';

export class FileSystemArtifactValidator implements ArtifactValidator {
  async validate(artifactPath: string, expectedType: ArtifactType): Promise<ValidationResult> {
    // Check file exists
    // Check file size > 0
    // Parse frontmatter with gray-matter
    // Check required sections based on expectedType
  }
}
```

**Key details**:
- Validate existence, non-empty content, frontmatter structure, required sections
- Return specific error messages for debugging
- Use existing `gray-matter` dependency (no new dependencies)

**Testing**: Integration tests with fixture markdown files

---

### Step 6: Implement Cleanup Handler Adapter (Layer 2)

**File**: `src/demo/adapters/cleanup-handler.ts`

**What to create**:
```typescript
import { rm } from 'node:fs/promises';
import type { CleanupHandler } from '../ports.js';

export class FileSystemCleanupHandler implements CleanupHandler {
  async cleanup(demoDir: string): Promise<void> {
    // Delete directory recursively
    // Handle errors gracefully (already deleted, permission denied)
  }
}
```

**Key details**:
- Use `fs.rm(path, { recursive: true, force: true })` (Node.js 14+)
- Never throw on cleanup failure (log warning instead)
- Verify path is under `specs/` (safety check)

**Testing**: Integration tests with temporary directories

---

### Step 7: Wire Adapters in Composition Root (Layer 3)

**File**: `src/main.ts`

**What to add**:
```typescript
import { NodeProcessExecutor } from './demo/adapters/process-executor.js';
import { FileSystemArtifactValidator } from './demo/adapters/artifact-validator.js';
import { FileSystemCleanupHandler } from './demo/adapters/cleanup-handler.js';
import { runDemo } from './demo/orchestrator.js';

export function createDemoRunner(options: DemoRunnerOptions) {
  const processExecutor = new NodeProcessExecutor();
  const artifactValidator = new FileSystemArtifactValidator();
  const cleanupHandler = new FileSystemCleanupHandler();

  return {
    async run(flags: DemoFlags) {
      const config = buildDemoConfig(flags, options);
      return runDemo(config, { processExecutor, artifactValidator, cleanupHandler });
    }
  };
}
```

**Key details**:
- Follow existing pattern (see `createInstaller`, `createReviewer`)
- Return object with `run()` method
- Keep composition logic simple (just wiring, no business logic)

---

### Step 8: Register CLI Subcommand (Layer 3)

**File**: `src/cli/index.ts`

**What to add**:
```typescript
program
  .command('demo')
  .description('Run end-to-end demo of Squad-SpecKit integration pipeline')
  .option('--dry-run', 'Simulate GitHub issue creation without API calls', false)
  .option('--keep', 'Preserve demo artifacts after completion', false)
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;
    const verbose = globalOpts.verbose as boolean;

    try {
      const runner = createDemoRunner({ configPath: globalOpts.config });
      const result = await runner.run({
        dryRun: cmdOpts.dryRun,
        keep: cmdOpts.keep,
        verbose
      });

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = result.success ? 0 : 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'demo', jsonOutput);
      process.exitCode = 1;
    }
  });
```

**Key details**:
- Follow existing pattern (see `install`, `review` commands)
- Inherit global flags (--json, --quiet, --verbose)
- Use structured error handling (emitError function)

---

### Step 9: Add Output Formatting

**Files**: `src/demo/orchestrator.ts` (or new `src/demo/formatter.ts`)

**What to create**:
```typescript
function formatHumanOutput(report: ExecutionReport): string {
  // Build emoji-decorated output
  // Show stage progress (⏳, ✓, ✗)
  // Display artifact paths, timing, cleanup status
  // Include next steps suggestions
}

function formatJsonOutput(report: ExecutionReport): object {
  // Convert ExecutionReport to JSON schema
  // Include all stages, artifacts, timing, flags
}
```

**Key details**:
- Use UTF-8 emoji (🚀, ⏳, ✓, ✗, ❌, 📖)
- Format elapsed time (e.g., "3.1s", "15.4s")
- Format file sizes (e.g., "1.2 KB", "4.5 KB")
- Provide helpful next steps (run with --keep, run without --dry-run)

**Reference**: See `contracts/cli-interface.md` for exact output format

---

### Step 10: Write Tests (All Layers)

**Test files**:
- `tests/demo/entities.test.ts` — Unit tests for validation rules, state transitions
- `tests/demo/orchestrator.test.ts` — Unit tests with mocked ports
- `tests/demo/adapters/process-executor.test.ts` — Integration tests
- `tests/demo/adapters/artifact-validator.test.ts` — Integration tests with fixtures
- `tests/e2e/demo.test.ts` — Full demo run with temporary directories

**Coverage targets**:
- Entities: 100% (pure functions, no I/O)
- Use cases: 90% (cover happy path, error paths, interrupts)
- Adapters: 80% (cover main behaviors, edge cases)
- E2E: Smoke test (verify demo completes successfully)

**Run tests**: `npm test`

---

## Expected File Structure (After Implementation)

```
src/
├── cli/
│   └── index.ts          # +50 LOC (demo subcommand registration)
├── demo/
│   ├── entities.ts       # +80 LOC (types, interfaces)
│   ├── ports.ts          # +30 LOC (port interfaces)
│   ├── orchestrator.ts   # +120 LOC (use case logic)
│   └── adapters/
│       ├── process-executor.ts    # +60 LOC
│       ├── artifact-validator.ts  # +80 LOC
│       └── cleanup-handler.ts     # +30 LOC
└── main.ts               # +20 LOC (createDemoRunner factory)

Total: ~470 LOC (target was ~200 LOC, actual is reasonable for clean architecture)
```

**Note**: LOC estimate is higher than initial ~200 LOC spec due to Clean Architecture separation. The actual complexity is equivalent (orchestration + adapters = ~200 LOC, types/ports = overhead for testability).

---

## Common Pitfalls

### ❌ Don't: Import Commander.js in Use Case Layer
```typescript
// WRONG: src/demo/orchestrator.ts
import { Command } from 'commander'; // Violates Dependency Rule
```

**✅ Do**: Keep Commander.js in CLI layer only
```typescript
// CORRECT: src/cli/index.ts
import { Command } from 'commander';
```

---

### ❌ Don't: Call child_process Directly in Use Case
```typescript
// WRONG: src/demo/orchestrator.ts
import { spawn } from 'node:child_process';
const result = spawn('speckit', ['specify']);
```

**✅ Do**: Use ProcessExecutor port
```typescript
// CORRECT: src/demo/orchestrator.ts
const result = await ports.processExecutor.run('speckit', ['specify'], {});
```

---

### ❌ Don't: Pass gray-matter Types Across Boundaries
```typescript
// WRONG: port interface
export interface ArtifactValidator {
  validate(path: string): Promise<GrayMatterFile>; // Framework type leaked
}
```

**✅ Do**: Return simple DTOs
```typescript
// CORRECT: port interface
export interface ArtifactValidator {
  validate(path: string): Promise<ValidationResult>; // DTO only
}
```

---

## Verification Checklist

Before submitting PR:

- [ ] All entity types in `src/demo/entities.ts` have zero external imports
- [ ] Port interfaces in `src/demo/ports.ts` use DTOs only (no framework types)
- [ ] Use case `runDemo()` has no direct filesystem or child_process calls
- [ ] Adapters are in `src/demo/adapters/` directory
- [ ] Composition root `createDemoRunner()` added to `src/main.ts`
- [ ] CLI subcommand registered in `src/cli/index.ts`
- [ ] Tests pass: `npm test`
- [ ] Demo runs successfully: `npm run dev demo --dry-run`
- [ ] Artifacts cleaned up after run (unless `--keep` used)
- [ ] `--json` flag produces valid JSON output
- [ ] Constitution Check passes (all 5 principles compliant)

---

## Next Steps

After implementing:

1. **Manual Testing**:
   ```bash
   npm run build
   npm run dev demo --dry-run --keep
   # Inspect specs/demo-*/
   ```

2. **Verify Cleanup**:
   ```bash
   npm run dev demo --dry-run
   ls specs/ # Should not see demo-* directory
   ```

3. **Test Interrupt Handling**:
   ```bash
   npm run dev demo --dry-run
   # Press Ctrl+C during execution
   # Verify cleanup message appears
   ```

4. **JSON Output**:
   ```bash
   npm run dev demo --dry-run --json | jq .
   # Verify valid JSON structure
   ```

5. **Update Documentation**:
   - Add demo command to README.md usage section
   - Update docs/usage.md with examples
   - Add demo to API reference (docs/api-reference.md)

---

## Reference Materials

- **Data Model**: `data-model.md` — Complete entity definitions
- **CLI Contract**: `contracts/cli-interface.md` — CLI behavior specifications
- **Research**: `research.md` — Technology choices, integration patterns
- **Spec**: `spec.md` — Requirements, user stories, success criteria
- **Constitution**: `.specify/memory/constitution.md` — Clean Architecture principles

---

## Estimated Time

- Step 1-2 (Entities + Ports): 15 minutes
- Step 3 (Use Case): 30 minutes
- Step 4-6 (Adapters): 45 minutes
- Step 7-8 (Wiring + CLI): 20 minutes
- Step 9 (Output Formatting): 20 minutes
- Step 10 (Tests): 60 minutes

**Total**: ~3 hours for full implementation with tests
**Minimum Viable**: ~1.5 hours for basic implementation (defer comprehensive tests)

---

## Questions?

- Architecture questions → Review `.specify/memory/constitution.md`
- CLI patterns → Study existing commands in `src/cli/index.ts`
- Testing patterns → Review `tests/` directory structure
- Output formatting → See `src/review/ceremony.ts` (similar report generation)
