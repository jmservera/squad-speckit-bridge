/**
 * T041 Tests: Orchestrator Cleanup Scenarios
 *
 * Unit tests for cleanup behavior in the demo orchestrator pipeline.
 * All I/O is mocked — no filesystem access.
 */

import { describe, it, expect, vi } from 'vitest';
import { runDemo } from '../../src/demo/orchestrator.js';
import type { DemoDependencies } from '../../src/demo/orchestrator.js';
import type {
  DemoConfiguration,
  ExecutionReport,
  DemoArtifact,
  ArtifactType,
} from '../../src/demo/entities.js';
import type {
  ProcessExecutor,
  ArtifactValidator,
  CleanupHandler,
  StageRunResult,
} from '../../src/demo/ports.js';

// ─────────────────────────────────────────────────────────────
// Mock Factories
// ─────────────────────────────────────────────────────────────

function makeConfig(
  overrides: Partial<DemoConfiguration> = {},
): DemoConfiguration {
  return {
    exampleFeature: 'User Authentication',
    demoDir: 'specs/demo-20250101-120000',
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: '.specify',
    ...overrides,
  };
}

function makeSuccessRunResult(): StageRunResult {
  return {
    success: true,
    exitCode: 0,
    stdout: 'stage completed',
    stderr: '',
    timedOut: false,
  };
}

function makeFailedRunResult(
  overrides: Partial<StageRunResult> = {},
): StageRunResult {
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
    type: 'spec' as unknown as ArtifactType,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
  };
}

