import { describe, it, expect } from 'vitest';
import {
  analyzeDistribution,
  extractAgent,
} from '../../src/issues/analyze-distribution.js';
import type { TaskEntry } from '../../src/types.js';

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 'T001',
    title: 'Test task',
    description: 'A test task description',
    dependencies: [],
    status: 'pending',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractAgent
// ---------------------------------------------------------------------------

describe('extractAgent', () => {
  it('extracts agent from bracketed tag [AgentName]', () => {
    const task = makeTask({ title: '[Dinesh] Implement auth module' });
    expect(extractAgent(task)).toBe('dinesh');
  });

  it('extracts agent from colon prefix "AgentName: ..."', () => {
    const task = makeTask({ title: 'Gilfoyle: Set up CI pipeline' });
    expect(extractAgent(task)).toBe('gilfoyle');
  });

  it('returns unassigned when no agent pattern is found', () => {
    const task = makeTask({ title: 'Implement the feature' });
    expect(extractAgent(task)).toBe('unassigned');
  });

  it('does not treat task ID prefix as an agent', () => {
    const task = makeTask({ title: 'T001: Build the widget' });
    expect(extractAgent(task)).toBe('unassigned');
  });

  it('does not treat "Task N" prefix as an agent', () => {
    const task = makeTask({ title: 'Task 1: Build the widget' });
    expect(extractAgent(task)).toBe('unassigned');
  });

  it('normalises agent name to lowercase', () => {
    const task = makeTask({ title: '[RICHARD] Design the API' });
    expect(extractAgent(task)).toBe('richard');
  });

  it('handles multi-word agent names in brackets', () => {
    const task = makeTask({ title: '[Big Head] Review docs' });
    expect(extractAgent(task)).toBe('big head');
  });
});

// ---------------------------------------------------------------------------
// analyzeDistribution — empty / basic
// ---------------------------------------------------------------------------

describe('analyzeDistribution', () => {
  it('returns balanced result for empty task list', () => {
    const result = analyzeDistribution([]);
    expect(result.totalTasks).toBe(0);
    expect(result.distribution).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.balanced).toBe(true);
  });

  it('counts a single agent with 100% share', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.totalTasks).toBe(2);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0].agent).toBe('dinesh');
    expect(result.distribution[0].taskCount).toBe(2);
    expect(result.distribution[0].percentage).toBe(1.0);
  });

  it('reports balanced when all agents are below threshold', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Gilfoyle] Task B' }),
      makeTask({ title: '[Richard] Task C' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.balanced).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Dominance detection (default threshold = 0.5)
  // ---------------------------------------------------------------------------

  it('warns when one agent has >50% of tasks (default threshold)', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Dinesh] Task C' }),
      makeTask({ title: '[Gilfoyle] Task D' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.balanced).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].agent).toBe('dinesh');
    expect(result.warnings[0].percentage).toBe(0.75);
    expect(result.warnings[0].message).toContain('75%');
    expect(result.warnings[0].message).toContain('threshold: 50%');
  });

  it('does not warn when agent has exactly 50% (not >50%)', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Gilfoyle] Task B' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.balanced).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Custom threshold
  // ---------------------------------------------------------------------------

  it('respects custom dominanceThreshold', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Gilfoyle] Task C' }),
      makeTask({ title: '[Richard] Task D' }),
      makeTask({ title: '[Jared] Task E' }),
    ];
    // Dinesh has 40% — below 50% but above 30%
    const result = analyzeDistribution(tasks, { dominanceThreshold: 0.3 });

    expect(result.balanced).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].agent).toBe('dinesh');
  });

  it('flags no warnings with a very high threshold', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Gilfoyle] Task C' }),
    ];
    // Dinesh has 67% — below 90%
    const result = analyzeDistribution(tasks, { dominanceThreshold: 0.9 });

    expect(result.balanced).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Rebalancing suggestions
  // ---------------------------------------------------------------------------

  it('suggests rebalancing from overloaded to least-loaded agent', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Dinesh] Task C' }),
      makeTask({ title: '[Gilfoyle] Task D' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].from).toBe('dinesh');
    expect(result.suggestions[0].to).toBe('gilfoyle');
    expect(result.suggestions[0].reason).toContain('Rebalance');
  });

  it('suggests generic redistribution when only one named agent exists', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Dinesh] Task C' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].from).toBe('dinesh');
    expect(result.suggestions[0].to).toBe('other agents');
    expect(result.suggestions[0].reason).toContain('overloaded');
  });

  // ---------------------------------------------------------------------------
  // Distribution ordering
  // ---------------------------------------------------------------------------

  it('sorts distribution by task count descending', () => {
    const tasks = [
      makeTask({ title: '[Jared] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Dinesh] Task C' }),
      makeTask({ title: '[Dinesh] Task D' }),
      makeTask({ title: '[Gilfoyle] Task E' }),
      makeTask({ title: '[Gilfoyle] Task F' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.distribution[0].agent).toBe('dinesh');
    expect(result.distribution[0].taskCount).toBe(3);
    expect(result.distribution[1].agent).toBe('gilfoyle');
    expect(result.distribution[1].taskCount).toBe(2);
    expect(result.distribution[2].agent).toBe('jared');
    expect(result.distribution[2].taskCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Unassigned tasks
  // ---------------------------------------------------------------------------

  it('groups unassigned tasks separately', () => {
    const tasks = [
      makeTask({ title: 'Implement feature X' }),
      makeTask({ title: 'Fix bug Y' }),
      makeTask({ title: '[Dinesh] Task C' }),
    ];
    const result = analyzeDistribution(tasks);

    const unassigned = result.distribution.find(d => d.agent === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned!.taskCount).toBe(2);
  });

  it('does not suggest moving tasks to "unassigned"', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Dinesh] Task C' }),
      makeTask({ title: 'Unassigned task' }),
    ];
    const result = analyzeDistribution(tasks);

    for (const suggestion of result.suggestions) {
      expect(suggestion.to).not.toBe('unassigned');
    }
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles all tasks unassigned', () => {
    const tasks = [
      makeTask({ title: 'Task A' }),
      makeTask({ title: 'Task B' }),
      makeTask({ title: 'Task C' }),
    ];
    const result = analyzeDistribution(tasks);

    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0].agent).toBe('unassigned');
    expect(result.distribution[0].percentage).toBe(1.0);
    // Unassigned agent dominance should still be flagged
    expect(result.warnings).toHaveLength(1);
  });

  it('handles a single task', () => {
    const tasks = [makeTask({ title: '[Dinesh] Only task' })];
    const result = analyzeDistribution(tasks);

    expect(result.totalTasks).toBe(1);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0].percentage).toBe(1.0);
    expect(result.warnings).toHaveLength(1);
  });

  it('handles multiple overloaded agents (low threshold)', () => {
    const tasks = [
      makeTask({ title: '[Dinesh] Task A' }),
      makeTask({ title: '[Dinesh] Task B' }),
      makeTask({ title: '[Gilfoyle] Task C' }),
      makeTask({ title: '[Gilfoyle] Task D' }),
      makeTask({ title: '[Richard] Task E' }),
    ];
    // Both Dinesh (40%) and Gilfoyle (40%) are above 30%
    const result = analyzeDistribution(tasks, { dominanceThreshold: 0.3 });

    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.map(w => w.agent)).toContain('dinesh');
    expect(result.warnings.map(w => w.agent)).toContain('gilfoyle');
  });
});
