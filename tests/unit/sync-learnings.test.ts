import { describe, it, expect, vi } from 'vitest';
import {
  syncLearnings,
  computeLearningFingerprint,
} from '../../src/sync/sync-learnings.js';
import type {
  SyncStateReader,
  AgentHistoryReader,
  ExtractedLearning,
} from '../../src/sync/sync-learnings.js';
import type { SquadMemoryWriter } from '../../src/bridge/ports.js';
import type { SyncState } from '../../src/types.js';

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                    */
/* ------------------------------------------------------------------ */

function makeStateReader(overrides: Partial<SyncStateReader> = {}): SyncStateReader {
  return {
    readSyncState: vi.fn().mockResolvedValue(null),
    writeSyncState: vi.fn().mockResolvedValue(undefined),
    readSpecResults: vi.fn().mockResolvedValue([
      { title: 'Task T001 completed', content: 'Setup complete' },
      { title: 'Task T002 completed', content: 'Build passes' },
    ]),
    ...overrides,
  };
}

function makeMemoryWriter(overrides: Partial<SquadMemoryWriter> = {}): SquadMemoryWriter {
  return {
    writeLearning: vi.fn().mockResolvedValue('.squad/agents/bridge/history.md'),
    writeDecision: vi.fn().mockResolvedValue('.squad/decisions.md'),
    ...overrides,
  };
}

function makeHistoryReader(
  learnings: ExtractedLearning[] = [],
): AgentHistoryReader {
  return {
    extractLearnings: vi.fn().mockResolvedValue(learnings),
  };
}

const defaultOpts = { specDir: 'specs/001', squadDir: '.squad', dryRun: false };

/* ------------------------------------------------------------------ */
/*  Original behaviour (backward-compatible)                           */
/* ------------------------------------------------------------------ */

describe('syncLearnings', () => {
  it('syncs completed task results to squad memory', async () => {
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    expect(result.record.learningsUpdated).toBe(2);
    expect(result.record.filesWritten).toHaveLength(2);
    expect(result.dryRun).toBe(false);
    expect(writer.writeLearning).toHaveBeenCalledTimes(2);
  });

  it('dry run does not write to memory', async () => {
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.record.learningsUpdated).toBe(2);
    expect(result.record.filesWritten).toHaveLength(0);
    expect(writer.writeLearning).not.toHaveBeenCalled();
  });

  it('handles no results to sync', async () => {
    const stateReader = makeStateReader({
      readSpecResults: vi.fn().mockResolvedValue([]),
    });
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    expect(result.record.learningsUpdated).toBe(0);
    expect(result.record.summary).toContain('No execution results');
  });

  it('updates sync state after successful sync', async () => {
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader = makeStateReader({ writeSyncState });
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    expect(writeSyncState).toHaveBeenCalledTimes(1);
    const state = writeSyncState.mock.calls[0][1];
    expect(state.totalSyncs).toBe(1);
    expect(state.syncHistory).toHaveLength(1);
  });

  it('increments sync count on subsequent syncs', async () => {
    const prevState = {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [{ syncTimestamp: '2025-07-01', learningsUpdated: 1, filesWritten: [], summary: 'test' }],
      totalSyncs: 1,
    };
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
      writeSyncState,
    });
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, {
      specDir: 'specs/001',
      squadDir: '.squad',
      dryRun: false,
    });

    const state = writeSyncState.mock.calls[0][1];
    expect(state.totalSyncs).toBe(2);
    expect(state.syncHistory).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  computeLearningFingerprint                                         */
/* ------------------------------------------------------------------ */

describe('computeLearningFingerprint', () => {
  it('produces consistent fingerprints for identical content', () => {
    const fp1 = computeLearningFingerprint('Title A', 'Content body');
    const fp2 = computeLearningFingerprint('Title A', 'Content body');
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different titles', () => {
    const fp1 = computeLearningFingerprint('Title A', 'Same body');
    const fp2 = computeLearningFingerprint('Title B', 'Same body');
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints for different content', () => {
    const fp1 = computeLearningFingerprint('Same title', 'Body one');
    const fp2 = computeLearningFingerprint('Same title', 'Body two');
    expect(fp1).not.toBe(fp2);
  });

  it('is case-insensitive', () => {
    const fp1 = computeLearningFingerprint('TITLE', 'CONTENT');
    const fp2 = computeLearningFingerprint('title', 'content');
    expect(fp1).toBe(fp2);
  });

  it('ignores leading/trailing whitespace', () => {
    const fp1 = computeLearningFingerprint('  Title  ', '  Content  ');
    const fp2 = computeLearningFingerprint('Title', 'Content');
    expect(fp1).toBe(fp2);
  });

  it('returns a string starting with fp_', () => {
    const fp = computeLearningFingerprint('t', 'c');
    expect(fp).toMatch(/^fp_[a-z0-9]+$/);
  });
});