function makeProcessExecutor(
  overrides: Partial<ProcessExecutor> = {},
): ProcessExecutor {
  return {
    execute: vi.fn().mockResolvedValue({}),
    run: vi.fn().mockResolvedValue(makeSuccessRunResult()),
    isCommandAvailable: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeArtifactValidator(
  overrides: Partial<ArtifactValidator> = {},
): ArtifactValidator {
  return {
    validate: vi.fn().mockImplementation((artifactPath: string) =>
      Promise.resolve(makeValidArtifact(artifactPath)),
    ),
    validateAll: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeCleanupHandler(
  overrides: Partial<CleanupHandler> = {},
): CleanupHandler {
  return {
    cleanup: vi.fn().mockImplementation(
      (_config: DemoConfiguration, report: ExecutionReport) =>
        Promise.resolve({ ...report, cleanupPerformed: true }),
    ),
    isSafeToDelete: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DemoDependencies> = {}): DemoDependencies {
  return {
    processExecutor: makeProcessExecutor(),
    artifactValidator: makeArtifactValidator(),
    cleanupHandler: makeCleanupHandler(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// Cleanup Tests
// ─────────────────────────────────────────────────────────────

describe('Orchestrator Cleanup', () => {
  // ── T041-1: Verify cleanup is called when keep=false ──

  describe('when keep=false and all stages succeed', () => {
    it('calls cleanup handler', async () => {
      const cleanupHandler = makeCleanupHandler();
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      await runDemo(config, deps);

      expect(cleanupHandler.cleanup).toHaveBeenCalledOnce();
    });

    it('passes config and report to cleanup handler', async () => {
      const cleanupHandler = makeCleanupHandler();
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      await runDemo(config, deps);

      expect(cleanupHandler.cleanup).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          stagesCompleted: 5,
          stagesFailed: 0,
          cleanupPerformed: false,
        }),
      );
    });

    it('returns report with cleanupPerformed=true', async () => {
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps();

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(true);
    });
  });

  // ── T041-2: Verify cleanup is skipped when keep=true ──

  describe('when keep=true', () => {
    it('does not call cleanup handler', async () => {
      const cleanupHandler = makeCleanupHandler();
      const config = makeConfig({ flags: { dryRun: false, keep: true, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
    });

    it('returns report with cleanupPerformed=false', async () => {
      const config = makeConfig({ flags: { dryRun: false, keep: true, verbose: false } });
      const deps = makeDeps();

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(false);
    });

    it('preserves artifacts in report when keeping', async () => {
      const config = makeConfig({ flags: { dryRun: false, keep: true, verbose: false } });
      const deps = makeDeps();

      const report = await runDemo(config, deps);

      expect(report.artifacts.length).toBe(5);
      expect(report.stagesCompleted).toBe(5);
    });
  });

  // ── T041-2b: Cleanup is also skipped when stages fail ──

  describe('when a stage fails', () => {
    it('does not call cleanup handler even with keep=false', async () => {
      const cleanupHandler = makeCleanupHandler();
      const processExecutor = makeProcessExecutor({
        run: vi.fn()
          .mockResolvedValueOnce(makeSuccessRunResult())
          .mockResolvedValueOnce(makeFailedRunResult()),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler, processExecutor });

      await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
    });

    it('returns report with cleanupPerformed=false', async () => {
      const processExecutor = makeProcessExecutor({
        run: vi.fn().mockResolvedValue(makeFailedRunResult()),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ processExecutor });

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(false);
      expect(report.stagesFailed).toBeGreaterThan(0);
    });
  });

  // ── T041-3: Cleanup error handling ──

  describe('cleanup error handling', () => {
    it('propagates error in report when cleanup handler fails', async () => {
      const cleanupHandler = makeCleanupHandler({
        cleanup: vi.fn().mockImplementation(
          (_config: DemoConfiguration, report: ExecutionReport) =>
            Promise.resolve({
              ...report,
              cleanupPerformed: false,
              errorSummary: 'Cleanup failed: EACCES permission denied',
            }),
        ),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(false);
      expect(report.errorSummary).toContain('Cleanup failed');
    });

    it('does not throw when cleanup handler rejects', async () => {
      const cleanupHandler = makeCleanupHandler({
        cleanup: vi.fn().mockRejectedValue(new Error('fs.rm exploded')),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      await expect(runDemo(config, deps)).rejects.toThrow('fs.rm exploded');
    });

    it('reports unsafe path as cleanup skipped', async () => {
      const cleanupHandler = makeCleanupHandler({
        cleanup: vi.fn().mockImplementation(
          (_config: DemoConfiguration, report: ExecutionReport) =>
            Promise.resolve({
              ...report,
              cleanupPerformed: false,
              errorSummary: 'Cleanup skipped: path not safe to delete',
            }),
        ),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(false);
      expect(report.errorSummary).toContain('path not safe to delete');
    });
  });

  // ── T041-4: Partial cleanup scenarios ──

  describe('partial cleanup scenarios', () => {
    it('skips cleanup when first stage fails (no artifacts to clean)', async () => {
      const cleanupHandler = makeCleanupHandler();
      const processExecutor = makeProcessExecutor({
        run: vi.fn().mockResolvedValue(makeFailedRunResult()),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler, processExecutor });

      const report = await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.stagesCompleted).toBe(0);
      expect(report.stagesFailed).toBe(1);
      expect(report.cleanupPerformed).toBe(false);
    });

    it('skips cleanup when middle stage fails (partial artifacts exist)', async () => {
      const cleanupHandler = makeCleanupHandler();
      const processExecutor = makeProcessExecutor({
        run: vi.fn()
          .mockResolvedValueOnce(makeSuccessRunResult()) // specify
          .mockResolvedValueOnce(makeSuccessRunResult()) // plan
          .mockResolvedValueOnce(makeFailedRunResult()), // tasks fails
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler, processExecutor });

      const report = await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.stagesCompleted).toBe(2);
      expect(report.stagesFailed).toBe(1);
      expect(report.artifacts.length).toBe(2);
      expect(report.cleanupPerformed).toBe(false);
    });

    it('skips cleanup when last stage fails', async () => {
      const cleanupHandler = makeCleanupHandler();
      const processExecutor = makeProcessExecutor({
        run: vi.fn()
          .mockResolvedValueOnce(makeSuccessRunResult()) // specify
          .mockResolvedValueOnce(makeSuccessRunResult()) // plan
          .mockResolvedValueOnce(makeSuccessRunResult()) // tasks
          .mockResolvedValueOnce(makeSuccessRunResult()) // review
          .mockResolvedValueOnce(makeFailedRunResult()), // issues fails
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler, processExecutor });

      const report = await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.stagesCompleted).toBe(4);
      expect(report.stagesFailed).toBe(1);
      expect(report.cleanupPerformed).toBe(false);
    });

    it('skips cleanup when artifact validation fails', async () => {
      const cleanupHandler = makeCleanupHandler();
      const artifactValidator = makeArtifactValidator({
        validate: vi.fn()
          .mockResolvedValueOnce(makeValidArtifact('spec.md'))
          .mockResolvedValueOnce({
            path: 'plan.md',
            type: 'plan' as unknown as ArtifactType,
            sizeBytes: 0,
            exists: true,
            valid: false,
            errors: ['Missing required frontmatter'],
          }),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler, artifactValidator });

      const report = await runDemo(config, deps);

      expect(cleanupHandler.cleanup).not.toHaveBeenCalled();
      expect(report.stagesFailed).toBe(1);
      expect(report.cleanupPerformed).toBe(false);
    });
  });

  // ── T041-5: Verify cleanup reports what was removed ──

  describe('cleanup reports what was removed', () => {
    it('returns cleanupPerformed=true from handler on successful cleanup', async () => {
      const cleanupHandler = makeCleanupHandler({
        cleanup: vi.fn().mockImplementation(
          (_config: DemoConfiguration, report: ExecutionReport) =>
            Promise.resolve({ ...report, cleanupPerformed: true }),
        ),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(true);
    });

    it('preserves artifact list in report even after cleanup', async () => {
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps();

      const report = await runDemo(config, deps);

      expect(report.cleanupPerformed).toBe(true);
      expect(report.artifacts.length).toBe(5);
      expect(report.artifacts[0].name).toBeTruthy();
      expect(report.artifacts[0].path).toBeTruthy();
      expect(report.artifacts[0].sizeKB).toBeTruthy();
    });

    it('includes stage count and timing in final report', async () => {
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps();

      const report = await runDemo(config, deps);

      expect(report.stagesCompleted).toBe(5);
      expect(report.stagesFailed).toBe(0);
      expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(report.cleanupPerformed).toBe(true);
    });

    it('handler receives report reflecting all completed stages', async () => {
      const cleanupHandler = makeCleanupHandler();
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      await runDemo(config, deps);

      const [, reportArg] = (cleanupHandler.cleanup as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(reportArg.stagesCompleted).toBe(5);
      expect(reportArg.stagesFailed).toBe(0);
      expect(reportArg.artifacts.length).toBe(5);
      expect(reportArg.cleanupPerformed).toBe(false); // not yet performed at call time
    });

    it('cleanup handler can append to existing errorSummary', async () => {
      const cleanupHandler = makeCleanupHandler({
        cleanup: vi.fn().mockImplementation(
          (_config: DemoConfiguration, report: ExecutionReport) =>
            Promise.resolve({
              ...report,
              cleanupPerformed: false,
              errorSummary: report.errorSummary
                ? `${report.errorSummary}; Cleanup failed: disk full`
                : 'Cleanup failed: disk full',
            }),
        ),
      });
      const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });
      const deps = makeDeps({ cleanupHandler });

      const report = await runDemo(config, deps);

      expect(report.errorSummary).toContain('Cleanup failed: disk full');
    });
  });
});
