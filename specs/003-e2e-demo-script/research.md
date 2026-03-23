# Research: E2E Demo Script

**Phase 0 Output** | Generated: 2025-03-23 | Feature: 003-e2e-demo-script

## Research Questions

### 1. How should the demo command execute Spec Kit pipeline stages?

**Decision**: Use Node.js `child_process.spawn()` to execute speckit commands as subprocess

**Rationale**:
- Spec Kit commands are designed as task agents invoked via Copilot CLI (`/speckit.specify`, `/speckit.plan`, etc.)
- Running these as external processes maintains separation and allows capturing stdio output for validation
- The bridge already uses similar pattern for GitHub CLI interactions (see `src/issues/adapters/github-issue-adapter.ts`)
- Allows streaming output to user in real-time (better UX than silent execution)

**Alternatives Considered**:
- **Direct TypeScript imports**: Spec Kit agents are not TypeScript libraries, they're Copilot CLI commands. Cannot import directly.
- **Shell scripts**: Less portable (Windows compatibility issues), harder to test, loses type safety. Node.js child_process is cross-platform.
- **HTTP API calls**: No HTTP API exists for Spec Kit commands. Would require additional infrastructure.

**Implementation Notes**:
- Wrap `child_process.spawn()` in adapter layer (`ProcessExecutor` port implementation)
- Use `stdio: 'pipe'` to capture output for validation
- Handle both success (exit code 0) and failure (non-zero) cases
- Set reasonable timeout (30s per stage) to prevent hangs

---

### 2. What example feature should the demo use?

**Decision**: Use a "User Authentication" feature with login/logout functionality

**Rationale**:
- Universally understood domain (no specialized knowledge required)
- Simple enough to complete in <60 seconds (meets performance constraint)
- Demonstrates typical CRUD + validation patterns (covers common Spec Kit use cases)
- Small enough to generate compact artifacts (4-6 tasks, ~1KB spec.md)

**Alternatives Considered**:
- **TODO List CRUD**: Too trivial, doesn't demonstrate validation or business logic
- **Payment Processing**: Too complex, raises security concerns, would generate large task lists
- **File Upload**: Platform-specific concerns (storage backends), harder to make self-contained

**Example Feature Description** (hardcoded in demo):
```
Feature: User Authentication
Description: Add login and logout functionality with email/password validation.
Requirements:
- Email format validation (RFC 5322)
- Password minimum length (8 characters)
- Session token generation (JWT)
- Login endpoint POST /api/auth/login
- Logout endpoint POST /api/auth/logout
```

---

### 3. How should artifact validation work between stages?

**Decision**: Validate file existence + non-empty content + valid frontmatter structure

