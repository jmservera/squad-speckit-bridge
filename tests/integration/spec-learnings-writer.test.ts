/**
 * T008 tests: SpecLearningsWriterAdapter integration tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SpecLearningsWriterAdapter } from '../../src/sync/adapters/spec-learnings-writer.js';
import type { LearningsMetadata } from '../../src/types.js';

const metadata: LearningsMetadata = {
  featureName: 'Test Feature',
  specId: '001-test',
  executionPeriod: { start: '2026-03-23', end: '2026-03-25' },
  agents: ['gilfoyle'],
};

describe('SpecLearningsWriterAdapter', () => {
  let tempDir: string;
  const adapter = new SpecLearningsWriterAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('write creates learnings.md file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spec-writer-'));
    const content = '# Learnings\n\nSome content';

    const path = await adapter.write(tempDir, content, metadata);

    expect(path).toContain('learnings.md');
    const written = await readFile(path, 'utf-8');
    expect(written).toBe(content);
  });

  it('overwrite replaces existing file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spec-writer-'));

    await adapter.write(tempDir, 'First version', metadata);
    const path = await adapter.write(tempDir, 'Second version', metadata);

    const written = await readFile(path, 'utf-8');
    expect(written).toBe('Second version');
  });

  it('returns correct absolute path', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spec-writer-'));

    const path = await adapter.write(tempDir, 'Content', metadata);

    expect(path).toMatch(/^\/.*learnings\.md$/);
    expect(path).toContain(tempDir);
  });
});
