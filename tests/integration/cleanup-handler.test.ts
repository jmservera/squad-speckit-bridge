import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, stat, readdir, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { FileSystemCleanupHandler } from '../../src/demo/adapters/cleanup-handler.js';
import type { DemoConfiguration, ExecutionReport } from '../../src/demo/entities.js';

/** Helper to build a DemoConfiguration pointing at a given demoDir */
function makeConfig(
  demoDir: string,
  flags: { keep?: boolean } = {},
): DemoConfiguration {
  return {
    exampleFeature: 'Test Feature',
    demoDir,
    flags: { dryRun: false, keep: flags.keep ?? false, verbose: false },
    timeout: 30,
    squadDir: '',
    specifyDir: '',
  };
}

/** Helper to build a minimal ExecutionReport */
function makeReport(overrides: Partial<ExecutionReport> = {}): ExecutionReport {
  return {
    totalTimeMs: 100,
    stagesCompleted: 4,
    stagesFailed: 0,
    artifacts: [],
    cleanupPerformed: false,
    ...overrides,
  };
}

describe('FileSystemCleanupHandler', () => {
  let handler: FileSystemCleanupHandler;
  // Root temp dir for all specs/ subdirectories used in this suite
  let rootDir: string;

  beforeEach(async () => {
    handler = new FileSystemCleanupHandler();
    rootDir = join(
      tmpdir(),
      `bridge-cleanup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(rootDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  // ── Successful cleanup of temp directories ─────────────────

  describe('successful cleanup', () => {
    it('removes a demo directory and sets cleanupPerformed', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoDir = join(specsDir, 'demo-test');
      await mkdir(demoDir, { recursive: true });
      await writeFile(join(demoDir, 'spec.md'), '# Spec');

      // chdir so isSafeToDelete resolves relative to rootDir
      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(demoDir),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(true);
        await expect(stat(demoDir)).rejects.toThrow();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('skips cleanup when keep flag is true', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoDir = join(specsDir, 'demo-keep');
      await mkdir(demoDir, { recursive: true });
      await writeFile(join(demoDir, 'plan.md'), '# Plan');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(demoDir, { keep: true }),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(false);
        // Directory should still exist
        const stats = await stat(demoDir);
        expect(stats.isDirectory()).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('preserves existing errorSummary when cleanup is skipped', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoDir = join(specsDir, 'demo-err');
      await mkdir(demoDir, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(demoDir, { keep: true }),
          makeReport({ errorSummary: 'Stage 2 failed' }),
        );

        expect(result.cleanupPerformed).toBe(false);
        expect(result.errorSummary).toBe('Stage 2 failed');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  // ── Permission / unsafe path errors ────────────────────────

  describe('path safety and permission errors', () => {
    it('refuses to delete directories outside specs/', async () => {
      const unsafeDir = join(rootDir, 'not-specs', 'demo');
      await mkdir(unsafeDir, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(unsafeDir),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(false);
        expect(result.errorSummary).toContain('not safe to delete');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('refuses paths with parent traversal (..)', async () => {
      const traversalPath = join(rootDir, 'specs', '..', 'etc');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const isSafe = await handler.isSafeToDelete(traversalPath);
        expect(isSafe).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('appends cleanup error to existing errorSummary', async () => {
      const unsafeDir = join(rootDir, 'outside', 'demo');
      await mkdir(unsafeDir, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(unsafeDir),
          makeReport({ errorSummary: 'Previous error' }),
        );

        expect(result.cleanupPerformed).toBe(false);
        expect(result.errorSummary).toContain('Previous error');
        expect(result.errorSummary).toContain('not safe to delete');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  // ── Nested directories ─────────────────────────────────────

  describe('nested directories', () => {
    it('recursively removes deeply nested structures', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoDir = join(specsDir, 'demo-nested');
      const deepDir = join(demoDir, 'level1', 'level2', 'level3');
      await mkdir(deepDir, { recursive: true });
      await writeFile(join(deepDir, 'deep-file.md'), 'deep content');
      await writeFile(join(demoDir, 'top-file.md'), 'top content');
      await writeFile(join(demoDir, 'level1', 'mid-file.md'), 'mid content');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(demoDir),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(true);
        await expect(stat(demoDir)).rejects.toThrow();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('removes directory with mixed files and subdirectories', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoDir = join(specsDir, 'demo-mixed');
      const subDir = join(demoDir, 'sub');
      await mkdir(subDir, { recursive: true });
      await writeFile(join(demoDir, 'spec.md'), '# Spec');
      await writeFile(join(demoDir, 'plan.md'), '# Plan');
      await writeFile(join(subDir, 'notes.txt'), 'notes');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(demoDir),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(true);
        await expect(stat(demoDir)).rejects.toThrow();
        // Parent specs/ dir should still exist
        const parentStats = await stat(specsDir);
        expect(parentStats.isDirectory()).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  // ── Directory doesn't exist ────────────────────────────────

  describe('non-existent directories', () => {
    it('isSafeToDelete returns false for missing directory', async () => {
      const missing = join(rootDir, 'specs', 'ghost');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.isSafeToDelete(missing);
        expect(result).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('cleanup reports path-not-safe when directory is missing', async () => {
      const missing = join(rootDir, 'specs', 'ghost');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.cleanup(
          makeConfig(missing),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('isSafeToDelete returns false for a file (not a directory)', async () => {
      const specsDir = join(rootDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      const filePath = join(specsDir, 'not-a-dir.md');
      await writeFile(filePath, 'content');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        const result = await handler.isSafeToDelete(filePath);
        expect(result).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  // ── Selective cleanup (keep some, remove others) ───────────

  describe('selective cleanup', () => {
    it('cleans one demo dir while leaving another intact', async () => {
      const specsDir = join(rootDir, 'specs');
      const demoA = join(specsDir, 'demo-a');
      const demoB = join(specsDir, 'demo-b');
      await mkdir(demoA, { recursive: true });
      await mkdir(demoB, { recursive: true });
      await writeFile(join(demoA, 'spec.md'), '# A');
      await writeFile(join(demoB, 'spec.md'), '# B');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        // Clean demo-a only
        const result = await handler.cleanup(
          makeConfig(demoA),
          makeReport(),
        );

        expect(result.cleanupPerformed).toBe(true);
        await expect(stat(demoA)).rejects.toThrow();

        // demo-b should be untouched
        const bStats = await stat(demoB);
        expect(bStats.isDirectory()).toBe(true);
        const bFiles = await readdir(demoB);
        expect(bFiles).toContain('spec.md');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('keep=true preserves directory while keep=false removes it', async () => {
      const specsDir = join(rootDir, 'specs');
      const keepDir = join(specsDir, 'demo-keep');
      const removeDir = join(specsDir, 'demo-remove');
      await mkdir(keepDir, { recursive: true });
      await mkdir(removeDir, { recursive: true });
      await writeFile(join(keepDir, 'spec.md'), '# Keep');
      await writeFile(join(removeDir, 'spec.md'), '# Remove');

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        // Keep
        const keepResult = await handler.cleanup(
          makeConfig(keepDir, { keep: true }),
          makeReport(),
        );
        expect(keepResult.cleanupPerformed).toBe(false);

        // Remove
        const removeResult = await handler.cleanup(
          makeConfig(removeDir),
          makeReport(),
        );
        expect(removeResult.cleanupPerformed).toBe(true);

        // Kept dir still exists
        const keepStats = await stat(keepDir);
        expect(keepStats.isDirectory()).toBe(true);

        // Removed dir is gone
        await expect(stat(removeDir)).rejects.toThrow();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('isSafeToDelete accepts specs/ subdirectories only', async () => {
      const specsDir = join(rootDir, 'specs');
      const safeDir = join(specsDir, 'demo-safe');
      const unsafeSrc = join(rootDir, 'src');
      await mkdir(safeDir, { recursive: true });
      await mkdir(unsafeSrc, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(rootDir);
      try {
        expect(await handler.isSafeToDelete(safeDir)).toBe(true);
        expect(await handler.isSafeToDelete(unsafeSrc)).toBe(false);
        expect(await handler.isSafeToDelete(rootDir)).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
