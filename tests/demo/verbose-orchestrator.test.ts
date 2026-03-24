/**
 * T027: Verbose mode in orchestrator
 *
 * Tests that the orchestrator emits detailed progress info for each pipeline
 * stage when verbose mode is active (timing, intermediate results, debug info).
 */

import { describe, it, expect, vi } from 'vitest';
import { runDemo, createPipelineStages, type DemoDependencies } from '../../src/demo/orchestrator.js';
import type { DemoConfiguration } from '../../src/demo/entities.js';
import { StageStatus, ArtifactType } from '../../src/demo/entities.js';
import type { Logger } from '../../src/cli/logger.js';
import { createNullLogger } from '../../src/cli/logger.js';

// ── Helpers ──────────────────────────────────────────────────

function makeConfig(overrides: Partial<DemoConfiguration> = {}): DemoConfiguration {
  return {
    exampleFeature: 'Test feature',
    demoDir: 'specs/demo-test',
    flags: { dryRun: false, keep: false, verbose: true },
    timeout: 30,
    squadDir: '.squad',
    specifyDir: 'specs',
    ...overrides,
  };
}

function makeSuccessResult() {
  return { success: true, exitCode: 0, stdout: 'ok', stderr: '', timedOut: false };
}

function makeFailResult() {
  return { success: false, exitCode: 1, stdout: '', stderr: 'command failed', timedOut: false };
}

function makeValidArtifact(path: string) {
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 1024,
    exists: true,
    valid: true,
    errors: [],
  };
}

function makeInvalidArtifact(path: string) {
  return {
    path,
    type: ArtifactType.Spec,
    sizeBytes: 512,
    exists: true,
    valid: false,
    errors: ['Missing required section: ## Overview'],
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
      validate: vi.fn().mockResolvedValue(makeValidArtifact('specs/demo-test/spec.md')),
      validateAll: vi.fn().mockResolvedValue([]),
    },
    cleanupHandler: {
      cleanup: vi.fn().mockImplementation((_config, report) =>
        Promise.resolve({ ...report, cleanupPerformed: true }),
      ),
      isSafeToDelete: vi.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('T027: Orchestrator verbose mode', () => {
  it('should log pipeline start info when logger is provided', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('Pipeline starting with 5 stages'))).toBe(true);
  });

  it('should log configuration details when verbose', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('demoDir=specs/demo-test'))).toBe(true);
    expect(calls.some((m) => m.includes('timeout=30s'))).toBe(true);
  });

  it('should log each stage start with command', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('[specify] Starting'))).toBe(true);
    expect(calls.some((m) => m.includes('[specify] Command: speckit specify'))).toBe(true);
  });

  it('should log stage completion timing', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('[specify] Completed in'))).toBe(true);
  });

  it('should log artifact validation result on success', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('[specify] ✓ Stage passed'))).toBe(true);
  });

  it('should log failure details when stage command fails', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({
      logger,
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue(makeFailResult()),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('[specify] ✗ Stage failed'))).toBe(true);
  });

  it('should log skipped stages when pipeline halts', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({
      logger,
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue(makeFailResult()),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('[plan] Skipped (pipeline halted)'))).toBe(true);
  });

  it('should include stages array in report when verbose', async () => {
    const deps = makeDeps({ logger: createNullLogger() });
    const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: true } });

    const report = await runDemo(config, deps);

    expect(report.stages).toBeDefined();
    expect(report.stages!.length).toBe(5);
  });

  it('should not include stages array when not verbose', async () => {
    const deps = makeDeps();
    const config = makeConfig({ flags: { dryRun: false, keep: false, verbose: false } });

    const report = await runDemo(config, deps);

    expect(report.stages).toBeUndefined();
  });

  it('should collect warnings in report when verbose', async () => {
    const deps = makeDeps({
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue(makeFailResult()),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
    });
    const config = makeConfig();

    const report = await runDemo(config, deps);

    expect(report.warnings).toBeDefined();
    expect(report.warnings!.length).toBeGreaterThan(0);
    expect(report.warnings!.some((w) => w.includes('skipped'))).toBe(true);
  });

  it('should log artifact validation failure with details', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({
      logger,
      artifactValidator: {
        validate: vi.fn().mockResolvedValue(makeInvalidArtifact('specs/demo-test/spec.md')),
        validateAll: vi.fn().mockResolvedValue([]),
      },
    });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('Artifact validation failed'))).toBe(true);
  });

  it('should log cleanup decision', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('Performing cleanup'))).toBe(true);
  });

  it('should log pipeline summary at the end', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const deps = makeDeps({ logger });
    const config = makeConfig();

    await runDemo(config, deps);

    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('Pipeline finished'))).toBe(true);
  });

  it('should work without a logger (uses null logger)', async () => {
    const deps = makeDeps();
    delete (deps as Record<string, unknown>).logger;
    const config = makeConfig();

    const report = await runDemo(config, deps);
    expect(report.stagesCompleted).toBe(5);
  });
});
