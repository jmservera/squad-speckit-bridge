/**
 * T014: analyzeDistribution — Pure function for task distribution analysis
 *
 * Detects when one agent has >threshold% of tasks and emits
 * rebalancing suggestions. No I/O — takes task list, returns analysis.
 */

import type { TaskEntry } from '../types.js';

export interface DistributionConfig {
  /** Fraction (0–1) above which an agent is flagged as overloaded. Default: 0.5 */
  dominanceThreshold: number;
}

export interface AgentShare {
  agent: string;
  taskCount: number;
  percentage: number;
}

export interface DistributionWarning {
  agent: string;
  percentage: number;
  message: string;
}

export interface RebalanceSuggestion {
  from: string;
  to: string;
  reason: string;
}

export interface DistributionAnalysis {
  totalTasks: number;
  distribution: AgentShare[];
  warnings: DistributionWarning[];
  suggestions: RebalanceSuggestion[];
  balanced: boolean;
}

const DEFAULT_CONFIG: DistributionConfig = {
  dominanceThreshold: 0.5,
};

/**
 * Extracts an agent/assignee name from a task.
 * Convention: tasks with an assigned agent use the title prefix "AgentName: ..."
 * or a bracketed tag like "[AgentName]" in the title.
 * Falls back to 'unassigned' if no agent can be detected.
 */
export function extractAgent(task: TaskEntry): string {
  // Check for bracketed tag: [AgentName]
  const bracketMatch = task.title.match(/^\[([^\]]+)\]/);
  if (bracketMatch) {
    return bracketMatch[1].trim().toLowerCase();
  }

  // Check for "AgentName:" prefix (but not task IDs like "T001:")
  const colonMatch = task.title.match(/^([A-Za-z][A-Za-z0-9 _-]+):/);
  if (colonMatch) {
    const candidate = colonMatch[1].trim();
    // Reject if it looks like a task ID (e.g., "T001", "Task 1")
    if (/^T\d+$/i.test(candidate) || /^Task\s+\d+$/i.test(candidate)) {
      return 'unassigned';
    }
    return candidate.toLowerCase();
  }

  return 'unassigned';
}

/**
 * Analyzes task distribution across agents and produces warnings
 * when any single agent holds more than the configured threshold of tasks.
 *
 * Pure function — no I/O, no side effects.
 */
export function analyzeDistribution(
  tasks: TaskEntry[],
  config: Partial<DistributionConfig> = {},
): DistributionAnalysis {
  const { dominanceThreshold } = { ...DEFAULT_CONFIG, ...config };

  if (tasks.length === 0) {
    return {
      totalTasks: 0,
      distribution: [],
      warnings: [],
      suggestions: [],
      balanced: true,
    };
  }

  // Count tasks per agent
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const agent = extractAgent(task);
    counts.set(agent, (counts.get(agent) ?? 0) + 1);
  }

  // Build sorted distribution (highest count first)
  const distribution: AgentShare[] = [...counts.entries()]
    .map(([agent, taskCount]) => ({
      agent,
      taskCount,
      percentage: taskCount / tasks.length,
    }))
    .sort((a, b) => b.taskCount - a.taskCount);

  // Detect overloaded agents
  const warnings: DistributionWarning[] = [];
  for (const share of distribution) {
    if (share.percentage > dominanceThreshold) {
      const pct = Math.round(share.percentage * 100);
      warnings.push({
        agent: share.agent,
        percentage: share.percentage,
        message: `Agent "${share.agent}" holds ${pct}% of tasks (threshold: ${Math.round(dominanceThreshold * 100)}%).`,
      });
    }
  }

  // Generate rebalancing suggestions
  const suggestions = generateSuggestions(distribution, dominanceThreshold);

  return {
    totalTasks: tasks.length,
    distribution,
    warnings,
    suggestions,
    balanced: warnings.length === 0,
  };
}

/**
 * Generates rebalancing suggestions when overloaded agents are detected.
 * Suggests moving tasks from the most-loaded agent to the least-loaded.
 */
function generateSuggestions(
  distribution: AgentShare[],
  threshold: number,
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];

  const overloaded = distribution.filter(s => s.percentage > threshold);
  const underloaded = distribution.filter(
    s => s.percentage <= threshold && s.agent !== 'unassigned',
  );

  for (const heavy of overloaded) {
    if (underloaded.length > 0) {
      // Suggest redistribution to the least-loaded named agent
      const lightest = underloaded[underloaded.length - 1];
      suggestions.push({
        from: heavy.agent,
        to: lightest.agent,
        reason: `Rebalance: "${heavy.agent}" has ${heavy.taskCount} tasks; consider moving some to "${lightest.agent}" (${lightest.taskCount} tasks).`,
      });
    } else if (heavy.agent !== 'unassigned') {
      suggestions.push({
        from: heavy.agent,
        to: 'other agents',
        reason: `Agent "${heavy.agent}" is overloaded with ${heavy.taskCount}/${distribution.reduce((s, d) => s + d.taskCount, 0)} tasks. Consider distributing to additional team members.`,
      });
    }
  }

  return suggestions;
}
