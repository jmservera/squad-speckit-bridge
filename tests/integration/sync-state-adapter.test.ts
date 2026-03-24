/**
 * Integration tests for T009: SyncStateAdapter
 *
 * Tests against real file system with temp directories.
 * Verifies timestamp persistence, state read/write, graceful error handling,
 * and the SyncStatePersistence port contract.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SyncStateAdapter } from '../../src/sync/adapters/sync-state-adapter.js';
import type { SyncState } from '../../src/types.js';

const SYNC_STATE_FILE = '.bridge-sync.json';

describe('SyncStateAdapter — state persistence', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null when no sync state file exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));
    const state = await adapter.readSyncState(tempDir);
    expect(state).toBeNull();
  });

  it('writes and reads sync state round-trip', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));
    const state: SyncState = {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [
        {
          syncTimestamp: '2025-07-20T12:00:00.000Z',
          learningsUpdated: 3,
          filesWritten: ['.squad/agents/bridge/history.md'],
          summary: 'Synced 3 learning(s)',
        },
      ],
      totalSyncs: 1,
    };

    await adapter.writeSyncState(tempDir, state);
    const loaded = await adapter.readSyncState(tempDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.lastSyncTimestamp).toBe('2025-07-20T12:00:00.000Z');
    expect(loaded!.totalSyncs).toBe(1);
    expect(loaded!.syncHistory).toHaveLength(1);
    expect(loaded!.syncHistory[0].learningsUpdated).toBe(3);
  });

  it('persists state as formatted JSON to disk', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));
    const state: SyncState = {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    };

    await adapter.writeSyncState(tempDir, state);

    const raw = await readFile(join(tempDir, SYNC_STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.lastSyncTimestamp).toBe('2025-07-20T12:00:00.000Z');
    expect(raw).toContain('\n'); // Formatted JSON
  });

  it('creates parent directory if missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));
    const nestedDir = join(tempDir, 'nested', '.squad');
    const state: SyncState = {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    };

    await adapter.writeSyncState(nestedDir, state);
    const loaded = await adapter.readSyncState(nestedDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.lastSyncTimestamp).toBe('2025-07-20T12:00:00.000Z');
  });

  it('overwrites existing state on subsequent writes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));

    await adapter.writeSyncState(tempDir, {
      lastSyncTimestamp: '2025-07-01T00:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    });

    await adapter.writeSyncState(tempDir, {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 2,
    });

    const loaded = await adapter.readSyncState(tempDir);
    expect(loaded!.lastSyncTimestamp).toBe('2025-07-20T12:00:00.000Z');
    expect(loaded!.totalSyncs).toBe(2);
  });

  it('preserves syncedFingerprints through round-trip', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-state-'));
    const stateWithFp = {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
      syncedFingerprints: ['fp_abc123', 'fp_def456'],
    };

    await adapter.writeSyncState(tempDir, stateWithFp as SyncState);
    const raw = await readFile(join(tempDir, SYNC_STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.syncedFingerprints).toEqual(['fp_abc123', 'fp_def456']);
  });
});

describe('SyncStateAdapter — getLastSyncTimestamp', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null when no state file exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-ts-'));
    const ts = await adapter.getLastSyncTimestamp(tempDir);
    expect(ts).toBeNull();
  });

  it('returns Date object from persisted timestamp', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-ts-'));
    await adapter.writeSyncState(tempDir, {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    });

    const ts = await adapter.getLastSyncTimestamp(tempDir);
    expect(ts).toBeInstanceOf(Date);
    expect(ts!.toISOString()).toBe('2025-07-20T12:00:00.000Z');
  });

  it('returns null for invalid timestamp in state', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-ts-'));
    await writeFile(
      join(tempDir, SYNC_STATE_FILE),
      JSON.stringify({
        lastSyncTimestamp: 'not-a-date',
        syncHistory: [],
        totalSyncs: 1,
      }),
    );

    const ts = await adapter.getLastSyncTimestamp(tempDir);
    expect(ts).toBeNull();
  });

  it('returns null for corrupted JSON state file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-ts-'));
    await writeFile(join(tempDir, SYNC_STATE_FILE), '{ broken json');

    const ts = await adapter.getLastSyncTimestamp(tempDir);
    expect(ts).toBeNull();
  });

  it('returns null for empty state file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-ts-'));
    await writeFile(join(tempDir, SYNC_STATE_FILE), '');

    const ts = await adapter.getLastSyncTimestamp(tempDir);
    expect(ts).toBeNull();
  });
});

describe('SyncStateAdapter — clearState', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('removes existing state file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-clear-'));
    await adapter.writeSyncState(tempDir, {
      lastSyncTimestamp: '2025-07-20T12:00:00.000Z',
      syncHistory: [],
      totalSyncs: 1,
    });

    await adapter.clearState(tempDir);

    const state = await adapter.readSyncState(tempDir);
    expect(state).toBeNull();
  });

  it('does not throw when state file does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-clear-'));
    await expect(adapter.clearState(tempDir)).resolves.toBeUndefined();
  });

  it('does not throw when directory does not exist', async () => {
    await expect(adapter.clearState('/non/existent/dir')).resolves.toBeUndefined();
  });
});

describe('SyncStateAdapter — graceful error handling', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null for corrupted JSON state file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-err-'));
    await writeFile(join(tempDir, SYNC_STATE_FILE), '{{invalid json}}');

    const state = await adapter.readSyncState(tempDir);
    expect(state).toBeNull();
  });

  it('returns null for empty state file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-err-'));
    await writeFile(join(tempDir, SYNC_STATE_FILE), '');

    const state = await adapter.readSyncState(tempDir);
    expect(state).toBeNull();
  });

  it('returns null for state file with wrong shape (missing lastSyncTimestamp)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-err-'));
    await writeFile(
      join(tempDir, SYNC_STATE_FILE),
      JSON.stringify({ totalSyncs: 1 }),
    );

    const state = await adapter.readSyncState(tempDir);
    expect(state).toBeNull();
  });

  it('returns null for non-existent directory', async () => {
    const state = await adapter.readSyncState('/non/existent/path');
    expect(state).toBeNull();
  });
});

describe('SyncStateAdapter — readSpecResults', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('extracts completed tasks from tasks.md', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-spec-'));
    await writeFile(
      join(tempDir, 'tasks.md'),
      [
        '# Tasks',
        '',
        '- [x] T001 Setup project — Initialize repo',
        '- [ ] T002 Add CI — Pipeline not ready',
        '- [X] T003 Build passes — All tests green',
      ].join('\n'),
    );

    const results = await adapter.readSpecResults(tempDir);

    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('T001');
    expect(results[0].title).toContain('Setup project');
    expect(results[1].title).toContain('T003');
  });

  it('returns empty array when tasks.md does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-spec-'));
    const results = await adapter.readSpecResults(tempDir);
    expect(results).toEqual([]);
  });

  it('returns empty array when no tasks are completed', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-spec-'));
    await writeFile(
      join(tempDir, 'tasks.md'),
      '# Tasks\n\n- [ ] T001 Setup project\n- [ ] T002 Add CI\n',
    );

    const results = await adapter.readSpecResults(tempDir);
    expect(results).toEqual([]);
  });

  it('returns empty array for non-existent directory', async () => {
    const results = await adapter.readSpecResults('/non/existent/dir');
    expect(results).toEqual([]);
  });
});

describe('SyncStateAdapter — writeLearning', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates history file with learning entry', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-learn-'));
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const path = await adapter.writeLearning('bridge', 'Test title', 'Test content');

      expect(path).toContain('.squad/agents/bridge/history.md');
      const content = await readFile(join(tempDir, path), 'utf-8');
      expect(content).toContain('### ');
      expect(content).toContain('Test title');
      expect(content).toContain('Test content');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('appends to existing history file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-learn-'));
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await adapter.writeLearning('bridge', 'First', 'First content');
      await adapter.writeLearning('bridge', 'Second', 'Second content');

      const content = await readFile(
        join(tempDir, '.squad', 'agents', 'bridge', 'history.md'),
        'utf-8',
      );
      expect(content).toContain('First');
      expect(content).toContain('Second');
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe('SyncStateAdapter — writeDecision', () => {
  let tempDir: string;
  const adapter = new SyncStateAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates decisions file with entry', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-dec-'));
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const path = await adapter.writeDecision('Adopt TypeScript', 'Strict mode for safety');

      expect(path).toContain('decisions.md');
      const content = await readFile(join(tempDir, path), 'utf-8');
      expect(content).toContain('Adopt TypeScript');
      expect(content).toContain('Strict mode for safety');
    } finally {
      process.chdir(originalCwd);
    }
  });
});
