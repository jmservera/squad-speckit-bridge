import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing the adapter
const mockExecFile = vi.fn();
vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => {
    // promisify wraps execFile; simulate that wrapper
    const cb = args[args.length - 1] as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    const result = mockExecFile(args[0], args[1]);
    if (result instanceof Error) {
      cb(result, { stdout: '', stderr: '' });
    } else {
      cb(null, { stdout: result, stderr: '' });
    }
  },
}));

import { GitHubIssueAdapter } from '../../src/issues/adapters/github-issue-adapter.js';

function makeIssue(n: number, opts?: { isPR?: boolean }) {
  return {
    number: n,
    title: `T${String(n).padStart(3, '0')}: Task ${n}`,
    body: `Description ${n}`,
    labels: [{ name: 'squad' }],
    url: `https://github.com/test/repo/issues/${n}`,
    createdAt: '2025-01-01T00:00:00Z',
    ...(opts?.isPR ? { pull_request: { url: 'https://...' } } : {}),
  };
}

function makePage(start: number, count: number, opts?: { includePR?: boolean }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(makeIssue(start + i));
  }
  if (opts?.includePR) {
    items.push(makeIssue(9000 + start, { isPR: true }));
  }
  return JSON.stringify(items);
}

describe('GitHubIssueAdapter.listExisting', () => {
  let adapter: GitHubIssueAdapter;

  beforeEach(() => {
    adapter = new GitHubIssueAdapter();
    mockExecFile.mockReset();
  });

  it('returns empty array for repo with 0 issues', async () => {
    mockExecFile.mockReturnValue('[]');

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toEqual([]);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  it('fetches single page when < 100 issues', async () => {
    mockExecFile.mockReturnValue(makePage(1, 3));

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toHaveLength(3);
    expect(result[0].issueNumber).toBe(1);
    expect(result[2].issueNumber).toBe(3);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  it('handles large result sets in single call', async () => {
    // gh issue list --limit 200 returns all at once
    mockExecFile.mockReturnValue(makePage(1, 150));

    const result = await adapter.listExisting('test/repo', []);

    expect(result).toHaveLength(150);
    expect(result[0].issueNumber).toBe(1);
    expect(result[149].issueNumber).toBe(150);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  it('handles 200+ results from gh issue list', async () => {
    mockExecFile.mockReturnValue(makePage(1, 200));

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toHaveLength(200);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  it('does not include pull requests (gh issue list only returns issues)', async () => {
    // gh issue list returns only issues, not PRs
    mockExecFile.mockReturnValue(makePage(1, 3));

    const result = await adapter.listExisting('test/repo', []);

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.issueNumber < 9000)).toBe(true);
  });

  it('passes labels as separate --label arguments', async () => {
    mockExecFile.mockReturnValue('[]');

    await adapter.listExisting('test/repo', ['squad', 'v0.2.0']);

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    const labelIndices = callArgs.reduce<number[]>((acc, v, i) => (v === '--label' ? [...acc, i] : acc), []);
    expect(labelIndices).toHaveLength(2);
    expect(callArgs[labelIndices[0] + 1]).toBe('squad');
    expect(callArgs[labelIndices[1] + 1]).toBe('v0.2.0');
  });

  it('omits label arguments when labels array is empty', async () => {
    mockExecFile.mockReturnValue('[]');

    await adapter.listExisting('test/repo', []);

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    const hasLabels = callArgs.some((a: string) => a === '--label');
    expect(hasLabels).toBe(false);
  });

  it('uses gh issue list with correct parameters', async () => {
    mockExecFile.mockReturnValue('[]');

    await adapter.listExisting('owner/repo', ['squad']);

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(callArgs).toContain('issue');
    expect(callArgs).toContain('list');
    expect(callArgs).toContain('--repo');
    expect(callArgs).toContain('owner/repo');
    expect(callArgs).toContain('--json');
    expect(callArgs).toContain('--state');
    expect(callArgs).toContain('all');
    expect(callArgs).toContain('--limit');
    expect(callArgs).toContain('200');
  });

  it('extracts taskId from issue title', async () => {
    mockExecFile.mockReturnValue(JSON.stringify([
      { ...makeIssue(1), title: 'T042: Some task title' },
      { ...makeIssue(2), title: 'No task prefix here' },
    ]));

    const result = await adapter.listExisting('test/repo', []);

    expect(result[0].taskId).toBe('T042');
    expect(result[1].taskId).toBe('');
  });

  it('throws descriptive error on failure', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error('gh: command not found');
    });

    await expect(adapter.listExisting('test/repo', []))
      .rejects.toThrow('Failed to list issues for test/repo');
  });
});
