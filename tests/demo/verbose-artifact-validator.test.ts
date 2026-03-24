/**
 * T029: Verbose mode in ArtifactValidator
 *
 * Tests that FileSystemArtifactValidator logs each file being checked,
 * its size, validation rules applied, and pass/fail status per file.
 */

import { describe, it, expect, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { FileSystemArtifactValidator } from '../../src/demo/adapters/artifact-validator.js';
import { StageStatus } from '../../src/demo/entities.js';
import type { PipelineStage, DemoConfiguration } from '../../src/demo/entities.js';
import type { Logger } from '../../src/cli/logger.js';

// ── Helpers ──────────────────────────────────────────────────

const TEST_DIR = join(process.cwd(), 'tests', 'demo', '.validator-verbose-test');

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

function makeStage(name: string, artifact: string): PipelineStage {
  return {
    name,
    displayName: `Test ${name}`,
    command: ['speckit', name],
    artifact,
    status: StageStatus.Success,
  };
}

const VALID_SPEC = `---
title: Test Spec
---

## Overview
Test overview

## Requirements
Test requirements
`;

const INVALID_SPEC_NO_FRONTMATTER = `
## Overview
Test overview
`;

// ── Setup / Teardown ─────────────────────────────────────────

async function setupTestDir(): Promise<void> {
  await mkdir(TEST_DIR, { recursive: true });
}

async function cleanupTestDir(): Promise<void> {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('T029: ArtifactValidator verbose mode', () => {
  it('should log the artifact path being checked', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] Checking artifact:') && m.includes('spec.md'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log the artifact type detected', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] Artifact type: spec'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log file size when file exists', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] File exists, size:') && m.includes('bytes'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log when file does not exist', async () => {
    const { logger, calls } = makeVerboseLogger();
    const validator = new FileSystemArtifactValidator(logger);
    const stage = makeStage('specify', 'spec.md');

    await validator.validate('/nonexistent/path/spec.md', stage);

    expect(calls.some((m) => m.includes('[validate] ✗ File does not exist'))).toBe(true);
  });

  it('should log frontmatter validation rule', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] Rule: YAML frontmatter check'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log frontmatter pass result', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] ✓ Frontmatter check passed'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log frontmatter failure', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, INVALID_SPEC_NO_FRONTMATTER);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] ✗ Frontmatter check failed'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log required sections rule with section names', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) =>
        m.includes('[validate] Rule: Required sections check') &&
        m.includes('## Overview') &&
        m.includes('## Requirements'),
      )).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log PASS result for valid artifact', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] Result: PASS'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log FAIL result for invalid artifact', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, INVALID_SPEC_NO_FRONTMATTER);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const stage = makeStage('specify', 'spec.md');

      await validator.validate(filePath, stage);

      expect(calls.some((m) => m.includes('[validate] Result: FAIL'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should work without a logger (no errors)', async () => {
    await setupTestDir();
    try {
      const filePath = join(TEST_DIR, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const validator = new FileSystemArtifactValidator();
      const stage = makeStage('specify', 'spec.md');

      const result = await validator.validate(filePath, stage);

      expect(result.valid).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });

  it('should log validateAll scan details', async () => {
    await setupTestDir();
    try {
      await writeFile(join(TEST_DIR, 'spec.md'), VALID_SPEC);

      const { logger, calls } = makeVerboseLogger();
      const validator = new FileSystemArtifactValidator(logger);
      const config: DemoConfiguration = {
        exampleFeature: 'test',
        demoDir: TEST_DIR,
        flags: { dryRun: false, keep: false, verbose: true },
        timeout: 30,
        squadDir: '.squad',
        specifyDir: 'specs',
      };

      await validator.validateAll(config);

      expect(calls.some((m) => m.includes('[validateAll] Scanning directory:'))).toBe(true);
      expect(calls.some((m) => m.includes('[validateAll] Validated'))).toBe(true);
    } finally {
      await cleanupTestDir();
    }
  });
});
