import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubIssueAdapter } from '../../src/issues/adapters/github-issue-adapter.js';

// Mock child_process.execFile at the module level
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

// Helper: make execFile resolve with stdout
function mockGhSuccess(stdout: string): void {
  (execFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, result: { stdout: string }) => void) => {
      cb(null, { stdout });
    },
  );
}

// Helper: make execFile reject with an error
function mockGhFailure(message: string): void {
  (execFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
      cb(new Error(message));
    },
  );
}

// Helper: make execFile fail N times then succeed
function mockGhFailThenSucceed(failures: string[], successStdout: string): void {
  let callCount = 0;
  (execFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, result?: { stdout: string }) => void) => {
      if (callCount < failures.length) {
        const msg = failures[callCount];
        callCount++;
        cb(new Error(msg));
      } else {
        callCount++;
        cb(null, { stdout: successStdout });
      }
    },
  );
}

const MOCK_ISSUES_JSON = JSON.stringify([
  {
    number: 42,
    title: 'T001: Setup project',
    body: 'Initialize the project structure',
    labels: [{ name: 'squad' }, { name: 'speckit' }],
    url: 'https://github.com/test/repo/issues/42',
    createdAt: '2025-07-26T10:00:00Z',
  },
  {
    number: 43,
    title: 'T002: Build pipeline',
    body: 'Create CI/CD pipeline',
    labels: [{ name: 'squad' }],
    url: 'https://github.com/test/repo/issues/43',
    createdAt: '2025-07-26T11:00:00Z',
  },
  {
    number: 44,
    title: 'Non-task issue',
    body: 'A bug report without task ID',
    labels: [{ name: 'squad' }],
    url: 'https://github.com/test/repo/issues/44',
    createdAt: '2025-07-26T12:00:00Z',
  },
]);

describe('GitHubIssueAdapter.listExisting', () => {
  const noopSleep = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped IssueRecord[] from gh output', async () => {
    mockGhSuccess(MOCK_ISSUES_JSON);
    const adapter = new GitHubIssueAdapter({}, noopSleep);

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      issueNumber: 42,
      title: 'T001: Setup project',
      body: 'Initialize the project structure',
      labels: ['squad', 'speckit'],
      taskId: 'T001',
      url: 'https://github.com/test/repo/issues/42',
      createdAt: '2025-07-26T10:00:00Z',
    });
    expect(result[1].taskId).toBe('T002');
    expect(result[2].taskId).toBe('');
  });

  it('passes correct args to gh CLI', async () => {
    mockGhSuccess('[]');
    const adapter = new GitHubIssueAdapter({}, noopSleep);

    await adapter.listExisting('owner/repo', ['squad', 'v2']);

    const call = (execFile as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('gh');
    const args = call[1] as string[];
    expect(args).toContain('issue');
    expect(args).toContain('list');
    expect(args).toContain('--repo');
    expect(args).toContain('owner/repo');
    expect(args).toContain('--json');
    expect(args).toContain('--state');
    expect(args).toContain('all');
    expect(args).toContain('--limit');
    expect(args).toContain('200');
    // Labels should appear as --label squad --label v2
    const labelIndices = args.reduce<number[]>((acc, v, i) => (v === '--label' ? [...acc, i] : acc), []);
    expect(labelIndices).toHaveLength(2);
    expect(args[labelIndices[0] + 1]).toBe('squad');
    expect(args[labelIndices[1] + 1]).toBe('v2');
  });

  it('returns empty array for empty gh output', async () => {
    mockGhSuccess('[]');
    const adapter = new GitHubIssueAdapter({}, noopSleep);

    const result = await adapter.listExisting('test/repo', []);

    expect(result).toEqual([]);
  });

  it('throws on non-rate-limit errors immediately', async () => {
    mockGhFailure('gh: Not Found (HTTP 404)');
    const adapter = new GitHubIssueAdapter({}, noopSleep);

    await expect(adapter.listExisting('bad/repo', ['squad'])).rejects.toThrow(
      'Failed to list issues for bad/repo',
    );
    // Should NOT retry — only 1 call
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(noopSleep).not.toHaveBeenCalled();
  });

  it('retries with exponential backoff on rate limit errors', async () => {
    mockGhFailThenSucceed(
      ['API rate limit exceeded', 'secondary rate limit'],
      MOCK_ISSUES_JSON,
    );
    const adapter = new GitHubIssueAdapter(
      { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 2000 },
      noopSleep,
    );

    const result = await adapter.listExisting('test/repo', ['squad']);

    // 2 failures + 1 success = 3 calls
    expect(execFile).toHaveBeenCalledTimes(3);
    expect(noopSleep).toHaveBeenCalledTimes(2);
    // First backoff: 100 * 2^0 = 100ms
    expect(noopSleep).toHaveBeenNthCalledWith(1, 100);
    // Second backoff: 100 * 2^1 = 200ms
    expect(noopSleep).toHaveBeenNthCalledWith(2, 200);
    expect(result).toHaveLength(3);
  });

  it('throws after exhausting all retries on rate limit', async () => {
    mockGhFailThenSucceed(
      [
        'API rate limit exceeded',
        'API rate limit exceeded',
        'API rate limit exceeded',
        'API rate limit exceeded',
      ],
      MOCK_ISSUES_JSON,
    );
    const adapter = new GitHubIssueAdapter(
      { maxRetries: 3, baseDelayMs: 50, maxDelayMs: 500 },
      noopSleep,
    );

    await expect(adapter.listExisting('test/repo', ['squad'])).rejects.toThrow(
      'Failed to list issues for test/repo',
    );
    // Initial attempt + 3 retries = 4 calls total
    expect(execFile).toHaveBeenCalledTimes(4);
    expect(noopSleep).toHaveBeenCalledTimes(3);
  });

  it('caps backoff delay at maxDelayMs', async () => {
    mockGhFailThenSucceed(
      ['rate limit', 'rate limit', 'rate limit'],
      MOCK_ISSUES_JSON,
    );
    const adapter = new GitHubIssueAdapter(
      { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 1000 },
      noopSleep,
    );

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(noopSleep).toHaveBeenCalledTimes(3);
    // 500 * 2^0 = 500
    expect(noopSleep).toHaveBeenNthCalledWith(1, 500);
    // 500 * 2^1 = 1000
    expect(noopSleep).toHaveBeenNthCalledWith(2, 1000);
    // 500 * 2^2 = 2000, capped to 1000
    expect(noopSleep).toHaveBeenNthCalledWith(3, 1000);
    expect(result).toHaveLength(3);
  });

  it('detects abuse detection rate limit variant', async () => {
    mockGhFailThenSucceed(['abuse detection mechanism triggered'], MOCK_ISSUES_JSON);
    const adapter = new GitHubIssueAdapter(
      { maxRetries: 2, baseDelayMs: 50 },
      noopSleep,
    );

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(execFile).toHaveBeenCalledTimes(2);
    expect(noopSleep).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
  });

  it('handles labels with special characters', async () => {
    mockGhSuccess('[]');
    const adapter = new GitHubIssueAdapter({}, noopSleep);

    await adapter.listExisting('test/repo', ['squad:bridge', 'v0.2.0']);

    const call = (execFile as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const args = call[1] as string[];
    expect(args).toContain('squad:bridge');
    expect(args).toContain('v0.2.0');
  });

  it('uses default retry options when none provided', async () => {
    mockGhSuccess(MOCK_ISSUES_JSON);
    const adapter = new GitHubIssueAdapter(undefined, noopSleep);

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toHaveLength(3);
  });
});
