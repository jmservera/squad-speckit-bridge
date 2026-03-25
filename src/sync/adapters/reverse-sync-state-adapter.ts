/**
 * T008: ReverseSyncStateAdapter
 *
 * Implements the ReverseSyncStatePersistence port.
 * Reads/writes .bridge-sync-reverse.json for reverse sync idempotency.
 *
 * Adapter layer — uses fs/promises (framework), implements port.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ReverseSyncStatePersistence } from '../sync-reverse.js';
import type { ReverseSyncState } from '../../types.js';

const STATE_FILE = '.bridge-sync-reverse.json';

export class ReverseSyncStateAdapter implements ReverseSyncStatePersistence {

  async load(specDir: string): Promise<ReverseSyncState | null> {
    try {
      const raw = await readFile(join(specDir, STATE_FILE), 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.lastReverseSyncTimestamp) {
        return null;
      }
      return parsed as ReverseSyncState;
    } catch {
      return null;
    }
  }

  async save(specDir: string, state: ReverseSyncState): Promise<void> {
    const fullPath = join(specDir, STATE_FILE);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  }
}
