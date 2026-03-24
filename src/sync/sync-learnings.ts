/**
 * T027 + T008: SyncLearnings Use Case
 *
 * Reads execution results from a spec directory and agent history files,
 * then updates Squad memory with implementation learnings. Tracks sync state
 * with timestamp-based idempotent extraction and fingerprint deduplication.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { SyncRecord, SyncState } from '../types.js';
import type { SquadMemoryWriter } from '../bridge/ports.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SyncOptions {
  specDir: string;
  squadDir: string;
  dryRun: boolean;
  agentDir?: string;
}

export interface SyncResult {
  record: SyncRecord;
  dryRun: boolean;
}

export interface ExtractedLearning {
  agentName: string;
  timestamp: string;
  title: string;
  content: string;
  source: string;
}

/* ------------------------------------------------------------------ */
/*  Port interfaces                                                    */
/* ------------------------------------------------------------------ */

export interface SyncStateReader {
  readSyncState(squadDir: string): Promise<SyncState | null>;
  writeSyncState(squadDir: string, state: SyncState): Promise<void>;
  readSpecResults(specDir: string): Promise<{ title: string; content: string }[]>;
}

/** Reads agent history/output files and extracts learnings. */
export interface AgentHistoryReader {
  extractLearnings(agentDir: string, since?: Date): Promise<ExtractedLearning[]>;
}

/**
 * Port for sync state persistence with timestamp convenience methods.
 * Separates the pure state-persistence concern from spec-result reading.
 */
export interface SyncStatePersistence {
  readSyncState(stateDir: string): Promise<SyncState | null>;
  writeSyncState(stateDir: string, state: SyncState): Promise<void>;
  getLastSyncTimestamp(stateDir: string): Promise<Date | null>;
  clearState(stateDir: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

/** Extended sync state that tracks fingerprints for deduplication. */
interface SyncStateWithFingerprints extends SyncState {
  syncedFingerprints?: string[];
}

/**
 * Compute a deterministic fingerprint for a learning entry.
 * Used to prevent duplicate syncs across runs (idempotency).
 * DJB2 hash over normalized title + content.
 */
export function computeLearningFingerprint(title: string, content: string): string {
  const normalized = `${title.trim().toLowerCase()}::${content.trim().toLowerCase()}`;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) & 0xffffffff;
  }
  return `fp_${(hash >>> 0).toString(36)}`;
}

/* ------------------------------------------------------------------ */
/*  Use case                                                           */
/* ------------------------------------------------------------------ */

export async function syncLearnings(
  stateAdapter: SyncStateReader,
  memoryWriter: SquadMemoryWriter,
  options: SyncOptions,
  historyReader?: AgentHistoryReader,
): Promise<SyncResult> {
  const { specDir, squadDir, dryRun, agentDir } = options;

  // Read previous sync state (may contain fingerprints from prior runs)
  const prevState = (await stateAdapter.readSyncState(squadDir)) as SyncStateWithFingerprints | null;
  const existingFingerprints = new Set(prevState?.syncedFingerprints ?? []);

  // Timestamp gate: only extract learnings newer than last sync
  const sinceDate = prevState?.lastSyncTimestamp
    ? new Date(prevState.lastSyncTimestamp)
    : undefined;

  // Collect learnings from all sources
  const allLearnings: { title: string; content: string }[] = [];

  // Source 1: execution results from spec directory
  const specResults = await stateAdapter.readSpecResults(specDir);
  allLearnings.push(...specResults);

  // Source 2: agent history files (timestamp-filtered at the reader)
  if (historyReader && agentDir) {
    const extracted = await historyReader.extractLearnings(agentDir, sinceDate);
    for (const learning of extracted) {
      allLearnings.push({
        title: learning.title,
        content: `[${learning.agentName}] ${learning.content}`,
      });
    }
  }

  // No results from any source
  if (allLearnings.length === 0) {
    const record: SyncRecord = {
      syncTimestamp: new Date().toISOString(),
      learningsUpdated: 0,
      filesWritten: [],
      summary: 'No execution results found to sync.',
    };
    return { record, dryRun };
  }

  // Deduplicate: skip learnings whose fingerprint was already synced
  const newLearnings = allLearnings.filter((l) => {
    const fp = computeLearningFingerprint(l.title, l.content);
    return !existingFingerprints.has(fp);
  });

  if (newLearnings.length === 0) {
    const record: SyncRecord = {
      syncTimestamp: new Date().toISOString(),
      learningsUpdated: 0,
      filesWritten: [],
      summary: 'All learnings already synced — nothing new to write.',
    };
    return { record, dryRun };
  }

  const filesWritten: string[] = [];
  const newFingerprints: string[] = [];

  if (!dryRun) {
    for (const learning of newLearnings) {
      const path = await memoryWriter.writeLearning(
        'bridge',
        learning.title,
        learning.content,
      );
      filesWritten.push(path);
      newFingerprints.push(computeLearningFingerprint(learning.title, learning.content));
    }

    // Persist fingerprints so the next run skips these learnings
    const updatedFingerprints = [...existingFingerprints, ...newFingerprints];
    const newState: SyncStateWithFingerprints = {
      lastSyncTimestamp: new Date().toISOString(),
      syncHistory: [
        ...(prevState?.syncHistory ?? []),
        {
          syncTimestamp: new Date().toISOString(),
          learningsUpdated: newLearnings.length,
          filesWritten,
          summary: `Synced ${newLearnings.length} learning(s) from ${specDir}`,
        },
      ],
      totalSyncs: (prevState?.totalSyncs ?? 0) + 1,
      syncedFingerprints: updatedFingerprints,
    };

    await stateAdapter.writeSyncState(squadDir, newState);
  }

  const record: SyncRecord = {
    syncTimestamp: new Date().toISOString(),
    learningsUpdated: newLearnings.length,
    filesWritten,
    summary: dryRun
      ? `[DRY RUN] Would sync ${newLearnings.length} learning(s) from ${specDir}`
      : `Synced ${newLearnings.length} learning(s) from ${specDir}`,
  };

  return { record, dryRun };
}
