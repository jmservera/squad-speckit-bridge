/**
 * T016 tests: LearningExtractorAdapter edge case hardening
 */

import { describe, it, expect, afterEach } from 'vitest';
import { rm, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LearningExtractorAdapter } from '../../src/sync/adapters/learning-extractor.js';

describe('LearningExtractorAdapter — edge cases (T016)', () => {
  let tempDir: string;
  const adapter = new LearningExtractorAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('handles history.md without ## Learnings section gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));
    const agentDir = join(tempDir, 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'), '# Agent Test\n\n## Core Context\n\nJust context, no learnings.\n', 'utf-8');

    const results = await adapter.extract(tempDir, ['histories']);
    expect(results).toEqual([]);
  });

  it('handles empty ## Learnings section gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));
    const agentDir = join(tempDir, 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'), '# Agent Test\n\n## Learnings\n\n## Next Section\n\nSomething else.\n', 'utf-8');

    const results = await adapter.extract(tempDir, ['histories']);
    expect(results).toEqual([]);
  });

  it('handles malformed entry headings (no date) gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));
    const agentDir = join(tempDir, 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'),
      '# Agent Test\n\n## Learnings\n\n### No date here\n\nSome body text.\n\n### 2026-03-25: Valid entry\n\nValid body.\n',
      'utf-8',
    );

    const results = await adapter.extract(tempDir, ['histories']);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid entry');
  });

  it('returns empty array when agents directory does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));
    // No agents/ directory created

    const results = await adapter.extract(tempDir, ['histories']);
    expect(results).toEqual([]);
  });

  it('returns empty array when decisions.md does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));

    const results = await adapter.extract(tempDir, ['decisions']);
    expect(results).toEqual([]);
  });

  it('returns empty array when skills directory does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));

    const results = await adapter.extract(tempDir, ['skills']);
    expect(results).toEqual([]);
  });

  it('filters sources correctly: only histories', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));
    const agentDir = join(tempDir, 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'),
      '# Agent\n\n## Learnings\n\n### 2026-03-25: A learning\n\nBody text.\n',
      'utf-8',
    );
    await writeFile(join(tempDir, 'decisions.md'),
      '### Some Decision (2026-03-25)\n\nDecision body.\n',
      'utf-8',
    );

    const results = await adapter.extract(tempDir, ['histories']);
    expect(results).toHaveLength(1);
    expect(results[0].sourceType).toBe('histories');
  });

  it('extracts from all three source types', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-'));

    // Set up histories
    const agentDir = join(tempDir, 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'),
      '# Agent\n\n## Learnings\n\n### 2026-03-25: History item\n\nHistory body.\n',
      'utf-8',
    );

    // Set up decisions
    await writeFile(join(tempDir, 'decisions.md'),
      '### Some Decision (2026-03-25)\n\nDecision body.\n',
      'utf-8',
    );

    // Set up skills
    const skillDir = join(tempDir, 'skills', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# Test Skill\n\nSkill content.\n', 'utf-8');

    const results = await adapter.extract(tempDir, ['histories', 'decisions', 'skills']);
    const sourceTypes = results.map(r => r.sourceType);
    expect(sourceTypes).toContain('histories');
    expect(sourceTypes).toContain('decisions');
    expect(sourceTypes).toContain('skills');
  });
});
