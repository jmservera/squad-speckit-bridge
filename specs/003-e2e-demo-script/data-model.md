# Data Model: E2E Demo Script

**Phase 1 Output** | Generated: 2025-03-23 | Feature: 003-e2e-demo-script

## Entity Definitions

### DemoConfiguration

Represents the runtime configuration for a demo execution.

**Fields**:
- `exampleFeature: string` — Predefined feature description (hardcoded: User Authentication)
- `demoDir: string` — Temporary directory path (e.g., `specs/demo-20250323-143022/`)
- `flags: DemoFlags` — Command-line flags (dryRun, keep, verbose)
- `timeout: number` — Maximum seconds per pipeline stage (default: 30)
- `squadDir: string` — Path to Squad directory (for context building)
- `specifyDir: string` — Path to Spec Kit directory (for agent execution)

**Validation Rules**:
- `exampleFeature` must not be empty (length > 0)
- `demoDir` must be absolute path under `specs/` directory
- `timeout` must be positive integer (1-300 seconds)
- `squadDir` and `specifyDir` must exist (validated during setup)

**State Transitions**: Immutable after creation (passed to use case, never modified)

---

### DemoFlags

Boolean flags controlling demo behavior.

**Fields**:
- `dryRun: boolean` — If true, simulate GitHub issue creation without API calls (default: false)
- `keep: boolean` — If true, preserve demo artifacts after completion (default: false)
- `verbose: boolean` — If true, display detailed logs for debugging (default: false)

**Validation Rules**:
- All fields optional (default to false if not provided)
- No conflicting combinations (all flags are independent)

**State Transitions**: Immutable, set once from CLI arguments

---

### PipelineStage

Represents a single step in the demo workflow with execution metadata.

**Fields**:
- `name: string` — Stage identifier (specify, plan, tasks, review, issues)
- `displayName: string` — Human-readable name for output ("Generating specification")
- `command: string[]` — Command to execute (e.g., `['speckit', 'specify', '...']`)
- `artifact: string` — Expected output filename (e.g., `spec.md`)
- `status: StageStatus` — Execution state (pending, running, success, failed)
- `startTime?: number` — Timestamp (ms) when stage began
- `endTime?: number` — Timestamp (ms) when stage completed
- `error?: string` — Error message if status is 'failed'

**Validation Rules**:
- `name` must be one of: specify, plan, tasks, review, issues
- `command` must not be empty array
- `artifact` must be valid filename (no path separators)
- `status` progresses only forward: pending → running → (success | failed)
- `startTime` < `endTime` when both are set

**State Transitions**:
```
pending → running (when stage execution starts)
running → success (when command exits 0 and artifact valid)
running → failed (when command exits non-zero or artifact invalid)
```

**Derived Properties**:
- `elapsedMs: number` — `endTime - startTime` (only when status is success or failed)
- `elapsedSeconds: string` — Formatted elapsed time (e.g., "3.1s")

---

### StageStatus

Enumeration of pipeline stage states.

**Values**:
- `pending` — Stage not yet started
- `running` — Stage currently executing
- `success` — Stage completed successfully (exit code 0, artifact valid)
- `failed` — Stage failed (non-zero exit code or invalid artifact)

**Validation Rules**:
- Status transitions must follow: pending → running → (success | failed)
- No backwards transitions allowed

---

### DemoArtifact

Represents a generated file with validation status.

**Fields**:
- `path: string` — Absolute path to artifact file
- `type: ArtifactType` — File classification (spec, plan, tasks, review)
- `sizeBytes: number` — File size in bytes (0 if does not exist)
- `exists: boolean` — True if file exists on filesystem
- `valid: boolean` — True if file structure is correct (has frontmatter, required sections)
- `errors: string[]` — Validation error messages (empty if valid)

**Validation Rules**:
- `path` must be absolute and under `demoDir`
- `type` must match expected artifact for stage (spec.md → 'spec')
- `exists` must be true for `valid` to be true
- `sizeBytes` must be > 0 for `valid` to be true

**State Transitions**: Recalculated after each stage execution (validation is stateless)

---

### ArtifactType

Enumeration of artifact classifications.

**Values**:
- `spec` — Feature specification (spec.md)
- `plan` — Implementation plan (plan.md)
- `tasks` — Task breakdown (tasks.md)
- `review` — Design review (review.md)

**Validation Rules**: Must match one of the enum values

---

### ExecutionReport

Represents the final summary after demo completion.

**Fields**:
- `totalTimeMs: number` — Total execution time from start to finish
- `stagesCompleted: number` — Count of stages with status 'success'
- `stagesFailed: number` — Count of stages with status 'failed'
- `artifacts: ArtifactSummary[]` — List of generated files with metadata
- `cleanupPerformed: boolean` — True if demo directory was deleted
- `errorSummary?: string` — High-level error description if demo failed

**Validation Rules**:
- `totalTimeMs` must be positive
- `stagesCompleted + stagesFailed` ≤ total stage count (5)
- `cleanupPerformed` must be false if `keep` flag was set
- `errorSummary` required if any stage failed

