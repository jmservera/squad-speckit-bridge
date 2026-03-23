import { describe, it, expect, vi } from 'vitest';
import { syncLearnings } from '../../src/sync/sync-learnings.js';
import type { SyncStateReader } from '../../src/sync/sync-learnings.js';
import type { SquadMemoryWriter } from '../../src/bridge/ports.js';

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
