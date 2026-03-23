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
  const startTime = Date.now();
  const stages = createPipelineStages(config);
  const completedArtifacts: DemoArtifact[] = [];

  let stagesCompleted = 0;
  let stagesFailed = 0;
  let errorSummary: string | undefined;

  const timeoutMs = (config.timeout || 30) * 1000;

  // Execute stages sequentially with explicit status transitions
  for (const stage of stages) {
    const stageStartTime = Date.now();

    // Transition: pending → running
    stage.status = StageStatus.Running;
    stage.startTime = stageStartTime;

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

    if (result.success) {
      // Validate artifact after successful execution
      const artifactPath = `${config.demoDir}/${stage.artifact}`;
      const artifact = await deps.artifactValidator.validate(artifactPath, stage);
      completedArtifacts.push(artifact);

      if (artifact.valid) {
        // Transition: running → success (command ran and artifact is valid)
        stage.status = StageStatus.Success;
        stagesCompleted++;
      } else {
        // Transition: running → failed (command ran but artifact validation failed)
        stage.status = StageStatus.Failed;
        stage.error = `Artifact validation failed (${formatElapsedTime(stage.elapsedMs!)}): ${artifact.errors.join(', ')}`;
        stagesFailed++;
        errorSummary = `Artifact validation failed for ${stage.name}: ${artifact.errors.join(', ')}`;
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
      } else {
        errorParts.push(`Exit code: ${result.exitCode ?? 'unknown'}`);
      }
      if (result.stderr.trim()) {
        errorParts.push(`Error: ${result.stderr.trim().slice(0, 500)}`);
      }
      stage.error = errorParts.join('; ');

      errorSummary = `Stage '${stage.name}' failed: ${stage.error}`;

      // Halt pipeline on first failure (don't continue to next stage)
      break;
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
  };

  // Run cleanup (respects config.flags.keep)
  report = await deps.cleanupHandler.cleanup(config, report);

  return report;
}
