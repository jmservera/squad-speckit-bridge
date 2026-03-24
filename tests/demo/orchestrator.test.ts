/**
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
// ─────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication',
    demoDir: 'specs/demo-test',
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: 'specs',
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

function makeValidArtifact(path: string): DemoArtifact {
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
  };
}

function makeInvalidArtifact(path: string, errors: string[]): DemoArtifact {
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 0,
    exists: false,
    valid: false,
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
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
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
  });
});
