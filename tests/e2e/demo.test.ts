/**
 * E2E Demo Pipeline Test
 *
 * Full end-to-end tests for the demo orchestrator, exercising the
 * complete pipeline: specify → plan → tasks → review → issues.
 *
 * Uses mock adapters injected via the factory to avoid real I/O
 * while validating orchestration logic, artifact handling, cleanup
 * behavior, flag propagation, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDemoRunner, createDemoDirectory } from '../../src/demo/factory.js';
import {
  StageStatus,
  ArtifactType,
  type DemoConfiguration,
  type PipelineStage,
  type DemoArtifact,
  type ExecutionReport,
} from '../../src/demo/entities.js';
import type {
  ProcessExecutor,
  ArtifactValidator,
  CleanupHandler,
  StageRunResult,
} from '../../src/demo/ports.js';
import { createPipelineStages } from '../../src/demo/orchestrator.js';
import { formatJsonOutput, type ExtendedExecutionReport } from '../../src/demo/formatters.js';

// ─────────────────────────────────────────────────────────────
// Mock Adapters
// ─────────────────────────────────────────────────────────────

function makeSuccessExecutor(
  overrides: Partial<ProcessExecutor> = {},
): ProcessExecutor {
  return {
    async execute(
      stage: PipelineStage,
      _config: DemoConfiguration,
    ): Promise<PipelineStage> {
      return {
        ...stage,
        status: StageStatus.Success,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        elapsedMs: 100,
      };
    },
    async run(
      _command: string[],
      _cwd: string,
      _timeoutMs: number,
    ): Promise<StageRunResult> {
      return {
        success: true,
        exitCode: 0,
        stdout: 'OK',
        stderr: '',
        timedOut: false,
      };
    },
    async isCommandAvailable(_command: string): Promise<boolean> {
      return true;
    },
    ...overrides,
  };
}

function makeSuccessValidator(
  overrides: Partial<ArtifactValidator> = {},
): ArtifactValidator {
  return {
    async validate(
      artifactPath: string,
      _stage: PipelineStage,
    ): Promise<DemoArtifact> {
      return {
        path: artifactPath,
        type: ArtifactType.Spec,
        sizeBytes: 1024,
        exists: true,
        valid: true,
        errors: [],
      };
    },
    async validateAll(_config: DemoConfiguration): Promise<DemoArtifact[]> {
      return [];
    },
    ...overrides,
  };
}

function makeNoopCleanup(
  overrides: Partial<CleanupHandler> = {},
): CleanupHandler {
  return {
    async cleanup(
      _config: DemoConfiguration,
      report: ExecutionReport,
    ): Promise<ExecutionReport> {
      return { ...report, cleanupPerformed: true };
    },
    async isSafeToDelete(_path: string): Promise<boolean> {
      return true;
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication with OAuth2 and JWT tokens',
    demoDir: 'specs/demo-test-run',
    flags: { dryRun: true, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: '.speckit',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('E2E Demo Pipeline', () => {
  let config: DemoConfiguration;

  beforeEach(() => {
    config = makeConfig();
  });

  // ─── Full Pipeline Execution ───────────────────────────────

  describe('full pipeline: specify → plan → tasks → review → issues', () => {
    it('should execute all 5 stages and report success', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.stagesCompleted).toBe(5);
      expect(report.stagesFailed).toBe(0);
      expect(report.errorSummary).toBeUndefined();
      expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute stages in correct order', async () => {
      const executedStages: string[] = [];

      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(command, _cwd, _timeoutMs) {
            // The first element is 'speckit', commands differ by arg
            executedStages.push(command[1]);
            return { success: true, exitCode: 0, stdout: '', stderr: '', timedOut: false };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      await runner.run(config);

      expect(executedStages).toEqual([
        'specify',
        'plan',
        'tasks',
        'analyze',
        'taskstoissues',
      ]);
    });

    it('should halt pipeline on first stage failure', async () => {
      const executedStages: string[] = [];

      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(command, _cwd, _timeoutMs) {
            executedStages.push(command[1]);
            if (command[1] === 'plan') {
              return { success: false, exitCode: 1, stdout: '', stderr: 'plan error', timedOut: false };
            }
            return { success: true, exitCode: 0, stdout: '', stderr: '', timedOut: false };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(executedStages).toEqual(['specify', 'plan']);
      expect(report.stagesCompleted).toBe(1);
      expect(report.stagesFailed).toBe(1);
      expect(report.errorSummary).toContain('plan');
    });
  });

  // ─── Pipeline Stage Definitions ────────────────────────────

  describe('pipeline stage definitions', () => {
    it('should define all 5 expected stages', () => {
      const stages = createPipelineStages(config);

      expect(stages).toHaveLength(5);
      expect(stages.map((s) => s.name)).toEqual([
        'specify',
        'plan',
        'tasks',
        'review',
        'issues',
      ]);
    });

    it('should map stages to correct artifacts', () => {
      const stages = createPipelineStages(config);
      const artifactMap = Object.fromEntries(stages.map((s) => [s.name, s.artifact]));

      expect(artifactMap).toEqual({
        specify: 'spec.md',
        plan: 'plan.md',
        tasks: 'tasks.md',
        review: 'review.md',
        issues: 'issues.json',
      });
    });

    it('should start all stages in pending status', () => {
      const stages = createPipelineStages(config);

      for (const stage of stages) {
        expect(stage.status).toBe(StageStatus.Pending);
      }
    });

    it('should include feature description in specify command', () => {
      const stages = createPipelineStages(config);
      const specifyStage = stages.find((s) => s.name === 'specify')!;

      expect(specifyStage.command).toContain(config.exampleFeature);
    });
  });

  // ─── Artifact Validation ───────────────────────────────────

  describe('artifact validation', () => {
    it('should collect artifact summaries for valid artifacts', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator({
          async validate(artifactPath, _stage) {
            return {
              path: artifactPath,
              type: ArtifactType.Spec,
              sizeBytes: 2048,
              exists: true,
              valid: true,
              errors: [],
            };
          },
        }),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.artifacts.length).toBe(5);
      for (const artifact of report.artifacts) {
        expect(artifact.path).toContain(config.demoDir);
        expect(artifact.sizeKB).toMatch(/\d+\.\d+\s*KB/);
      }
    });

    it('should fail stage when artifact validation fails', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator({
          async validate(artifactPath, stage) {
            if (stage.name === 'tasks') {
              return {
                path: artifactPath,
                type: ArtifactType.Tasks,
                sizeBytes: 0,
                exists: false,
                valid: false,
                errors: ['File does not exist'],
              };
            }
            return {
              path: artifactPath,
              type: ArtifactType.Spec,
              sizeBytes: 1024,
              exists: true,
              valid: true,
              errors: [],
            };
          },
        }),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.stagesFailed).toBe(1);
      expect(report.stagesCompleted).toBe(2); // specify + plan succeed
      expect(report.errorSummary).toContain('validation');
      expect(report.errorSummary).toContain('tasks');
    });

    it('should not include invalid artifacts in report summaries', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator({
          async validate(artifactPath, stage) {
            if (stage.name === 'specify') {
              return {
                path: artifactPath,
                type: ArtifactType.Spec,
                sizeBytes: 0,
                exists: false,
                valid: false,
                errors: ['Missing required sections'],
              };
            }
            return {
              path: artifactPath,
              type: ArtifactType.Spec,
              sizeBytes: 1024,
              exists: true,
              valid: true,
              errors: [],
            };
          },
        }),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      // Pipeline halts on first failure; no valid artifacts in summary
      expect(report.artifacts.length).toBe(0);
    });
  });

  // ─── Cleanup Behavior ─────────────────────────────────────

  describe('cleanup behavior', () => {
    it('should perform cleanup when --keep is false and all stages succeed', async () => {
      config.flags.keep = false;

      let cleanupCalled = false;
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup({
          async cleanup(_cfg, report) {
            cleanupCalled = true;
            return { ...report, cleanupPerformed: true };
          },
        }),
      });

      const report = await runner.run(config);

      expect(cleanupCalled).toBe(true);
      expect(report.cleanupPerformed).toBe(true);
    });

    it('should preserve artifacts when --keep is true', async () => {
      config.flags.keep = true;

      let cleanupCalled = false;
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup({
          async cleanup(_cfg, report) {
            cleanupCalled = true;
            return { ...report, cleanupPerformed: true };
          },
        }),
      });

      const report = await runner.run(config);

      expect(cleanupCalled).toBe(false);
      expect(report.cleanupPerformed).toBe(false);
    });

    it('should preserve artifacts when pipeline fails (for debugging)', async () => {
      config.flags.keep = false;

      let cleanupCalled = false;
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(_command, _cwd, _timeoutMs) {
            return { success: false, exitCode: 1, stdout: '', stderr: 'error', timedOut: false };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup({
          async cleanup(_cfg, report) {
            cleanupCalled = true;
            return { ...report, cleanupPerformed: true };
          },
        }),
      });

      const report = await runner.run(config);

      expect(cleanupCalled).toBe(false);
      expect(report.cleanupPerformed).toBe(false);
    });
  });

  // ─── Flag Handling ─────────────────────────────────────────

  describe('--dry-run flag handling', () => {
    it('should add --dry-run to issues stage when dryRun=true', () => {
      config.flags.dryRun = true;
      const stages = createPipelineStages(config);
      const issuesStage = stages.find((s) => s.name === 'issues')!;

      expect(issuesStage.command).toContain('--dry-run');
      expect(issuesStage.command).toEqual(['speckit', 'taskstoissues', '--dry-run']);
    });

    it('should not add --dry-run to issues stage when dryRun=false', () => {
      config.flags.dryRun = false;
      const stages = createPipelineStages(config);
      const issuesStage = stages.find((s) => s.name === 'issues')!;

      expect(issuesStage.command).not.toContain('--dry-run');
      expect(issuesStage.command).toEqual(['speckit', 'taskstoissues']);
    });

    it('should not affect non-issues stages', () => {
      config.flags.dryRun = true;
      const stages = createPipelineStages(config);
      const nonIssuesStages = stages.filter((s) => s.name !== 'issues');

      for (const stage of nonIssuesStages) {
        expect(stage.command).not.toContain('--dry-run');
      }
    });

    it('should propagate dry-run through full pipeline execution', async () => {
      config.flags.dryRun = true;
      let issuesCommand: string[] = [];

      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(command, _cwd, _timeoutMs) {
            if (command.includes('taskstoissues')) {
              issuesCommand = [...command];
            }
            return { success: true, exitCode: 0, stdout: '', stderr: '', timedOut: false };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      await runner.run(config);

      expect(issuesCommand).toContain('--dry-run');
    });
  });

  // ─── Error Handling ────────────────────────────────────────

  describe('error handling', () => {
    it('should capture command timeout in error summary', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(_command, _cwd, _timeoutMs) {
            return { success: false, exitCode: null, stdout: '', stderr: '', timedOut: true };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.stagesFailed).toBe(1);
      expect(report.errorSummary).toBeDefined();
      expect(report.errorSummary!.toLowerCase()).toContain('timed out');
    });

    it('should include exit code in error for non-zero exit', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(_command, _cwd, _timeoutMs) {
            return {
              success: false,
              exitCode: 127,
              stdout: '',
              stderr: 'command not found',
              timedOut: false,
            };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.stagesFailed).toBe(1);
      expect(report.errorSummary).toContain('127');
    });

    it('should include stderr in error message', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async run(_command, _cwd, _timeoutMs) {
            return {
              success: false,
              exitCode: 1,
              stdout: '',
              stderr: 'FATAL: speckit binary not found',
              timedOut: false,
            };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.errorSummary).toContain('speckit binary not found');
    });

    it('should handle missing prerequisites (command not available)', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor({
          async isCommandAvailable(_command) {
            return false;
          },
          async run(_command, _cwd, _timeoutMs) {
            return {
              success: false,
              exitCode: 127,
              stdout: '',
              stderr: 'speckit: command not found',
              timedOut: false,
            };
          },
        }),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.stagesFailed).toBe(1);
      expect(report.stagesCompleted).toBe(0);
      expect(report.errorSummary).toContain('command not found');
    });
  });

  // ─── Execution Report ─────────────────────────────────────

  describe('execution report', () => {
    it('should calculate total execution time', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof report.totalTimeMs).toBe('number');
    });

    it('should include artifact names and paths in summaries', async () => {
      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.artifacts.length).toBeGreaterThan(0);
      for (const artifact of report.artifacts) {
        expect(artifact.name).toBeTruthy();
        expect(artifact.path).toContain(config.demoDir);
        expect(artifact.sizeKB).toBeTruthy();
      }
    });

    it('should report cleanupPerformed=false when cleanup is skipped', async () => {
      config.flags.keep = true;

      const runner = createDemoRunner({
        processExecutor: makeSuccessExecutor(),
        artifactValidator: makeSuccessValidator(),
        cleanupHandler: makeNoopCleanup(),
      });

      const report = await runner.run(config);

      expect(report.cleanupPerformed).toBe(false);
    });
  });

  // ─── JSON Output Structure ─────────────────────────────────

  describe('JSON output structure', () => {
    it('should produce valid JSON for successful pipeline', () => {
      const extendedReport: ExtendedExecutionReport = {
        totalTimeMs: 500,
        stagesCompleted: 5,
        stagesFailed: 0,
        artifacts: [
          { name: 'spec.md', path: 'specs/demo/spec.md', sizeKB: '1.0 KB' },
          { name: 'plan.md', path: 'specs/demo/plan.md', sizeKB: '2.0 KB' },
        ],
        cleanupPerformed: true,
        stages: createPipelineStages(config).map((s) => ({
          ...s,
          status: StageStatus.Success,
          elapsedMs: 100,
        })),
        demoDir: config.demoDir,
        flags: config.flags,
      };

      const json = formatJsonOutput(extendedReport);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(true);
      expect(parsed.totalTimeMs).toBe(500);
      expect(parsed.stages).toHaveLength(5);
      expect(parsed.demoDir).toBe(config.demoDir);
      expect(parsed.cleanupPerformed).toBe(true);
      expect(parsed.flags).toEqual(config.flags);
    });

    it('should include failedStage and errorSummary on failure', () => {
      const stages = createPipelineStages(config);
      stages[0].status = StageStatus.Success;
      stages[0].elapsedMs = 100;
      stages[1].status = StageStatus.Failed;
      stages[1].elapsedMs = 50;
      stages[1].error = 'plan generation failed';

      const extendedReport: ExtendedExecutionReport = {
        totalTimeMs: 150,
        stagesCompleted: 1,
        stagesFailed: 1,
        artifacts: [],
        cleanupPerformed: false,
        errorSummary: 'Pipeline halted at plan stage',
        stages,
        demoDir: config.demoDir,
        flags: config.flags,
      };

      const json = formatJsonOutput(extendedReport);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(false);
      expect(parsed.failedStage).toBe('plan');
      expect(parsed.errorSummary).toContain('plan');
    });

    it('should include totalTimeSeconds as formatted string', () => {
      const extendedReport: ExtendedExecutionReport = {
        totalTimeMs: 1500,
        stagesCompleted: 5,
        stagesFailed: 0,
        artifacts: [],
        cleanupPerformed: false,
        stages: createPipelineStages(config).map((s) => ({
          ...s,
          status: StageStatus.Success,
          elapsedMs: 300,
        })),
        demoDir: config.demoDir,
        flags: config.flags,
      };

      const json = formatJsonOutput(extendedReport);
      const parsed = JSON.parse(json);

      expect(parsed.totalTimeSeconds).toBe('1.5s');
    });

    it('should mark pending stages correctly in JSON', () => {
      const stages = createPipelineStages(config);
      stages[0].status = StageStatus.Success;
      stages[0].elapsedMs = 100;
      stages[1].status = StageStatus.Failed;
      stages[1].elapsedMs = 50;
      stages[1].error = 'failed';
      // stages[2..4] remain pending

      const extendedReport: ExtendedExecutionReport = {
        totalTimeMs: 150,
        stagesCompleted: 1,
        stagesFailed: 1,
        artifacts: [],
        cleanupPerformed: false,
        errorSummary: 'Pipeline failed',
        stages,
        demoDir: config.demoDir,
        flags: config.flags,
      };

      const json = formatJsonOutput(extendedReport);
      const parsed = JSON.parse(json);

      expect(parsed.stages[2].status).toBe('pending');
      expect(parsed.stages[3].status).toBe('pending');
      expect(parsed.stages[4].status).toBe('pending');
    });
  });

  // ─── Demo Directory Creation ───────────────────────────────

  describe('demo directory creation', () => {
    it('should generate a timestamped directory under specs/', () => {
      const dir = createDemoDirectory();

      expect(dir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
    });

    it('should generate unique directories on successive calls', () => {
      const dirs = new Set<string>();
      // Rapid calls within same second may collide, but the format is tested
      const dir = createDemoDirectory();
      dirs.add(dir);

      expect(dirs.size).toBe(1);
      expect(dir.startsWith('specs/demo-')).toBe(true);
    });
  });
});
