/**
 * T007: E2E-style tests for dedup + batch flow wired through createIssueCreator.
 *
 * Uses in-memory mocks injected at the composition root level to test the
 * full flow: tasks parsing → dedup via listExisting → batch creation → output formatting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIssuesFromTasks } from '../../src/issues/create-issues.js';
import type { IssueCreator, TasksMarkdownReader } from '../../src/bridge/ports.js';
import type { TaskEntry, IssueRecord } from '../../src/types.js';
import {
  buildHierarchicalLabel,
  isHierarchicalLabel,
  filterLabelsByPrefix,
} from '../../src/issues/create-issues.js';

// --- Fixtures ---

const FIXTURE_TASKS: TaskEntry[] = [
  { id: 'T001', title: 'Set up project', description: 'Create directories — init', dependencies: [], status: 'pending' },
  { id: 'T002', title: 'Build data model', description: 'Define entities — ORM setup', dependencies: ['T001'], status: 'pending' },
  { id: 'T003', title: 'Add auth layer', description: 'JWT middleware — session mgmt', dependencies: ['T002'], status: 'pending' },
  { id: 'T004', title: 'Create API routes', description: 'RESTful endpoints', dependencies: ['T002', 'T003'], status: 'pending' },
  { id: 'T005', title: 'Write tests', description: 'Integration tests for all routes', dependencies: ['T004'], status: 'done' },
];

const FIXTURE_EXISTING_ISSUES: IssueRecord[] = [
  {
    issueNumber: 10,
    title: 'T001: Set up project',
    body: 'Create directories',
    labels: ['squad', 'area/infra'],
    taskId: 'T001',
    url: 'https://github.com/test/repo/issues/10',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    issueNumber: 11,
    title: 'T003: Add auth layer',
    body: 'JWT middleware',
    labels: ['squad', 'area/auth'],
    taskId: 'T003',
    url: 'https://github.com/test/repo/issues/11',
    createdAt: '2025-01-02T00:00:00Z',
  },
];

const HIERARCHICAL_LABELS = ['area/bridge', 'type/feature', 'agent/dinesh'];

// --- Helpers ---

function makeReader(tasks: TaskEntry[] = FIXTURE_TASKS): TasksMarkdownReader {
  return {
    readAndParse: vi.fn().mockResolvedValue(tasks),
  };
}

function makeCreator(existingIssues: IssueRecord[] = []): IssueCreator {
  let counter = 100;
  return {
    create: vi.fn().mockImplementation(async (task: TaskEntry, labels: string[]) => ({
      issueNumber: counter++,
      title: `${task.id}: ${task.title}`,
      body: task.description,
      labels,
      taskId: task.id,
      url: `https://github.com/test/repo/issues/${counter - 1}`,
      createdAt: new Date().toISOString(),
    })),
    createBatch: vi.fn().mockResolvedValue([]),
    listExisting: vi.fn().mockResolvedValue(existingIssues),
  };
}

// --- Test suites ---

describe('E2E: Issues dedup + batch flow', () => {
  describe('full pipeline with dedup', () => {
    it('skips tasks that already have issues and creates the rest', async () => {
      const reader = makeReader();
      const creator = makeCreator(FIXTURE_EXISTING_ISSUES);

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad', 'area/bridge'],
        repository: 'test/repo',
        dryRun: false,
        batchDelayMs: 10,
      });

      // T001 and T003 are duplicates, T005 is done → T002 and T004 created
      expect(result.total).toBe(5);
      expect(result.duplicates).toHaveLength(2);
      expect(result.duplicates.map(t => t.id).sort()).toEqual(['T001', 'T003']);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].id).toBe('T005');
      expect(result.created).toHaveLength(2);
      expect(result.created.map(i => i.taskId).sort()).toEqual(['T002', 'T004']);
      expect(result.dryRun).toBe(false);

      // Verify listExisting was called with correct args
      expect(creator.listExisting).toHaveBeenCalledWith('test/repo', ['squad', 'area/bridge']);
      // Verify create was called exactly twice
      expect(creator.create).toHaveBeenCalledTimes(2);
    });

    it('dry-run dedup shows correct would-create set without calling create', async () => {
      const reader = makeReader();
      const creator = makeCreator(FIXTURE_EXISTING_ISSUES);

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.created).toHaveLength(2);
      expect(result.created.map(i => i.taskId).sort()).toEqual(['T002', 'T004']);
      expect(result.duplicates).toHaveLength(2);
      // Dry run never calls create
      expect(creator.create).not.toHaveBeenCalled();
      // But it still calls listExisting for dedup
      expect(creator.listExisting).toHaveBeenCalledOnce();
    });

    it('no duplicates → all eligible tasks are created', async () => {
      const reader = makeReader();
      const creator = makeCreator([]); // no existing issues

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: false,
        batchDelayMs: 10,
      });

      expect(result.created).toHaveLength(4); // T001-T004 (T005 is done)
      expect(result.duplicates).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    it('all eligible tasks are duplicates → zero created', async () => {
      const allExisting: IssueRecord[] = FIXTURE_TASKS
        .filter(t => t.status !== 'done')
        .map((t, i) => ({
          issueNumber: 50 + i,
          title: `${t.id}: ${t.title}`,
          body: t.description,
          labels: ['squad'],
          taskId: t.id,
          url: `https://github.com/test/repo/issues/${50 + i}`,
          createdAt: '2025-01-01T00:00:00Z',
        }));
      const reader = makeReader();
      const creator = makeCreator(allExisting);

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: false,
      });

      expect(result.created).toHaveLength(0);
      expect(result.duplicates).toHaveLength(4);
      expect(creator.create).not.toHaveBeenCalled();
    });
  });

  describe('batch sequential creation', () => {
    it('creates issues sequentially with delay between them', async () => {
      const tasks: TaskEntry[] = [
        { id: 'T001', title: 'A', description: 'a', dependencies: [], status: 'pending' },
        { id: 'T002', title: 'B', description: 'b', dependencies: [], status: 'pending' },
        { id: 'T003', title: 'C', description: 'c', dependencies: [], status: 'pending' },
      ];
      const reader = makeReader(tasks);
      const creator = makeCreator();
      const timestamps: number[] = [];

      (creator.create as ReturnType<typeof vi.fn>).mockImplementation(async (task: TaskEntry, labels: string[]) => {
        timestamps.push(Date.now());
        return {
          issueNumber: 1,
          title: `${task.id}: ${task.title}`,
          body: task.description,
          labels,
          taskId: task.id,
          url: '',
          createdAt: new Date().toISOString(),
        };
      });

      await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: false,
        batchDelayMs: 50,
      });

      expect(timestamps).toHaveLength(3);
      // Verify sequential delay between each creation
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(40);
      expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(40);
    });

    it('single eligible task has no trailing delay', async () => {
      const tasks: TaskEntry[] = [
        { id: 'T001', title: 'Solo', description: 'only task', dependencies: [], status: 'pending' },
      ];
      const reader = makeReader(tasks);
      const creator = makeCreator();

      const start = Date.now();
      await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: [],
        repository: 'test/repo',
        dryRun: false,
        batchDelayMs: 500,
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(400);
      expect(creator.create).toHaveBeenCalledOnce();
    });
  });

  describe('hierarchical labels end-to-end', () => {
    it('passes hierarchical labels through the full pipeline', async () => {
      const reader = makeReader();
      const creator = makeCreator();

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: HIERARCHICAL_LABELS,
        repository: 'test/repo',
        dryRun: true,
      });

      // All created issues carry hierarchical labels
      for (const issue of result.created) {
        expect(issue.labels).toEqual(HIERARCHICAL_LABELS);
      }
    });

    it('mixed hierarchical and plain labels are preserved', async () => {
      const reader = makeReader();
      const creator = makeCreator();
      const mixedLabels = ['squad', 'area/bridge', 'type/feature', 'v0.2.0'];

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: mixedLabels,
        repository: 'test/repo',
        dryRun: true,
      });

      expect(result.created[0].labels).toEqual(mixedLabels);

      // Can filter just the hierarchical ones
      const areaLabels = filterLabelsByPrefix(result.created[0].labels, 'area');
      expect(areaLabels).toEqual(['area/bridge']);
      const typeLabels = filterLabelsByPrefix(result.created[0].labels, 'type');
      expect(typeLabels).toEqual(['type/feature']);
    });

    it('buildHierarchicalLabel creates correct prefix/value pairs', () => {
      expect(buildHierarchicalLabel('area', 'issues')).toBe('area/issues');
      expect(buildHierarchicalLabel('type', 'bug')).toBe('type/bug');
      expect(buildHierarchicalLabel('agent', 'gilfoyle')).toBe('agent/gilfoyle');
    });

    it('isHierarchicalLabel validates label format', () => {
      expect(isHierarchicalLabel('area/bridge')).toBe(true);
      expect(isHierarchicalLabel('type/feature')).toBe(true);
      expect(isHierarchicalLabel('agent/dinesh')).toBe(true);
      expect(isHierarchicalLabel('squad')).toBe(false);
      expect(isHierarchicalLabel('unknown/foo')).toBe(false);
      expect(isHierarchicalLabel('area/')).toBe(false);
    });
  });

  describe('--dry-run flag behavior', () => {
    it('dry-run produces placeholder records with issueNumber=0 and empty url', async () => {
      const reader = makeReader();
      const creator = makeCreator();

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad', 'area/bridge'],
        repository: 'test/repo',
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      for (const issue of result.created) {
        expect(issue.issueNumber).toBe(0);
        expect(issue.url).toBe('');
        expect(issue.labels).toEqual(['squad', 'area/bridge']);
      }
    });

    it('dry-run with all tasks done creates nothing', async () => {
      const allDone: TaskEntry[] = [
        { id: 'T001', title: 'Done 1', description: 'd1', dependencies: [], status: 'done' },
        { id: 'T002', title: 'Done 2', description: 'd2', dependencies: [], status: 'done' },
      ];
      const reader = makeReader(allDone);
      const creator = makeCreator();

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: true,
      });

      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
      expect(result.dryRun).toBe(true);
    });
  });

  describe('--labels flag wiring', () => {
    it('custom labels from CLI flag override defaults', async () => {
      const reader = makeReader();
      const creator = makeCreator();
      const customLabels = ['area/bridge', 'type/feature', 'agent/dinesh', 'sprint-42'];

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: customLabels,
        repository: 'test/repo',
        dryRun: true,
      });

      for (const issue of result.created) {
        expect(issue.labels).toEqual(customLabels);
      }
    });

    it('empty labels array is valid', async () => {
      const reader = makeReader();
      const creator = makeCreator();

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: [],
        repository: 'test/repo',
        dryRun: true,
      });

      for (const issue of result.created) {
        expect(issue.labels).toEqual([]);
      }
    });
  });

  describe('listExisting adapter integration', () => {
    it('listExisting is called before any create calls', async () => {
      const reader = makeReader();
      const creator = makeCreator();
      const callOrder: string[] = [];

      (creator.listExisting as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('listExisting');
        return [];
      });
      (creator.create as ReturnType<typeof vi.fn>).mockImplementation(async (task: TaskEntry) => {
        callOrder.push(`create:${task.id}`);
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
        batchDelayMs: 10,
      });

      expect(callOrder[0]).toBe('listExisting');
      expect(callOrder.filter(c => c.startsWith('create:')).length).toBeGreaterThan(0);
    });

    it('listExisting receives repository and labels for accurate dedup', async () => {
      const reader = makeReader();
      const creator = makeCreator();

      await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['area/bridge', 'type/feature'],
        repository: 'myorg/myrepo',
        dryRun: false,
        batchDelayMs: 10,
      });

      expect(creator.listExisting).toHaveBeenCalledWith('myorg/myrepo', ['area/bridge', 'type/feature']);
    });
  });

  describe('empty and edge cases', () => {
    it('empty tasks file produces empty results', async () => {
      const reader = makeReader([]);
      const creator = makeCreator();

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: false,
      });

      expect(result.total).toBe(0);
      expect(result.created).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('custom filter combined with dedup narrows creation set', async () => {
      const reader = makeReader();
      // T001 exists → duplicate
      const creator = makeCreator([FIXTURE_EXISTING_ISSUES[0]]);

      const result = await createIssuesFromTasks(reader, creator, {
        tasksFilePath: 'specs/001/tasks.md',
        labels: ['squad'],
        repository: 'test/repo',
        dryRun: false,
        batchDelayMs: 10,
        // Only tasks with no dependencies
        filter: (t) => t.dependencies.length === 0 && t.status !== 'done',
      });

      // T001 (no deps, pending) → duplicate; T005 (no deps, done) filtered by custom filter
      // T002, T003, T004 all have deps → filtered out by custom filter
      expect(result.created).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].id).toBe('T001');
    });
  });
});
