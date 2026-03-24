# CLI Interface Contract: Demo Command

**Version**: 1.0.0 | **Feature**: 003-e2e-demo-script | **Type**: CLI Subcommand

## Command Signature

```bash
squask demo [options]
```

**Aliases**: `squad-speckit-bridge demo`

---

## Options

### `--dry-run`

- **Type**: Boolean flag
- **Default**: `false`
- **Description**: Simulate GitHub issue creation without making API calls
- **Behavior**:
  - When enabled: All pipeline stages execute except `issues` stage skips GitHub API calls
  - Logs show simulated issue creation (title, labels, body preview)
  - Exit code 0 on success (same as normal run)
  - No authentication required (GitHub token not validated)
- **Example**: `squask demo --dry-run`

---

### `--keep`

- **Type**: Boolean flag
- **Default**: `false`
- **Description**: Preserve generated artifacts after demo completion
- **Behavior**:
  - When enabled: Demo directory (`specs/demo-{timestamp}/`) is **not** deleted
  - Artifacts remain for manual inspection
  - Cleanup is skipped even on failure
  - Output shows retained directory path
- **Example**: `squask demo --keep`

---

### `--verbose`

- **Type**: Boolean flag (inherited from global options)
- **Default**: `false`
- **Description**: Enable detailed logging for debugging
- **Behavior**:
  - Shows command invocations, full stdout/stderr from subprocesses
  - Displays artifact validation details (frontmatter keys, section counts)
  - Logs timing for each stage (start time, end time, elapsed)
  - Does not affect demo execution logic (read-only flag)
- **Example**: `squask demo --verbose`

---

### `--json`

- **Type**: Boolean flag (inherited from global options)
- **Default**: `false`
- **Description**: Output results in JSON format instead of human-readable text
- **Behavior**:
  - Suppresses emoji indicators and formatted output
  - Prints single JSON object to stdout on completion
  - Schema documented below in "JSON Output Format" section
  - Suitable for parsing by scripts or CI/CD pipelines
- **Example**: `squask demo --json`

---

### `--quiet`

- **Type**: Boolean flag (inherited from global options)
- **Default**: `false`
- **Description**: Suppress informational output (errors still printed to stderr)
- **Behavior**:
  - Only prints final success/failure message
  - Stage progress indicators hidden
  - Artifact paths not displayed
  - Error messages still output to stderr (not suppressed)
- **Example**: `squask demo --quiet`

---

## Arguments

**None.** The demo command takes no positional arguments. The example feature description is hardcoded.

---

## Exit Codes

| Code | Meaning | Scenario |
|------|---------|----------|
| 0 | Success | All pipeline stages completed successfully |
| 1 | Failure | One or more stages failed (non-zero exit code from speckit command) |
| 1 | Validation Error | Artifact validation failed (missing frontmatter, empty file) |
| 1 | Configuration Error | Squad/Spec Kit directories not found |
| 1 | Interrupt | User pressed Ctrl+C (cleanup attempted) |

**Note**: All failure modes use exit code 1 (consistent with existing bridge commands).

---

## Output Formats

### Human-Readable Output (Default)

**Structure**:
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
   - Run `squask demo --keep` to inspect generated artifacts
   - Run `squask demo` (without --dry-run) to create real issues
```

**Failure Output**:
```
🚀 Starting demo pipeline...

⏳ Stage 1/5: Generating specification (specify)...
   ✓ Created: specs/demo-20250323-143022/spec.md (1.2 KB)
   Elapsed: 3.1s

⏳ Stage 2/5: Creating implementation plan (plan)...
   ✗ Failed: Command exited with code 1
   Error: Plan generation failed: missing research.md
   Elapsed: 2.3s

❌ Demo failed at stage 2/5
   Artifacts: specs/demo-20250323-143022/ (preserved for inspection)
   Cleaned up: No

🔍 Troubleshooting:
   - Run with --verbose for detailed logs
   - Check .specify/ directory exists
   - Verify Squad and Spec Kit are properly installed
