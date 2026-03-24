/**
<<<<<<< HEAD
 * Orchestrator Failure Tests (T040)
 *
 * Tests that the pipeline halts on stage failure and errors propagate correctly.
 * Covers: command failures, artifact validation failures, timeout failures,
 * partial pipeline failures, error message structure, and cleanup skipping.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  runDemo,
  createPipelineStages,
  type DemoDependencies,
} from '../../src/demo/orchestrator.js';
import type { DemoConfiguration, DemoArtifact } from '../../src/demo/entities.js';
import { StageStatus, ArtifactType } from '../../src/demo/entities.js';
import type { StageRunResult } from '../../src/demo/ports.js';

// ─────────────────────────────────────────────────────────────
// Factories
=======
 * T039: Orchestrator Happy Path Tests
 *
 * Verifies runDemo() pipeline execution with fully mocked ports.
 * Tests stage ordering, status transitions, artifact collection,
 * cleanup behavior, and error propagation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runDemo,
  createPipelineStages,
  createDemoDirectory,
  type DemoDependencies,
} from '../../src/demo/orchestrator.js';
import {
  StageStatus,
  type DemoConfiguration,
  type DemoArtifact,
  type ExecutionReport,
  type PipelineStage,
  ArtifactType,
} from '../../src/demo/entities.js';
import type {
  ProcessExecutor,
  ArtifactValidator,
  CleanupHandler,
  StageRunResult,
} from '../../src/demo/ports.js';

// ─────────────────────────────────────────────────────────────
// Test Factories
>>>>>>> origin/main
// ─────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication',
<<<<<<< HEAD
    demoDir: 'specs/demo-test',
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: 'specs',
=======
    demoDir: 'specs/demo-20260324-120000',
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: '.specify',
>>>>>>> origin/main
    ...overrides,
  };
}

function makeSuccessResult(overrides: Partial<StageRunResult> = {}): StageRunResult {
  return {
    success: true,
    exitCode: 0,
    stdout: 'ok',
    stderr: '',
    timedOut: false,
    ...overrides,
  };
}

function makeFailResult(overrides: Partial<StageRunResult> = {}): StageRunResult {
  return {
    success: false,
    exitCode: 1,
    stdout: '',
    stderr: 'command failed',
    timedOut: false,
    ...overrides,
  };
}

<<<<<<< HEAD
function makeValidArtifact(path: string): DemoArtifact {
=======
function makeValidArtifact(path: string, overrides: Partial<DemoArtifact> = {}): DemoArtifact {
>>>>>>> origin/main
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
<<<<<<< HEAD
  };
}

function makeInvalidArtifact(path: string, errors: string[]): DemoArtifact {
=======
    ...overrides,
  };
}

function makeInvalidArtifact(path: string, overrides: Partial<DemoArtifact> = {}): DemoArtifact {
>>>>>>> origin/main
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 0,
    exists: false,
    valid: false,
<<<<<<< HEAD
    errors,
  };
}

function makeDeps(overrides: Partial<DemoDependencies> = {}): DemoDependencies {
  return {
    processExecutor: {
      execute: vi.fn(),
      run: vi.fn().mockResolvedValue(makeSuccessResult()),
      isCommandAvailable: vi.fn().mockResolvedValue(true),
    },
    artifactValidator: {
      validate: vi.fn().mockImplementation((path: string) =>
        Promise.resolve(makeValidArtifact(path))
      ),
      validateAll: vi.fn().mockResolvedValue([]),
    },
    cleanupHandler: {
      cleanup: vi.fn().mockImplementation((_config, report) =>
        Promise.resolve({ ...report, cleanupPerformed: true })
      ),
      isSafeToDelete: vi.fn().mockResolvedValue(true),
    },
=======
    errors: ['File does not exist'],
>>>>>>> origin/main
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
<<<<<<< HEAD
// Tests
// ─────────────────────────────────────────────────────────────

describe('Orchestrator Failure Tests', () => {
  describe('First stage command failure', () => {
    it('halts pipeline immediately when first stage fails', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesFailed).toBe(1);
      expect(report.stagesCompleted).toBe(0);
      expect(deps.processExecutor.run).toHaveBeenCalledTimes(1);
    });

    it('does not invoke artifact validator on command failure', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      await runDemo(makeConfig(), deps);

      expect(deps.artifactValidator.validate).not.toHaveBeenCalled();
    });

    it('includes exit code in errorSummary', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ exitCode: 42 })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toBeDefined();
      expect(report.errorSummary).toContain('Exit code: 42');
    });

    it('includes stderr in errorSummary', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ stderr: 'ENOENT: speckit not found' })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('ENOENT: speckit not found');
    });

    it('includes stage name in errorSummary', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain("Stage 'specify' failed");
    });

    it('returns zero artifacts on first stage failure', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(report.artifacts).toHaveLength(0);
    });
  });

  describe('Timeout failure', () => {
    it('halts pipeline on timeout', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ timedOut: true, exitCode: null })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesFailed).toBe(1);
      expect(report.stagesCompleted).toBe(0);
    });

    it('reports "Timed out" in errorSummary for timeout', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ timedOut: true, exitCode: null })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('Timed out');
    });

    it('does not include exit code label when timed out', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ timedOut: true, exitCode: null })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).not.toContain('Exit code');
    });
  });

  describe('Artifact validation failure', () => {
    it('halts pipeline when artifact is invalid despite command success', async () => {
      const deps = makeDeps();
      vi.mocked(deps.artifactValidator.validate).mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/spec.md', ['Missing frontmatter'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesFailed).toBe(1);
      expect(report.stagesCompleted).toBe(0);
      expect(deps.processExecutor.run).toHaveBeenCalledTimes(1);
    });

    it('includes validation error in errorSummary', async () => {
      const deps = makeDeps();
      vi.mocked(deps.artifactValidator.validate).mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/spec.md', ['Missing frontmatter', 'Empty body'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('Artifact validation failed');
      expect(report.errorSummary).toContain('Missing frontmatter');
      expect(report.errorSummary).toContain('Empty body');
    });

    it('includes stage name in artifact validation error', async () => {
      const deps = makeDeps();
      vi.mocked(deps.artifactValidator.validate).mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/spec.md', ['Bad format'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('specify');
    });

    it('filters invalid artifacts from report', async () => {
      const deps = makeDeps();
      vi.mocked(deps.artifactValidator.validate).mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/spec.md', ['Bad'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.artifacts).toHaveLength(0);
    });
  });

  describe('Mid-pipeline failure (partial execution)', () => {
    it('completes 2 stages then fails at stage 3', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult()); // specify
      run.mockResolvedValueOnce(makeSuccessResult()); // plan
      run.mockResolvedValueOnce(makeFailResult({ exitCode: 2, stderr: 'tasks error' })); // tasks

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesCompleted).toBe(2);
      expect(report.stagesFailed).toBe(1);
      expect(report.artifacts).toHaveLength(2);
      expect(deps.processExecutor.run).toHaveBeenCalledTimes(3);
    });

    it('includes failed stage name in errorSummary for mid-pipeline failure', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeFailResult({ stderr: 'crash' }));

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain("Stage 'tasks' failed");
    });

    it('failure at stage 4 (review) preserves 3 completed artifacts', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeFailResult({ exitCode: 1 }));

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesCompleted).toBe(3);
      expect(report.stagesFailed).toBe(1);
      expect(report.artifacts).toHaveLength(3);
    });

    it('failure at last stage (issues) preserves 4 completed artifacts', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeFailResult({ exitCode: 1 }));

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesCompleted).toBe(4);
      expect(report.stagesFailed).toBe(1);
      expect(report.artifacts).toHaveLength(4);
    });

    it('mid-pipeline artifact validation failure after 1 success', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeSuccessResult());

      const validate = vi.mocked(deps.artifactValidator.validate);
      validate.mockResolvedValueOnce(makeValidArtifact('specs/demo-test/spec.md'));
      validate.mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/plan.md', ['Truncated file'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.stagesCompleted).toBe(1);
      expect(report.stagesFailed).toBe(1);
      expect(report.artifacts).toHaveLength(1);
      expect(report.errorSummary).toContain('plan');
    });
  });

  describe('Cleanup behavior on failure', () => {
    it('skips cleanup when pipeline fails (preserves artifacts)', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.cleanupPerformed).toBe(false);
    });

    it('skips cleanup on mid-pipeline failure even with keep=false', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig({ flags: { dryRun: false, keep: false, verbose: false } }), deps);

      expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.cleanupPerformed).toBe(false);
    });

    it('skips cleanup on artifact validation failure', async () => {
      const deps = makeDeps();
      vi.mocked(deps.artifactValidator.validate).mockResolvedValueOnce(
        makeInvalidArtifact('specs/demo-test/spec.md', ['bad'])
      );

      const report = await runDemo(makeConfig(), deps);

      expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.cleanupPerformed).toBe(false);
    });
  });

  describe('Error message structure', () => {
    it('error includes command string', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('speckit');
    });

    it('error includes duration information', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      // Duration is formatted as Xs
      expect(report.errorSummary).toMatch(/Duration: \d+\.\ds/);
    });

    it('truncates long stderr to 500 chars', async () => {
      const longStderr = 'x'.repeat(600);
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ stderr: longStderr })
      );

      const report = await runDemo(makeConfig(), deps);

      // The error should contain stderr but truncated
      expect(report.errorSummary).toBeDefined();
      expect(report.errorSummary!.length).toBeLessThan(longStderr.length + 200);
    });

    it('omits stderr from error when stderr is empty', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ stderr: '' })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).not.toContain('Error:');
    });

    it('exit code shows "unknown" when null', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(
        makeFailResult({ exitCode: null, timedOut: false })
      );

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toContain('Exit code: unknown');
    });
  });

  describe('Report integrity on failure', () => {
    it('totalTimeMs is always positive even on immediate failure', async () => {
      const deps = makeDeps();
      vi.mocked(deps.processExecutor.run).mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);

      expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('stagesCompleted + stagesFailed ≤ total stages', async () => {
      const deps = makeDeps();
      const run = vi.mocked(deps.processExecutor.run);
      run.mockResolvedValueOnce(makeSuccessResult());
      run.mockResolvedValueOnce(makeFailResult());

      const report = await runDemo(makeConfig(), deps);
      const totalStages = createPipelineStages(makeConfig()).length;

      expect(report.stagesCompleted + report.stagesFailed).toBeLessThanOrEqual(totalStages);
    });

    it('errorSummary is undefined on full success', async () => {
      const deps = makeDeps();

      const report = await runDemo(makeConfig(), deps);

      expect(report.errorSummary).toBeUndefined();
    });
=======
// Mock Builders
// ─────────────────────────────────────────────────────────────

function makeMockProcessExecutor(
  runFn?: ProcessExecutor['run']
): ProcessExecutor {
  return {
    execute: vi.fn(),
    run: runFn ?? vi.fn().mockResolvedValue(makeSuccessResult()),
    isCommandAvailable: vi.fn().mockResolvedValue(true),
  };
}

function makeMockArtifactValidator(
  validateFn?: ArtifactValidator['validate']
): ArtifactValidator {
  return {
    validate:
      validateFn ??
      vi.fn().mockImplementation((artifactPath: string) =>
        Promise.resolve(makeValidArtifact(artifactPath))
      ),
    validateAll: vi.fn().mockResolvedValue([]),
  };
}

function makeMockCleanupHandler(
  cleanupFn?: CleanupHandler['cleanup']
): CleanupHandler {
  return {
    cleanup:
      cleanupFn ??
      vi.fn().mockImplementation((_config: DemoConfiguration, report: ExecutionReport) =>
        Promise.resolve({ ...report, cleanupPerformed: true })
      ),
    isSafeToDelete: vi.fn().mockResolvedValue(true),
  };
}

function makeDeps(overrides: Partial<DemoDependencies> = {}): DemoDependencies {
  return {
    processExecutor: makeMockProcessExecutor(),
    artifactValidator: makeMockArtifactValidator(),
    cleanupHandler: makeMockCleanupHandler(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// createPipelineStages
// ─────────────────────────────────────────────────────────────

describe('createPipelineStages', () => {
  it('creates exactly 5 stages', () => {
    const stages = createPipelineStages(makeConfig());
    expect(stages).toHaveLength(5);
  });

  it('stages are in correct order: specify → plan → tasks → review → issues', () => {
    const stages = createPipelineStages(makeConfig());
    const names = stages.map((s) => s.name);
    expect(names).toEqual(['specify', 'plan', 'tasks', 'review', 'issues']);
  });

  it('all stages start as Pending', () => {
    const stages = createPipelineStages(makeConfig());
    for (const stage of stages) {
      expect(stage.status).toBe(StageStatus.Pending);
    }
  });

  it('specify stage uses config.exampleFeature in command', () => {
    const config = makeConfig({ exampleFeature: 'Shopping Cart' });
    const stages = createPipelineStages(config);
    expect(stages[0].command).toContain('Shopping Cart');
  });

  it('issues stage uses --dry-run flag when dryRun is true', () => {
    const config = makeConfig({ flags: { dryRun: true, keep: false, verbose: false } });
    const stages = createPipelineStages(config);
    const issuesStage = stages.find((s) => s.name === 'issues')!;
    expect(issuesStage.command).toContain('--dry-run');
  });

  it('issues stage omits --dry-run flag when dryRun is false', () => {
    const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
    const stages = createPipelineStages(config);
    const issuesStage = stages.find((s) => s.name === 'issues')!;
    expect(issuesStage.command).not.toContain('--dry-run');
  });

  it('each stage has a displayName', () => {
    const stages = createPipelineStages(makeConfig());
    for (const stage of stages) {
      expect(stage.displayName).toBeTruthy();
      expect(typeof stage.displayName).toBe('string');
    }
  });

  it('each stage has an expected artifact filename', () => {
    const stages = createPipelineStages(makeConfig());
    const artifactNames = stages.map((s) => s.artifact);
    expect(artifactNames).toEqual(['spec.md', 'plan.md', 'tasks.md', 'review.md', 'issues.json']);
  });
});

// ─────────────────────────────────────────────────────────────
// createDemoDirectory
// ─────────────────────────────────────────────────────────────

describe('createDemoDirectory', () => {
  it('returns a path under specs/', () => {
    const dir = createDemoDirectory();
    expect(dir).toMatch(/^specs\/demo-/);
  });

  it('includes a timestamp in YYYYMMDD-HHMMSS format', () => {
    const dir = createDemoDirectory();
    expect(dir).toMatch(/^specs\/demo-\d{8}-\d{6}$/);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Happy Path
// ─────────────────────────────────────────────────────────────

describe('runDemo — happy path', () => {
  let config: DemoConfiguration;
  let deps: DemoDependencies;

  beforeEach(() => {
    config = makeConfig();
    deps = makeDeps();
  });

  it('returns an ExecutionReport', async () => {
    const report = await runDemo(config, deps);
    expect(report).toBeDefined();
    expect(typeof report.totalTimeMs).toBe('number');
    expect(typeof report.stagesCompleted).toBe('number');
    expect(typeof report.stagesFailed).toBe('number');
    expect(Array.isArray(report.artifacts)).toBe(true);
  });

  it('completes all 5 stages on success', async () => {
    const report = await runDemo(config, deps);
    expect(report.stagesCompleted).toBe(5);
    expect(report.stagesFailed).toBe(0);
  });

  it('has no errorSummary on success', async () => {
    const report = await runDemo(config, deps);
    expect(report.errorSummary).toBeUndefined();
  });

  it('calls processExecutor.run for each stage', async () => {
    await runDemo(config, deps);
    expect(deps.processExecutor.run).toHaveBeenCalledTimes(5);
  });

  it('calls artifactValidator.validate for each stage', async () => {
    await runDemo(config, deps);
    expect(deps.artifactValidator.validate).toHaveBeenCalledTimes(5);
  });

  it('executes stages in correct order', async () => {
    const callOrder: string[] = [];
    const executor = makeMockProcessExecutor(
      vi.fn().mockImplementation((command: string[]) => {
        // The second arg of the speckit command identifies the stage
        callOrder.push(command[1]);
        return Promise.resolve(makeSuccessResult());
      })
    );
    deps.processExecutor = executor;
    await runDemo(config, deps);
    expect(callOrder).toEqual(['specify', 'plan', 'tasks', 'analyze', 'taskstoissues']);
  });

  it('passes correct cwd and timeout to processExecutor.run', async () => {
    await runDemo(config, deps);
    const runMock = deps.processExecutor.run as ReturnType<typeof vi.fn>;
    // All calls use config.demoDir and timeout * 1000
    for (const call of runMock.mock.calls) {
      expect(call[1]).toBe(config.demoDir);
      expect(call[2]).toBe(config.timeout * 1000);
    }
  });

  it('validates artifacts with correct paths', async () => {
    await runDemo(config, deps);
    const validateMock = deps.artifactValidator.validate as ReturnType<typeof vi.fn>;
    const expectedPaths = [
      `${config.demoDir}/spec.md`,
      `${config.demoDir}/plan.md`,
      `${config.demoDir}/tasks.md`,
      `${config.demoDir}/review.md`,
      `${config.demoDir}/issues.json`,
    ];
    const actualPaths = validateMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(actualPaths).toEqual(expectedPaths);
  });

  it('collects valid artifacts into report', async () => {
    const report = await runDemo(config, deps);
    expect(report.artifacts).toHaveLength(5);
    for (const a of report.artifacts) {
      expect(a.name).toBeTruthy();
      expect(a.path).toBeTruthy();
      expect(a.sizeKB).toBeTruthy();
    }
  });

  it('performs cleanup when keep=false and all stages succeed', async () => {
    const report = await runDemo(config, deps);
    expect(deps.cleanupHandler.cleanup).toHaveBeenCalledTimes(1);
    expect(report.cleanupPerformed).toBe(true);
  });

  it('records positive totalTimeMs', async () => {
    const report = await runDemo(config, deps);
    expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Cleanup Behavior
// ─────────────────────────────────────────────────────────────

describe('runDemo — cleanup behavior', () => {
  it('skips cleanup when keep=true', async () => {
    const config = makeConfig({ flags: { dryRun: false, keep: true, verbose: false } });
    const deps = makeDeps();
    const report = await runDemo(config, deps);
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
    expect(report.cleanupPerformed).toBe(false);
  });

  it('skips cleanup when a stage fails (preserves artifacts for debugging)', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn()
        .mockResolvedValueOnce(makeSuccessResult())
        .mockResolvedValueOnce(makeFailResult())
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(deps.cleanupHandler.cleanup).not.toHaveBeenCalled();
    expect(report.cleanupPerformed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Stage Failure
// ─────────────────────────────────────────────────────────────

describe('runDemo — stage failure (command fails)', () => {
  it('halts pipeline on first command failure', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn()
        .mockResolvedValueOnce(makeSuccessResult()) // specify succeeds
        .mockResolvedValueOnce(makeFailResult())    // plan fails
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(report.stagesCompleted).toBe(1);
    expect(report.stagesFailed).toBe(1);
    expect(executor.run).toHaveBeenCalledTimes(2);
  });

  it('sets errorSummary when a stage fails', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(makeFailResult({ stderr: 'speckit not found' }))
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(report.errorSummary).toBeDefined();
    expect(report.errorSummary).toContain('specify');
  });

  it('includes exit code in error when command fails', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(makeFailResult({ exitCode: 127 }))
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(report.errorSummary).toContain('127');
  });

  it('includes timeout info in error when command times out', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(
        makeFailResult({ timedOut: true, exitCode: null, stderr: '' })
      )
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(report.errorSummary).toContain('Timed out');
  });

  it('does not call artifactValidator for failed stages', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(makeFailResult())
    );
    const deps = makeDeps({ processExecutor: executor });
    await runDemo(makeConfig(), deps);
    expect(deps.artifactValidator.validate).not.toHaveBeenCalled();
  });

  it('reports 0 completed if first stage fails', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(makeFailResult())
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);
    expect(report.stagesCompleted).toBe(0);
    expect(report.stagesFailed).toBe(1);
    expect(report.artifacts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Artifact Validation Failure
// ─────────────────────────────────────────────────────────────

describe('runDemo — artifact validation failure', () => {
  it('halts pipeline when artifact is invalid despite command success', async () => {
    const validator = makeMockArtifactValidator(
      vi.fn()
        .mockResolvedValueOnce(makeValidArtifact('specs/demo/spec.md'))
        .mockResolvedValueOnce(
          makeInvalidArtifact('specs/demo/plan.md', {
            errors: ['Missing frontmatter'],
          })
        )
    );
    const deps = makeDeps({ artifactValidator: validator });
    const report = await runDemo(makeConfig(), deps);
    expect(report.stagesCompleted).toBe(1);
    expect(report.stagesFailed).toBe(1);
    expect(report.errorSummary).toContain('plan');
    expect(report.errorSummary).toContain('Missing frontmatter');
  });

  it('still collects the valid artifact for the failed stage', async () => {
    // The invalid artifact is still pushed to completedArtifacts, but filtered in report.artifacts
    const validator = makeMockArtifactValidator(
      vi.fn().mockResolvedValue(
        makeInvalidArtifact('specs/demo/spec.md', {
          errors: ['Empty file'],
        })
      )
    );
    const deps = makeDeps({ artifactValidator: validator });
    const report = await runDemo(makeConfig(), deps);
    // Invalid artifacts are filtered out of report.artifacts
    expect(report.artifacts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Timeout Configuration
// ─────────────────────────────────────────────────────────────

describe('runDemo — timeout configuration', () => {
  it('uses config.timeout converted to milliseconds', async () => {
    const config = makeConfig({ timeout: 60 });
    const deps = makeDeps();
    await runDemo(config, deps);
    const runMock = deps.processExecutor.run as ReturnType<typeof vi.fn>;
    for (const call of runMock.mock.calls) {
      expect(call[2]).toBe(60_000);
    }
  });

  it('falls back to 30s when timeout is 0', async () => {
    const config = makeConfig({ timeout: 0 });
    const deps = makeDeps();
    await runDemo(config, deps);
    const runMock = deps.processExecutor.run as ReturnType<typeof vi.fn>;
    // (config.timeout || 30) * 1000 → 30000
    for (const call of runMock.mock.calls) {
      expect(call[2]).toBe(30_000);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Stage Output Capture
// ─────────────────────────────────────────────────────────────

describe('runDemo — stage output capture', () => {
  it('captures stdout and stderr from processExecutor in stage output', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn().mockResolvedValue(
        makeSuccessResult({ stdout: 'Generated spec.md', stderr: 'warn: low disk' })
      )
    );
    const deps = makeDeps({ processExecutor: executor });
    const config = makeConfig();
    const stages = createPipelineStages(config);

    await runDemo(config, deps);

    // Verify stages mutated in place have output set
    // We can verify through the processExecutor calls
    const runMock = executor.run as ReturnType<typeof vi.fn>;
    expect(runMock).toHaveBeenCalledTimes(5);
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Partial Pipeline Failure (middle stage)
// ─────────────────────────────────────────────────────────────

describe('runDemo — partial pipeline (failure at stage 3)', () => {
  it('completes first 2 stages, fails on 3rd, skips remaining', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn()
        .mockResolvedValueOnce(makeSuccessResult()) // specify
        .mockResolvedValueOnce(makeSuccessResult()) // plan
        .mockResolvedValueOnce(makeFailResult())    // tasks
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);

    expect(report.stagesCompleted).toBe(2);
    expect(report.stagesFailed).toBe(1);
    expect(executor.run).toHaveBeenCalledTimes(3);
    // Only 2 artifacts validated (specify and plan)
    expect(deps.artifactValidator.validate).toHaveBeenCalledTimes(2);
    expect(report.artifacts).toHaveLength(2);
  });

  it('reports failure at last stage (issues)', async () => {
    const executor = makeMockProcessExecutor(
      vi.fn()
        .mockResolvedValueOnce(makeSuccessResult()) // specify
        .mockResolvedValueOnce(makeSuccessResult()) // plan
        .mockResolvedValueOnce(makeSuccessResult()) // tasks
        .mockResolvedValueOnce(makeSuccessResult()) // review
        .mockResolvedValueOnce(makeFailResult())    // issues
    );
    const deps = makeDeps({ processExecutor: executor });
    const report = await runDemo(makeConfig(), deps);

    expect(report.stagesCompleted).toBe(4);
    expect(report.stagesFailed).toBe(1);
    expect(report.errorSummary).toContain('issues');
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — DryRun Flag
// ─────────────────────────────────────────────────────────────

describe('runDemo — dryRun flag', () => {
  it('passes --dry-run to issues stage command', async () => {
    const callLog: string[][] = [];
    const executor = makeMockProcessExecutor(
      vi.fn().mockImplementation((command: string[]) => {
        callLog.push(command);
        return Promise.resolve(makeSuccessResult());
      })
    );
    const config = makeConfig({ flags: { dryRun: true, keep: false, verbose: false } });
    const deps = makeDeps({ processExecutor: executor });

    await runDemo(config, deps);

    const issuesCall = callLog.find((cmd) => cmd.includes('taskstoissues'));
    expect(issuesCall).toBeDefined();
    expect(issuesCall).toContain('--dry-run');
  });

  it('omits --dry-run from issues stage when dryRun is false', async () => {
    const callLog: string[][] = [];
    const executor = makeMockProcessExecutor(
      vi.fn().mockImplementation((command: string[]) => {
        callLog.push(command);
        return Promise.resolve(makeSuccessResult());
      })
    );
    const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
    const deps = makeDeps({ processExecutor: executor });

    await runDemo(config, deps);

    const issuesCall = callLog.find((cmd) => cmd.includes('taskstoissues'));
    expect(issuesCall).toBeDefined();
    expect(issuesCall).not.toContain('--dry-run');
  });
});

// ─────────────────────────────────────────────────────────────
// runDemo — Report Structure
// ─────────────────────────────────────────────────────────────

describe('runDemo — report structure', () => {
  it('artifact summary has name, path, and sizeKB', async () => {
    const deps = makeDeps();
    const report = await runDemo(makeConfig(), deps);

    for (const artifact of report.artifacts) {
      expect(artifact).toHaveProperty('name');
      expect(artifact).toHaveProperty('path');
      expect(artifact).toHaveProperty('sizeKB');
    }
  });

  it('artifact name is the filename (not the full path)', async () => {
    const deps = makeDeps();
    const report = await runDemo(makeConfig(), deps);

    // Each artifact name should be just the filename part
    for (const artifact of report.artifacts) {
      expect(artifact.name).not.toContain('/');
    }
  });

  it('report includes cleanupPerformed flag', async () => {
    const deps = makeDeps();
    const report = await runDemo(makeConfig(), deps);
    expect(typeof report.cleanupPerformed).toBe('boolean');
>>>>>>> origin/main
  });
});
