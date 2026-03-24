/**
 * T028: Verbose mode in ProcessExecutor
 *
 * Tests that NodeProcessExecutor logs full command details, working directory,
 * and streams stdout/stderr in real-time when a verbose logger is provided.
 */

import { describe, it, expect, vi } from 'vitest';
import { NodeProcessExecutor } from '../../src/demo/adapters/process-executor.js';
import type { Logger } from '../../src/cli/logger.js';

// ── Helpers ──────────────────────────────────────────────────

function makeVerboseLogger(): { logger: Logger; calls: string[] } {
  const calls: string[] = [];
  const logger: Logger = {
    verbose: vi.fn((msg: string) => calls.push(msg)),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { logger, calls };
}

// ── Tests ────────────────────────────────────────────────────

describe('T028: ProcessExecutor verbose mode', () => {
  it('should log the full command being executed', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'hello'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec] Command: echo hello'))).toBe(true);
  });

  it('should log the working directory', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);
    const cwd = process.cwd();

    await executor.run(['echo', 'test'], cwd, 5000);

    expect(calls.some((m) => m.includes(`[exec] Working directory: ${cwd}`))).toBe(true);
  });

  it('should log the timeout value', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'test'], process.cwd(), 10000);

    expect(calls.some((m) => m.includes('[exec] Timeout: 10000ms'))).toBe(true);
  });

  it('should log the platform info', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'test'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec] Platform:'))).toBe(true);
  });

  it('should stream stdout in real-time via logger', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'verbose-output-test'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec:stdout]') && m.includes('verbose-output-test'))).toBe(true);
  });

  it('should stream stderr in real-time via logger', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['node', '-e', 'console.error("err-test")'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec:stderr]') && m.includes('err-test'))).toBe(true);
  });

  it('should log process exit code on completion', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'done'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec] Process exited with code: 0'))).toBe(true);
  });

  it('should log spawn errors for missing commands', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['nonexistent-command-xyz'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec] Spawn error:'))).toBe(true);
  });

  it('should work without a logger (no errors)', async () => {
    const executor = new NodeProcessExecutor();

    const result = await executor.run(['echo', 'no-logger'], process.cwd(), 5000);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('no-logger');
  });

  it('should log PID of spawned process', async () => {
    const { logger, calls } = makeVerboseLogger();
    const executor = new NodeProcessExecutor(logger);

    await executor.run(['echo', 'pid-test'], process.cwd(), 5000);

    expect(calls.some((m) => m.includes('[exec] Spawned process PID:'))).toBe(true);
  });
});
