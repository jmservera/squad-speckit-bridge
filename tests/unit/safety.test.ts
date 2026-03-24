/**
 * T031-T036: Safety and Output Enhancement Tests
 *
 * Comprehensive tests for prerequisite validation, graceful shutdown,
 * timeout handling, path safety, error summary, and JSON error reporting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePrerequisites,
  runDemo,
  createPipelineStages,
  type DemoDependencies,
  type RunDemoOptions,
} from '../../src/demo/orchestrator.js';
import type {
  DemoConfiguration,
  ExecutionReport,
  PipelineStage,
  DemoArtifact,
  ErrorEntry,
  WarningEntry,
} from '../../src/demo/entities.js';
import { StageStatus, ArtifactType } from '../../src/demo/entities.js';
import type { ProcessExecutor, StageRunResult, ArtifactValidator, CleanupHandler } from '../../src/demo/ports.js';
import { ProcessTimeoutError } from '../../src/demo/adapters/process-executor.js';
import { FileSystemCleanupHandler } from '../../src/demo/adapters/cleanup-handler.js';
import { formatHumanOutput, formatJsonOutput, type ExtendedExecutionReport } from '../../src/demo/formatters.js';
import { createDemoRunner } from '../../src/demo/factory.js';

// ─────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────

function createMockConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication with OAuth2 and JWT tokens',
    demoDir: 'specs/demo-test',
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: 'specs',
    ...overrides,
  };
}

function createSuccessRunResult(): StageRunResult {
  return {
    success: true,
    exitCode: 0,
    stdout: 'ok',
    stderr: '',
    timedOut: false,
  };
}

function createFailedRunResult(overrides: Partial<StageRunResult> = {}): StageRunResult {
  return {
    success: false,
    exitCode: 1,
    stdout: '',
    stderr: 'command failed',
    timedOut: false,
    ...overrides,
  };
}

function createValidArtifact(path: string): DemoArtifact {
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
  };
}

function createMockDeps(overrides: Partial<DemoDependencies> = {}): DemoDependencies {
  return {
    processExecutor: {
      execute: vi.fn(),
      run: vi.fn().mockResolvedValue(createSuccessRunResult()),
      isCommandAvailable: vi.fn().mockResolvedValue(true),
    },
    artifactValidator: {
      validate: vi.fn().mockImplementation((path: string) =>
        Promise.resolve(createValidArtifact(path))
      ),
      validateAll: vi.fn().mockResolvedValue([]),
    },
    cleanupHandler: {
      cleanup: vi.fn().mockImplementation((_config, report) =>
        Promise.resolve({ ...report, cleanupPerformed: true })
      ),
      isSafeToDelete: vi.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
}

function createExtendedReport(overrides: Partial<ExtendedExecutionReport> = {}): ExtendedExecutionReport {
  return {
    totalTimeMs: 5000,
    stagesCompleted: 5,
    stagesFailed: 0,
    artifacts: [],
    cleanupPerformed: true,
    stages: [],
    demoDir: 'specs/demo-test',
    flags: { dryRun: false, keep: false, verbose: false },
    errors: [],
    warnings: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// T031: Prerequisite Validation
// ─────────────────────────────────────────────────────────────

describe('T031: Prerequisite Validation', () => {
  it('returns valid when all prerequisites are met', async () => {
    const config = createMockConfig();
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when speckit command is not available', async () => {
    const config = createMockConfig();
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn(),
        isCommandAvailable: vi.fn().mockResolvedValue(false),
      },
    });

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('speckit')
    );
  });

  it('returns error for zero timeout', async () => {
    const config = createMockConfig({ timeout: 0 });
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Invalid timeout')
    );
  });

  it('returns error for negative timeout', async () => {
    const config = createMockConfig({ timeout: -5 });
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Invalid timeout')
    );
  });

  it('returns error for empty feature description', async () => {
    const config = createMockConfig({ exampleFeature: '' });
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Feature description is empty')
    );
  });

  it('returns error for whitespace-only feature description', async () => {
    const config = createMockConfig({ exampleFeature: '   ' });
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Feature description is empty')
    );
  });

  it('returns error when demoDir is not under specs/', async () => {
    const config = createMockConfig({ demoDir: 'output/demo-test' });
    const deps = createMockDeps();

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('must be under specs/')
    );
  });

  it('collects multiple errors at once', async () => {
    const config = createMockConfig({
      timeout: 0,
      exampleFeature: '',
      demoDir: 'bad/dir',
    });
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn(),
        isCommandAvailable: vi.fn().mockResolvedValue(false),
      },
    });

    const result = await validatePrerequisites(config, deps);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('runDemo fails fast when prerequisites not met', async () => {
    const config = createMockConfig({ timeout: 0 });
    const deps = createMockDeps();

    const report = await runDemo(config, deps);

    expect(report.stagesCompleted).toBe(0);
    expect(report.errorSummary).toContain('Prerequisite check failed');
    expect(report.errors).toBeDefined();
    expect(report.errors!.length).toBeGreaterThan(0);
    expect(report.errors![0].code).toBe('PREREQUISITE_FAILED');
  });
});

// ─────────────────────────────────────────────────────────────
// T032: SIGINT Handler (Graceful Shutdown)
// ─────────────────────────────────────────────────────────────

describe('T032: Graceful Shutdown (AbortSignal)', () => {
  it('stops pipeline when signal is already aborted', async () => {
    const config = createMockConfig();
    const deps = createMockDeps();
    const controller = new AbortController();
    controller.abort();

    const report = await runDemo(config, deps, { signal: controller.signal });

    expect(report.stagesCompleted).toBe(0);
    expect(report.errorSummary).toContain('interrupted');
    expect(report.warnings).toBeDefined();
    expect(report.warnings!.length).toBeGreaterThan(0);
  });

  it('returns partial results when aborted after first stage', async () => {
    const config = createMockConfig();
    const controller = new AbortController();

    let callCount = 0;
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 2) {
            // Abort before second stage completes
            controller.abort();
          }
          return createSuccessRunResult();
        }),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });

    const report = await runDemo(config, deps, { signal: controller.signal });

    // First stage completed, second stage ran but pipeline interrupted after
    expect(report.stagesCompleted).toBeGreaterThanOrEqual(1);
    expect(report.errorSummary).toContain('interrupted');
  });

  it('does not perform cleanup when pipeline is interrupted', async () => {
    const config = createMockConfig();
    const controller = new AbortController();
    controller.abort();
    const deps = createMockDeps();

    const report = await runDemo(config, deps, { signal: controller.signal });

    expect(report.cleanupPerformed).toBe(false);
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
  });

  it('sets warning entries for skipped stages', async () => {
    const config = createMockConfig();
    const controller = new AbortController();
    controller.abort();
    const deps = createMockDeps();

    const report = await runDemo(config, deps, { signal: controller.signal });

    expect(report.warnings).toBeDefined();
    expect(report.warnings!.some(w => w.message.includes('skipped'))).toBe(true);
  });

  it('runs normally when no signal provided', async () => {
    const config = createMockConfig();
    const deps = createMockDeps();

    const report = await runDemo(config, deps);

    expect(report.stagesCompleted).toBe(5);
    expect(report.stagesFailed).toBe(0);
    expect(report.cleanupPerformed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// T033: Timeout Handling
// ─────────────────────────────────────────────────────────────

describe('T033: Timeout Handling', () => {
  it('ProcessTimeoutError has correct properties', () => {
    const err = new ProcessTimeoutError(['speckit', 'specify'], 30000, 31000);

    expect(err.name).toBe('ProcessTimeoutError');
    expect(err.command).toEqual(['speckit', 'specify']);
    expect(err.timeoutMs).toBe(30000);
    expect(err.elapsedMs).toBe(31000);
    expect(err.message).toContain('timed out');
    expect(err.message).toContain('speckit specify');
  });

  it('ProcessTimeoutError is an instance of Error', () => {
    const err = new ProcessTimeoutError(['cmd'], 1000, 1100);
    expect(err).toBeInstanceOf(Error);
  });

  it('timed out stage produces PROCESS_TIMEOUT error entry', async () => {
    const config = createMockConfig();
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue({
          success: false,
          exitCode: null,
          stdout: '',
          stderr: 'timed out',
          timedOut: true,
        }),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });

    const report = await runDemo(config, deps);

    expect(report.stagesFailed).toBe(1);
    expect(report.errors).toBeDefined();
    expect(report.errors!.some(e => e.code === 'PROCESS_TIMEOUT')).toBe(true);
  });

  it('non-timeout failure produces STAGE_EXECUTION_FAILED error entry', async () => {
    const config = createMockConfig();
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue(createFailedRunResult()),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });

    const report = await runDemo(config, deps);

    expect(report.errors).toBeDefined();
    expect(report.errors!.some(e => e.code === 'STAGE_EXECUTION_FAILED')).toBe(true);
  });

  it('timeout error entry includes stage name', async () => {
    const config = createMockConfig();
    const deps = createMockDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue({
          success: false,
          exitCode: null,
          stdout: '',
          stderr: '',
          timedOut: true,
        }),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });

    const report = await runDemo(config, deps);

    const timeoutError = report.errors!.find(e => e.code === 'PROCESS_TIMEOUT');
    expect(timeoutError).toBeDefined();
    expect(timeoutError!.stage).toBe('specify');
    expect(timeoutError!.timestamp).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// T034: Path Safety Check
// ─────────────────────────────────────────────────────────────

describe('T034: Path Safety Check', () => {
  let handler: FileSystemCleanupHandler;

  beforeEach(() => {
    handler = new FileSystemCleanupHandler();
  });

  it('rejects path with parent directory traversal', async () => {
    const result = await handler.isSafeToDelete('specs/../etc/passwd');
    expect(result).toBe(false);
  });

  it('rejects root directory', async () => {
    const result = await handler.isSafeToDelete('/');
    expect(result).toBe(false);
  });

  it('rejects home directory path', async () => {
    const result = await handler.isSafeToDelete('/home/user');
    expect(result).toBe(false);
  });

  it('rejects arbitrary directory outside safe zones', async () => {
    const result = await handler.isSafeToDelete('src/demo');
    expect(result).toBe(false);
  });

  it('rejects system paths', async () => {
    const result = await handler.isSafeToDelete('/usr/bin');
    expect(result).toBe(false);
  });

  it('rejects node_modules directory', async () => {
    const result = await handler.isSafeToDelete('node_modules');
    expect(result).toBe(false);
  });

  it('rejects empty path equivalent', async () => {
    const result = await handler.isSafeToDelete('.');
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// T035: Error Summary in Human Output
// ─────────────────────────────────────────────────────────────

describe('T035: Error Summary in Human Output', () => {
  it('includes error summary section when errors present', () => {
    const report: ExecutionReport = {
      totalTimeMs: 5000,
      stagesCompleted: 0,
      stagesFailed: 1,
      artifacts: [],
      cleanupPerformed: false,
      errorSummary: 'Stage specify failed',
      errors: [
        {
          stage: 'specify',
          message: 'Command failed with exit code 1',
          code: 'STAGE_EXECUTION_FAILED',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
      warnings: [],
    };

    const output = formatHumanOutput(report);

    expect(output).toContain('Error Summary');
    expect(output).toContain('Errors (1)');
    expect(output).toContain('[specify]');
    expect(output).toContain('STAGE_EXECUTION_FAILED');
  });

  it('does not include error summary section when no errors', () => {
    const report: ExecutionReport = {
      totalTimeMs: 5000,
      stagesCompleted: 5,
      stagesFailed: 0,
      artifacts: [],
      cleanupPerformed: true,
      errors: [],
      warnings: [],
    };

    const output = formatHumanOutput(report);

    expect(output).not.toContain('Error Summary');
  });

  it('includes warnings section in error summary', () => {
    const report: ExecutionReport = {
      totalTimeMs: 5000,
      stagesCompleted: 1,
      stagesFailed: 0,
      artifacts: [],
      cleanupPerformed: false,
      errors: [],
      warnings: [
        {
          stage: 'plan',
          message: 'Stage skipped due to pipeline interruption',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    };

    const output = formatHumanOutput(report);

    expect(output).toContain('Warnings (1)');
    expect(output).toContain('[plan]');
  });

  it('collects multiple errors from different stages', () => {
    const report: ExecutionReport = {
      totalTimeMs: 5000,
      stagesCompleted: 0,
      stagesFailed: 2,
      artifacts: [],
      cleanupPerformed: false,
      errors: [
        {
          stage: 'prerequisites',
          message: 'speckit not found',
          code: 'PREREQUISITE_FAILED',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
        {
          stage: 'specify',
          message: 'Timed out',
          code: 'PROCESS_TIMEOUT',
          timestamp: '2025-01-01T00:00:01.000Z',
        },
      ],
      warnings: [],
    };

    const output = formatHumanOutput(report);

    expect(output).toContain('Errors (2)');
    expect(output).toContain('[prerequisites]');
    expect(output).toContain('[specify]');
  });

  it('shows both errors and warnings together', () => {
    const report: ExecutionReport = {
      totalTimeMs: 5000,
      stagesCompleted: 1,
      stagesFailed: 1,
      artifacts: [],
      cleanupPerformed: false,
      errors: [
        { stage: 'plan', message: 'Failed', code: 'STAGE_EXECUTION_FAILED', timestamp: '2025-01-01T00:00:00.000Z' },
      ],
      warnings: [
        { stage: 'tasks', message: 'Skipped', timestamp: '2025-01-01T00:00:00.000Z' },
      ],
    };

    const output = formatHumanOutput(report);

    expect(output).toContain('Errors (1)');
    expect(output).toContain('Warnings (1)');
  });
});

// ─────────────────────────────────────────────────────────────
// T036: Failure Details in JSON Output
// ─────────────────────────────────────────────────────────────

describe('T036: Failure Details in JSON Output', () => {
  it('includes errors array in JSON output', () => {
    const report = createExtendedReport({
      stagesFailed: 1,
      stagesCompleted: 0,
      errorSummary: 'Stage failed',
      errors: [
        {
          stage: 'specify',
          message: 'Command failed with exit code 1',
          code: 'STAGE_EXECUTION_FAILED',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.errors).toBeDefined();
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0].stage).toBe('specify');
    expect(json.errors[0].code).toBe('STAGE_EXECUTION_FAILED');
  });

  it('includes warnings array in JSON output', () => {
    const report = createExtendedReport({
      warnings: [
        {
          stage: 'plan',
          message: 'Stage skipped',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.warnings).toBeDefined();
    expect(json.warnings).toHaveLength(1);
    expect(json.warnings[0].stage).toBe('plan');
  });

  it('error objects have all required fields', () => {
    const report = createExtendedReport({
      stagesFailed: 1,
      stagesCompleted: 0,
      errorSummary: 'Failed',
      errors: [
        {
          stage: 'specify',
          message: 'Timed out',
          code: 'PROCESS_TIMEOUT',
          timestamp: '2025-01-15T10:30:00.000Z',
        },
      ],
    });

    const json = JSON.parse(formatJsonOutput(report));
    const err = json.errors[0];

    expect(err).toHaveProperty('stage');
    expect(err).toHaveProperty('message');
    expect(err).toHaveProperty('code');
    expect(err).toHaveProperty('timestamp');
    expect(err.stage).toBe('specify');
    expect(err.message).toBe('Timed out');
    expect(err.code).toBe('PROCESS_TIMEOUT');
    expect(err.timestamp).toBe('2025-01-15T10:30:00.000Z');
  });

  it('empty errors/warnings arrays when no errors occur', () => {
    const report = createExtendedReport({
      errors: [],
      warnings: [],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.errors).toEqual([]);
    expect(json.warnings).toEqual([]);
  });

  it('JSON success output includes errors and warnings arrays', () => {
    const report = createExtendedReport();

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.success).toBe(true);
    expect(json).toHaveProperty('errors');
    expect(json).toHaveProperty('warnings');
  });

  it('JSON failure output includes errors, warnings, and failedStage', () => {
    const failedStage: PipelineStage = {
      name: 'plan',
      displayName: 'Creating implementation plan',
      command: ['speckit', 'plan'],
      artifact: 'plan.md',
      status: StageStatus.Failed,
      elapsedMs: 1500,
      error: 'Command failed',
    };
    const report = createExtendedReport({
      stagesFailed: 1,
      stagesCompleted: 1,
      errorSummary: 'Stage plan failed',
      stages: [
        {
          name: 'specify',
          displayName: 'Generating specification',
          command: ['speckit', 'specify', 'test'],
          artifact: 'spec.md',
          status: StageStatus.Success,
          elapsedMs: 2000,
        },
        failedStage,
      ],
      errors: [
        { stage: 'plan', message: 'Command failed', code: 'STAGE_EXECUTION_FAILED', timestamp: '2025-01-01T00:00:00.000Z' },
      ],
    });

    const json = JSON.parse(formatJsonOutput(report));

    expect(json.success).toBe(false);
    expect(json.failedStage).toBe('plan');
    expect(json.errors).toHaveLength(1);
    expect(json.warnings).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// Integration: Factory + Pipeline with features
// ─────────────────────────────────────────────────────────────

describe('Integration: Factory with safety features', () => {
  it('createDemoRunner passes abort signal through', async () => {
    const controller = new AbortController();
    controller.abort();

    const runner = createDemoRunner({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue(createSuccessRunResult()),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
      artifactValidator: {
        validate: vi.fn().mockImplementation((path: string) =>
          Promise.resolve(createValidArtifact(path))
        ),
        validateAll: vi.fn().mockResolvedValue([]),
      },
      cleanupHandler: {
        cleanup: vi.fn().mockImplementation((_config, report) =>
          Promise.resolve({ ...report, cleanupPerformed: true })
        ),
        isSafeToDelete: vi.fn().mockResolvedValue(true),
      },
    });

    const config = createMockConfig();
    const report = await runner.run(config, { signal: controller.signal });

    expect(report.stagesCompleted).toBe(0);
    expect(report.errorSummary).toContain('interrupted');
  });

  it('artifact validation failure produces error entry', async () => {
    const config = createMockConfig();
    const invalidArtifact: DemoArtifact = {
      path: 'specs/demo-test/spec.md',
      type: ArtifactType.Spec,
      sizeBytes: 100,
      exists: true,
      valid: false,
      errors: ['Missing YAML frontmatter'],
    };
    const deps = createMockDeps({
      artifactValidator: {
        validate: vi.fn().mockResolvedValue(invalidArtifact),
        validateAll: vi.fn().mockResolvedValue([]),
      },
    });

    const report = await runDemo(config, deps);

    expect(report.stagesFailed).toBe(1);
    expect(report.errors).toBeDefined();
    expect(report.errors!.some(e => e.code === 'ARTIFACT_VALIDATION_FAILED')).toBe(true);
  });

  it('report includes both errors and warnings arrays even when empty', async () => {
    const config = createMockConfig();
    const deps = createMockDeps();

    const report = await runDemo(config, deps);

    expect(report.errors).toBeDefined();
    expect(report.warnings).toBeDefined();
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});