**State Transitions**: Computed once at demo end (never modified)

**Derived Properties**:
- `success: boolean` — True if `stagesFailed` === 0
- `totalTimeSeconds: string` — Formatted total time (e.g., "15.4s")

---

### ArtifactSummary

Minimal artifact metadata for final report.

**Fields**:
- `name: string` — Filename (e.g., "spec.md")
- `path: string` — Absolute path
- `sizeKB: string` — Human-readable size (e.g., "1.2 KB")

**Validation Rules**:
- `name` must not be empty
- `path` must be absolute
- `sizeKB` must match format: `\d+\.\d+ KB`

---

## Relationships

```
DemoConfiguration (1) ──creates──> DemoArtifact (4-5)
DemoConfiguration (1) ──executes──> PipelineStage (5)
PipelineStage (1) ──produces──> DemoArtifact (1)
PipelineStage (5) ──summarizes to──> ExecutionReport (1)
ExecutionReport (1) ──references──> ArtifactSummary (4-5)
```

**Cardinality**:
- 1 DemoConfiguration per demo run
- 5 PipelineStages per demo (specify, plan, tasks, review, issues)
- 4-5 DemoArtifacts (issues stage creates no artifact in dry-run mode)
- 1 ExecutionReport per demo run

---

## Validation Rules Summary

### DemoConfiguration
- `exampleFeature.length > 0`
- `demoDir` must match pattern: `specs/demo-{timestamp}/`
- `timeout` in range [1, 300]
- `squadDir` and `specifyDir` must exist on filesystem

### PipelineStage
- `status` transitions: pending → running → (success | failed)
- `startTime < endTime` when both are set
- `artifact` must be one of: spec.md, plan.md, tasks.md, review.md, (none for issues)

### DemoArtifact
- If `exists` is false, `valid` must be false
- If `sizeBytes` is 0, `valid` must be false
- `errors` array must not be empty if `valid` is false

### ExecutionReport
- `stagesCompleted + stagesFailed` ≤ 5
- `cleanupPerformed` must be false if `keep` flag was true
- `errorSummary` required if `stagesFailed > 0`

---

## State Machine: Pipeline Execution

```
Initial State: All stages in 'pending' status

Transition: Start Demo
  → Stage 1 (specify) transitions to 'running'
  
Transition: Stage Success
  → Current stage transitions to 'success'
  → Next stage transitions to 'running' (or complete if final stage)
  
Transition: Stage Failure
  → Current stage transitions to 'failed'
  → Demo execution halts (all remaining stages stay 'pending')
  
Transition: Demo Complete (All Success)
  → Generate ExecutionReport with stagesFailed = 0
  → If keep = false, perform cleanup (delete demoDir)
  
Transition: Demo Failed
  → Generate ExecutionReport with stagesFailed > 0
  → If keep = false, perform cleanup (delete demoDir)
  
Final State: ExecutionReport available, demoDir deleted (if keep = false)
```

**Invariants**:
- Only one stage can be 'running' at a time (sequential execution)
- Once a stage is 'failed', no subsequent stages execute
- Cleanup always runs (unless keep = true), even on failure
- ExecutionReport always generated (even on interrupt/crash)

---

## Example Data Flow

### Input (from CLI):
```typescript
{
  dryRun: true,
  keep: false,
  verbose: false
}
```

### Intermediate (during execution):
```typescript
// Stage 1
{
  name: 'specify',
  displayName: 'Generating specification',
  command: ['speckit', 'specify', 'Feature: User Authentication...'],
  artifact: 'spec.md',
  status: 'running',
  startTime: 1711200000000,
  endTime: undefined,
  error: undefined
}

// After stage 1 completes
{
  name: 'specify',
  status: 'success',
  startTime: 1711200000000,
  endTime: 1711200003100,
  // elapsedMs = 3100, elapsedSeconds = "3.1s"
}

// Artifact validation
{
  path: '/path/to/specs/demo-20250323-143022/spec.md',
  type: 'spec',
  sizeBytes: 1234,
  exists: true,
  valid: true,
  errors: []
}
```

### Output (final report):
```typescript
{
  totalTimeMs: 15400,
  stagesCompleted: 5,
  stagesFailed: 0,
  artifacts: [
    { name: 'spec.md', path: '...', sizeKB: '1.2 KB' },
    { name: 'plan.md', path: '...', sizeKB: '4.5 KB' },
    { name: 'tasks.md', path: '...', sizeKB: '2.3 KB' },
    { name: 'review.md', path: '...', sizeKB: '1.8 KB' }
  ],
  cleanupPerformed: true,
  errorSummary: undefined
  // success = true, totalTimeSeconds = "15.4s"
}
```

---

## Notes

- All timestamps use `Date.now()` for millisecond precision
- File sizes converted to KB for human readability (1 KB = 1000 bytes, not 1024)
- Artifact validation uses `gray-matter` (existing dependency) to parse frontmatter
- Stage execution is **sequential**, not parallel (dependency: plan requires spec, tasks requires plan)
- Error messages are preserved verbatim from command stderr for debugging
