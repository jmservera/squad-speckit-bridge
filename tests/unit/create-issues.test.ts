import { describe, it, expect, vi } from 'vitest';
import {
  createIssuesFromTasks,
  buildHierarchicalLabel,
  isHierarchicalLabel,
  filterLabelsByPrefix,
} from '../../src/issues/create-issues.js';
import type { IssueCreator, TasksMarkdownReader } from '../../src/bridge/ports.js';
import type { TaskEntry, IssueRecord } from '../../src/types.js';

function makeTasks(): TaskEntry[] {
  return [
    { id: 'T001', title: 'Task 1', description: 'First task — setup', dependencies: [], status: 'pending' },
    { id: 'T002', title: 'Task 2', description: 'Second task — build', dependencies: ['T001'], status: 'pending' },
    { id: 'T003', title: 'Task 3', description: 'Third task — done', dependencies: [], status: 'done' },
  ];
}

function makeReader(tasks?: TaskEntry[]): TasksMarkdownReader {
  return {
    readAndParse: vi.fn().mockResolvedValue(tasks ?? makeTasks()),
  };
}

function makeIssueCreator(existingIssues: IssueRecord[] = []): IssueCreator {
  let counter = 100;
  return {
    create: vi.fn().mockImplementation(async (task) => ({
      issueNumber: counter++,
      title: `${task.id}: ${task.title}`,
      body: task.description,
      labels: ['squad'],
      taskId: task.id,
      url: `https://github.com/test/repo/issues/${counter - 1}`,
      createdAt: new Date().toISOString(),
    })),
    createBatch: vi.fn().mockResolvedValue([]),
    listExisting: vi.fn().mockResolvedValue(existingIssues),


  };
}

describe('createIssuesFromTasks', () => {
  it('creates issues for unchecked tasks only', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result.created).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].id).toBe('T003');
    expect(result.total).toBe(3);
  });

  it('dry run does not call issueCreator.create', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.created).toHaveLength(2);
    expect(creator.create).not.toHaveBeenCalled();
    expect(result.created[0].issueNumber).toBe(0);
  });

  it('passes labels through to created issues', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad', 'v0.2.0'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.created[0].labels).toEqual(['squad', 'v0.2.0']);
  });

  it('handles empty task list', async () => {
    const reader = makeReader([]);
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result.created).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('supports custom filter function', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: true,
      filter: (t) => t.id === 'T001',
    });

    expect(result.created).toHaveLength(1);
    expect(result.created[0].taskId).toBe('T001');
  });

  // T005: Dedup tests

  it('deduplicates tasks that already have issues', async () => {
    const reader = makeReader();
    const existingIssues: IssueRecord[] = [
      { issueNumber: 50, title: 'T001: Task 1', body: '', labels: ['squad'], taskId: 'T001', url: '', createdAt: '' },
    ];
    const creator = makeIssueCreator(existingIssues);

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result.created).toHaveLength(1);
    expect(result.created[0].taskId).toBe('T002');
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].id).toBe('T001');
  });

  it('calls listExisting with repository and labels', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad', 'area/bridge'],
      repository: 'owner/repo',
      dryRun: false,
    });

    expect(creator.listExisting).toHaveBeenCalledWith('owner/repo', ['squad', 'area/bridge']);
  });

  it('dedup works in dry-run mode', async () => {
    const reader = makeReader();
    const existingIssues: IssueRecord[] = [
      { issueNumber: 50, title: 'T001: Task 1', body: '', labels: ['squad'], taskId: 'T001', url: '', createdAt: '' },
    ];
    const creator = makeIssueCreator(existingIssues);

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.created).toHaveLength(1);
    expect(result.created[0].taskId).toBe('T002');
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].id).toBe('T001');
    expect(creator.create).not.toHaveBeenCalled();
  });

  it('all tasks duplicated produces zero created', async () => {
    const reader = makeReader();
    const existingIssues: IssueRecord[] = [
      { issueNumber: 50, title: 'T001: Task 1', body: '', labels: ['squad'], taskId: 'T001', url: '', createdAt: '' },
      { issueNumber: 51, title: 'T002: Task 2', body: '', labels: ['squad'], taskId: 'T002', url: '', createdAt: '' },
    ];
    const creator = makeIssueCreator(existingIssues);

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result.created).toHaveLength(0);
    expect(result.duplicates).toHaveLength(2);
    expect(creator.create).not.toHaveBeenCalled();
  });

  // T005: Batch delay tests

  it('applies batch delay between issue creations', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();
    const timestamps: number[] = [];
    (creator.create as ReturnType<typeof vi.fn>).mockImplementation(async (task: TaskEntry) => {
      timestamps.push(Date.now());
      return {
        issueNumber: 1,
        title: task.id,
        body: '',
        labels: [],
        taskId: task.id,
        url: '',
        createdAt: '',
      };
    });

    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['squad'],
      repository: 'test/repo',
      dryRun: false,
      batchDelayMs: 50,
    });

    expect(timestamps).toHaveLength(2);
    const elapsed = timestamps[1] - timestamps[0];
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow small timing variance
  });

  it('uses default 200ms batch delay when not specified', async () => {
    const tasks: TaskEntry[] = [
      { id: 'T001', title: 'A', description: 'a', dependencies: [], status: 'pending' },
      { id: 'T002', title: 'B', description: 'b', dependencies: [], status: 'pending' },
    ];
    const reader = makeReader(tasks);
    const creator = makeIssueCreator();
    const timestamps: number[] = [];
    (creator.create as ReturnType<typeof vi.fn>).mockImplementation(async (task: TaskEntry) => {
      timestamps.push(Date.now());
      return {
        issueNumber: 1,
        title: task.id,
        body: '',
        labels: [],
        taskId: task.id,
        url: '',
        createdAt: '',
      };
    });

    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(timestamps).toHaveLength(2);
    const elapsed = timestamps[1] - timestamps[0];
    expect(elapsed).toBeGreaterThanOrEqual(180);
  });

  it('single task has no trailing delay', async () => {
    const tasks: TaskEntry[] = [
      { id: 'T001', title: 'A', description: 'a', dependencies: [], status: 'pending' },
    ];
    const reader = makeReader(tasks);
    const creator = makeIssueCreator();

    const start = Date.now();
    await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: false,
      batchDelayMs: 500,
    });
    const elapsed = Date.now() - start;

    // Should complete well under 500ms since there's only one issue
    expect(elapsed).toBeLessThan(400);
    expect(creator.create).toHaveBeenCalledOnce();
  });

  // T005: Hierarchical labels tests

  it('supports hierarchical labels in creation', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: ['area/issues', 'type/feature', 'agent/gilfoyle'],
      repository: 'test/repo',
      dryRun: true,
    });

    expect(result.created[0].labels).toEqual(['area/issues', 'type/feature', 'agent/gilfoyle']);
  });

  it('result includes duplicates field', async () => {
    const reader = makeReader();
    const creator = makeIssueCreator();

    const result = await createIssuesFromTasks(reader, creator, {
      tasksFilePath: 'specs/001/tasks.md',
      labels: [],
      repository: 'test/repo',
      dryRun: false,
    });

    expect(result).toHaveProperty('duplicates');
    expect(result.duplicates).toEqual([]);
  });
});

