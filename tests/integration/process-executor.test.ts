import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeProcessExecutor } from '../../src/demo/adapters/process-executor.js';
import type { StageRunResult } from '../../src/demo/ports.js';

describe('NodeProcessExecutor', () => {
  let executor: NodeProcessExecutor;
  let testDir: string;

  beforeEach(async () => {
    executor = new NodeProcessExecutor();
    testDir = join(
      tmpdir(),
      `proc-exec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ── Basic execution ──────────────────────────────────────────

  describe('basic execution with echo', () => {
    it('executes echo and returns success', async () => {
      const result = await executor.run(['echo', 'hello'], testDir, 5_000);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
    });

    it('executes echo with multiple arguments', async () => {
      const result = await executor.run(
        ['echo', 'hello', 'world'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello world');
    });
  });

  // ── Stdout capture ───────────────────────────────────────────

  describe('stdout capture', () => {
    it('captures stdout from echo', async () => {
      const result = await executor.run(['echo', 'captured output'], testDir, 5_000);

      expect(result.stdout.trim()).toBe('captured output');
    });

    it('captures multi-line stdout', async () => {
      const result = await executor.run(
        ['printf', 'line1\nline2\nline3'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(true);
      const lines = result.stdout.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('line1');
      expect(lines[2]).toBe('line3');
    });

    it('captures stderr separately from stdout', async () => {
      const result = await executor.run(
        ['bash', '-c', 'echo out; echo err >&2'],
        testDir,
        5_000,
      );

      expect(result.stdout).toContain('out');
      expect(result.stderr).toContain('err');
    });
  });

  // ── Timeout handling ─────────────────────────────────────────

  describe('timeout handling', () => {
    it('kills long-running commands that exceed timeout', async () => {
      const start = Date.now();
      const result = await executor.run(['sleep', '60'], testDir, 500);
      const elapsed = Date.now() - start;

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      // Should finish well under the sleep duration
      expect(elapsed).toBeLessThan(10_000);
    });

    it('allows commands that finish before timeout', async () => {
      const result = await executor.run(['echo', 'fast'], testDir, 5_000);

      expect(result.success).toBe(true);
      expect(result.timedOut).toBe(false);
    });
  });

  // ── Error handling ───────────────────────────────────────────

  describe('error handling', () => {
    it('reports non-zero exit codes', async () => {
      const result = await executor.run(
        ['bash', '-c', 'exit 42'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(42);
      expect(result.timedOut).toBe(false);
    });

    it('handles command not found', async () => {
      const result = await executor.run(
        ['nonexistent_command_xyz_12345'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeNull();
      expect(result.stderr).toBeTruthy();
    });

    it('captures stderr on failure', async () => {
      const result = await executor.run(
        ['bash', '-c', 'echo "error detail" >&2; exit 1'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error detail');
    });
  });

  // ── Environment variable passing ────────────────────────────

  describe('environment variable passing', () => {
    it('inherits process environment variables', async () => {
      // The child process should inherit the parent's PATH at minimum
      const result = await executor.run(
        ['bash', '-c', 'echo $PATH'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(true);
      expect(result.stdout.trim().length).toBeGreaterThan(0);
    });

    it('inherits custom env vars set on parent process', async () => {
      const marker = `TEST_MARKER_${Date.now()}`;
      process.env['PROC_EXEC_TEST_VAR'] = marker;

      try {
        const result = await executor.run(
          ['bash', '-c', 'echo $PROC_EXEC_TEST_VAR'],
          testDir,
          5_000,
        );

        expect(result.success).toBe(true);
        expect(result.stdout.trim()).toBe(marker);
      } finally {
        delete process.env['PROC_EXEC_TEST_VAR'];
      }
    });
  });

  // ── Working directory ────────────────────────────────────────

  describe('working directory specification', () => {
    it('executes commands in the specified directory', async () => {
      const result = await executor.run(['pwd'], testDir, 5_000);

      expect(result.success).toBe(true);
      // Resolve symlinks since tmpdir() may return a symlink on some systems
      const { realpathSync } = await import('node:fs');
      const realTestDir = realpathSync(testDir);
      expect(result.stdout.trim()).toBe(realTestDir);
    });

    it('can read files relative to working directory', async () => {
      await writeFile(join(testDir, 'data.txt'), 'file-content');

      const result = await executor.run(
        ['cat', 'data.txt'],
        testDir,
        5_000,
      );

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('file-content');
    });

    it('uses a subdirectory as working directory', async () => {
      const subDir = join(testDir, 'nested', 'dir');
      await mkdir(subDir, { recursive: true });

      const result = await executor.run(['pwd'], subDir, 5_000);

      expect(result.success).toBe(true);
      const { realpathSync } = await import('node:fs');
      expect(result.stdout.trim()).toBe(realpathSync(subDir));
    });
  });

  // ── isCommandAvailable ───────────────────────────────────────

  describe('isCommandAvailable', () => {
    it('returns true for common commands', async () => {
      const available = await executor.isCommandAvailable('echo');
      expect(available).toBe(true);
    });

    it('returns false for non-existent commands', async () => {
      const available = await executor.isCommandAvailable(
        'nonexistent_command_xyz_12345',
      );
      expect(available).toBe(false);
    });
  });
});
