/**
 * T012 tests: ReverseConstitutionAdapter
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReverseConstitutionAdapter } from '../../src/sync/adapters/reverse-constitution-adapter.js';
import type { ExtractedReverseLearning } from '../../src/types.js';

function makeEntry(overrides: Partial<ExtractedReverseLearning> = {}): ExtractedReverseLearning {
  return {
    title: 'All APIs must have version negotiation',
    content: 'This is a project-wide architectural constraint for API compatibility.',
    sourceType: 'decisions',
    attribution: 'gilfoyle',
    timestamp: '2026-03-24',
    fingerprint: 'fp_test',
    classification: 'constitution-worthy',
    category: 'architectural-insights',
    ...overrides,
  };
}

describe('ReverseConstitutionAdapter', () => {
  let tempDir: string;
  const adapter = new ReverseConstitutionAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates constitution file when it does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rconst-'));
    const constitutionPath = join(tempDir, 'constitution.md');

    const count = await adapter.append(constitutionPath, [makeEntry()]);

    expect(count).toBe(1);
    const content = await readFile(constitutionPath, 'utf-8');
    expect(content).toContain('## Implementation Learnings');
    expect(content).toContain('### All APIs must have version negotiation');
    expect(content).toContain('*Source: gilfoyle, 2026-03-24*');
  });

  it('appends to existing Implementation Learnings section', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rconst-'));
    const constitutionPath = join(tempDir, 'constitution.md');

    const existing = '# Project Constitution\n\n## Implementation Learnings\n\n### Existing Entry\nSome content\n*Source: team, 2026-03-20*\n';
    await writeFile(constitutionPath, existing, 'utf-8');

    const count = await adapter.append(constitutionPath, [makeEntry({ title: 'New Entry', content: 'New content' })]);

    expect(count).toBe(1);
    const content = await readFile(constitutionPath, 'utf-8');
    expect(content).toContain('### Existing Entry');
    expect(content).toContain('### New Entry');
  });

  it('creates nested directory if needed', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rconst-'));
    const constitutionPath = join(tempDir, 'deep', 'nested', 'constitution.md');

    const count = await adapter.append(constitutionPath, [makeEntry()]);

    expect(count).toBe(1);
    const content = await readFile(constitutionPath, 'utf-8');
    expect(content).toContain('## Implementation Learnings');
  });

  it('returns 0 for empty entries array', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rconst-'));
    const constitutionPath = join(tempDir, 'constitution.md');

    const count = await adapter.append(constitutionPath, []);
    expect(count).toBe(0);
  });

  it('appends multiple entries at once', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rconst-'));
    const constitutionPath = join(tempDir, 'constitution.md');

    const entries = [
      makeEntry({ title: 'Entry A', content: 'Content A' }),
      makeEntry({ title: 'Entry B', content: 'Content B', attribution: 'dinesh' }),
    ];

    const count = await adapter.append(constitutionPath, entries);

    expect(count).toBe(2);
    const content = await readFile(constitutionPath, 'utf-8');
    expect(content).toContain('### Entry A');
    expect(content).toContain('### Entry B');
    expect(content).toContain('*Source: dinesh,');
  });
});
