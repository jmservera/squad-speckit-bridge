/**
 * T008 tests: ReverseSyncStateAdapter integration tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReverseSyncStateAdapter } from '../../src/sync/adapters/reverse-sync-state-adapter.js';
import type { ReverseSyncState } from '../../src/types.js';

describe('ReverseSyncStateAdapter', () => {
  let tempDir: string;
  const adapter = new ReverseSyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null when no state file exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rsync-state-'));
    const state = await adapter.load(tempDir);
    expect(state).toBeNull();
  });

  it('save then load: roundtrip works', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rsync-state-'));

    const state: ReverseSyncState = {
      lastReverseSyncTimestamp: '2026-03-25T14:00:00.000Z',
      syncedFingerprints: ['fp_abc', 'fp_def'],
      syncGeneration: 1,
      syncHistory: [
        {
          syncTimestamp: '2026-03-25T14:00:00.000Z',
          learningsWritten: 5,
          learningsDeduplicated: 2,
          constitutionEntriesAdded: 1,
          sourcesProcessed: ['histories', 'decisions'],
          outputPath: '/specs/009/learnings.md',
        },
      ],
    };

    await adapter.save(tempDir, state);
    const loaded = await adapter.load(tempDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.lastReverseSyncTimestamp).toBe('2026-03-25T14:00:00.000Z');
    expect(loaded!.syncedFingerprints).toEqual(['fp_abc', 'fp_def']);
    expect(loaded!.syncGeneration).toBe(1);
    expect(loaded!.syncHistory).toHaveLength(1);
    expect(loaded!.syncHistory[0].learningsWritten).toBe(5);
  });

  it('overwrite state preserves latest version', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rsync-state-'));

    const state1: ReverseSyncState = {
      lastReverseSyncTimestamp: '2026-03-24T00:00:00.000Z',
      syncedFingerprints: ['fp_1'],
      syncGeneration: 1,
      syncHistory: [],
    };
    await adapter.save(tempDir, state1);

    const state2: ReverseSyncState = {
      lastReverseSyncTimestamp: '2026-03-25T00:00:00.000Z',
      syncedFingerprints: ['fp_1', 'fp_2'],
      syncGeneration: 2,
      syncHistory: [],
    };
    await adapter.save(tempDir, state2);

    const loaded = await adapter.load(tempDir);
    expect(loaded!.syncGeneration).toBe(2);
    expect(loaded!.syncedFingerprints).toEqual(['fp_1', 'fp_2']);
  });
});
