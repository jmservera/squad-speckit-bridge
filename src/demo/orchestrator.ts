/**
 * E2E Demo Orchestrator
 *
 * Core business logic for demo pipeline execution.
 * Pure orchestration - no I/O directly; all I/O via dependency injection.
 */

import type {
  DemoConfiguration,
  PipelineStage,
  ExecutionReport,
  ArtifactSummary,
  DemoArtifact,
} from './entities.js';
import { StageStatus } from './entities.js';
import type {
  ProcessExecutor,
  ArtifactValidator,
  CleanupHandler,
} from './ports.js';
import type { Logger } from '../cli/logger.js';
import { createNullLogger } from '../cli/logger.js';
import { generateTimestamp, formatFileSize, formatElapsedTime } from './utils.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Dependencies injected into the orchestrator.
 * Allows testing with mocks and swapping implementations.
 */
export interface DemoDependencies {
  processExecutor: ProcessExecutor;
  artifactValidator: ArtifactValidator;
  cleanupHandler: CleanupHandler;
  /** Optional logger for verbose diagnostics */
  logger?: Logger;
}

// ─────────────────────────────────────────────────────────────
// Pipeline Stage Definitions
// ─────────────────────────────────────────────────────────────

/**
 * Creates the 5 pipeline stages for demo execution.
 * Stages: specify → plan → tasks → review → issues
 */
export function createPipelineStages(config: DemoConfiguration): PipelineStage[] {
  return [
    {
      name: 'specify',
      displayName: 'Generating specification',
      command: ['speckit', 'specify', config.exampleFeature],
      artifact: 'spec.md',
      status: StageStatus.Pending,
    },
    {
      name: 'plan',
      displayName: 'Creating implementation plan',
      command: ['speckit', 'plan'],
      artifact: 'plan.md',
      status: StageStatus.Pending,
    },
    {
      name: 'tasks',
      displayName: 'Generating task breakdown',
      command: ['speckit', 'tasks'],
      artifact: 'tasks.md',
      status: StageStatus.Pending,
    },
    {
      name: 'review',
      displayName: 'Running quality review',
      command: ['speckit', 'analyze'],
      artifact: 'review.md',
      status: StageStatus.Pending,
    },
    {
      name: 'issues',
      displayName: 'Creating GitHub issues',
      command: config.flags.dryRun
        ? ['speckit', 'taskstoissues', '--dry-run']
        : ['speckit', 'taskstoissues'],
      artifact: 'issues.json',
      status: StageStatus.Pending,
    },
  ];
}

/**
 * Generates a unique demo directory path under specs/.
 */
export function createDemoDirectory(): string {
  const timestamp = generateTimestamp();
  return `specs/demo-${timestamp}`;
}

// ─────────────────────────────────────────────────────────────
// Orchestrator Core
// ─────────────────────────────────────────────────────────────

/**
 * Executes the demo pipeline end-to-end.
 *
 * @param config - Demo configuration with flags and paths
 * @param deps - Injected dependencies for I/O operations
 * @returns Execution report with timing, artifacts, and status
 */
