import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileSystemArtifactValidator } from '../../src/demo/adapters/artifact-validator.js';
import { ArtifactType, StageStatus } from '../../src/demo/entities.js';
import type { PipelineStage, DemoConfiguration } from '../../src/demo/entities.js';

/** Helper to build a minimal PipelineStage for testing */
function makeStage(name: string, artifact: string): PipelineStage {
  return {
    name,
    displayName: name,
    command: [],
    artifact,
    status: StageStatus.Success,
  };
}

/** Helper to build a minimal DemoConfiguration for testing */
function makeConfig(demoDir: string): DemoConfiguration {
  return {
    exampleFeature: 'Test Feature',
    demoDir,
    flags: { dryRun: false, keep: false, verbose: false },
    timeout: 30,
    squadDir: '',
    specifyDir: '',
  };
}

/** Valid spec.md content with frontmatter and required sections */
const VALID_SPEC = `---
title: Test Spec
version: "1.0"
---

## Overview

This is the overview.

## Requirements

- Requirement 1
`;

/** Valid plan.md content */
const VALID_PLAN = `---
title: Test Plan
---

## Architecture

Clean architecture layers.

## Implementation

Step-by-step plan.
`;

/** Valid tasks.md content */
const VALID_TASKS = `---
title: Test Tasks
---

## Tasks

- [ ] Task 1
`;

/** Valid review.md content */
const VALID_REVIEW = `---
title: Test Review
---

## Summary

All stages passed.
`;

describe('FileSystemArtifactValidator', () => {
  let testDir: string;
  let validator: FileSystemArtifactValidator;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `bridge-artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
    validator = new FileSystemArtifactValidator();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ── Valid artifacts (all required files present) ───────────

  describe('valid artifacts', () => {
    it('validates a well-formed spec.md', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.type).toBe(ArtifactType.Spec);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('validates a well-formed plan.md', async () => {
      const filePath = join(testDir, 'plan.md');
      await writeFile(filePath, VALID_PLAN);

      const result = await validator.validate(filePath, makeStage('plan', 'plan.md'));

      expect(result.valid).toBe(true);
      expect(result.type).toBe(ArtifactType.Plan);
    });

    it('validates a well-formed tasks.md', async () => {
      const filePath = join(testDir, 'tasks.md');
      await writeFile(filePath, VALID_TASKS);

      const result = await validator.validate(filePath, makeStage('tasks', 'tasks.md'));

      expect(result.valid).toBe(true);
      expect(result.type).toBe(ArtifactType.Tasks);
    });

    it('validates a well-formed review.md', async () => {
      const filePath = join(testDir, 'review.md');
      await writeFile(filePath, VALID_REVIEW);

      const result = await validator.validate(filePath, makeStage('review', 'review.md'));

      expect(result.valid).toBe(true);
      expect(result.type).toBe(ArtifactType.Review);
    });

    it('validates all artifacts in a directory via validateAll', async () => {
      await writeFile(join(testDir, 'spec.md'), VALID_SPEC);
      await writeFile(join(testDir, 'plan.md'), VALID_PLAN);
      await writeFile(join(testDir, 'tasks.md'), VALID_TASKS);
      await writeFile(join(testDir, 'review.md'), VALID_REVIEW);

      const artifacts = await validator.validateAll(makeConfig(testDir));

      expect(artifacts).toHaveLength(4);
      expect(artifacts.every((a) => a.valid)).toBe(true);
      expect(artifacts.every((a) => a.exists)).toBe(true);

      const types = artifacts.map((a) => a.type).sort();
      expect(types).toEqual(
        [ArtifactType.Plan, ArtifactType.Review, ArtifactType.Spec, ArtifactType.Tasks].sort(),
      );
    });
  });

  // ── Missing artifacts ──────────────────────────────────────

  describe('missing artifacts', () => {
    it('reports missing file as invalid', async () => {
      const filePath = join(testDir, 'nonexistent.md');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.sizeBytes).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('does not exist');
    });

    it('returns empty array from validateAll on missing directory', async () => {
      const missingDir = join(testDir, 'does-not-exist');

      const artifacts = await validator.validateAll(makeConfig(missingDir));

      expect(artifacts).toEqual([]);
    });

    it('only validates known artifact files in directory', async () => {
      await writeFile(join(testDir, 'spec.md'), VALID_SPEC);
      await writeFile(join(testDir, 'random.txt'), 'not an artifact');

      const artifacts = await validator.validateAll(makeConfig(testDir));

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.Spec);
    });
  });

  // ── Corrupt / invalid artifact content ─────────────────────

  describe('corrupt or invalid content', () => {
    it('rejects file without frontmatter', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, '## Overview\n\n## Requirements\n');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('frontmatter'))).toBe(true);
    });

    it('rejects file with empty frontmatter', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, '---\n---\n\n## Overview\n\n## Requirements\n');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    });

    it('rejects spec.md missing required sections', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, '---\ntitle: Incomplete\n---\n\nNo sections here.\n');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('## Overview'))).toBe(true);
      expect(result.errors.some((e) => e.includes('## Requirements'))).toBe(true);
    });

    it('rejects plan.md missing required sections', async () => {
      const filePath = join(testDir, 'plan.md');
      await writeFile(filePath, '---\ntitle: Bad Plan\n---\n\nNothing useful.\n');

      const result = await validator.validate(filePath, makeStage('plan', 'plan.md'));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('## Architecture'))).toBe(true);
      expect(result.errors.some((e) => e.includes('## Implementation'))).toBe(true);
    });

    it('collects multiple errors in a single validation', async () => {
      const filePath = join(testDir, 'spec.md');
      // No frontmatter AND missing required sections
      await writeFile(filePath, 'Just some text with no structure');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.valid).toBe(false);
      // Should have frontmatter error + section errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Empty directories ──────────────────────────────────────

  describe('empty directories', () => {
    it('returns empty array from validateAll on empty directory', async () => {
      const emptyDir = join(testDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      const artifacts = await validator.validateAll(makeConfig(emptyDir));

      expect(artifacts).toEqual([]);
    });

    it('validates zero-byte file as invalid', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, '');

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── Artifact format / type mapping ─────────────────────────

  describe('artifact format validation', () => {
    it('maps spec.md filename to Spec type', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const result = await validator.validate(filePath, makeStage('unknown', 'spec.md'));
      expect(result.type).toBe(ArtifactType.Spec);
    });

    it('falls back to stage name when filename is unrecognized', async () => {
      const filePath = join(testDir, 'output.md');
      await writeFile(filePath, VALID_PLAN);

      const result = await validator.validate(filePath, makeStage('plan', 'output.md'));
      expect(result.type).toBe(ArtifactType.Plan);
    });

    it('defaults to Spec type for unknown filename and stage', async () => {
      const filePath = join(testDir, 'mystery.md');
      await writeFile(filePath, VALID_SPEC);

      const result = await validator.validate(filePath, makeStage('unknown', 'mystery.md'));
      expect(result.type).toBe(ArtifactType.Spec);
    });

    it('records file size accurately', async () => {
      const content = 'x'.repeat(1234);
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, content);

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));
      expect(result.sizeBytes).toBe(1234);
    });

    it('preserves full path in result', async () => {
      const filePath = join(testDir, 'spec.md');
      await writeFile(filePath, VALID_SPEC);

      const result = await validator.validate(filePath, makeStage('specify', 'spec.md'));
      expect(result.path).toBe(filePath);
    });
  });
});
