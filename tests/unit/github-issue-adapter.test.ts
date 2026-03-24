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
    html_url: `https://github.com/test/repo/issues/${n}`,
    created_at: '2025-01-01T00:00:00Z',
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

  it('paginates through multiple pages', async () => {
    // Page 1: 100 issues, Page 2: 50 issues → total 150
    mockExecFile
      .mockReturnValueOnce(makePage(1, 100))
      .mockReturnValueOnce(makePage(101, 50));

    const result = await adapter.listExisting('test/repo', []);

    expect(result).toHaveLength(150);
    expect(result[0].issueNumber).toBe(1);
    expect(result[99].issueNumber).toBe(100);
    expect(result[100].issueNumber).toBe(101);
    expect(result[149].issueNumber).toBe(150);
    expect(mockExecFile).toHaveBeenCalledTimes(2);
  });

  it('paginates through 3+ pages (250 issues)', async () => {
    mockExecFile
      .mockReturnValueOnce(makePage(1, 100))
      .mockReturnValueOnce(makePage(101, 100))
      .mockReturnValueOnce(makePage(201, 50));

    const result = await adapter.listExisting('test/repo', ['squad']);

    expect(result).toHaveLength(250);
    expect(mockExecFile).toHaveBeenCalledTimes(3);
  });

  it('filters out pull requests from results', async () => {
    // 3 real issues + 1 PR disguised as issue
    mockExecFile.mockReturnValue(makePage(1, 3, { includePR: true }));

    const result = await adapter.listExisting('test/repo', []);

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.issueNumber < 9000)).toBe(true);
  });

  it('passes labels as comma-separated parameter', async () => {
    mockExecFile.mockReturnValue('[]');

    await adapter.listExisting('test/repo', ['squad', 'v0.2.0']);

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    const labelsIdx = callArgs.indexOf('labels=squad,v0.2.0');
    expect(labelsIdx).toBeGreaterThan(-1);
  });

  it('omits labels parameter when empty', async () => {
    mockExecFile.mockReturnValue('[]');

    await adapter.listExisting('test/repo', []);

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    const hasLabels = callArgs.some((a: string) => a.startsWith('labels='));
    expect(hasLabels).toBe(false);
  });

  it('uses gh api with correct pagination parameters', async () => {
    mockExecFile
      .mockReturnValueOnce(makePage(1, 100))
      .mockReturnValueOnce('[]');

    await adapter.listExisting('owner/repo', ['squad']);

    // First call: page 1
    const call1Args = mockExecFile.mock.calls[0][1] as string[];
    expect(call1Args).toContain('repos/owner/repo/issues');
    expect(call1Args).toContain('per_page=100');
    expect(call1Args).toContain('page=1');

    // Second call: page 2
    const call2Args = mockExecFile.mock.calls[1][1] as string[];
    expect(call2Args).toContain('page=2');
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