**Rationale**:
- File existence check catches stage execution failures (command didn't complete)
- Non-empty content check (file size > 0) prevents empty file edge cases
- Frontmatter validation confirms file is well-formed (uses existing `gray-matter` dependency)
- Lightweight validation avoids re-implementing Spec Kit's own quality checks
- Fast (<10ms per file) to keep demo responsive

**Alternatives Considered**:
- **Full semantic validation**: Parsing markdown structure, checking section completeness. Too complex, duplicates Spec Kit's internal validation.
- **Existence only**: Misses empty file corruption. Not robust enough.
- **Hash-based validation**: Requires known-good artifacts (brittle, feature description changes invalidate hashes).

**Implementation**:
```typescript
interface ArtifactValidator {
  validate(path: string): Promise<ValidationResult>;
}

interface ValidationResult {
  exists: boolean;
  valid: boolean;
  errors: string[];
}
```

Validation rules:
- `spec.md`: frontmatter contains `Status`, `Feature Branch`, content has `## Requirements`
- `plan.md`: frontmatter exists, content has `## Technical Context`
- `tasks.md`: frontmatter exists, content has `- [ ]` (unchecked task markers)
- `review.md`: frontmatter exists, content has `## Findings`

---

### 4. How should cleanup logic handle interrupted executions?

**Decision**: Use `process.on('SIGINT', cleanup)` handler + `try/finally` blocks for graceful shutdown

**Rationale**:
- `SIGINT` handler catches Ctrl+C interruptions (user aborts)
- `try/finally` ensures cleanup runs even on exceptions
- Follows existing pattern in Node.js CLI tools (see npm, yarn, pnpm implementations)
- Cross-platform (works on Windows with PowerShell, Linux, macOS)

**Alternatives Considered**:
- **No cleanup on interrupt**: Leaves garbage artifacts, violates spec requirement FR-012
- **`process.on('exit', cleanup)`**: Too late, process already exiting, filesystem operations unreliable
- **`process.on('beforeExit', cleanup)`**: Only fires on natural exit, misses crashes/kills

**Implementation Notes**:
```typescript
let cleanupTriggered = false;
const cleanup = async () => {
  if (cleanupTriggered) return;
  cleanupTriggered = true;
  // Remove demo directory
  // Log cleanup status
};

process.on('SIGINT', cleanup);
try {
  await runDemo(config);
} finally {
  if (!config.keep) await cleanup();
}
```

---

### 5. What output format provides clear progress feedback?

**Decision**: Use emoji indicators + stage names + elapsed time + artifact paths

**Rationale**:
- Visual cues (✓, ✗, ⏳) improve scannability (meets SC-003: clear visual feedback)
- Stage names + elapsed time give execution transparency
- Artifact paths enable inspection without verbose logs
- Format is human-friendly while `--json` flag provides machine-parseable output

**Alternatives Considered**:
- **Progress bars**: Require terminal manipulation (cursor positioning), less portable, harder to test
- **Verbose logs only**: Information overload, buries key status updates (fails SC-003)
- **Silent execution**: Violates FR-005 (display clear console output)

**Output Format Example**:
```
🚀 Starting demo pipeline...

⏳ Stage 1/5: Generating specification (specify)...
   ✓ Created: specs/demo-20250323-143022/spec.md (1.2 KB)
   Elapsed: 3.1s

⏳ Stage 2/5: Creating implementation plan (plan)...
   ✓ Created: specs/demo-20250323-143022/plan.md (4.5 KB)
   Elapsed: 5.7s

⏳ Stage 3/5: Generating task breakdown (tasks)...
   ✓ Created: specs/demo-20250323-143022/tasks.md (2.3 KB)
   Elapsed: 4.2s

⏳ Stage 4/5: Preparing design review (review)...
   ✓ Created: specs/demo-20250323-143022/review.md (1.8 KB)
   Elapsed: 2.1s

⏳ Stage 5/5: Creating GitHub issues (dry-run)...
   ✓ Simulated 4 issues (labels: squad, speckit, demo)
   Elapsed: 0.3s

✅ Demo completed successfully in 15.4s
   Artifacts: specs/demo-20250323-143022/
   Cleaned up: Yes

📖 Next steps:
   - Run `sqsk demo --keep` to inspect generated artifacts
   - Run `sqsk demo` (without --dry-run) to create real issues
```

---

### 6. How should dry-run mode simulate GitHub issue creation?

**Decision**: Skip GitHub API calls entirely, log what would be created to stdout

**Rationale**:
- Matches industry-standard `--dry-run` behavior (kubectl, terraform, etc.)
- Zero network dependencies (meets constraint from spec)
- Fast (no API latency, meets <60s performance goal)
- Demonstrates issue structure without side effects (meets FR-006)

**Alternatives Considered**:
- **Call GitHub API with preview mode**: GitHub API doesn't support preview/dry-run mode
- **Create issues in test repository**: Requires credentials, network, leaves test data, violates "no side effects"

**Implementation**:
```typescript
if (dryRun) {
  logger.info(`Would create issue: "${task.title}"`);
  logger.info(`  Labels: ${labels.join(', ')}`);
  logger.info(`  Body: ${task.description.substring(0, 100)}...`);
} else {
  await githubAdapter.createIssue(task, labels);
}
```

---

## Technology Choices

### Process Execution: Node.js `child_process.spawn()`
- **Why**: Cross-platform, built-in, supports streaming output, no additional dependencies
- **Best Practice**: Always handle `error`, `exit`, `close` events; set timeouts; validate exit codes
- **Risk Mitigation**: Wrap in adapter to isolate from use case layer (follows Dependency Rule)

### Progress Output: Console.log with Emoji Indicators
- **Why**: Universal terminal support, readable, no dependencies (vs. libraries like chalk, ora)
- **Best Practice**: Use UTF-8 emoji (✓, ✗, ⏳) for cross-platform compatibility
- **Risk Mitigation**: Provide `--json` flag for automation/CI environments where emoji may render poorly

### Timestamp Generation: `Date.now()` + ISO Format
- **Why**: Unique directory names prevent collisions (meets FR-008)
- **Best Practice**: Use `YYYYMMDD-HHMMSS` format for filesystem-safe, sortable names
- **Implementation**: `demo-${new Date().toISOString().replace(/[:.]/g, '-')}`

### Cleanup Strategy: `fs.rm(path, { recursive: true, force: true })`
- **Why**: Native Node.js 14+, no dependencies (vs. rimraf), handles non-empty directories
- **Best Practice**: Always check `--keep` flag before deletion; log cleanup status
- **Risk Mitigation**: Use `try/catch` around deletion, never fail entire demo on cleanup errors

---

## Integration Patterns

### Spec Kit Command Invocation Pattern
```typescript
const result = await processExecutor.run('speckit', ['specify', featureDescription], {
  cwd: projectRoot,
  timeout: 30000,
  env: { ...process.env }
});

if (result.exitCode !== 0) {
  throw new Error(`Specify stage failed: ${result.stderr}`);
}
```

### Stage Validation Pattern
```typescript
const stages: PipelineStage[] = [
  { name: 'specify', artifact: 'spec.md', command: ['speckit', 'specify'] },
  { name: 'plan', artifact: 'plan.md', command: ['speckit', 'plan'] },
  { name: 'tasks', artifact: 'tasks.md', command: ['speckit', 'tasks'] },
  { name: 'review', artifact: 'review.md', command: ['speckit', 'review'] }
];

for (const stage of stages) {
  const result = await processExecutor.run(stage.command[0], stage.command.slice(1));
  const validation = await artifactValidator.validate(stage.artifact);
  if (!validation.valid) throw new Error(`Stage ${stage.name} produced invalid artifact`);
}
```

### Error Propagation Pattern
- **Layer 3 (CLI)**: Catch all errors, emit structured error with suggestion, set exit code
- **Layer 1 (Use Case)**: Wrap stage failures with context (which stage, what artifact, elapsed time)
- **Layer 2 (Adapter)**: Let raw errors bubble (ProcessExecutor throws on non-zero exit, ArtifactValidator throws on invalid content)

---

## Open Questions (None Remaining)

All technical unknowns from initial Technical Context resolved:
- ✅ Process execution mechanism: Node.js child_process.spawn()
- ✅ Example feature content: User Authentication with login/logout
- ✅ Artifact validation strategy: Existence + non-empty + frontmatter structure
- ✅ Cleanup interrupt handling: SIGINT handler + try/finally
- ✅ Output format: Emoji indicators + stage names + elapsed time
- ✅ Dry-run implementation: Skip GitHub API, log what would be created

**Status**: Ready for Phase 1 (Design & Contracts)
