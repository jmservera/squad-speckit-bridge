import { describe, it, expect, vi } from 'vitest';
import { createIssuesFromTasks } from '../../src/issues/create-issues.js';
import type { IssueCreator, TasksMarkdownReader } from '../../src/bridge/ports.js';
import type { TaskEntry } from '../../src/types.js';

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

function makeIssueCreator(): IssueCreator {
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

  it('dry run does not call issueCreator', async () => {
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
});