/* ------------------------------------------------------------------ */
/*  Idempotent deduplication                                           */
/* ------------------------------------------------------------------ */

describe('syncLearnings — idempotent deduplication', () => {
  it('skips learnings whose fingerprint already exists in sync state', async () => {
    const fp1 = computeLearningFingerprint('Task T001 completed', 'Setup complete');
    const fp2 = computeLearningFingerprint('Task T002 completed', 'Build passes');

    const prevState = {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
      syncedFingerprints: [fp1, fp2],
    };

    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
    });
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, defaultOpts);

    expect(result.record.learningsUpdated).toBe(0);
    expect(result.record.summary).toContain('already synced');
    expect(writer.writeLearning).not.toHaveBeenCalled();
  });

  it('only syncs learnings not yet fingerprinted', async () => {
    const fp1 = computeLearningFingerprint('Task T001 completed', 'Setup complete');

    const prevState = {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
      syncedFingerprints: [fp1],
    };

    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
    });
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, defaultOpts);

    expect(result.record.learningsUpdated).toBe(1);
    expect(writer.writeLearning).toHaveBeenCalledTimes(1);
    expect(writer.writeLearning).toHaveBeenCalledWith(
      'bridge',
      'Task T002 completed',
      'Build passes',
    );
  });

  it('persists new fingerprints in sync state for future runs', async () => {
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader = makeStateReader({ writeSyncState });
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, defaultOpts);

    const state = writeSyncState.mock.calls[0][1];
    expect(state.syncedFingerprints).toBeDefined();
    expect(state.syncedFingerprints).toHaveLength(2);
    expect(state.syncedFingerprints[0]).toMatch(/^fp_/);
  });

  it('accumulates fingerprints across multiple syncs', async () => {
    const existingFp = computeLearningFingerprint('Old learning', 'Old content');
    const prevState = {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
      syncedFingerprints: [existingFp],
    };
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
      writeSyncState,
    });
    const writer = makeMemoryWriter();

    await syncLearnings(stateReader, writer, defaultOpts);

    const state = writeSyncState.mock.calls[0][1];
    // Old fingerprint + 2 new ones
    expect(state.syncedFingerprints).toHaveLength(3);
    expect(state.syncedFingerprints).toContain(existingFp);
  });

  it('running sync twice with identical input is idempotent', async () => {
    // First run: no previous state
    const writeSyncState = vi.fn().mockResolvedValue(undefined);
    const stateReader1 = makeStateReader({ writeSyncState });
    const writer1 = makeMemoryWriter();

    await syncLearnings(stateReader1, writer1, defaultOpts);
    const stateAfterFirst = writeSyncState.mock.calls[0][1];

    // Second run: use state from first run
    const writeSyncState2 = vi.fn().mockResolvedValue(undefined);
    const stateReader2 = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(stateAfterFirst),
      writeSyncState: writeSyncState2,
    });
    const writer2 = makeMemoryWriter();

    const result = await syncLearnings(stateReader2, writer2, defaultOpts);

    expect(result.record.learningsUpdated).toBe(0);
    expect(result.record.summary).toContain('already synced');
    expect(writer2.writeLearning).not.toHaveBeenCalled();
    expect(writeSyncState2).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  Agent history reader integration                                   */
/* ------------------------------------------------------------------ */

