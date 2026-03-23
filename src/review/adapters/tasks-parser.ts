/**
 * T029: TasksParser Adapter
 *
 * Implements TasksReader port. Parses Spec Kit tasks.md checklist format:
 * - Task IDs (T001 pattern)
 * - [P] priority markers
 * - [USn] user story labels
 * - Descriptions with file paths
 * - Phase structure
 *
 * Clean Architecture: adapter layer — may import node:fs and parsing libs.
 */

import { readFile } from 'node:fs/promises';
import type { TasksReader } from '../../bridge/ports.js';
import type { TaskEntry } from '../../types.js';

export class TasksParser implements TasksReader {
  async readTasks(path: string): Promise<TaskEntry[]> {
    let content: string;
    try {
      content = await readFile(path, 'utf-8');
    } catch {
      throw new Error(`Cannot read tasks file: ${path}`);
    }

    return parseTasks(content);
  }
}

// Exported for direct testing
export function parseTasks(content: string): TaskEntry[] {
  const tasks: TaskEntry[] = [];
  const lines = content.split('\n');
  let currentPhase = '';

  for (const line of lines) {
    // Detect phase headings (## Phase N: ...)
    const phaseMatch = line.match(/^##\s+(.+)/);
    if (phaseMatch) {
      currentPhase = phaseMatch[1].trim();
      continue;
    }

    // Match task lines: - [ ] T001 [P] [US1] Description — details
    // or: - [x] T001 Description
    const taskMatch = line.match(
      /^-\s+\[([ xX])\]\s+(T\d{3,4})\s+(.*)/,
    );
    if (!taskMatch) continue;

    const checked = taskMatch[1].toLowerCase() === 'x';
    const id = taskMatch[2];
    let rest = taskMatch[3].trim();

    // Extract [USn] labels
    const storyLabels: string[] = [];
    rest = rest.replace(/\[US\d+\]/g, (match) => {
      storyLabels.push(match.replace(/[\[\]]/g, ''));
      return '';
    }).trim();

    // Extract [P] priority marker
    const hasPriority = /\[P\]/.test(rest);
    rest = rest.replace(/\[P\]/g, '').trim();

    // The rest is the description — may contain "Title — Details" or just "Title"
    const description = rest;

    // Extract dependency references from description (e.g., "depends on T001, T002")
    const dependencies: string[] = [];
    const depMatches = description.matchAll(/(?:depends?\s+on|after|requires?)\s+(T\d{3,4}(?:\s*,\s*T\d{3,4})*)/gi);
    for (const depMatch of depMatches) {
      const depIds = depMatch[1].match(/T\d{3,4}/g);
      if (depIds) dependencies.push(...depIds);
    }

    // Build status from checkbox and priority
    let status = checked ? 'done' : 'pending';
    if (hasPriority && !checked) status = 'priority';

    tasks.push({
      id,
      title: buildTitle(id, storyLabels, currentPhase),
      description,
      dependencies,
      status,
    });
  }

  return tasks;
}

function buildTitle(
  id: string,
  storyLabels: string[],
  phase: string,
): string {
  const parts = [id];
  if (storyLabels.length > 0) {
    parts.push(`[${storyLabels.join(', ')}]`);
  }
  if (phase) {
    parts.push(`(${phase})`);
  }
  return parts.join(' ');
}
