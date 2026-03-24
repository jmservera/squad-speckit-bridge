/**
 * T024 + T006: GitHubIssueAdapter
 *
 * Implements IssueCreator port. Uses `gh` CLI for issue creation
 * and listing to avoid requiring @octokit/rest as a production dependency.
 *
 * listExisting includes exponential backoff for GitHub rate limits.
 *
 * Adapter layer — uses child_process (framework), implements port.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { IssueCreator } from '../../bridge/ports.js';
import type { TaskEntry, IssueRecord } from '../../types.js';

const execFileAsync = promisify(execFile);

const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'secondary rate limit',
  'abuse detection',
  'API rate limit exceeded',
  'retry-after',
];

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 16000,
};

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function computeBackoffMs(attempt: number, opts: RetryOptions): number {
  const delay = opts.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, opts.maxDelayMs);
}

// Exposed for testing; replaced by vi.fn in tests
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class GitHubIssueAdapter implements IssueCreator {
  private retryOptions: RetryOptions;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(retryOptions?: Partial<RetryOptions>, sleepFn?: (ms: number) => Promise<void>) {
    this.retryOptions = { ...DEFAULT_RETRY, ...retryOptions };
    this.sleepFn = sleepFn ?? sleep;
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
    const args = [
      'issue', 'list',
      '--repo', repo,
      '--json', 'number,title,body,labels,url,createdAt',
      '--state', 'all',
      '--limit', '200',
    ];

    for (const label of labels) {
      args.push('--label', label);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const { stdout } = await execFileAsync('gh', args);
        const issues = JSON.parse(stdout) as Array<{
          number: number;
          title: string;
          body: string;
          labels: Array<{ name: string }>;
          url: string;
          createdAt: string;
        }>;

        return issues.map((issue) => ({
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
          labels: issue.labels.map((l) => l.name),
          taskId: this.extractTaskId(issue.title),
          url: issue.url,
          createdAt: issue.createdAt,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lastError = new Error(`Failed to list issues for ${repo}: ${message}`);

        if (isRateLimitError(message) && attempt < this.retryOptions.maxRetries) {
          const delayMs = computeBackoffMs(attempt, this.retryOptions);
          await this.sleepFn(delayMs);
          continue;
        }

        throw lastError;
      }
    }

    // Should be unreachable, but satisfies TypeScript
    throw lastError ?? new Error(`Failed to list issues for ${repo}: unknown error`);


  }

  private extractTaskId(title: string): string {
    const match = title.match(/^(T\d+):/);
    return match ? match[1] : '';
  }
}