// T005: Hierarchical label utility tests

describe('buildHierarchicalLabel', () => {
  it('builds area label', () => {
    expect(buildHierarchicalLabel('area', 'issues')).toBe('area/issues');
  });

  it('builds type label', () => {
    expect(buildHierarchicalLabel('type', 'feature')).toBe('type/feature');
  });

  it('builds agent label', () => {
    expect(buildHierarchicalLabel('agent', 'gilfoyle')).toBe('agent/gilfoyle');
  });
});

describe('isHierarchicalLabel', () => {
  it('recognizes valid area label', () => {
    expect(isHierarchicalLabel('area/bridge')).toBe(true);
  });

  it('recognizes valid type label', () => {
    expect(isHierarchicalLabel('type/bug')).toBe(true);
  });

  it('recognizes valid agent label', () => {
    expect(isHierarchicalLabel('agent/dinesh')).toBe(true);
  });

  it('rejects plain labels', () => {
    expect(isHierarchicalLabel('squad')).toBe(false);
  });

  it('rejects unknown prefix', () => {
    expect(isHierarchicalLabel('unknown/foo')).toBe(false);
  });

  it('rejects empty value after slash', () => {
    expect(isHierarchicalLabel('area/')).toBe(false);
  });
});

describe('filterLabelsByPrefix', () => {
  const labels = ['area/issues', 'type/feature', 'agent/gilfoyle', 'squad', 'area/bridge'];

  it('filters area labels', () => {
    expect(filterLabelsByPrefix(labels, 'area')).toEqual(['area/issues', 'area/bridge']);
  });

  it('filters type labels', () => {
    expect(filterLabelsByPrefix(labels, 'type')).toEqual(['type/feature']);
  });

  it('filters agent labels', () => {
    expect(filterLabelsByPrefix(labels, 'agent')).toEqual(['agent/gilfoyle']);
  });

  it('returns empty for no matches', () => {
    expect(filterLabelsByPrefix(['squad', 'v1'], 'area')).toEqual([]);
  });
});
