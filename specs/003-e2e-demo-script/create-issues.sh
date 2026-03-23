#!/bin/bash
# Create GitHub issues from tasks.md for feature 003-e2e-demo-script
# Run with: chmod +x create-issues.sh && ./create-issues.sh

set -e

REPO="jmservera/squadvsspeckit"
BRANCH="003-e2e-demo-script"
LABEL_ENHANCEMENT="enhancement"
LABEL_TESTING="testing"
LABEL_DOCS="documentation"

echo "🚀 Creating GitHub issues for E2E Demo Script feature..."
echo ""

# Phase 1: Setup (3 tasks)
echo "📁 Phase 1: Setup"

gh issue create --repo "$REPO" --title "T001: Create demo feature directory structure" \
  --body "Create the directory structure for the demo feature:
- \`src/demo/\`
- \`src/demo/adapters/\`
- \`tests/demo/\`
- \`tests/demo/adapters/\`
- \`tests/e2e/\`

**Branch:** \`$BRANCH\`
**Phase:** 1 - Setup
**Parallelizable:** No (first task)" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T002: Define entity types in src/demo/entities.ts" \
  --body "Define entity types in \`src/demo/entities.ts\`:
- DemoConfiguration
- DemoFlags
- PipelineStage
- StageStatus enum
- DemoArtifact
- ArtifactType enum
- ExecutionReport
- ArtifactSummary

**Branch:** \`$BRANCH\`
**Phase:** 1 - Setup
**Parallelizable:** Yes (with T003)
**Depends on:** T001" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T003: Define port interfaces in src/demo/ports.ts" \
  --body "Define port interfaces in \`src/demo/ports.ts\`:
- ProcessExecutor
- ArtifactValidator
- CleanupHandler

Method signatures should use DTOs only.

**Branch:** \`$BRANCH\`
**Phase:** 1 - Setup
**Parallelizable:** Yes (with T002)
**Depends on:** T001" \
  --label "$LABEL_ENHANCEMENT"

# Phase 2: Foundational (4 tasks)
echo "📁 Phase 2: Foundational"

gh issue create --repo "$REPO" --title "T004: Implement ProcessExecutor adapter" \
  --body "Implement ProcessExecutor adapter in \`src/demo/adapters/process-executor.ts\`:
- NodeProcessExecutor class
- Use child_process.spawn()
- Timeout handling
- stdout/stderr capture

**Branch:** \`$BRANCH\`
**Phase:** 2 - Foundational (BLOCKING)
**Parallelizable:** No (blocks other foundational tasks)
**Depends on:** T002, T003" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T005: Implement ArtifactValidator adapter" \
  --body "Implement ArtifactValidator adapter in \`src/demo/adapters/artifact-validator.ts\`:
- FileSystemArtifactValidator class
- Use gray-matter for frontmatter parsing

**Branch:** \`$BRANCH\`
**Phase:** 2 - Foundational
**Parallelizable:** Yes (with T006, T007)
**Depends on:** T004" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T006: Implement CleanupHandler adapter" \
  --body "Implement CleanupHandler adapter in \`src/demo/adapters/cleanup-handler.ts\`:
- FileSystemCleanupHandler class
- Use fs.rm() with recursive option

**Branch:** \`$BRANCH\`
**Phase:** 2 - Foundational
**Parallelizable:** Yes (with T005, T007)
**Depends on:** T004" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T007: Create helper utility in src/demo/utils.ts" \
  --body "Create helper utility in \`src/demo/utils.ts\`:
- Timestamp generation (YYYYMMDD-HHMMSS format)
- File size formatting (KB)
- Elapsed time formatting

**Branch:** \`$BRANCH\`
**Phase:** 2 - Foundational
**Parallelizable:** Yes (with T005, T006)
**Depends on:** T004" \
  --label "$LABEL_ENHANCEMENT"

# Phase 3: User Story 1 - Quick Pipeline Validation (10 tasks)
echo "📁 Phase 3: User Story 1 - Quick Pipeline Validation (MVP)"

gh issue create --repo "$REPO" --title "T008: Implement core orchestration logic" \
  --body "Implement core orchestration logic in \`src/demo/orchestrator.ts\`:
- runDemo() function
- Create demo directory
- Define 5 pipeline stages
- Execute sequentially
- Validate artifacts after each stage

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T005, T006, T007" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T009: Add stage execution loop to orchestrator" \
  --body "Add stage execution loop to \`src/demo/orchestrator.ts\`:
- Iterate through stages
- Call processExecutor.run()
- Update stage status (pending → running → success/failed)
- Halt on first failure

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T008" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T010: Implement artifact validation step" \
  --body "Implement artifact validation step in \`src/demo/orchestrator.ts\`:
- Call artifactValidator.validate() after each stage completes
- Check exists + valid
- Collect validation errors

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T009" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T011: Add execution timing tracking" \
  --body "Add execution timing tracking in \`src/demo/orchestrator.ts\`:
- Capture startTime/endTime for each stage
- Calculate elapsedMs
- Format as elapsedSeconds (e.g., \"3.1s\")

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T010" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T012: Generate ExecutionReport" \
  --body "Generate ExecutionReport in \`src/demo/orchestrator.ts\`:
- Aggregate totalTimeMs
- stagesCompleted
- stagesFailed
- artifacts array
- cleanupPerformed status

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T011" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T013: Add automatic cleanup logic" \
  --body "Add automatic cleanup logic in \`src/demo/orchestrator.ts\`:
- Call cleanupHandler.cleanup() if keep flag is false
- Set cleanupPerformed in report

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T012" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T014: Implement human-readable output formatter" \
  --body "Implement human-readable output formatter in \`src/demo/formatters.ts\`:
- formatHumanOutput() function
- Emoji indicators (🚀, ⏳, ✓, ✗, ✅, ❌)
- Stage progress
- Artifact paths
- Timing

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Parallelizable:** Yes (with T015)
**Depends on:** T013" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T015: Implement JSON output formatter" \
  --body "Implement JSON output formatter in \`src/demo/formatters.ts\`:
- formatJsonOutput() function
- Convert ExecutionReport to JSON schema per contracts/cli-interface.md

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Parallelizable:** Yes (with T014)
**Depends on:** T013" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T016: Create composition root factory" \
  --body "Create composition root factory in \`src/main.ts\`:
- createDemoRunner() function
- Wire NodeProcessExecutor, FileSystemArtifactValidator, FileSystemCleanupHandler to runDemo()

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T014, T015" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T017: Register demo subcommand in CLI" \
  --body "Register demo subcommand in \`src/cli/index.ts\`:
- Add \`.command('demo')\` with description
- Default action calling createDemoRunner().run()
- Error handling with emitError()

**User Story:** US1 - Quick Pipeline Validation (P1)
**Branch:** \`$BRANCH\`
**Phase:** 3 - User Story 1 (MVP)
**Depends on:** T016

✅ **CHECKPOINT:** At this point, \`sqsk demo --dry-run\` should complete all stages and show success report" \
  --label "$LABEL_ENHANCEMENT"

# Phase 4: User Story 2 - Dry-Run Testing (5 tasks)
echo "📁 Phase 4: User Story 2 - Dry-Run Testing"

gh issue create --repo "$REPO" --title "T018: Add --dry-run flag option" \
  --body "Add --dry-run flag option in \`src/cli/index.ts\`:
- Register \`.option('--dry-run', 'Simulate GitHub issue creation...', false)\`

**User Story:** US2 - Dry-Run Testing (P2)
**Branch:** \`$BRANCH\`
**Phase:** 4 - User Story 2
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T019: Modify issues stage for dry-run support" \
  --body "Modify issues stage in \`src/demo/orchestrator.ts\`:
- Detect dryRun flag in config
- Pass \`--dry-run\` argument to \`sqsk issues\` command when enabled

**User Story:** US2 - Dry-Run Testing (P2)
**Branch:** \`$BRANCH\`
**Phase:** 4 - User Story 2
**Depends on:** T018" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T020: Update stage validation for dry-run" \
  --body "Update stage validation in \`src/demo/orchestrator.ts\`:
- Skip artifact validation for issues stage when dryRun is true
- No artifact file created in dry-run mode

**User Story:** US2 - Dry-Run Testing (P2)
**Branch:** \`$BRANCH\`
**Phase:** 4 - User Story 2
**Depends on:** T019" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T021: Add dry-run indicator to human output" \
  --body "Add dry-run indicator to formatHumanOutput in \`src/demo/formatters.ts\`:
- Show \"(dry-run)\" suffix on issues stage output
- Display simulated issue count

**User Story:** US2 - Dry-Run Testing (P2)
**Branch:** \`$BRANCH\`
**Phase:** 4 - User Story 2
**Depends on:** T020" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T022: Add dryRun field to JSON output" \
  --body "Add dryRun field to JSON output in \`src/demo/formatters.ts\`:
- Include \`\"dryRun\": true/false\` in stages array and flags object

**User Story:** US2 - Dry-Run Testing (P2)
**Branch:** \`$BRANCH\`
**Phase:** 4 - User Story 2
**Depends on:** T021

✅ **CHECKPOINT:** User Stories 1 AND 2 should both work independently" \
  --label "$LABEL_ENHANCEMENT"

# Phase 5: User Story 3 - Artifact Inspection (4 tasks)
echo "📁 Phase 5: User Story 3 - Artifact Inspection"

gh issue create --repo "$REPO" --title "T023: Add --keep flag option" \
  --body "Add --keep flag option in \`src/cli/index.ts\`:
- Register \`.option('--keep', 'Preserve demo artifacts...', false)\`

**User Story:** US3 - Artifact Inspection (P3)
**Branch:** \`$BRANCH\`
**Phase:** 5 - User Story 3
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T024: Update cleanup logic for --keep flag" \
  --body "Update cleanup logic in \`src/demo/orchestrator.ts\`:
- Check config.flags.keep before calling cleanupHandler.cleanup()
- Skip cleanup if true
- Set cleanupPerformed = false in report

**User Story:** US3 - Artifact Inspection (P3)
**Branch:** \`$BRANCH\`
**Phase:** 5 - User Story 3
**Depends on:** T023" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T025: Add artifact preservation message" \
  --body "Add artifact preservation message to formatHumanOutput in \`src/demo/formatters.ts\`:
- Show retained directory path when keep=true
- Suggest inspection steps

**User Story:** US3 - Artifact Inspection (P3)
**Branch:** \`$BRANCH\`
**Phase:** 5 - User Story 3
**Depends on:** T024" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T026: Update cleanup status in JSON output" \
  --body "Update cleanup status in JSON output in \`src/demo/formatters.ts\`:
- Ensure \"cleanupPerformed\" field accurately reflects keep flag behavior

**User Story:** US3 - Artifact Inspection (P3)
**Branch:** \`$BRANCH\`
**Phase:** 5 - User Story 3
**Depends on:** T025

✅ **CHECKPOINT:** All core user stories should now be independently functional" \
  --label "$LABEL_ENHANCEMENT"

# Phase 6: User Story 4 - Verbose Debugging (4 tasks)
echo "📁 Phase 6: User Story 4 - Verbose Debugging"

gh issue create --repo "$REPO" --title "T027: Add verbose flag support to orchestrator" \
  --body "Add verbose flag support in \`src/demo/orchestrator.ts\`:
- Accept verbose from config.flags
- Pass to processExecutor.run() options

**User Story:** US4 - Verbose Debugging (P4)
**Branch:** \`$BRANCH\`
**Phase:** 6 - User Story 4
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T028: Enhance ProcessExecutor for verbose mode" \
  --body "Enhance ProcessExecutor in \`src/demo/adapters/process-executor.ts\`:
- When verbose=true, log command being executed
- Log full stdout/stderr streams
- Log exit codes

**User Story:** US4 - Verbose Debugging (P4)
**Branch:** \`$BRANCH\`
**Phase:** 6 - User Story 4
**Depends on:** T027" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T029: Enhance ArtifactValidator for verbose mode" \
  --body "Enhance ArtifactValidator in \`src/demo/adapters/artifact-validator.ts\`:
- When verbose=true, log frontmatter keys found
- Log section counts
- Log validation checks performed

**User Story:** US4 - Verbose Debugging (P4)
**Branch:** \`$BRANCH\`
**Phase:** 6 - User Story 4
**Depends on:** T028" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T030: Add verbose logging to formatHumanOutput" \
  --body "Add verbose logging to formatHumanOutput in \`src/demo/formatters.ts\`:
- Include command invocations when verbose flag set
- Include intermediate results
- Include validation details

**User Story:** US4 - Verbose Debugging (P4)
**Branch:** \`$BRANCH\`
**Phase:** 6 - User Story 4
**Depends on:** T029

✅ **CHECKPOINT:** All user stories complete - verbose debugging works" \
  --label "$LABEL_ENHANCEMENT"

# Phase 7: Error Handling & Edge Cases (6 tasks)
echo "📁 Phase 7: Error Handling & Edge Cases"

gh issue create --repo "$REPO" --title "T031: Add prerequisite validation" \
  --body "Add prerequisite validation in \`src/demo/orchestrator.ts\`:
- Check squadDir and specifyDir exist before starting pipeline
- Throw clear error if missing

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Parallelizable:** Yes
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T032: Add SIGINT handler for graceful shutdown" \
  --body "Add SIGINT handler in \`src/demo/orchestrator.ts\`:
- Register process.on('SIGINT', cleanup) to handle Ctrl+C interruption
- Ensure cleanup runs before exit

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Parallelizable:** Yes
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T033: Add timeout handling to ProcessExecutor" \
  --body "Add timeout handling in \`src/demo/adapters/process-executor.ts\`:
- Implement 30-second timeout per stage
- Kill subprocess on timeout
- Return error with \"timed out\" message

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Parallelizable:** Yes
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T034: Add path safety check to CleanupHandler" \
  --body "Add path safety check in \`src/demo/adapters/cleanup-handler.ts\`:
- Verify demoDir is under specs/ directory before deletion
- Prevent accidental deletion outside project

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Parallelizable:** Yes
**Depends on:** T017" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T035: Add error summary to formatHumanOutput" \
  --body "Add error summary to formatHumanOutput in \`src/demo/formatters.ts\`:
- Include troubleshooting section on failure with common fixes
- Suggest --verbose flag

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Depends on:** T030" \
  --label "$LABEL_ENHANCEMENT"

gh issue create --repo "$REPO" --title "T036: Add failure details to JSON output" \
  --body "Add failure details to JSON output in \`src/demo/formatters.ts\`:
- Include failedStage field
- Include errorSummary field
- Preserve error messages from failed stages

**Branch:** \`$BRANCH\`
**Phase:** 7 - Error Handling
**Depends on:** T035" \
  --label "$LABEL_ENHANCEMENT"

# Phase 8: Testing (9 tasks)
echo "📁 Phase 8: Testing"

gh issue create --repo "$REPO" --title "T037: Write entity validation tests" \
  --body "Write entity validation tests in \`tests/demo/entities.test.ts\`:
- Test DemoConfiguration validation rules
- Test stage status transitions
- Test ExecutionReport derived properties

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Unit tests
**Parallelizable:** Yes" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T038: Write port interface tests" \
  --body "Write port interface tests in \`tests/demo/ports.test.ts\`:
- Verify port signatures accept only DTOs
- No framework types leaked

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Unit tests
**Parallelizable:** Yes" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T039: Write orchestrator happy path test" \
  --body "Write orchestrator happy path test in \`tests/demo/orchestrator.test.ts\`:
- Mock all ports
- Verify all stages execute in order
- Success report generated

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Unit tests (Use Cases)
**Depends on:** T037, T038" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T040: Write orchestrator failure test" \
  --body "Write orchestrator failure test in \`tests/demo/orchestrator.test.ts\`:
- Mock stage failure
- Verify pipeline halts
- Error propagates correctly

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Unit tests (Use Cases)
**Parallelizable:** Yes (with T041)
**Depends on:** T039" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T041: Write orchestrator cleanup test" \
  --body "Write orchestrator cleanup test in \`tests/demo/orchestrator.test.ts\`:
- Verify cleanup called when keep=false
- Skipped when keep=true

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Unit tests (Use Cases)
**Parallelizable:** Yes (with T040)
**Depends on:** T039" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T042: Write ProcessExecutor integration tests" \
  --body "Write ProcessExecutor integration tests in \`tests/demo/adapters/process-executor.test.ts\`:
- Test with echo command
- Verify stdout capture
- Test timeout handling
- Test error handling

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Integration tests
**Parallelizable:** Yes" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T043: Write ArtifactValidator integration tests" \
  --body "Write ArtifactValidator integration tests in \`tests/demo/adapters/artifact-validator.test.ts\`:
- Create fixture markdown files
- Test validation rules
- Test frontmatter parsing errors

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Integration tests
**Parallelizable:** Yes" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T044: Write CleanupHandler integration tests" \
  --body "Write CleanupHandler integration tests in \`tests/demo/adapters/cleanup-handler.test.ts\`:
- Create temporary directories
- Verify deletion
- Test path safety checks

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** Integration tests
**Parallelizable:** Yes" \
  --label "$LABEL_TESTING"

gh issue create --repo "$REPO" --title "T045: Write full demo E2E test" \
  --body "Write full demo E2E test in \`tests/e2e/demo.test.ts\`:
- Run actual demo command with --dry-run --keep
- Verify all artifacts created
- Parse JSON output
- Verify cleanup behavior

**Branch:** \`$BRANCH\`
**Phase:** 8 - Testing
**Type:** E2E tests
**Depends on:** T042, T043, T044" \
  --label "$LABEL_TESTING"

# Phase 9: Documentation & Polish (5 tasks)
echo "📁 Phase 9: Documentation & Polish"

gh issue create --repo "$REPO" --title "T046: Add demo command to README.md" \
  --body "Add demo command to README.md usage section:
- Examples of \`npm run demo\`
- \`--dry-run\` flag
- \`--keep\` flag
- \`--verbose\` flag

**Branch:** \`$BRANCH\`
**Phase:** 9 - Documentation
**Parallelizable:** Yes" \
  --label "$LABEL_DOCS"

gh issue create --repo "$REPO" --title "T047: Update docs/usage.md with demo examples" \
  --body "Update docs/usage.md with demo examples:
- Show typical workflows
- Troubleshooting tips
- Expected output

**Branch:** \`$BRANCH\`
**Phase:** 9 - Documentation
**Parallelizable:** Yes" \
  --label "$LABEL_DOCS"

gh issue create --repo "$REPO" --title "T048: Add demo to API reference" \
  --body "Add demo to API reference in docs/api-reference.md:
- Document command options
- Exit codes
- JSON schema

**Branch:** \`$BRANCH\`
**Phase:** 9 - Documentation
**Parallelizable:** Yes" \
  --label "$LABEL_DOCS"

gh issue create --repo "$REPO" --title "T049: Validate quickstart.md checklist" \
  --body "Validate quickstart.md checklist:
- Run through verification checklist in quickstart.md
- Ensure all items pass

**Branch:** \`$BRANCH\`
**Phase:** 9 - Documentation
**Depends on:** T045" \
  --label "$LABEL_DOCS"

gh issue create --repo "$REPO" --title "T050: Run constitution compliance check" \
  --body "Run constitution compliance check:
- Verify all 5 Clean Architecture principles upheld
- Update Complexity Tracking if needed

**Principles to verify:**
- ✅ Principle I (Dependency Rule): All dependencies point inward
- ✅ Principle II (Clean Architecture Layers): Strict layer separation
- ✅ Principle III (Test-First by Layer): Tests cover all layers
- ✅ Principle IV (Simple Data Crosses Boundaries): Port interfaces use only DTOs
- ✅ Principle V (Framework Independence): Commander.js and child_process confined to adapter/CLI layers

**Branch:** \`$BRANCH\`
**Phase:** 9 - Documentation
**Depends on:** T049" \
  --label "$LABEL_DOCS"

echo ""
echo "✅ All 50 issues created successfully!"
echo ""
echo "📊 Summary:"
echo "  - Phase 1 (Setup): 3 issues"
echo "  - Phase 2 (Foundational): 4 issues"
echo "  - Phase 3 (US1 - MVP): 10 issues"
echo "  - Phase 4 (US2 - Dry-Run): 5 issues"
echo "  - Phase 5 (US3 - Artifact Inspection): 4 issues"
echo "  - Phase 6 (US4 - Verbose Debugging): 4 issues"
echo "  - Phase 7 (Error Handling): 6 issues"
echo "  - Phase 8 (Testing): 9 issues"
echo "  - Phase 9 (Documentation): 5 issues"
echo ""
echo "🔗 View issues: gh issue list --repo $REPO --label enhancement,testing,documentation"
