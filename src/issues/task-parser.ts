/**
 * T023: TasksMarkdownParser Adapter
 *
 * Implements TasksMarkdownReader port. Reads and parses tasks.md
 * for issue creation. Reuses parseTasks from review adapter.
 *
 * Adapter layer — uses fs/promises (framework), implements port.
 */

import { readFile } from 'node:fs/promises';
import type { TasksMarkdownReader } from '../bridge/ports.js';
import type { TaskEntry } from '../types.js';
import { parseTasks } from '../review/adapters/tasks-parser.js';

export class TasksMarkdownParser implements TasksMarkdownReader {
  async readAndParse(path: string): Promise<TaskEntry[]> {
    let content: string;
    try {
      content = await readFile(path, 'utf-8');
    } catch {
      throw new Error(`Cannot read tasks file: ${path}`);
    }

    return parseTasks(content);
  }
}