```

---

### JSON Output Format (`--json`)

**Success Schema**:
```json
{
  "success": true,
  "totalTimeMs": 15400,
  "totalTimeSeconds": "15.4s",
  "stages": [
    {
      "name": "specify",
      "displayName": "Generating specification",
      "status": "success",
      "elapsedMs": 3100,
      "elapsedSeconds": "3.1s",
      "artifact": {
        "name": "spec.md",
        "path": "/absolute/path/to/specs/demo-20250323-143022/spec.md",
        "sizeBytes": 1234,
        "sizeKB": "1.2 KB"
      }
    },
    {
      "name": "plan",
      "displayName": "Creating implementation plan",
      "status": "success",
      "elapsedMs": 5700,
      "elapsedSeconds": "5.7s",
      "artifact": {
        "name": "plan.md",
        "path": "/absolute/path/to/specs/demo-20250323-143022/plan.md",
        "sizeBytes": 4500,
        "sizeKB": "4.5 KB"
      }
    },
    {
      "name": "tasks",
      "displayName": "Generating task breakdown",
      "status": "success",
      "elapsedMs": 4200,
      "elapsedSeconds": "4.2s",
      "artifact": {
        "name": "tasks.md",
        "path": "/absolute/path/to/specs/demo-20250323-143022/tasks.md",
        "sizeBytes": 2300,
        "sizeKB": "2.3 KB"
      }
    },
    {
      "name": "review",
      "displayName": "Preparing design review",
      "status": "success",
      "elapsedMs": 2100,
      "elapsedSeconds": "2.1s",
      "artifact": {
        "name": "review.md",
        "path": "/absolute/path/to/specs/demo-20250323-143022/review.md",
        "sizeBytes": 1800,
        "sizeKB": "1.8 KB"
      }
    },
    {
      "name": "issues",
      "displayName": "Creating GitHub issues",
      "status": "success",
      "elapsedMs": 300,
      "elapsedSeconds": "0.3s",
      "issuesCreated": 4,
      "dryRun": true
    }
  ],
  "demoDir": "/absolute/path/to/specs/demo-20250323-143022",
  "cleanupPerformed": true,
  "flags": {
    "dryRun": true,
    "keep": false,
    "verbose": false
  }
}
```

**Failure Schema**:
```json
{
  "success": false,
  "totalTimeMs": 5400,
  "totalTimeSeconds": "5.4s",
  "stages": [
    {
      "name": "specify",
      "displayName": "Generating specification",
      "status": "success",
      "elapsedMs": 3100,
      "elapsedSeconds": "3.1s",
      "artifact": { /* same as success */ }
    },
    {
      "name": "plan",
      "displayName": "Creating implementation plan",
      "status": "failed",
      "elapsedMs": 2300,
      "elapsedSeconds": "2.3s",
      "error": "Command exited with code 1: Plan generation failed: missing research.md"
    },
    {
      "name": "tasks",
      "displayName": "Generating task breakdown",
      "status": "pending"
    },
    {
      "name": "review",
      "displayName": "Preparing design review",
      "status": "pending"
    },
    {
      "name": "issues",
      "displayName": "Creating GitHub issues",
      "status": "pending"
    }
  ],
  "failedStage": "plan",
  "errorSummary": "Demo failed at stage 2/5: Plan generation failed: missing research.md",
  "demoDir": "/absolute/path/to/specs/demo-20250323-143022",
  "cleanupPerformed": false,
  "flags": {
    "dryRun": false,
    "keep": false,
    "verbose": false
  }
}
```

---

## Behavior Specifications

### Idempotency

- **Requirement**: Running `squask demo` multiple times must not interfere with previous runs
- **Implementation**: Each run generates a unique `demo-{timestamp}` directory
- **Timestamp Format**: `YYYYMMDD-HHMMSS` (filesystem-safe, sortable)
- **Collision Handling**: If timestamp collision occurs (sub-second execution), append `-{random}` suffix

---

### Cleanup on Interrupt

- **Requirement**: Pressing Ctrl+C must attempt cleanup before exiting
- **Implementation**: Register `SIGINT` handler that calls cleanup function
- **Behavior**:
  - If `--keep` flag set: Skip cleanup, preserve artifacts
  - If `--keep` flag not set: Delete `demoDir` recursively
  - Log cleanup status before exit
  - Exit with code 130 (standard Unix convention for SIGINT)

---

### Artifact Validation Rules

| Artifact | Existence | Size | Frontmatter | Required Sections |
|----------|-----------|------|-------------|-------------------|
| spec.md | ✓ | > 0 bytes | ✓ (Status, Feature Branch) | `## Requirements` |
| plan.md | ✓ | > 0 bytes | ✓ (Branch, Date) | `## Technical Context` |
| tasks.md | ✓ | > 0 bytes | ✓ | `- [ ]` (unchecked task) |
| review.md | ✓ | > 0 bytes | ✓ | `## Findings` |

