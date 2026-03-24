/**
 * Integration tests for T009: AgentHistoryReaderAdapter
 *
 * Tests against real file system with temp directories containing
 * mock agent history files. Verifies timestamp filtering, multi-agent
 * discovery, and graceful handling of missing/empty history.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AgentHistoryReaderAdapter } from '../../src/sync/adapters/agent-history-reader.js';

function makeHistory(entries: { date: string; title: string; body: string }[]): string {
  const header = '# Agent — History\n\n## Learnings\n';
  const sections = entries
    .map((e) => `\n### ${e.date}: ${e.title}\n\n${e.body}\n`)
    .join('');
  return header + sections;
}

describe('AgentHistoryReaderAdapter — basic extraction', () => {
  let tempDir: string;
  const reader = new AgentHistoryReaderAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('extracts learnings from a single agent history file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'gilfoyle');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-07-15', title: 'Caching insight', body: 'LRU cache helps' },
        { date: '2025-07-16', title: 'Perf win', body: 'Reduced latency 40%' },
      ]),
    );

    const learnings = await reader.extractLearnings(tempDir);

    expect(learnings).toHaveLength(2);
    expect(learnings[0].agentName).toBe('gilfoyle');
    expect(learnings[0].title).toBe('Caching insight');
    expect(learnings[0].content).toBe('LRU cache helps');
    expect(learnings[1].title).toBe('Perf win');
  });

  it('discovers multiple agents in subdirectories', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    for (const agent of ['dinesh', 'gilfoyle', 'richard']) {
      const dir = join(tempDir, agent);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, 'history.md'),
        makeHistory([{ date: '2025-07-15', title: `${agent} learning`, body: 'content' }]),
      );
    }

    const learnings = await reader.extractLearnings(tempDir);

    expect(learnings).toHaveLength(3);
    const names = learnings.map((l) => l.agentName);
    expect(names).toContain('dinesh');
    expect(names).toContain('gilfoyle');
    expect(names).toContain('richard');
  });

  it('includes source file path in extracted learnings', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([{ date: '2025-07-15', title: 'Test', body: 'body' }]),
    );

    const learnings = await reader.extractLearnings(tempDir);

    expect(learnings[0].source).toContain('history.md');
    expect(learnings[0].source).toContain('dinesh');
  });
});

describe('AgentHistoryReaderAdapter — timestamp filtering', () => {
  let tempDir: string;
  const reader = new AgentHistoryReaderAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns only entries newer than since date', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'gilfoyle');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-07-10', title: 'Old learning', body: 'old stuff' },
        { date: '2025-07-15', title: 'New learning', body: 'new stuff' },
        { date: '2025-07-20', title: 'Newest learning', body: 'newest stuff' },
      ]),
    );

    const since = new Date('2025-07-14');
    const learnings = await reader.extractLearnings(tempDir, since);

    expect(learnings).toHaveLength(2);
    expect(learnings[0].title).toBe('New learning');
    expect(learnings[1].title).toBe('Newest learning');
  });

  it('returns all entries when since is undefined', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-06-01', title: 'Ancient', body: 'old' },
        { date: '2025-07-15', title: 'Recent', body: 'new' },
      ]),
    );

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toHaveLength(2);
  });

  it('returns empty when all entries are older than since', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'gilfoyle');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-07-01', title: 'Old', body: 'old content' },
        { date: '2025-07-05', title: 'Also old', body: 'also old' },
      ]),
    );

    const since = new Date('2025-07-10');
    const learnings = await reader.extractLearnings(tempDir, since);
    expect(learnings).toHaveLength(0);
  });

  it('includes entries on exact since date', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-07-15', title: 'Exact date', body: 'content' },
      ]),
    );

    // since = midnight July 15 → entry date parses as midnight July 15 → not strictly less
    // The adapter uses `<` to skip: entries at exactly since date are included (>= semantics)
    const since = new Date('2025-07-15');
    const learnings = await reader.extractLearnings(tempDir, since);
    expect(learnings).toHaveLength(1);
  });
});

describe('AgentHistoryReaderAdapter — graceful error handling', () => {
  let tempDir: string;
  const reader = new AgentHistoryReaderAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns empty array for non-existent directory', async () => {
    const learnings = await reader.extractLearnings('/non/existent/dir');
    expect(learnings).toEqual([]);
  });

  it('returns empty array for empty directory', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toEqual([]);
  });

  it('returns empty array for directory with no history.md files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'notes.txt'), 'not a history file');

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toEqual([]);
  });

  it('skips entries without valid date format', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'gilfoyle');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      [
        '# History',
        '',
        '### 2025-07-15: Valid entry',
        '',
        'Valid content',
        '',
        '### No date here',
        '',
        'This should be skipped',
        '',
        '### 2025-07-16: Another valid',
        '',
        'More content',
      ].join('\n'),
    );

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toHaveLength(2);
    expect(learnings[0].title).toBe('Valid entry');
    expect(learnings[1].title).toBe('Another valid');
  });

  it('handles empty history file gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, 'history.md'), '');

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toEqual([]);
  });

  it('handles history file with only headers (no entries)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      '# dinesh — History\n\n## Core Context\n\n## Learnings\n',
    );

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toEqual([]);
  });

  it('uses title as content when body is empty', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'history-'));
    const agentDir = join(tempDir, 'gilfoyle');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      '# History\n\n### 2025-07-15: Title only\n',
    );

    const learnings = await reader.extractLearnings(tempDir);
    expect(learnings).toHaveLength(1);
    expect(learnings[0].content).toBe('Title only');
  });
});

describe('AgentHistoryReaderAdapter — end-to-end with SyncStateAdapter', () => {
  let tempDir: string;
  const reader = new AgentHistoryReaderAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('filters using timestamp from persisted sync state', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'e2e-'));

    // Simulate agents directory with history entries spanning dates
    const agentDir = join(tempDir, 'agents', 'dinesh');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      makeHistory([
        { date: '2025-07-01', title: 'Before sync', body: 'Should be filtered' },
        { date: '2025-07-10', title: 'At sync time', body: 'Borderline' },
        { date: '2025-07-15', title: 'After sync', body: 'Should be included' },
      ]),
    );

    // Simulate a last sync timestamp — entries at or after since are included
    const since = new Date('2025-07-10T00:00:00.000Z');
    const learnings = await reader.extractLearnings(join(tempDir, 'agents'), since);

    expect(learnings).toHaveLength(2);
    expect(learnings[0].title).toBe('At sync time');
    expect(learnings[1].title).toBe('After sync');
  });
});
