/**
 * Integration tests for full sync → constitution pipeline
 *
 * Verifies the complete cycle: agent histories + tasks.md → syncLearnings
 * → constitution.md updated. Tests real adapters wired together with
 * temp directories — no mocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SyncStateAdapter } from '../../src/sync/adapters/sync-state-adapter.js';
import { AgentHistoryReaderAdapter } from '../../src/sync/adapters/agent-history-reader.js';
import { ConstitutionAdapter } from '../../src/sync/adapters/constitution-adapter.js';
import { syncLearnings } from '../../src/sync/sync-learnings.js';

describe('Full sync → constitution cycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Scaffold a temp directory structure with agent history, tasks, and
   * optionally a pre-existing constitution.
   */
  async function scaffold(opts?: { constitution?: string }) {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-const-'));

    // .squad/agents/test-agent/history.md
    const agentDir = join(tempDir, '.squad', 'agents', 'test-agent');
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, 'history.md'),
      [
        '### 2026-03-24: Caching insight',
        '',
        'LRU cache reduces API calls by 60%.',
        '',
        '### 2026-03-25: Error handling pattern',
        '',
        'Use Result<T> monads instead of throwing.',
        '',
      ].join('\n'),
      'utf-8',
    );

    // specs/test-spec/tasks.md
    const specDir = join(tempDir, 'specs', 'test-spec');
    await mkdir(specDir, { recursive: true });
    await writeFile(
      join(specDir, 'tasks.md'),
      [
        '# Tasks',
        '',
        '- [x] T001 Setup project — Initialize repo',
        '- [ ] T002 Add CI — Pipeline not ready',
      ].join('\n'),
      'utf-8',
    );

    // .specify/memory/constitution.md (optional)
    const constitutionDir = join(tempDir, '.specify', 'memory');
    await mkdir(constitutionDir, { recursive: true });
    if (opts?.constitution) {
      await writeFile(
        join(constitutionDir, 'constitution.md'),
        opts.constitution,
        'utf-8',
      );
    }

    return {
      squadDir: join(tempDir, '.squad'),
      agentDir: join(tempDir, '.squad', 'agents'),
      specDir,
      constitutionPath: join(constitutionDir, 'constitution.md'),
    };
  }

  it('creates/updates constitution.md after full sync cycle', async () => {
    const existingConstitution = [
      '# Project Constitution',
      '',
      '**Version**: 1.0.0 | **Last Amended**: 2025-07-01',
      '',
      '## Core Principles',
      '',
      '1. **Clean Architecture** — Dependencies point inward',
      '',
    ].join('\n');
    const { squadDir, agentDir, specDir, constitutionPath } =
      await scaffold({ constitution: existingConstitution });

    const stateAdapter = new SyncStateAdapter();
    const historyReader = new AgentHistoryReaderAdapter();
    const constitutionWriter = new ConstitutionAdapter();

    // Save original cwd and change to tempDir for writeLearning paths
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const result = await syncLearnings(
        stateAdapter,
        stateAdapter,
        {
          specDir,
          squadDir,
          dryRun: false,
          agentDir,
          constitutionPath,
        },
        historyReader,
        constitutionWriter,
      );

      expect(result.dryRun).toBe(false);
      expect(result.record.learningsUpdated).toBeGreaterThan(0);
      expect(result.record.filesWritten).toContain(constitutionPath);

      const constitution = await readFile(constitutionPath, 'utf-8');
      // Preserved original content
      expect(constitution).toContain('## Core Principles');
      expect(constitution).toContain('**Clean Architecture**');
      // Version bumped
      expect(constitution).toContain('**Version**: 1.1.0');
      // Has learnings section
      expect(constitution).toContain('## Learnings from Spec test-spec');
      expect(constitution).toContain('_Synced:');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('does not modify constitution when no constitutionWriter is passed', async () => {
    const existingConstitution =
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-01\n';
    const { squadDir, agentDir, specDir, constitutionPath } =
      await scaffold({ constitution: existingConstitution });

    const stateAdapter = new SyncStateAdapter();
    const historyReader = new AgentHistoryReaderAdapter();

    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      // No constitutionWriter — simulates --no-constitution flag
      await syncLearnings(
        stateAdapter,
        stateAdapter,
        {
          specDir,
          squadDir,
          dryRun: false,
          agentDir,
          constitutionPath,
        },
        historyReader,
        // constitutionWriter omitted
      );

      const constitution = await readFile(constitutionPath, 'utf-8');
      // Constitution unchanged — still at version 1.0.0
      expect(constitution).toContain('**Version**: 1.0.0');
      expect(constitution).not.toContain('## Learnings from Spec');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('does not modify constitution in dry-run mode', async () => {
    const existingConstitution =
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-01\n';
    const { squadDir, agentDir, specDir, constitutionPath } =
      await scaffold({ constitution: existingConstitution });

    const stateAdapter = new SyncStateAdapter();
    const historyReader = new AgentHistoryReaderAdapter();
    const constitutionWriter = new ConstitutionAdapter();

    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const result = await syncLearnings(
        stateAdapter,
        stateAdapter,
        {
          specDir,
          squadDir,
          dryRun: true,
          agentDir,
          constitutionPath,
        },
        historyReader,
        constitutionWriter,
      );

      expect(result.dryRun).toBe(true);
      expect(result.record.summary).toContain('DRY RUN');

      const constitution = await readFile(constitutionPath, 'utf-8');
      // Constitution unchanged
      expect(constitution).toContain('**Version**: 1.0.0');
      expect(constitution).not.toContain('## Learnings from Spec');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('idempotency: second sync with same input does not duplicate constitution learnings', async () => {
    const existingConstitution = [
      '# Project Constitution',
      '',
      '**Version**: 1.0.0 | **Last Amended**: 2025-07-01',
      '',
    ].join('\n');
    const { squadDir, agentDir, specDir, constitutionPath } =
      await scaffold({ constitution: existingConstitution });

    const stateAdapter = new SyncStateAdapter();
    const historyReader = new AgentHistoryReaderAdapter();
    const constitutionWriter = new ConstitutionAdapter();

    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      // First sync
      const result1 = await syncLearnings(
        stateAdapter,
        stateAdapter,
        {
          specDir,
          squadDir,
          dryRun: false,
          agentDir,
          constitutionPath,
        },
        historyReader,
        constitutionWriter,
      );
      expect(result1.record.learningsUpdated).toBeGreaterThan(0);

      // Second sync with same input — fingerprints prevent duplicates
      const result2 = await syncLearnings(
        stateAdapter,
        stateAdapter,
        {
          specDir,
          squadDir,
          dryRun: false,
          agentDir,
          constitutionPath,
        },
        historyReader,
        constitutionWriter,
      );

      expect(result2.record.learningsUpdated).toBe(0);
      expect(result2.record.summary).toContain('already synced');

      // Constitution should have exactly one learnings section (from first sync)
      const constitution = await readFile(constitutionPath, 'utf-8');
      const learningsSections = constitution.match(/## Learnings from Spec/g);
      expect(learningsSections).toHaveLength(1);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