**Validation Failures**:
- Missing file: "Artifact {name} not found at {path}"
- Empty file: "Artifact {name} is empty (0 bytes)"
- Invalid frontmatter: "Artifact {name} has malformed frontmatter: {error}"
- Missing section: "Artifact {name} missing required section: {section}"

---

### Stage Timeout Handling

- **Default Timeout**: 30 seconds per stage
- **Behavior on Timeout**:
  - Kill subprocess (SIGTERM, then SIGKILL after 5s grace period)
  - Mark stage as 'failed' with error: "Stage {name} timed out after 30s"
  - Halt pipeline (do not execute subsequent stages)
- **Rationale**: Prevents infinite hangs, ensures demo completes in <2 minutes (per spec SC-001)

---

## Example Invocations

### Basic Demo (Dry-Run)
```bash
squask demo --dry-run
```
**Result**: Full pipeline executes, no GitHub issues created, artifacts cleaned up

---

### Inspect Artifacts
```bash
squask demo --dry-run --keep
```
**Result**: Artifacts preserved in `specs/demo-{timestamp}/`, can inspect spec.md, plan.md, tasks.md, review.md

---

### Create Real Issues
```bash
squask demo
```
**Result**: Full pipeline executes, GitHub issues created (requires `GITHUB_TOKEN` env var), artifacts cleaned up

---

### Debug Failure
```bash
squask demo --verbose --keep
```
**Result**: Detailed logs displayed, artifacts preserved for inspection

---

### CI/CD Integration
```bash
squask demo --dry-run --json --quiet
```
**Result**: JSON output to stdout, minimal noise, exit code 0 on success

---

## Dependencies on Other Bridge Commands

The demo command **does not directly call** other bridge commands. Instead, it invokes Spec Kit task agents:

1. **Stage 1 (specify)**: Invokes `/speckit.specify` agent
2. **Stage 2 (plan)**: Invokes `/speckit.plan` agent
3. **Stage 3 (tasks)**: Invokes `/speckit.tasks` agent
4. **Stage 4 (review)**: Calls `squask review {tasks-file}` (bridge command)
5. **Stage 5 (issues)**: Calls `squask issues {tasks-file} --dry-run` (if dry-run enabled) or `squask issues {tasks-file}` (if real issues)

**Note**: Spec Kit agents are external processes, not TypeScript imports. Communication is via command-line invocation.

---

## Error Scenarios

### Scenario 1: Squad/Spec Kit Not Installed

**Input**: `squask demo`  
**Condition**: `.squad/` or `.specify/` directory not found  
**Output**:
```
Error [SQUAD_NOT_FOUND]: Squad directory not found
  Suggestion: Run `squask install` to initialize bridge components
```
**Exit Code**: 1

---

### Scenario 2: Stage Execution Failure

**Input**: `squask demo --dry-run`  
**Condition**: `speckit plan` command exits with code 1  
**Output**:
```
⏳ Stage 2/5: Creating implementation plan (plan)...
   ✗ Failed: Command exited with code 1
   Error: Plan generation failed: missing research.md
   Elapsed: 2.3s

❌ Demo failed at stage 2/5
```
**Exit Code**: 1

---

### Scenario 3: Invalid Artifact

**Input**: `squask demo --dry-run`  
**Condition**: Generated `spec.md` is empty (0 bytes)  
**Output**:
```
⏳ Stage 1/5: Generating specification (specify)...
   ✗ Validation failed: spec.md is empty (0 bytes)
   Elapsed: 3.1s

❌ Demo failed at stage 1/5
```
**Exit Code**: 1

---

### Scenario 4: User Interrupt

**Input**: `squask demo` (user presses Ctrl+C during stage 2)  
**Output**:
```
⏳ Stage 2/5: Creating implementation plan (plan)...
^C
⚠️  Demo interrupted by user
   Cleaning up: specs/demo-20250323-143022/
   ✓ Cleanup complete
```
**Exit Code**: 130 (SIGINT)

---

## Compatibility

- **Minimum Node.js**: 18.0.0 (per package.json engines)
- **Terminal**: UTF-8 support required for emoji indicators (fallback to ASCII in `--json` mode)
- **Operating Systems**: Linux, macOS, Windows (via cross-platform Node.js APIs)
- **CI/CD**: Compatible with GitHub Actions, GitLab CI, Jenkins (use `--json --quiet` flags)

---

## Version History

- **1.0.0** (2025-03-23): Initial contract definition
