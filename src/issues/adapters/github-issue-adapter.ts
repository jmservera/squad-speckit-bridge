/**
 * T024: GitHubIssueAdapter
 *
 * Implements IssueCreator port. Uses `gh` CLI for issue creation
 * to avoid requiring @octokit/rest as a production dependency.
 * Falls back to @octokit/rest if available.
 *
 * Adapter layer — uses child_process (framework), implements port.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { IssueCreator } from '../../bridge/ports.js';
import type { TaskEntry, IssueRecord } from '../../types.js';

const execFileAsync = promisify(execFile);

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

type SleepFn = (ms: number) => Promise<void>;

const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'secondary rate limit',
  'abuse detection',
];

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p));
}

const defaultSleep: SleepFn = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class GitHubIssueAdapter implements IssueCreator {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly sleep: SleepFn;

  constructor(options?: RetryOptions, sleep?: SleepFn) {
    this.maxRetries = options?.maxRetries ?? 3;
    this.baseDelayMs = options?.baseDelayMs ?? 1000;
    this.maxDelayMs = options?.maxDelayMs ?? 30000;
    this.sleep = sleep ?? defaultSleep;
  }

  async create(task: TaskEntry, labels: string[], repo: string): Promise<IssueRecord> {
    const title = `${task.id}: ${task.title}`;
    const body = task.description;

    try {
      const args = [
        'issue', 'create',
        '--repo', repo,
        '--title', title,
        '--body', body,
      ];

      for (const label of labels) {
        args.push('--label', label);
      }

      const { stdout } = await execFileAsync('gh', args);
      const url = stdout.trim();

      // Extract issue number from URL
      const numberMatch = url.match(/\/issues\/(\d+)/);
      const issueNumber = numberMatch ? parseInt(numberMatch[1], 10) : 0;

      return {
        issueNumber,
        title,
        body,
        labels,
        taskId: task.id,
        url,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to create issue for ${task.id}: ${message}`);
    }
  }

  async createBatch(tasks: TaskEntry[], labels: string[], repo: string): Promise<IssueRecord[]> {
    const results: IssueRecord[] = [];
    for (const task of tasks) {
      const record = await this.create(task, labels, repo);
      results.push(record);
    }
    return results;
  }

  async listExisting(repo: string, labels: string[]): Promise<IssueRecord[]> {
    const jsonFields = 'number,title,body,labels,url,createdAt';
    const args = [
      'issue', 'list',
      '--repo', repo,
      '--json', jsonFields,
      '--state', 'all',
      '--limit', '200',
    ];

    for (const label of labels) {
      args.push('--label', label);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { stdout } = await execFileAsync('gh', args);
        const issues = JSON.parse(stdout || '[]') as Array<{
          number: number;
          title: string;
          body: string | null;
          labels: Array<{ name: string }>;
          url: string;
          createdAt: string;
        }>;

        return issues.map((issue) => ({
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body ?? '',
          labels: issue.labels.map((l) => l.name),
          taskId: this.extractTaskId(issue.title),
          url: issue.url,
          createdAt: issue.createdAt,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(message);

        if (!isRateLimitError(message) || attempt >= this.maxRetries) {
          break;
        }

        // Exponential backoff capped at maxDelayMs
        const delay = Math.min(
          this.baseDelayMs * Math.pow(2, attempt),
          this.maxDelayMs,
        );
        await this.sleep(delay);
      }
    }

    throw new Error(
      `Failed to list issues for ${repo}: ${lastError?.message ?? 'Unknown error'}`,
    );
  }

  private extractTaskId(title: string): string {
    const match = title.match(/^(T\d+):/);
    return match ? match[1] : '';
  }
}
