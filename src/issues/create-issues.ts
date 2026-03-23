/**
 * T022: CreateIssuesFromTasks Use Case
 *
 * Parses tasks from a tasks.md file, filters unchecked tasks,
 * and creates GitHub issues for each. Supports --dry-run mode.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { TaskEntry, IssueRecord } from '../types.js';
import type { IssueCreator, TasksMarkdownReader } from '../bridge/ports.js';

export interface CreateIssuesOptions {
  tasksFilePath: string;
  labels: string[];
  repository: string;
  dryRun: boolean;
  filter?: (task: TaskEntry) => boolean;
}

export interface CreateIssuesResult {
  created: IssueRecord[];
  skipped: TaskEntry[];
  dryRun: boolean;
  total: number;
}

export async function createIssuesFromTasks(
  tasksReader: TasksMarkdownReader,
  issueCreator: IssueCreator,
  options: CreateIssuesOptions,
): Promise<CreateIssuesResult> {
  const tasks = await tasksReader.readAndParse(options.tasksFilePath);

  // Filter: only unchecked tasks (status !== 'done')
  const defaultFilter = (t: TaskEntry) => t.status !== 'done';
  const filter = options.filter ?? defaultFilter;

  const eligible = tasks.filter(filter);
  const skipped = tasks.filter(t => !filter(t));

  if (options.dryRun) {
    // Dry run: produce IssueRecord placeholders without calling GitHub
    const dryResults: IssueRecord[] = eligible.map(task => ({
      issueNumber: 0,
      title: `${task.id}: ${task.description.split('—')[0].trim()}`,
      body: buildIssueBody(task),
      labels: options.labels,
      taskId: task.id,
      url: '',
      createdAt: new Date().toISOString(),
    }));

    return {
      created: dryResults,
      skipped,
      dryRun: true,
      total: tasks.length,
    };
  }

  // Create issues via the port
  const created: IssueRecord[] = [];
  for (const task of eligible) {
    // Enrich task with formatted body for issue creation
    const enrichedTask: TaskEntry = {
      ...task,
      description: buildIssueBody(task),
    };
    const record = await issueCreator.create(enrichedTask, options.labels, options.repository);
    created.push(record);
  }

  return {
    created,
    skipped,
    dryRun: false,
    total: tasks.length,
  };
}

function buildIssueBody(task: TaskEntry): string {
  const lines: string[] = [];

  lines.push(`## Task ${task.id}`);
  lines.push('');
  lines.push(task.description);
  lines.push('');

  if (task.dependencies.length > 0) {
    lines.push('### Dependencies');
    for (const dep of task.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Created by squad-speckit-bridge from tasks.md*');

  return lines.join('\n');
}
