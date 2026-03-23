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
import { generateTimestamp, formatFileSize } from './utils.js';

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

  // Execute stages sequentially
  for (const stage of stages) {
    // Execute stage via process executor
    const executedStage = await deps.processExecutor.execute(stage, config);

    if (executedStage.status === StageStatus.Success) {
      // Validate artifact after successful execution
      const artifactPath = `${config.demoDir}/${executedStage.artifact}`;
      const artifact = await deps.artifactValidator.validate(artifactPath, executedStage);
      completedArtifacts.push(artifact);

      if (artifact.valid) {
        stagesCompleted++;
      } else {
        stagesFailed++;
        errorSummary = `Artifact validation failed for ${executedStage.name}: ${artifact.errors.join(', ')}`;
        break;
      }
    } else if (executedStage.status === StageStatus.Failed) {
      stagesFailed++;
      errorSummary = `Stage '${executedStage.name}' failed: ${executedStage.error ?? 'Unknown error'}`;
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
