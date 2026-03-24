/**
 * T027-T030: Verbose mode integration — logger and factory wiring
 *
 * Tests createNullLogger, createLogger verbose behavior,
 * and factory wiring of logger to adapters.
 */

import { describe, it, expect, vi } from 'vitest';
import { createLogger, createNullLogger } from '../../src/cli/logger.js';
import { createDemoRunner } from '../../src/demo/factory.js';
import type { DemoConfiguration } from '../../src/demo/entities.js';
import type { Logger } from '../../src/cli/logger.js';

// ── Tests ────────────────────────────────────────────────────

describe('createNullLogger', () => {
  it('should return a logger with all methods', () => {
    const logger = createNullLogger();

    expect(typeof logger.verbose).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should not throw when calling any method', () => {
    const logger = createNullLogger();

    expect(() => logger.verbose('test')).not.toThrow();
    expect(() => logger.info('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
  });
});

describe('createLogger with verbose=true', () => {
  it('should output [DEBUG] messages to stderr when verbose', () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const logger = createLogger({ verbose: true, quiet: false });
      logger.verbose('test message');

      expect(stderrSpy).toHaveBeenCalledWith('[DEBUG] test message');
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('should not output [DEBUG] messages when verbose=false', () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const logger = createLogger({ verbose: false, quiet: false });
      logger.verbose('test message');

      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
    }
  });
});

describe('createDemoRunner factory with logger', () => {
  it('should accept a logger option', () => {
    const logger: Logger = {
      verbose: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const runner = createDemoRunner({ logger });

    expect(runner).toBeDefined();
    expect(typeof runner.run).toBe('function');
  });

  it('should create runner without logger (default)', () => {
    const runner = createDemoRunner();

    expect(runner).toBeDefined();
    expect(typeof runner.run).toBe('function');
  });

  it('should pass logger through to orchestrator when running', async () => {
    const verbose = vi.fn();
    const logger: Logger = { verbose, info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    // Use mock adapters so we don't need real commands
    const runner = createDemoRunner({
      logger,
      processExecutor: {
        execute: vi.fn(),
        run: vi.fn().mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'ok',
          stderr: '',
          timedOut: false,
        }),
        isCommandAvailable: vi.fn().mockResolvedValue(true),
      },
      artifactValidator: {
        validate: vi.fn().mockResolvedValue({
          path: 'specs/demo/spec.md',
          type: 'spec',
          sizeBytes: 100,
          exists: true,
          valid: true,
          errors: [],
        }),
        validateAll: vi.fn().mockResolvedValue([]),
      },
      cleanupHandler: {
        cleanup: vi.fn().mockImplementation((_c, r) =>
          Promise.resolve({ ...r, cleanupPerformed: true }),
        ),
        isSafeToDelete: vi.fn().mockResolvedValue(true),
      },
    });

    const config: DemoConfiguration = {
      exampleFeature: 'test',
      demoDir: 'specs/demo-test',
      flags: { dryRun: false, keep: false, verbose: true },
      timeout: 30,
      squadDir: '.squad',
      specifyDir: 'specs',
    };

    await runner.run(config);

    // Logger should have been called by the orchestrator
    expect(verbose).toHaveBeenCalled();
    const calls = verbose.mock.calls.map((c) => c[0] as string);
    expect(calls.some((m) => m.includes('Pipeline starting'))).toBe(true);
  });
});
