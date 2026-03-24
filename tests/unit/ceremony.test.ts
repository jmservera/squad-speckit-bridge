/**
 * T028 Tests: PrepareReview Use Case
 *
 * Unit tests with mocked ports — no file I/O.
 */

import { describe, it, expect, vi } from 'vitest';
import { prepareReview, prepareFidelityReview } from '../../src/review/ceremony.js';
import type { SquadStateReader, TasksReader } from '../../src/bridge/ports.js';
import type { SpecReader, ImplementationScanner } from '../../src/review/ports.js';
import type {
  TaskEntry,
  DecisionEntry,
  LearningEntry,
  FunctionalRequirement,
  ImplementationEvidence,
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

// ── T012: Fidelity Review Tests ──────────────────────────────────────

function makeFR(overrides: Partial<FunctionalRequirement> = {}): FunctionalRequirement {
  return {
    id: 'FR-001',
    title: 'User authentication',
    description: 'FR-001: User authentication via JWT',
    acceptanceCriteria: ['Must support token refresh'],
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<ImplementationEvidence> = {}): ImplementationEvidence {
  return {
    requirementId: 'FR-001',
    filePath: 'src/auth.ts',
    line: 10,
    snippet: '// FR-001: auth logic',
    kind: 'comment',
    ...overrides,
  };
}

function makeSpecReader(requirements: FunctionalRequirement[]): SpecReader {
  return { readRequirements: vi.fn().mockResolvedValue(requirements) };
}

function makeImplScanner(evidence: ImplementationEvidence[]): ImplementationScanner {
  return { scan: vi.fn().mockResolvedValue(evidence) };
}

describe('PrepareFidelityReview', () => {
  it('reports full coverage when all requirements have annotations', async () => {
    const reqs = [makeFR({ id: 'FR-001' }), makeFR({ id: 'FR-002', title: 'Logging' })];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'annotation' }),
      makeEvidence({ requirementId: 'FR-002', kind: 'annotation' }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'specs/001/spec.md', srcDir: 'src/' },
    );

    expect(report.covered).toHaveLength(2);
    expect(report.missing).toHaveLength(0);
    expect(report.partial).toHaveLength(0);
    expect(report.coverage).toBe(1);
    expect(report.specPath).toBe('specs/001/spec.md');
    expect(report.srcDir).toBe('src/');
    expect(report.timestamp).toBeTruthy();
  });

  it('reports missing requirements with no evidence', async () => {
    const reqs = [
      makeFR({ id: 'FR-001' }),
      makeFR({ id: 'FR-002', title: 'Logging' }),
      makeFR({ id: 'FR-003', title: 'Error handling' }),
    ];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'annotation' }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.covered).toHaveLength(1);
    expect(report.missing).toHaveLength(2);
    expect(report.missing.map((r) => r.id)).toEqual(['FR-002', 'FR-003']);
    expect(report.coverage).toBeCloseTo(1 / 3);
  });

  it('classifies partial when only one non-annotation evidence exists', async () => {
    const reqs = [makeFR({ id: 'FR-001' })];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'comment' }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.partial).toHaveLength(1);
    expect(report.partial[0].id).toBe('FR-001');
    expect(report.coverage).toBe(0.5);
  });

  it('classifies covered when two or more evidence lines exist', async () => {
    const reqs = [makeFR({ id: 'FR-001' })];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'comment', line: 10 }),
      makeEvidence({ requirementId: 'FR-001', kind: 'reference', line: 42 }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.covered).toHaveLength(1);
    expect(report.coverage).toBe(1);
  });

  it('handles empty spec (no requirements) gracefully', async () => {
    const report = await prepareFidelityReview(
      makeSpecReader([]),
      makeImplScanner([]),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.covered).toHaveLength(0);
    expect(report.missing).toHaveLength(0);
    expect(report.partial).toHaveLength(0);
    expect(report.entries).toHaveLength(0);
    expect(report.coverage).toBe(1);
    expect(report.summary).toContain('No functional requirements');
  });

  it('handles empty scanner results (no implementation) gracefully', async () => {
    const reqs = [
      makeFR({ id: 'FR-001' }),
      makeFR({ id: 'FR-002', title: 'Logging' }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner([]),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.covered).toHaveLength(0);
    expect(report.missing).toHaveLength(2);
    expect(report.partial).toHaveLength(0);
    expect(report.coverage).toBe(0);
    expect(report.summary).toContain('Missing: FR-001, FR-002');
  });

  it('produces entries with correct evidence mapping', async () => {
    const reqs = [
      makeFR({ id: 'FR-001' }),
      makeFR({ id: 'FR-002', title: 'Logging' }),
    ];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'annotation', filePath: 'src/auth.ts' }),
      makeEvidence({ requirementId: 'FR-001', kind: 'comment', filePath: 'src/auth.test.ts' }),
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.entries).toHaveLength(2);

    const fr001Entry = report.entries.find((e) => e.requirement.id === 'FR-001');
    expect(fr001Entry?.status).toBe('covered');
    expect(fr001Entry?.evidence).toHaveLength(2);

    const fr002Entry = report.entries.find((e) => e.requirement.id === 'FR-002');
    expect(fr002Entry?.status).toBe('missing');
    expect(fr002Entry?.evidence).toHaveLength(0);
  });

  it('generates a summary with coverage percentage', async () => {
    const reqs = [
      makeFR({ id: 'FR-001' }),
      makeFR({ id: 'FR-002', title: 'Logging' }),
      makeFR({ id: 'FR-003', title: 'Error handling' }),
      makeFR({ id: 'FR-004', title: 'Notifications' }),
    ];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'annotation' }),
      makeEvidence({ requirementId: 'FR-002', kind: 'annotation' }),
      makeEvidence({ requirementId: 'FR-003', kind: 'reference' }), // partial (1 non-annotation)
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    // 2 covered (1.0 each) + 1 partial (0.5) + 1 missing (0) = 2.5 / 4 = 62.5%
    expect(report.coverage).toBeCloseTo(0.625);
    expect(report.summary).toContain('63%');
    expect(report.summary).toContain('2 covered');
    expect(report.summary).toContain('1 partial');
    expect(report.summary).toContain('1 missing');
    expect(report.summary).toContain('FR-004');
  });

  it('calls ports with correct arguments', async () => {
    const specReader = makeSpecReader([makeFR({ id: 'FR-010' })]);
    const implScanner = makeImplScanner([]);

    await prepareFidelityReview(specReader, implScanner, {
      specPath: 'specs/feature/spec.md',
      srcDir: 'src/feature/',
    });

    expect(specReader.readRequirements).toHaveBeenCalledWith('specs/feature/spec.md');
    expect(implScanner.scan).toHaveBeenCalledWith('src/feature/', ['FR-010']);
  });

  it('does not call scanner when spec has no requirements', async () => {
    const specReader = makeSpecReader([]);
    const implScanner = makeImplScanner([]);

    await prepareFidelityReview(specReader, implScanner, {
      specPath: 'spec.md',
      srcDir: 'src/',
    });

    expect(specReader.readRequirements).toHaveBeenCalledOnce();
    expect(implScanner.scan).not.toHaveBeenCalled();
  });

  it('mixed scenario: covered + partial + missing', async () => {
    const reqs = [
      makeFR({ id: 'FR-001' }),
      makeFR({ id: 'FR-002', title: 'Logging' }),
      makeFR({ id: 'FR-003', title: 'Error handling' }),
    ];
    const evidence = [
      makeEvidence({ requirementId: 'FR-001', kind: 'annotation' }),
      makeEvidence({ requirementId: 'FR-002', kind: 'comment' }), // single non-annotation → partial
      // FR-003 has no evidence → missing
    ];

    const report = await prepareFidelityReview(
      makeSpecReader(reqs),
      makeImplScanner(evidence),
      { specPath: 'spec.md', srcDir: 'src/' },
    );

    expect(report.covered.map((r) => r.id)).toEqual(['FR-001']);
    expect(report.partial.map((r) => r.id)).toEqual(['FR-002']);
    expect(report.missing.map((r) => r.id)).toEqual(['FR-003']);
    // (1 + 0.5 + 0) / 3 = 0.5
    expect(report.coverage).toBeCloseTo(0.5);
  });
});
