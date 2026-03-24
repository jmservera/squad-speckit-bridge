/**
 * T018-T022: Dry-Run Output Formatting Tests
 *
 * Tests the composition root formatters (main.ts) for dry-run behavior:
 *   - Install, Status, Context, Review, Issues, Sync human output with [DRY RUN]
 *   - JSON output with dryRun field
 *   - Write-skip behavior for install, context, review
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createIssueCreator,
  createSyncer,
  createReviewer,
  type IssuesOutput,
  type SyncOutput,
  type ReviewOutput,
} from '../../src/main.js';

// ─────────────────────────────────────────────────────────────
// Mock adapters to isolate from file system
// ─────────────────────────────────────────────────────────────

vi.mock('../../src/install/adapters/config-loader.js', () => {
  const mockLoad = vi.fn().mockResolvedValue({
    contextMaxBytes: 8192,
    sources: { skills: true, decisions: true, histories: true },
    summarization: { recencyBiasWeight: 0.7, maxDecisionAgeDays: 90 },
    hooks: { afterTasks: true, beforeSpecify: true, afterImplement: true },
    sync: { autoSync: false, targetDir: '.squad' },
    issues: { defaultLabels: ['squad', 'speckit'], repository: 'test/repo' },
    paths: { squadDir: '.squad', specifyDir: '.specify' },
  });
  return {
    ConfigFileLoader: class {
      load = mockLoad;
    },
  };
});

vi.mock('../../src/issues/task-parser.js', () => ({
  TasksMarkdownParser: class {
    readAndParse = vi.fn().mockResolvedValue([
      { id: 'T001', title: 'Setup', description: 'Setup — init', dependencies: [], status: 'pending' },
      { id: 'T002', title: 'Build', description: 'Build — compile', dependencies: ['T001'], status: 'pending' },
      { id: 'T003', title: 'Done', description: 'Done task', dependencies: [], status: 'done' },
    ]);
  },
}));

vi.mock('../../src/issues/adapters/github-issue-adapter.js', () => {
  let counter = 100;
  return {
    GitHubIssueAdapter: class {
      create = vi.fn().mockImplementation(async (task: { id: string; title: string; description: string }) => ({
        issueNumber: counter++,
        title: `${task.id}: ${task.title}`,
        body: task.description,
        labels: ['squad'],
        taskId: task.id,
        url: `https://github.com/test/repo/issues/${counter - 1}`,
        createdAt: new Date().toISOString(),
      }));
      createBatch = vi.fn().mockResolvedValue([]);
      listExisting = vi.fn().mockResolvedValue([]);
    },
  };
});

vi.mock('../../src/sync/adapters/sync-state-adapter.js', () => ({
  SyncStateAdapter: class {
    readSyncState = vi.fn().mockResolvedValue(null);
    writeSyncState = vi.fn().mockResolvedValue(undefined);
    readSpecResults = vi.fn().mockResolvedValue([
      { title: 'Learning 1', content: 'Content A' },
    ]);
    writeLearning = vi.fn().mockResolvedValue('.squad/agents/bridge/history.md');
    writeDecision = vi.fn().mockResolvedValue('.squad/decisions.md');
  },
}));

vi.mock('../../src/review/adapters/tasks-parser.js', () => ({
  TasksParser: class {
    readTasks = vi.fn().mockResolvedValue([
      { id: 'T001', title: 'Task 1', description: 'A task', dependencies: [], status: 'pending' },
    ]);
  },
}));

vi.mock('../../src/review/adapters/review-writer.js', () => ({
  ReviewWriter: class {
    write = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../src/bridge/adapters/squad-file-reader.js', () => ({
  SquadFileReader: class {
    readSkills = vi.fn().mockResolvedValue([]);
    readDecisions = vi.fn().mockResolvedValue([]);
    readLearnings = vi.fn().mockResolvedValue([]);
    getWarnings = vi.fn().mockReturnValue([]);
  },
}));

vi.mock('../../src/review/ceremony.js', () => ({
  prepareReview: vi.fn().mockResolvedValue({
    record: {
      reviewedArtifact: 'tasks.md',
      timestamp: '2025-07-01T00:00:00Z',
      participants: ['bridge'],
      findings: [],
      approvalStatus: 'approved',
      summary: 'No issues found',
    },
  }),
}));

// ─────────────────────────────────────────────────────────────
// Issues output tests
// ─────────────────────────────────────────────────────────────

describe('Issues dry-run output formatting', () => {
  it('human output contains [DRY RUN] prefix when dryRun=true', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: true,
      labels: ['squad'],
    });

    expect(result.humanOutput).toContain('[DRY RUN]');
  });

  it('human output does not contain [DRY RUN] when dryRun=false', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: false,
      labels: ['squad'],
      repository: 'test/repo',
    });

    expect(result.humanOutput).not.toContain('[DRY RUN]');
  });

  it('JSON output includes dryRun=true', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: true,
    });

    expect(result.jsonOutput.dryRun).toBe(true);
  });

  it('JSON output includes dryRun=false', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: false,
      repository: 'test/repo',
    });

    expect(result.jsonOutput.dryRun).toBe(false);
  });

  it('human output indicates no changes were made in dry-run', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: true,
    });

    expect(result.humanOutput).toContain('No changes were made');
  });

  it('human output lists would-be-created issues in dry-run', async () => {
    const creator = createIssueCreator({ baseDir: '/fake' });
    const result: IssuesOutput = await creator.createFromTasks('tasks.md', {
      dryRun: true,
    });

    expect(result.humanOutput).toContain('Would create issues');
    expect(result.humanOutput).toContain('T001');
    expect(result.humanOutput).toContain('T002');
  });
});

// ─────────────────────────────────────────────────────────────
// Sync output tests
// ─────────────────────────────────────────────────────────────

describe('Sync dry-run output formatting', () => {
  it('human output contains [DRY RUN] prefix when dryRun=true', async () => {
    const syncer = createSyncer({ baseDir: '/fake' });
    const result: SyncOutput = await syncer.sync('specs/001', { dryRun: true });

    expect(result.humanOutput).toContain('[DRY RUN]');
  });

  it('human output indicates no changes were made in dry-run', async () => {
    const syncer = createSyncer({ baseDir: '/fake' });
    const result: SyncOutput = await syncer.sync('specs/001', { dryRun: true });

    expect(result.humanOutput).toContain('No changes were made');
  });

  it('JSON output includes dryRun=true', async () => {
    const syncer = createSyncer({ baseDir: '/fake' });
    const result: SyncOutput = await syncer.sync('specs/001', { dryRun: true });

    expect(result.jsonOutput.dryRun).toBe(true);
  });

  it('JSON output includes dryRun=false', async () => {
    const syncer = createSyncer({ baseDir: '/fake' });
    const result: SyncOutput = await syncer.sync('specs/001', { dryRun: false });

    expect(result.jsonOutput.dryRun).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Review output tests
// ─────────────────────────────────────────────────────────────

describe('Review dry-run output formatting', () => {
  it('human output contains [DRY RUN] prefix when dryRun=true', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: true });

    expect(result.humanOutput).toContain('[DRY RUN]');
  });

  it('human output does not contain [DRY RUN] when dryRun=false', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: false });

    expect(result.humanOutput).not.toContain('[DRY RUN]');
  });

  it('JSON output includes dryRun=true', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: true });

    expect(result.jsonOutput.dryRun).toBe(true);
  });

  it('JSON output includes dryRun=false', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: false });

    expect(result.jsonOutput.dryRun).toBe(false);
  });

  it('dry-run review indicates no file was written', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: true });

    expect(result.humanOutput).toContain('Would write review');
    expect(result.humanOutput).toContain('No changes were made');
  });

  it('non-dry-run review indicates file was written', async () => {
    const reviewer = createReviewer({ baseDir: '/fake' });
    const result: ReviewOutput = await reviewer.review('tasks.md', undefined, { dryRun: false });

    expect(result.humanOutput).toContain('Review template written to');
  });
});
