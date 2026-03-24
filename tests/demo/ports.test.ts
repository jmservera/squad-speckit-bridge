/**
 * T038: Port Interface Tests
 *
 * Verifies that port interfaces:
 * 1. Accept only DTOs defined in types.ts — no framework types leak through.
 * 2. Have correct method signatures (parameter types, return types).
 * 3. The ports module imports exclusively from the entity layer.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  SquadStateReader,
  ContextWriter,
  TasksReader,
  FrameworkDetector,
  FileDeployer,
  ConfigLoader,
  IssueCreator,
  SquadMemoryWriter,
  TasksMarkdownReader,
  PreviousContextMetadata,
} from '../../src/bridge/ports.js';
import type {
  BridgeConfig,
  ContextSummary,
  DecisionEntry,
  DeploymentFile,
  IssueRecord,
  LearningEntry,
  SkillEntry,
  TaskEntry,
} from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers: factories for DTO fixtures
// ---------------------------------------------------------------------------

function makeSkillEntry(overrides: Partial<SkillEntry> = {}): SkillEntry {
  return {
    name: 'test-skill',
    context: 'test context',
    patterns: ['pattern-a'],
    antiPatterns: ['anti-a'],
    rawSize: 100,
    ...overrides,
  };
}

function makeDecisionEntry(overrides: Partial<DecisionEntry> = {}): DecisionEntry {
  return {
    title: 'Test Decision',
    date: '2025-07-01',
    status: 'Active',
    summary: 'A test decision',
    relevanceScore: 0.8,
    fullContent: 'Full content',
    ...overrides,
  };
}

function makeLearningEntry(overrides: Partial<LearningEntry> = {}): LearningEntry {
  return {
    agentName: 'jared',
    agentRole: 'Data Analyst',
    entries: [{ date: '2025-07-01', title: 'Learning', summary: 'Something' }],
    rawSize: 50,
    ...overrides,
  };
}

function makeTaskEntry(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 'T001',
    title: 'Test Task',
    description: 'A test task',
    dependencies: [],
    status: 'pending',
    ...overrides,
  };
}

function makeDeploymentFile(overrides: Partial<DeploymentFile> = {}): DeploymentFile {
  return {
    targetPath: 'hooks/after_tasks.sh',
    content: '#!/bin/bash\necho ok',
    ...overrides,
  };
}

function makeContextSummary(overrides: Partial<ContextSummary> = {}): ContextSummary {
  return {
    metadata: {
      generated: '2025-07-01T00:00:00Z',
      cycleCount: 1,
      sources: { skills: 1, decisions: 1, histories: 1, skipped: [] },
      sizeBytes: 256,
      maxBytes: 8192,
    },
    content: {
      skills: [makeSkillEntry()],
      decisions: [makeDecisionEntry()],
      learnings: [makeLearningEntry()],
      warnings: [],
    },
    ...overrides,
  };
}

function makeIssueRecord(overrides: Partial<IssueRecord> = {}): IssueRecord {
  return {
    issueNumber: 42,
    title: 'Test Issue',
    body: 'Body text',
    labels: ['squad'],
    taskId: 'T001',
    url: 'https://github.com/test/repo/issues/42',
    createdAt: '2025-07-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Source-level import purity check
// ---------------------------------------------------------------------------

describe('T038: Port module import purity', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const portsSource = readFileSync(
    resolve(__dirname, '../../src/bridge/ports.ts'),
    'utf-8',
  );

  it('imports ONLY from ../types.js', () => {
    // Match all `from '...'` specifiers (handles multiline imports)
    const fromClauses = portsSource.match(/from\s+['"][^'"]+['"]/g);

    expect(fromClauses).not.toBeNull();
    expect(fromClauses!.length).toBeGreaterThan(0);
    for (const clause of fromClauses!) {
      expect(clause).toContain('../types.js');
    }
  });

  it('does not import from node: built-ins', () => {
    expect(portsSource).not.toMatch(/from\s+['"]node:/);
  });

  it('does not import from express or other HTTP frameworks', () => {
    expect(portsSource).not.toMatch(/from\s+['"]express/);
    expect(portsSource).not.toMatch(/from\s+['"]koa/);
    expect(portsSource).not.toMatch(/from\s+['"]fastify/);
    expect(portsSource).not.toMatch(/from\s+['"]hapi/);
  });

  it('does not import from fs or path directly', () => {
    expect(portsSource).not.toMatch(/from\s+['"]fs['"]/);
    expect(portsSource).not.toMatch(/from\s+['"]path['"]/);
  });

  it('does not reference child_process or net', () => {
    expect(portsSource).not.toMatch(/from\s+['"]child_process/);
    expect(portsSource).not.toMatch(/from\s+['"]net['"]/);
  });

  it('has no require() calls', () => {
    expect(portsSource).not.toMatch(/\brequire\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// SquadStateReader — reads Squad memory artifacts
// ---------------------------------------------------------------------------

describe('T038: SquadStateReader port signatures', () => {
  it('readSkills returns Promise<SkillEntry[]>', () => {
    expectTypeOf<SquadStateReader['readSkills']>()
      .returns.resolves.toEqualTypeOf<SkillEntry[]>();
  });

  it('readDecisions returns Promise<DecisionEntry[]>', () => {
    expectTypeOf<SquadStateReader['readDecisions']>()
      .returns.resolves.toEqualTypeOf<DecisionEntry[]>();
  });

  it('readLearnings accepts optional Date and returns Promise<LearningEntry[]>', () => {
    expectTypeOf<SquadStateReader['readLearnings']>()
      .parameter(0).toEqualTypeOf<Date | undefined>();
    expectTypeOf<SquadStateReader['readLearnings']>()
      .returns.resolves.toEqualTypeOf<LearningEntry[]>();
  });

  it('readConstitution is optional and returns Promise<string | null>', () => {
    expectTypeOf<SquadStateReader>()
      .toHaveProperty('readConstitution');
    // When present, should resolve to string | null
    type ReadConst = NonNullable<SquadStateReader['readConstitution']>;
    expectTypeOf<ReadConst>().returns.resolves.toEqualTypeOf<string | null>();
  });

  it('mock implementation satisfies the interface using only DTOs', async () => {
    const mock: SquadStateReader = {
      readSkills: async () => [makeSkillEntry()],
      readDecisions: async () => [makeDecisionEntry()],
      readLearnings: async (_since?: Date) => [makeLearningEntry()],
    };
    const skills = await mock.readSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('test-skill');
  });
});

// ---------------------------------------------------------------------------
// ContextWriter — writes generated context summary
// ---------------------------------------------------------------------------

describe('T038: ContextWriter port signatures', () => {
  it('write accepts ContextSummary and returns Promise<void>', () => {
    expectTypeOf<ContextWriter['write']>()
      .parameter(0).toEqualTypeOf<ContextSummary>();
    expectTypeOf<ContextWriter['write']>()
      .returns.resolves.toEqualTypeOf<void>();
  });

  it('readPreviousMetadata returns Promise<PreviousContextMetadata | null>', () => {
    expectTypeOf<ContextWriter['readPreviousMetadata']>()
      .returns.resolves.toEqualTypeOf<PreviousContextMetadata | null>();
  });

  it('PreviousContextMetadata has generated (string) and cycleCount (number)', () => {
    expectTypeOf<PreviousContextMetadata>().toHaveProperty('generated');
    expectTypeOf<PreviousContextMetadata['generated']>().toBeString();
    expectTypeOf<PreviousContextMetadata>().toHaveProperty('cycleCount');
    expectTypeOf<PreviousContextMetadata['cycleCount']>().toBeNumber();
  });

  it('mock implementation satisfies the interface using only DTOs', async () => {
    let stored: ContextSummary | null = null;
    const mock: ContextWriter = {
      write: async (summary) => { stored = summary; },
      readPreviousMetadata: async () => null,
    };
    const summary = makeContextSummary();
    await mock.write(summary);
    expect(stored).toEqual(summary);
  });
});

// ---------------------------------------------------------------------------
// TasksReader — reads Spec Kit tasks
// ---------------------------------------------------------------------------

describe('T038: TasksReader port signatures', () => {
  it('readTasks accepts a string path and returns Promise<TaskEntry[]>', () => {
    expectTypeOf<TasksReader['readTasks']>()
      .parameter(0).toBeString();
    expectTypeOf<TasksReader['readTasks']>()
      .returns.resolves.toEqualTypeOf<TaskEntry[]>();
  });

  it('mock implementation satisfies the interface using only DTOs', async () => {
    const mock: TasksReader = {
      readTasks: async (_path: string) => [makeTaskEntry()],
    };
    const tasks = await mock.readTasks('specs/001/tasks.md');
    expect(tasks[0].id).toBe('T001');
  });
});

// ---------------------------------------------------------------------------
// FrameworkDetector — detects installed frameworks
// ---------------------------------------------------------------------------

describe('T038: FrameworkDetector port signatures', () => {
  it('detectSquad accepts string dir and returns Promise<boolean>', () => {
    expectTypeOf<FrameworkDetector['detectSquad']>()
      .parameter(0).toBeString();
    expectTypeOf<FrameworkDetector['detectSquad']>()
      .returns.resolves.toBeBoolean();
  });

  it('detectSpecKit accepts string dir and returns Promise<boolean>', () => {
    expectTypeOf<FrameworkDetector['detectSpecKit']>()
      .parameter(0).toBeString();
    expectTypeOf<FrameworkDetector['detectSpecKit']>()
      .returns.resolves.toBeBoolean();
  });

  it('returns only boolean primitives, no framework-specific objects', async () => {
    const mock: FrameworkDetector = {
      detectSquad: async () => true,
      detectSpecKit: async () => false,
    };
    const result = await mock.detectSquad('/project');
    expect(typeof result).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// FileDeployer — deploys bridge components
// ---------------------------------------------------------------------------

describe('T038: FileDeployer port signatures', () => {
  it('deploy accepts DeploymentFile[] and returns Promise<string[]>', () => {
    expectTypeOf<FileDeployer['deploy']>()
      .parameter(0).toEqualTypeOf<DeploymentFile[]>();
    expectTypeOf<FileDeployer['deploy']>()
      .returns.resolves.toEqualTypeOf<string[]>();
  });

  it('deployExecutable accepts DeploymentFile[] and returns Promise<string[]>', () => {
    expectTypeOf<FileDeployer['deployExecutable']>()
      .parameter(0).toEqualTypeOf<DeploymentFile[]>();
    expectTypeOf<FileDeployer['deployExecutable']>()
      .returns.resolves.toEqualTypeOf<string[]>();
  });

  it('listDeployed takes no args and returns Promise<string[]>', () => {
    expectTypeOf<FileDeployer['listDeployed']>()
      .parameters.toEqualTypeOf<[]>();
    expectTypeOf<FileDeployer['listDeployed']>()
      .returns.resolves.toEqualTypeOf<string[]>();
  });

  it('mock implementation works with DTO-only inputs', async () => {
    const deployed: string[] = [];
    const mock: FileDeployer = {
      deploy: async (files) => { files.forEach(f => deployed.push(f.targetPath)); return deployed; },
      deployExecutable: async (files) => { files.forEach(f => deployed.push(f.targetPath)); return deployed; },
      listDeployed: async () => deployed,
    };
    const files = [makeDeploymentFile()];
    const result = await mock.deploy(files);
    expect(result).toContain('hooks/after_tasks.sh');
  });
});

// ---------------------------------------------------------------------------
// ConfigLoader — loads bridge configuration
// ---------------------------------------------------------------------------

describe('T038: ConfigLoader port signatures', () => {
  it('load takes no args and returns Promise<BridgeConfig>', () => {
    expectTypeOf<ConfigLoader['load']>()
      .parameters.toEqualTypeOf<[]>();
    expectTypeOf<ConfigLoader['load']>()
      .returns.resolves.toEqualTypeOf<BridgeConfig>();
  });

  it('mock implementation returns a valid BridgeConfig DTO', async () => {
    const mock: ConfigLoader = {
      load: async () => ({
        contextMaxBytes: 8192,
        sources: { skills: true, decisions: true, histories: true },
        summarization: { recencyBiasWeight: 0.7, maxDecisionAgeDays: 90 },
        hooks: { afterTasks: true, beforeSpecify: true, afterImplement: true },
        sync: { autoSync: false, targetDir: '.squad' },
        issues: { defaultLabels: ['squad'], repository: 'org/repo' },
        paths: { squadDir: '.squad', specifyDir: '.specify' },
      }),
    };
    const config = await mock.load();
    expect(config.contextMaxBytes).toBe(8192);
    expect(config.paths.squadDir).toBe('.squad');
  });
});

// ---------------------------------------------------------------------------
// IssueCreator — creates GitHub issues from task entries
// ---------------------------------------------------------------------------

describe('T038: IssueCreator port signatures', () => {
  it('create accepts (TaskEntry, string[], string) and returns Promise<IssueRecord>', () => {
    expectTypeOf<IssueCreator['create']>()
      .parameter(0).toEqualTypeOf<TaskEntry>();
    expectTypeOf<IssueCreator['create']>()
      .parameter(1).toEqualTypeOf<string[]>();
    expectTypeOf<IssueCreator['create']>()
      .parameter(2).toBeString();
    expectTypeOf<IssueCreator['create']>()
      .returns.resolves.toEqualTypeOf<IssueRecord>();
  });

  it('createBatch accepts (TaskEntry[], string[], string) and returns Promise<IssueRecord[]>', () => {
    expectTypeOf<IssueCreator['createBatch']>()
      .parameter(0).toEqualTypeOf<TaskEntry[]>();
    expectTypeOf<IssueCreator['createBatch']>()
      .returns.resolves.toEqualTypeOf<IssueRecord[]>();
  });

  it('mock implementation uses only DTO types', async () => {
    const mock: IssueCreator = {
      create: async (task, labels, repo) => makeIssueRecord({ taskId: task.id, labels, url: `https://github.com/${repo}/issues/1` }),
      createBatch: async (tasks, labels, repo) =>
        tasks.map((t, i) => makeIssueRecord({ taskId: t.id, labels, issueNumber: i + 1, url: `https://github.com/${repo}/issues/${i + 1}` })),
    };
    const issue = await mock.create(makeTaskEntry(), ['squad'], 'org/repo');
    expect(issue.taskId).toBe('T001');
    expect(issue.labels).toContain('squad');
  });
});

// ---------------------------------------------------------------------------
// SquadMemoryWriter — writes learnings back to Squad state
// ---------------------------------------------------------------------------

describe('T038: SquadMemoryWriter port signatures', () => {
  it('writeLearning accepts (string, string, string) and returns Promise<string>', () => {
    expectTypeOf<SquadMemoryWriter['writeLearning']>()
      .parameter(0).toBeString();
    expectTypeOf<SquadMemoryWriter['writeLearning']>()
      .parameter(1).toBeString();
    expectTypeOf<SquadMemoryWriter['writeLearning']>()
      .parameter(2).toBeString();
    expectTypeOf<SquadMemoryWriter['writeLearning']>()
      .returns.resolves.toBeString();
  });

  it('writeDecision accepts (string, string) and returns Promise<string>', () => {
    expectTypeOf<SquadMemoryWriter['writeDecision']>()
      .parameter(0).toBeString();
    expectTypeOf<SquadMemoryWriter['writeDecision']>()
      .parameter(1).toBeString();
    expectTypeOf<SquadMemoryWriter['writeDecision']>()
      .returns.resolves.toBeString();
  });

  it('mock implementation uses only primitive DTO types', async () => {
    const written: Array<{ agent: string; title: string }> = [];
    const mock: SquadMemoryWriter = {
      writeLearning: async (agent, title, _content) => {
        written.push({ agent, title });
        return `learnings/${agent}.md`;
      },
      writeDecision: async (title, _content) => {
        return `decisions/${title}.md`;
      },
    };
    const path = await mock.writeLearning('jared', 'Test', 'content');
    expect(path).toBe('learnings/jared.md');
    expect(written[0].agent).toBe('jared');
  });
});

// ---------------------------------------------------------------------------
// TasksMarkdownReader — reads tasks markdown for issue creation
// ---------------------------------------------------------------------------

describe('T038: TasksMarkdownReader port signatures', () => {
  it('readAndParse accepts string path and returns Promise<TaskEntry[]>', () => {
    expectTypeOf<TasksMarkdownReader['readAndParse']>()
      .parameter(0).toBeString();
    expectTypeOf<TasksMarkdownReader['readAndParse']>()
      .returns.resolves.toEqualTypeOf<TaskEntry[]>();
  });

  it('mock implementation satisfies the interface', async () => {
    const mock: TasksMarkdownReader = {
      readAndParse: async (_path) => [
        makeTaskEntry({ id: 'T001' }),
        makeTaskEntry({ id: 'T002', dependencies: ['T001'] }),
      ],
    };
    const tasks = await mock.readAndParse('specs/001/tasks.md');
    expect(tasks).toHaveLength(2);
    expect(tasks[1].dependencies).toContain('T001');
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: all ports use only DTO types, no framework leaks
// ---------------------------------------------------------------------------

describe('T038: No framework type leaks across ports', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const portsSource = readFileSync(
    resolve(__dirname, '../../src/bridge/ports.ts'),
    'utf-8',
  );

  const frameworkPatterns = [
    { name: 'Express Request/Response', pattern: /\b(Request|Response)\b.*from\s+['"]express/ },
    { name: 'Node.js Buffer', pattern: /\bBuffer\b/ },
    { name: 'Node.js Stream', pattern: /\b(Readable|Writable|Transform|Duplex)Stream\b/ },
    { name: 'Node.js EventEmitter', pattern: /\bEventEmitter\b/ },
    { name: 'IncomingMessage', pattern: /\bIncomingMessage\b/ },
    { name: 'ServerResponse', pattern: /\bServerResponse\b/ },
    { name: 'Node.js URL', pattern: /\bnew URL\b/ },
  ];

  for (const { name, pattern } of frameworkPatterns) {
    it(`does not reference ${name}`, () => {
      expect(portsSource).not.toMatch(pattern);
    });
  }

  it('exports only interface and type declarations (no concrete implementations)', () => {
    // Port file should have no function/class exports — only interfaces
    const exportedFunctions = portsSource.match(/export\s+(function|class)\s/g);
    expect(exportedFunctions).toBeNull();
  });

  it('all parameter and return types resolve to DTO types or primitives', () => {
    // Extract all type references in method signatures
    // Port methods should only use: string, boolean, number, Date, void, null,
    // or types imported from ../types.js
    const dtoTypes = [
      'BridgeConfig', 'ContextSummary', 'DecisionEntry', 'DeploymentFile',
      'IssueRecord', 'LearningEntry', 'SkillEntry', 'SyncRecord', 'TaskEntry',
      'SpecRequirement',
    ];
    const primitives = ['string', 'boolean', 'number', 'void', 'null', 'Date'];
    const allowedTypes = [...dtoTypes, ...primitives, 'Promise', 'PreviousContextMetadata'];

    // Find type annotations in method signatures (simplified check)
    const typeRefs = portsSource.match(/:\s*(?:Promise<)?([A-Z][a-zA-Z]+)/g) || [];
    for (const ref of typeRefs) {
      const typeName = ref.replace(/^:\s*(?:Promise<)?/, '');
      expect(
        allowedTypes.some(allowed => typeName.startsWith(allowed)),
      ).toBe(true);
    }
  });
});
