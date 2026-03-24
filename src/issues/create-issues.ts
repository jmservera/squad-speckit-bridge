/**
 * T022 + T005: CreateIssuesFromTasks Use Case
 *
 * Parses tasks from a tasks.md file, filters unchecked tasks,
 * and creates GitHub issues for each. Supports dedup via listExisting,
 * sequential batch with 200ms delay, hierarchical label taxonomy, and --dry-run.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { TaskEntry, IssueRecord } from '../types.js';
import type { IssueCreator, TasksMarkdownReader } from '../bridge/ports.js';

/** Hierarchical label prefixes for the taxonomy. */
export type LabelPrefix = 'area' | 'type' | 'agent';

export interface CreateIssuesOptions {
  tasksFilePath: string;
  labels: string[];
  repository: string;
  dryRun: boolean;
  filter?: (task: TaskEntry) => boolean;
  batchDelayMs?: number;
}

export interface CreateIssuesResult {
  created: IssueRecord[];
  skipped: TaskEntry[];
  duplicates: TaskEntry[];
  dryRun: boolean;
  total: number;
}

const DEFAULT_BATCH_DELAY_MS = 200;

/**
 * Build hierarchical labels from prefix/value pairs.
 * Accepts raw labels and returns them alongside structured prefix labels.
 * Example: buildHierarchicalLabels('area', 'issues') → 'area/issues'
 */
export function buildHierarchicalLabel(prefix: LabelPrefix, value: string): string {
  return `${prefix}/${value}`;
}

/**
 * Validate that a label conforms to the hierarchical taxonomy.
 * Valid forms: 'area/foo', 'type/bar', 'agent/baz', or any plain label.
 */
export function isHierarchicalLabel(label: string): boolean {
  return /^(area|type|agent)\/\S+$/.test(label);
}

/**
 * Extract labels matching a given prefix from a label array.
 */
export function filterLabelsByPrefix(labels: string[], prefix: LabelPrefix): string[] {
  return labels.filter(l => l.startsWith(`${prefix}/`));
}

/** Delay helper for sequential batching. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  // Dedup: fetch existing issues and skip tasks that already have issues
  const existing = await issueCreator.listExisting(options.repository, options.labels);
  const existingTaskIds = new Set(existing.map(r => r.taskId).filter(Boolean));

  const duplicates = eligible.filter(t => existingTaskIds.has(t.id));
  const toCreate = eligible.filter(t => !existingTaskIds.has(t.id));

  if (options.dryRun) {
    // Dry run: produce IssueRecord placeholders without calling GitHub
    const dryResults: IssueRecord[] = toCreate.map(task => ({
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
      duplicates,
      dryRun: true,
      total: tasks.length,
    };
  }

  // Create issues sequentially with batch delay to avoid rate limiting
  const batchDelay = options.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS;
  const created: IssueRecord[] = [];
  for (let i = 0; i < toCreate.length; i++) {
    const task = toCreate[i];
    const enrichedTask: TaskEntry = {
      ...task,
      description: buildIssueBody(task),
    };
    const record = await issueCreator.create(enrichedTask, options.labels, options.repository);
    created.push(record);

    // Apply delay between issues (not after the last one)
    if (i < toCreate.length - 1) {
      await delay(batchDelay);
    }
  }

  return {
    created,
    skipped,
    duplicates,
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
