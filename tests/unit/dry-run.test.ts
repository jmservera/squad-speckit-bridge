/**
 * T018-T022: Dry-Run Feature Chain Tests
 *
 * Comprehensive tests covering:
 *   T018: --dry-run / -n global flag parsing and pipeline propagation
 *   T019: Issues stage dry-run simulation
 *   T020: Stage validation / write-skip behavior in dry-run mode
 *   T021: [DRY RUN] indicator in human output
 *   T022: dryRun field in JSON output
 */

import { describe, it, expect, vi } from 'vitest';
import { createIssuesFromTasks } from '../../src/issues/create-issues.js';
import { syncLearnings } from '../../src/sync/sync-learnings.js';
import type { SyncStateReader } from '../../src/sync/sync-learnings.js';
import type { IssueCreator, TasksMarkdownReader, SquadMemoryWriter } from '../../src/bridge/ports.js';
import type { TaskEntry } from '../../src/types.js';

// ─────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────

function makeTasks(): TaskEntry[] {
  return [
    { id: 'T001', title: 'Setup', description: 'Setup — initial', dependencies: [], status: 'pending' },
    { id: 'T002', title: 'Build', description: 'Build — compile', dependencies: ['T001'], status: 'pending' },
    { id: 'T003', title: 'Done', description: 'Already done', dependencies: [], status: 'done' },
  ];
}

function makeReader(tasks?: TaskEntry[]): TasksMarkdownReader {
  return {
    readAndParse: vi.fn().mockResolvedValue(tasks ?? makeTasks()),
  };
}

function makeIssueCreator(): IssueCreator & { create: ReturnType<typeof vi.fn> } {
  let counter = 100;
  return {
    create: vi.fn().mockImplementation(async (task: TaskEntry) => ({
      issueNumber: counter++,
      title: `${task.id}: ${task.title}`,
      body: task.description,
      labels: ['squad'],
      taskId: task.id,
      url: `https://github.com/test/repo/issues/${counter - 1}`,
      createdAt: new Date().toISOString(),
    })),
    createBatch: vi.fn().mockResolvedValue([]),
  };
}

function makeSyncStateReader(overrides: Partial<SyncStateReader> = {}): SyncStateReader {
  return {
    readSyncState: vi.fn().mockResolvedValue(null),
    writeSyncState: vi.fn().mockResolvedValue(undefined),
    readSpecResults: vi.fn().mockResolvedValue([
      { title: 'Learning 1', content: 'Content 1' },
      { title: 'Learning 2', content: 'Content 2' },
    ]),
    ...overrides,
  };
}

function makeMemoryWriter(): SquadMemoryWriter & { writeLearning: ReturnType<typeof vi.fn> } {
  return {
    writeLearning: vi.fn().mockResolvedValue('.squad/agents/bridge/history.md'),
    writeDecision: vi.fn().mockResolvedValue('.squad/decisions.md'),
  };
}

// ─────────────────────────────────────────────────────────────
// T018: --dry-run flag option and pipeline propagation
// ─────────────────────────────────────────────────────────────

describe('T018: --dry-run flag propagation', () => {
  it('issues use case receives dryRun=true and produces dry-run result', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
  });

  it('issues use case receives dryRun=false and produces non-dry-run result', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result.dryRun).toBe(false);
  });

  it('sync use case receives dryRun=true and produces dry-run result', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// T019: Issues stage dry-run simulation
// ─────────────────────────────────────────────────────────────

describe('T019: Issues stage dry-run simulation', () => {
  it('does not call GitHub API (issueCreator.create) in dry-run', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(creator.create).not.toHaveBeenCalled();
  });

  it('produces placeholder IssueRecords with issueNumber=0 in dry-run', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.created).toHaveLength(2);
    for (const issue of result.created) {
      expect(issue.issueNumber).toBe(0);
      expect(issue.url).toBe('');
    }
  });

  it('includes correct titles for simulated issues', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad', 'v2'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.created[0].title).toContain('T001');
    expect(result.created[1].title).toContain('T002');
  });

  it('preserves labels in dry-run placeholders', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: ['squad', 'dry-run-test'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.created[0].labels).toEqual(['squad', 'dry-run-test']);
  });

  it('correctly reports total/eligible/skipped counts in dry-run', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.total).toBe(3);
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].id).toBe('T003');
  });
});

// ─────────────────────────────────────────────────────────────
// T020: Stage validation / write-skip in dry-run
// ─────────────────────────────────────────────────────────────

describe('T020: Stage write-skip behavior in dry-run', () => {
  it('sync dry-run does not write learnings to memory', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(writer.writeLearning).not.toHaveBeenCalled();
  });

  it('sync dry-run does not update sync state', async () => {
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader = makeSyncStateReader({ writeSyncState });
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(writeSyncState).not.toHaveBeenCalled();
  });

  it('sync dry-run returns empty filesWritten array', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result.record.filesWritten).toHaveLength(0);
  });

  it('issues dry-run still reads and parses the tasks file', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(reader.readAndParse).toHaveBeenCalledWith('tasks.md');
  });
});

// ─────────────────────────────────────────────────────────────
// T021: [DRY RUN] indicator in human output
// ─────────────────────────────────────────────────────────────

describe('T021: [DRY RUN] indicator in human output', () => {
  it('sync dry-run summary contains [DRY RUN] prefix', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result.record.summary).toContain('[DRY RUN]');
  });

  it('sync non-dry-run summary does not contain [DRY RUN]', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    expect(result.record.summary).not.toContain('[DRY RUN]');
  });

  it('sync dry-run summary describes what would happen', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result.record.summary).toContain('Would sync');
    expect(result.record.summary).toContain('2 learning(s)');
  });
});

// ─────────────────────────────────────────────────────────────
// T022: dryRun field in JSON output
// ─────────────────────────────────────────────────────────────

describe('T022: dryRun field in result objects', () => {
  it('issues result includes dryRun=true when dry-run', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result).toHaveProperty('dryRun', true);
  });

  it('issues result includes dryRun=false when not dry-run', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result).toHaveProperty('dryRun', false);
  });

  it('sync result includes dryRun=true when dry-run', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result).toHaveProperty('dryRun', true);
  });

  it('sync result includes dryRun=false when not dry-run', async () => {
    const stateReader = makeSyncStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    expect(result).toHaveProperty('dryRun', false);
  });
});
