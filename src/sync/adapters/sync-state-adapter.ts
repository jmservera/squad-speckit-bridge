/**
 * T028 + T009: SyncStateAdapter
 *
 * Implements SyncStateReader, SyncStatePersistence, and SquadMemoryWriter ports.
 * Reads sync state from .squad/.bridge-sync.json.
 * Reads execution results from spec directory (tasks.md completion status).
 * Writes learnings to .squad/agents/bridge/history.md.
 *
 * Adapter layer — uses fs/promises (framework), implements ports.
 */

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { SquadMemoryWriter } from '../../bridge/ports.js';
import type { SyncState } from '../../types.js';
import type { SyncStateReader, SyncStatePersistence } from '../sync-learnings.js';

const SYNC_STATE_FILE = '.bridge-sync.json';

export class SyncStateAdapter implements SyncStateReader, SyncStatePersistence, SquadMemoryWriter {

  async readSyncState(squadDir: string): Promise<SyncState | null> {
    try {
      const raw = await readFile(join(squadDir, SYNC_STATE_FILE), 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.lastSyncTimestamp) {
        return null;
      }
      return parsed as SyncState;
    } catch {
      return null;
    }
  }

  async writeSyncState(squadDir: string, state: SyncState): Promise<void> {
    const fullPath = join(squadDir, SYNC_STATE_FILE);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  }

  async getLastSyncTimestamp(squadDir: string): Promise<Date | null> {
    const state = await this.readSyncState(squadDir);
    if (!state?.lastSyncTimestamp) return null;
    const date = new Date(state.lastSyncTimestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  async clearState(squadDir: string): Promise<void> {
    try {
      await unlink(join(squadDir, SYNC_STATE_FILE));
    } catch {
      // Already missing — nothing to clear
    }
  }

  async readSpecResults(specDir: string): Promise<{ title: string; content: string }[]> {
    const results: { title: string; content: string }[] = [];

    // Read tasks.md to find all tasks (checked and unchecked)
    try {
      const tasksContent = await readFile(join(specDir, 'tasks.md'), 'utf-8');
      const tasks = this.extractTasks(tasksContent);
      for (const task of tasks) {
        results.push({
          title: `Task ${task.id}: ${task.title}`,
          content: task.description,
        });
      }
    } catch {
      // No tasks.md or unreadable
    }

    return results;
  }

  async writeLearning(agentName: string, title: string, content: string): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const historyPath = join('.squad', 'agents', agentName, 'history.md');

    let existing = '';
    try {
      existing = await readFile(historyPath, 'utf-8');
    } catch {
      existing = `# ${agentName} — History\n\n## Core Context\n\n## Learnings\n\n<!-- Append learnings below -->\n`;
    }

    const entry = `\n### ${date}: ${title}\n\n${content}\n`;
    const updated = existing + entry;

    await mkdir(dirname(historyPath), { recursive: true });
    await writeFile(historyPath, updated, 'utf-8');

    return historyPath;
  }

  async writeDecision(title: string, content: string): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const decisionsPath = join('.squad', 'decisions.md');

    let existing = '';
    try {
      existing = await readFile(decisionsPath, 'utf-8');
    } catch {
      existing = '# Squad Decisions\n\n## Active Decisions\n';
    }

    const entry = `\n### ${title} (${date})\n\n${content}\n\n---\n`;

    // Insert before the last section marker or at end
    const updated = existing + entry;
    await mkdir(dirname(decisionsPath), { recursive: true });
    await writeFile(decisionsPath, updated, 'utf-8');

    return decisionsPath;
  }

  /**
   * Extract all tasks from tasks.md content.
   * Matches both checked [x] and unchecked [ ] tasks because squask sync
   * is an explicit post-execution command — if you're running it, the spec
   * was executed. Completion tracking is via GitHub issues, not markdown checkboxes.
   */
  private extractTasks(content: string): { id: string; title: string; description: string }[] {
    const tasks: { id: string; title: string; description: string }[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^-\s+\[[ xX]\]\s+(T\d{3,4})\s+(.*)/);
      if (match) {
        const id = match[1];
        const rest = match[2].trim()
          .replace(/\[US\d+\]/g, '')
          .replace(/\[P\]/g, '')
          .trim();

        tasks.push({
          id,
          title: rest.split('—')[0].trim(),
          description: rest,
        });
      }
    }

    return tasks;
  }
}