export async function runDemo(
  config: DemoConfiguration,
  deps: DemoDependencies
): Promise<ExecutionReport> {
  const logger = deps.logger ?? createNullLogger();
  const verbose = config.flags.verbose;
  const startTime = Date.now();
  const stages = createPipelineStages(config);
  const completedArtifacts: DemoArtifact[] = [];
  const warnings: string[] = [];

  let stagesCompleted = 0;
  let stagesFailed = 0;
  let errorSummary: string | undefined;

  const timeoutMs = (config.timeout || 30) * 1000;

  logger.verbose(`Pipeline starting with ${stages.length} stages`);
  logger.verbose(`Configuration: demoDir=${config.demoDir}, timeout=${config.timeout}s, dryRun=${config.flags.dryRun}, keep=${config.flags.keep}`);

  // Execute stages sequentially with explicit status transitions
  for (const stage of stages) {
    const stageStartTime = Date.now();

    // Transition: pending → running
    stage.status = StageStatus.Running;
    stage.startTime = stageStartTime;

    logger.verbose(`[${stage.name}] Starting: ${stage.displayName}`);
    logger.verbose(`[${stage.name}] Command: ${stage.command.join(' ')}`);

    // Execute stage via processExecutor.run() with output capture
    const result = await deps.processExecutor.run(
      stage.command,
      config.demoDir,
      timeoutMs
    );

    const stageEndTime = Date.now();
    stage.endTime = stageEndTime;
    stage.elapsedMs = stageEndTime - stageStartTime;

    // Capture stdout/stderr in stage result
    stage.output = {
      stdout: result.stdout,
      stderr: result.stderr,
    };

    logger.verbose(`[${stage.name}] Completed in ${formatElapsedTime(stage.elapsedMs)}`);

    if (result.success) {
      logger.verbose(`[${stage.name}] Command succeeded (exit code 0)`);

      // Validate artifact after successful execution
      const artifactPath = `${config.demoDir}/${stage.artifact}`;

      logger.verbose(`[${stage.name}] Validating artifact: ${artifactPath}`);

      const artifact = await deps.artifactValidator.validate(artifactPath, stage);
      completedArtifacts.push(artifact);

      if (artifact.valid) {
        // Transition: running → success (command ran and artifact is valid)
        stage.status = StageStatus.Success;
        stagesCompleted++;
        logger.verbose(`[${stage.name}] ✓ Stage passed — artifact valid (${formatFileSize(artifact.sizeBytes)})`);
      } else {
        // Transition: running → failed (command ran but artifact validation failed)
        stage.status = StageStatus.Failed;
        stage.error = `Artifact validation failed (${formatElapsedTime(stage.elapsedMs!)}): ${artifact.errors.join(', ')}`;
        stagesFailed++;
        errorSummary = `Artifact validation failed for ${stage.name}: ${artifact.errors.join(', ')}`;
        logger.verbose(`[${stage.name}] ✗ Artifact validation failed: ${artifact.errors.join(', ')}`);
        warnings.push(`Stage '${stage.name}' artifact validation failed: ${artifact.errors.join(', ')}`);
        // Halt pipeline on first failure
        break;
      }
    } else {
      // Transition: running → failed
      stage.status = StageStatus.Failed;
      stagesFailed++;

      // Build error message with captured stderr
      const errorParts: string[] = [
        `Command: ${stage.command.join(' ')}`,
        `Duration: ${formatElapsedTime(stage.elapsedMs!)}`,
      ];
      if (result.timedOut) {
        errorParts.push('Status: Timed out');
        warnings.push(`Stage '${stage.name}' timed out after ${formatElapsedTime(stage.elapsedMs!)}`);
      } else {
        errorParts.push(`Exit code: ${result.exitCode ?? 'unknown'}`);
      }
      if (result.stderr.trim()) {
        errorParts.push(`Error: ${result.stderr.trim().slice(0, 500)}`);
        warnings.push(`Stage '${stage.name}' stderr: ${result.stderr.trim().slice(0, 200)}`);
      }
      stage.error = errorParts.join('; ');

      errorSummary = `Stage '${stage.name}' failed: ${stage.error}`;

      logger.verbose(`[${stage.name}] ✗ Stage failed: ${stage.error}`);

      // Halt pipeline on first failure (don't continue to next stage)
      break;
    }
  }

  // Log skipped stages
  for (const stage of stages) {
    if (stage.status === StageStatus.Pending) {
      logger.verbose(`[${stage.name}] Skipped (pipeline halted)`);
      warnings.push(`Stage '${stage.name}' was skipped due to earlier failure`);
    }
  }

  const totalTimeMs = Date.now() - startTime;

  logger.verbose(`Pipeline finished: ${stagesCompleted} passed, ${stagesFailed} failed, total ${formatElapsedTime(totalTimeMs)}`);

  // Build artifact summaries
  const artifacts: ArtifactSummary[] = completedArtifacts
    .filter((a) => a.exists && a.valid)
    .map((a) => ({
      name: a.path.split('/').pop() ?? a.path,
      path: a.path,
      sizeKB: formatFileSize(a.sizeBytes),
    }));

  // Build initial report
  let report: ExecutionReport = {
    totalTimeMs,
    stagesCompleted,
    stagesFailed,
    artifacts,
    cleanupPerformed: false,
    errorSummary,
    stages: verbose ? [...stages] : undefined,
    warnings: verbose ? warnings : undefined,
  };

  // Automatic cleanup logic:
  // - If keep=false AND all stages succeeded: perform cleanup
  // - If keep=true OR any stage failed: skip cleanup (preserve artifacts for debugging)
  const allStagesSucceeded = stagesFailed === 0;
  if (!config.flags.keep && allStagesSucceeded) {
    logger.verbose('Performing cleanup (keep=false, all stages passed)');
    report = await deps.cleanupHandler.cleanup(config, report);
    logger.verbose(`Cleanup ${report.cleanupPerformed ? 'completed' : 'skipped'}`);
  } else {
    logger.verbose(`Cleanup skipped (keep=${config.flags.keep}, allPassed=${allStagesSucceeded})`);
  }
  // Otherwise, cleanupPerformed remains false (artifacts preserved)

  return report;
}
