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
  PrerequisiteResult,
  ErrorEntry,
  WarningEntry,
} from './entities.js';
import { StageStatus } from './entities.js';
import type {
  ProcessExecutor,
  ArtifactValidator,
  CleanupHandler,
} from './ports.js';
import type { Logger } from '../cli/logger.js';
import { resolve, relative } from 'node:path';
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
// T031: Prerequisite Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validates that all prerequisites are met before running the pipeline.
 * Checks: command availability, config validity, feature description.
 */
export async function validatePrerequisites(
  config: DemoConfiguration,
  deps: DemoDependencies
): Promise<PrerequisiteResult> {
  const errors: string[] = [];

  // Check speckit command is available
  const speckitAvailable = await deps.processExecutor.isCommandAvailable('speckit');
  if (!speckitAvailable) {
    errors.push('Spec Kit command not found — install Spec Kit or add "speckit" to PATH.');
  }

  // Check timeout is valid
  if (!config.timeout || config.timeout <= 0) {
    errors.push(`Invalid timeout value: ${config.timeout}. Must be a positive number.`);
  }

  // Check feature description is non-empty
  if (!config.exampleFeature || config.exampleFeature.trim().length === 0) {
    errors.push('Feature description is empty. Provide a feature description to specify.');
  }

  // Check demoDir is under specs/ using resolve()+relative() containment check
  const resolvedDemo = resolve(config.demoDir);
  const relativeDemo = relative(resolve('specs'), resolvedDemo);
  if (!relativeDemo || relativeDemo.startsWith('..') || relativeDemo === '.') {
    errors.push(`Demo directory "${config.demoDir}" must be under specs/.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────
// Orchestrator Core
// ─────────────────────────────────────────────────────────────

/**
 * Options for controlling pipeline execution.
 */
export interface RunDemoOptions {
  /** T032: AbortSignal for graceful shutdown on SIGINT */
  signal?: AbortSignal;
}

/**
 * Executes the demo pipeline end-to-end.
 *
 * @param config - Demo configuration with flags and paths
 * @param deps - Injected dependencies for I/O operations
 * @param options - Optional execution controls (abort signal)
 * @returns Execution report with timing, artifacts, and status
 */
export async function runDemo(
  config: DemoConfiguration,
  deps: DemoDependencies,
  options?: RunDemoOptions
): Promise<ExecutionReport> {
  const startTime = Date.now();
  const errors: ErrorEntry[] = [];
  const warnings: (WarningEntry | string)[] = [];
  const logger = deps.logger;

  // T031: Validate prerequisites before running
  const prereqs = await validatePrerequisites(config, deps);
  if (!prereqs.valid) {
    // If the only error is command unavailability, report as a stage failure
    const isCommandOnlyFailure = prereqs.errors.length === 1
      && prereqs.errors[0].includes('command not found');
    return {
      totalTimeMs: Date.now() - startTime,
      stagesCompleted: 0,
      stagesFailed: isCommandOnlyFailure ? 1 : 0,
      artifacts: [],
      cleanupPerformed: false,
      errorSummary: `Prerequisite check failed: ${prereqs.errors.join('; ')}`,
      errors: prereqs.errors.map(msg => ({
        stage: 'prerequisites',
        message: msg,
        code: 'PREREQUISITE_FAILED',
        timestamp: new Date().toISOString(),
      })),
      warnings: [],
      kept: false,
      artifactPaths: [],
    };
  }

  const stages = createPipelineStages(config);
  const completedArtifacts: DemoArtifact[] = [];

  let stagesCompleted = 0;
  let stagesFailed = 0;
  let errorSummary: string | undefined;

  const timeoutMs = (config.timeout || 30) * 1000;

  // Verbose: log pipeline start
  logger?.verbose(`Pipeline starting with ${stages.length} stages`);
  logger?.verbose(`demoDir=${config.demoDir}`);
  logger?.verbose(`timeout=${config.timeout}s`);

  // Track whether pipeline was halted
  let pipelineHalted = false;

  // Execute stages sequentially with explicit status transitions
  for (const stage of stages) {
    // T032: Check for abort signal before each stage
    if (options?.signal?.aborted) {
      errorSummary = errorSummary ?? 'Pipeline interrupted by user (SIGINT)';
      warnings.push({
        stage: stage.name,
        message: 'Stage skipped due to pipeline interruption',
        timestamp: new Date().toISOString(),
      });
      break;
    }

    // If pipeline was halted by a previous failure, log skipped stages
    if (pipelineHalted) {
      logger?.verbose(`[${stage.name}] Skipped (pipeline halted)`);
      if (config.flags.verbose) {
        warnings.push(`Stage '${stage.name}' was skipped due to earlier failure`);
      }
      continue;
    }

    const stageStartTime = Date.now();

    // Transition: pending → running
    stage.status = StageStatus.Running;
    stage.startTime = stageStartTime;

    // Verbose: log stage start
    logger?.verbose(`[${stage.name}] Starting`);
    logger?.verbose(`[${stage.name}] Command: ${stage.command.join(' ')}`);

    // Execute stage via processExecutor.run() with output capture
    const result = await deps.processExecutor.run(
      stage.command,
      config.demoDir,
      timeoutMs
    );

    const stageEndTime = Date.now();
    stage.endTime = stageEndTime;
    stage.elapsedMs = stageEndTime - stageStartTime;

    // Verbose: log completion timing
    logger?.verbose(`[${stage.name}] Completed in ${formatElapsedTime(stage.elapsedMs)}`);

    // T032: Check for abort after execution completes
    if (options?.signal?.aborted) {
      errorSummary = 'Pipeline interrupted by user (SIGINT)';
      warnings.push({
        stage: stage.name,
        message: 'Pipeline interrupted during stage execution',
        timestamp: new Date().toISOString(),
      });
      break;
    }

    // Capture stdout/stderr in stage result
    stage.output = {
      stdout: result.stdout,
      stderr: result.stderr,
    };

    if (result.success) {
      // Validate artifact after successful execution
      const artifactPath = `${config.demoDir}/${stage.artifact}`;
      const artifact = await deps.artifactValidator.validate(artifactPath, stage);
      completedArtifacts.push(artifact);

      if (artifact.valid) {
        // Transition: running → success (command ran and artifact is valid)
        stage.status = StageStatus.Success;
        stagesCompleted++;
        logger?.verbose(`[${stage.name}] ✓ Stage passed`);
      } else {
        // Transition: running → failed (command ran but artifact validation failed)
        stage.status = StageStatus.Failed;
        stage.error = `Artifact validation failed (${formatElapsedTime(stage.elapsedMs!)}): ${artifact.errors.join(', ')}`;
        stagesFailed++;
        errorSummary = `Artifact validation failed for ${stage.name}: ${artifact.errors.join(', ')}`;
        errors.push({
          stage: stage.name,
          message: stage.error,
          code: 'ARTIFACT_VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        logger?.verbose(`[${stage.name}] ✗ Stage failed`);
        logger?.verbose(`Artifact validation failed: ${artifact.errors.join(', ')}`);
        pipelineHalted = true;
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
      // T033: Report timeout as specific error type
      if (result.timedOut) {
        errorParts.push('Status: Timed out');
        errors.push({
          stage: stage.name,
          message: `Process timed out after ${formatElapsedTime(stage.elapsedMs!)}: ${stage.command.join(' ')}`,
          code: 'PROCESS_TIMEOUT',
          timestamp: new Date().toISOString(),
        });
      } else {
        errorParts.push(`Exit code: ${result.exitCode ?? 'unknown'}`);
        errors.push({
          stage: stage.name,
          message: `Command failed with exit code ${result.exitCode ?? 'unknown'}: ${stage.command.join(' ')}`,
          code: 'STAGE_EXECUTION_FAILED',
          timestamp: new Date().toISOString(),
        });
      }
      if (result.stderr.trim()) {
        errorParts.push(`Error: ${result.stderr.trim().slice(0, 500)}`);
      }
      stage.error = errorParts.join('; ');

      errorSummary = `Stage '${stage.name}' failed: ${stage.error}`;
      logger?.verbose(`[${stage.name}] ✗ Stage failed`);
      pipelineHalted = true;
    }
  }

  const totalTimeMs = Date.now() - startTime;

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
    errors,
    warnings,
    kept: config.flags.keep,
    artifactPaths: config.flags.keep
      ? [config.demoDir, ...artifacts.map(a => a.path)]
      : [],
  };

  // Include stages in report when verbose mode is active
  if (config.flags.verbose) {
    report.stages = stages;
  }

  // Automatic cleanup logic:
  // - If keep=true: skip cleanup (user wants to preserve artifacts)
  // - If keep=false AND (all stages succeeded OR pipeline was interrupted): perform cleanup
  // - If keep=false AND a stage failed: skip cleanup (preserve for debugging)
  const pipelineInterrupted = !!options?.signal?.aborted;
  const allStagesSucceeded = stagesFailed === 0 && !pipelineInterrupted;
  if (!config.flags.keep && (allStagesSucceeded || pipelineInterrupted)) {
    logger?.verbose('Performing cleanup');
    report = await deps.cleanupHandler.cleanup(config, report);
  }
  // Otherwise, cleanupPerformed remains false (artifacts preserved)

  logger?.verbose(`Pipeline finished: ${stagesCompleted} completed, ${stagesFailed} failed`);

  return report;
}