describe('syncLearnings — agent history extraction', () => {
  const agentLearnings: ExtractedLearning[] = [
    {
      agentName: 'gilfoyle',
      timestamp: '2025-07-15',
      title: 'Discovered caching pattern',
      content: 'LRU cache reduces API calls by 60%',
      source: '.squad/agents/gilfoyle/history.md',
    },
    {
      agentName: 'dinesh',
      timestamp: '2025-07-16',
      title: 'Test parallelism insight',
      content: 'Vitest runs 3x faster with pool threads',
      source: '.squad/agents/dinesh/history.md',
    },
  ];

  it('extracts and syncs learnings from agent history', async () => {
    const stateReader = makeStateReader({
      readSpecResults: vi.fn().mockResolvedValue([]),
    });
    const writer = makeMemoryWriter();
    const reader = makeHistoryReader(agentLearnings);

    const result = await syncLearnings(
      stateReader,
      writer,
      { ...defaultOpts, agentDir: '.squad/agents' },
      reader,
    );

    expect(result.record.learningsUpdated).toBe(2);
    expect(writer.writeLearning).toHaveBeenCalledTimes(2);
    expect(writer.writeLearning).toHaveBeenCalledWith(
      'bridge',
      'Discovered caching pattern',
      '[gilfoyle] LRU cache reduces API calls by 60%',
    );
  });

  it('passes sinceDate from last sync to history reader', async () => {
    const prevState: SyncState = {
      lastSyncTimestamp: '2025-07-10T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    };
    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
      readSpecResults: vi.fn().mockResolvedValue([]),
    });
    const writer = makeMemoryWriter();
    const reader = makeHistoryReader([]);

    await syncLearnings(
      stateReader,
      writer,
      { ...defaultOpts, agentDir: '.squad/agents' },
      reader,
    );

    expect(reader.extractLearnings).toHaveBeenCalledWith(
      '.squad/agents',
      new Date('2025-07-10T00:00:00.000Z'),
    );
  });

  it('passes undefined sinceDate when no previous sync', async () => {
    const stateReader = makeStateReader({
      readSpecResults: vi.fn().mockResolvedValue([]),
    });
    const writer = makeMemoryWriter();
    const reader = makeHistoryReader([]);

    await syncLearnings(
      stateReader,
      writer,
      { ...defaultOpts, agentDir: '.squad/agents' },
      reader,
    );

    expect(reader.extractLearnings).toHaveBeenCalledWith(
      '.squad/agents',
      undefined,
    );
  });

  it('does not call history reader when agentDir is not provided', async () => {
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter();
    const reader = makeHistoryReader(agentLearnings);

    await syncLearnings(stateReader, writer, defaultOpts, reader);

    expect(reader.extractLearnings).not.toHaveBeenCalled();
  });

  it('does not call history reader when reader is not provided', async () => {
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      ...defaultOpts,
      agentDir: '.squad/agents',
    });

    // Should still sync spec results
    expect(result.record.learningsUpdated).toBe(2);
  });

  it('combines spec results and agent history learnings', async () => {
    const stateReader = makeStateReader(); // 2 spec results
    const writer = makeMemoryWriter();
    const reader = makeHistoryReader(agentLearnings); // 2 agent learnings

    const result = await syncLearnings(
      stateReader,
      writer,
      { ...defaultOpts, agentDir: '.squad/agents' },
      reader,
    );

    expect(result.record.learningsUpdated).toBe(4);
    expect(writer.writeLearning).toHaveBeenCalledTimes(4);
  });

  it('deduplicates across spec results and agent history', async () => {
    // Agent learning has same content as a spec result
    const dupLearning: ExtractedLearning = {
      agentName: 'bridge',
      timestamp: '2025-07-15',
      title: 'Task T001 completed',
      content: 'Setup complete',
      source: 'history.md',
    };
    // Pre-fingerprint one spec result
    const fp = computeLearningFingerprint('Task T001 completed', 'Setup complete');
    const prevState = {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
      syncedFingerprints: [fp],
    };
    const stateReader = makeStateReader({
      readSyncState: vi.fn().mockResolvedValue(prevState),
    });
    const writer = makeMemoryWriter();
    // The agent learning content gets prefixed with [bridge], making it unique
    const reader = makeHistoryReader([dupLearning]);

    const result = await syncLearnings(
      stateReader,
      writer,
      { ...defaultOpts, agentDir: '.squad/agents' },
      reader,
    );

    // T001 spec result is deduped, T002 spec result + agent learning (prefixed) = 2
    expect(result.record.learningsUpdated).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  Context generation verification                                    */
/* ------------------------------------------------------------------ */

describe('syncLearnings — context generation feedback loop', () => {
  it('writes learnings in format compatible with history.md parsing', async () => {
    const writeLearning = vi.fn().mockResolvedValue('.squad/agents/bridge/history.md');
    const stateReader = makeStateReader({
      readSpecResults: vi.fn().mockResolvedValue([
        { title: 'Caching strategy', content: 'Use Redis for session store' },
      ]),
    });
    const writer = makeMemoryWriter({ writeLearning });

    await syncLearnings(stateReader, writer, defaultOpts);

    expect(writeLearning).toHaveBeenCalledWith(
      'bridge',
      'Caching strategy',
      'Use Redis for session store',
    );
    // The SquadMemoryWriter.writeLearning contract produces entries in
    // ### YYYY-MM-DD: Title\n\nContent format, which parseHistoryFile reads.
    // buildSquadContext → reader.readLearnings() picks these up.
  });

  it('writes to squad agents directory so context builder discovers them', async () => {
    const paths: string[] = [];
    const writeLearning = vi.fn().mockImplementation(async () => {
      const p = '.squad/agents/bridge/history.md';
      paths.push(p);
      return p;
    });
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter({ writeLearning });

    const result = await syncLearnings(stateReader, writer, defaultOpts);

    // All written files are in .squad/agents/ which SquadFileReader globs
    for (const f of result.record.filesWritten) {
      expect(f).toContain('.squad/agents/');
      expect(f).toContain('history.md');
    }
  });

  it('dry run reports learnings that would appear in next context', async () => {
    const stateReader = makeStateReader();
    const writer = makeMemoryWriter();

    const result = await syncLearnings(stateReader, writer, {
      ...defaultOpts,
      dryRun: true,
    });

    expect(result.record.learningsUpdated).toBe(2);
    expect(result.record.summary).toContain('DRY RUN');
    expect(result.record.summary).toContain('2 learning(s)');
  });
});

