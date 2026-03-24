/**
 * AgentHistoryReaderAdapter
 *
 * Implements AgentHistoryReader port.
 * Reads agent history/output files from .squad/agents/{name}/history.md
 * and extracts timestamped learning entries.
 *
 * Adapter layer — uses fs/promises and glob (framework), implements port.
 */

import { readFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { glob } from 'glob';
import type { AgentHistoryReader, ExtractedLearning } from '../sync-learnings.js';

export class AgentHistoryReaderAdapter implements AgentHistoryReader {

  async extractLearnings(agentDir: string, since?: Date): Promise<ExtractedLearning[]> {
    const pattern = join(agentDir, '**', 'history.md').replace(/\\/g, '/');
    let files: string[];

    try {
      files = await glob(pattern);
    } catch {
      return [];
    }

    const learnings: ExtractedLearning[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const agentName = basename(dirname(file));
        const entries = this.parseHistoryEntries(content, agentName, file);

        for (const entry of entries) {
          if (since) {
            const entryDate = new Date(entry.timestamp);
            if (isNaN(entryDate.getTime()) || entryDate < since) continue;
          }
          learnings.push(entry);
        }
      } catch {
        // Skip unreadable files
      }
    }

    return learnings;
  }

  private parseHistoryEntries(
    content: string,
    agentName: string,
    source: string,
  ): ExtractedLearning[] {
    const entries: ExtractedLearning[] = [];
    const sections = content.split(/^###\s+/m).filter(s => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const heading = lines[0].trim();
      const dateMatch = heading.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)/);
      if (!dateMatch) continue;

      const timestamp = dateMatch[1];
      const title = dateMatch[2].trim();
      const body = lines.slice(1).join('\n').trim();

      if (title) {
        entries.push({
          agentName,
          timestamp,
          title,
          content: body || title,
          source,
        });
      }
    }

    return entries;
  }
}
