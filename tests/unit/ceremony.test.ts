/**
 * T028 Tests: PrepareReview Use Case
 *
 * Unit tests with mocked ports — no file I/O.
 */

import { describe, it, expect, vi } from 'vitest';
import { prepareReview } from '../../src/review/ceremony.js';
import type { SquadStateReader, TasksReader } from '../../src/bridge/ports.js';
import type {
  TaskEntry,
  DecisionEntry,
  LearningEntry,
} from '../../src/types.js';

function makeTasksReader(tasks: TaskEntry[]): TasksReader {
  return { readTasks: vi.fn().mockResolvedValue(tasks) };
}

function makeSquadReader(
  overrides: Partial<{
    decisions: DecisionEntry[];
    learnings: LearningEntry[];
  }> = {},
): SquadStateReader {
  return {
    readSkills: vi.fn().mockResolvedValue([]),
    readDecisions: vi.fn().mockResolvedValue(overrides.decisions ?? []),
    readLearnings: vi.fn().mockResolvedValue(overrides.learnings ?? []),
  };
}

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 'T001',
    title: 'Test task',
    description: 'Implement the test feature with authentication',
    dependencies: [],
    status: 'pending',
    ...overrides,
  };
}

function makeDecision(overrides: Partial<DecisionEntry> = {}): DecisionEntry {
  return {
    title: 'Use JWT authentication',
    date: '2025-07-01',
    status: 'Adopted',
    summary: 'Authentication should use JWT tokens for session management',
    relevanceScore: 0.8,
    fullContent: 'Full content here',
    ...overrides,
  };
}

function makeLearning(
  overrides: Partial<LearningEntry> = {},
): LearningEntry {
  return {
    agentName: 'dinesh',
    agentRole: 'Integration Engineer',
    entries: [
      {
        date: '2025-07-20',
        title: 'Authentication integration is fragile',
        summary: 'The authentication module required careful handling',
      },
    ],
    rawSize: 500,
    ...overrides,
  };
}

describe('PrepareReview', () => {
  it('produces an approved record when no conflicts detected', async () => {
    const tasksReader = makeTasksReader([makeTask()]);
    const squadReader = makeSquadReader();

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'specs/001/tasks.md',
    });

    expect(record.reviewedArtifact).toBe('specs/001/tasks.md');
    expect(record.approvalStatus).toBe('approved');
    expect(record.findings.length).toBe(0);
    expect(record.summary).toContain('Reviewed 1 tasks');
    expect(record.timestamp).toBeTruthy();
    expect(record.participants).toContain('bridge-cli');
  });

  it('detects decision conflicts via keyword overlap', async () => {
    const task = makeTask({
      id: 'T010',
      description: 'Implement JWT authentication tokens for session management',
    });
    const decision = makeDecision({
      title: 'Use JWT authentication',
      summary: 'Authentication should use JWT tokens for session management',
    });

    const tasksReader = makeTasksReader([task]);
    const squadReader = makeSquadReader({ decisions: [decision] });

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    const conflicts = record.findings.filter(
      (f) => f.type === 'decision_conflict',
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].description).toContain('T010');
    expect(record.approvalStatus).toBe('changes_requested');
  });

  it('detects risks from agent learnings', async () => {
    const task = makeTask({
      id: 'T020',
      description:
        'Build authentication integration with external identity provider',
    });
    const learning = makeLearning({
      agentName: 'dinesh',
      entries: [
        {
          date: '2025-07-20',
          title: 'Authentication integration is fragile',
          summary:
            'The authentication integration required careful error handling',
        },
      ],
    });

    const tasksReader = makeTasksReader([task]);
    const squadReader = makeSquadReader({ learnings: [learning] });

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    const risks = record.findings.filter((f) => f.type === 'risk');
    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].description).toContain('dinesh');
    expect(risks[0].description).toContain('T020');
  });

  it('detects ordering issues for missing dependencies', async () => {
    const task = makeTask({
      id: 'T005',
      dependencies: ['T999'], // T999 doesn't exist
    });

    const tasksReader = makeTasksReader([task]);
    const squadReader = makeSquadReader();

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    const ordering = record.findings.filter((f) => f.type === 'ordering');
    expect(ordering.length).toBe(1);
    expect(ordering[0].description).toContain('T999');
    expect(ordering[0].severity).toBe('high');
    expect(record.approvalStatus).toBe('blocked');
  });

  it('detects scope issues for underspecified tasks', async () => {
    const task = makeTask({
      id: 'T099',
      description: 'Fix the bug',
    });

    const tasksReader = makeTasksReader([task]);
    const squadReader = makeSquadReader();

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    const scope = record.findings.filter((f) => f.type === 'scope');
    expect(scope.length).toBe(1);
    expect(scope[0].description).toContain('T099');
    expect(scope[0].severity).toBe('low');
  });

  it('sorts findings by severity (high first)', async () => {
    const tasks = [
      makeTask({
        id: 'T001',
        dependencies: ['T999'], // high: ordering
        description: 'Implement JWT authentication tokens for session management',
      }),
    ];
    const decision = makeDecision({
      title: 'Use JWT authentication',
      summary: 'Authentication should use JWT tokens for session management',
    });

    const tasksReader = makeTasksReader(tasks);
    const squadReader = makeSquadReader({ decisions: [decision] });

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    expect(record.findings.length).toBeGreaterThan(1);
    // First finding should be high severity (ordering)
    expect(record.findings[0].severity).toBe('high');
  });

  it('accepts custom participants', async () => {
    const tasksReader = makeTasksReader([makeTask()]);
    const squadReader = makeSquadReader();

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
      participants: ['richard', 'dinesh', 'gilfoyle'],
    });

    expect(record.participants).toEqual(['richard', 'dinesh', 'gilfoyle']);
  });

  it('handles empty task list', async () => {
    const tasksReader = makeTasksReader([]);
    const squadReader = makeSquadReader();

    const { record } = await prepareReview(tasksReader, squadReader, {
      tasksFilePath: 'tasks.md',
    });

    expect(record.findings).toEqual([]);
    expect(record.approvalStatus).toBe('approved');
    expect(record.summary).toContain('Reviewed 0 tasks');
  });
});
