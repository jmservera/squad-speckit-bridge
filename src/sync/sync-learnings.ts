/**
 * T027: SyncLearnings Use Case
 *
 * Reads execution results from a spec directory and updates Squad
 * memory with implementation learnings. Tracks sync state.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { SyncRecord, SyncState } from '../types.js';
import type { SquadMemoryWriter } from '../bridge/ports.js';

export interface SyncOptions {
  specDir: string;
  squadDir: string;
  dryRun: boolean;
}

export interface SyncResult {
  record: SyncRecord;
  dryRun: boolean;
}

export interface SyncStateReader {
  readSyncState(squadDir: string): Promise<SyncState | null>;
  writeSyncState(squadDir: string, state: SyncState): Promise<void>;
  readSpecResults(specDir: string): Promise<{ title: string; content: string }[]>;
}

export async function syncLearnings(
  stateAdapter: SyncStateReader,
  memoryWriter: SquadMemoryWriter,
  options: SyncOptions,
): Promise<SyncResult> {
  const { specDir, squadDir, dryRun } = options;

  // Read previous sync state
  const prevState = await stateAdapter.readSyncState(squadDir);

  // Read execution results from spec dir
  const results = await stateAdapter.readSpecResults(specDir);

  if (results.length === 0) {
    const record: SyncRecord = {
      syncTimestamp: new Date().toISOString(),
      learningsUpdated: 0,
      filesWritten: [],
      summary: 'No execution results found to sync.',
    };
    return { record, dryRun };
  }

  const filesWritten: string[] = [];

  if (!dryRun) {
    // Write each result as a learning entry
    for (const result of results) {
      const path = await memoryWriter.writeLearning(
        'bridge',
        result.title,
        result.content,
      );
      filesWritten.push(path);
    }

    // Update sync state
    const newState: SyncState = {
      lastSyncTimestamp: new Date().toISOString(),
      syncHistory: [
        ...(prevState?.syncHistory ?? []),
        {
          syncTimestamp: new Date().toISOString(),
          learningsUpdated: results.length,
          filesWritten,
          summary: `Synced ${results.length} learning(s) from ${specDir}`,
        },
      ],
      totalSyncs: (prevState?.totalSyncs ?? 0) + 1,
    };

    await stateAdapter.writeSyncState(squadDir, newState);
  }

  const record: SyncRecord = {
    syncTimestamp: new Date().toISOString(),
    learningsUpdated: results.length,
    filesWritten,
    summary: dryRun
      ? `[DRY RUN] Would sync ${results.length} learning(s) from ${specDir}`
      : `Synced ${results.length} learning(s) from ${specDir}`,
  };

  return { record, dryRun };
}
