/**
 * T028: SyncStateAdapter
 *
 * Implements SyncStateReader and SquadMemoryWriter ports.
 * Reads sync state from .squad/.bridge-sync.json.
 * Reads execution results from spec directory (tasks.md completion status).
 * Writes learnings to .squad/agents/bridge/history.md.
 *
 * Adapter layer — uses fs/promises (framework), implements ports.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { SquadMemoryWriter } from '../../bridge/ports.js';
import type { SyncState } from '../../types.js';
import type { SyncStateReader } from '../sync-learnings.js';

const SYNC_STATE_FILE = '.bridge-sync.json';

export class SyncStateAdapter implements SyncStateReader, SquadMemoryWriter {

  async readSyncState(squadDir: string): Promise<SyncState | null> {
    try {
      const raw = await readFile(join(squadDir, SYNC_STATE_FILE), 'utf-8');
      return JSON.parse(raw) as SyncState;
    } catch {
      return null;
    }
  }

  async writeSyncState(squadDir: string, state: SyncState): Promise<void> {
    const fullPath = join(squadDir, SYNC_STATE_FILE);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  }

  async readSpecResults(specDir: string): Promise<{ title: string; content: string }[]> {
    const results: { title: string; content: string }[] = [];

    // Read tasks.md to find completed tasks
    try {
      const tasksContent = await readFile(join(specDir, 'tasks.md'), 'utf-8');
      const completedTasks = this.extractCompletedTasks(tasksContent);
      for (const task of completedTasks) {
        results.push({
          title: `Task ${task.id} completed: ${task.title}`,
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

  private extractCompletedTasks(content: string): { id: string; title: string; description: string }[] {
    const tasks: { id: string; title: string; description: string }[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^-\s+\[[xX]\]\s+(T\d{3,4})\s+(.*)/);
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
