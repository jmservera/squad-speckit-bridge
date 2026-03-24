import { describe, it, expect } from 'vitest';
import { analyzeDistribution } from '../../src/types.js';
import type { AgentAssignment } from '../../src/types.js';

function assign(issueNumber: number, agentName: string): AgentAssignment {
  return { issueNumber, agentName, labels: [] };
}

describe('analyzeDistribution', () => {
  it('flags imbalance when one agent exceeds threshold', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'dinesh'),
      assign(3, 'gilfoyle'),
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.imbalanced).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].agentName).toBe('dinesh');
  });

  it('reports balanced when no agent exceeds threshold', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'gilfoyle'),
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.imbalanced).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('includes 0-assignment agents when availableAgents is provided', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'dinesh'),
    ];
    const result = analyzeDistribution(assignments, 0.5, ['dinesh', 'gilfoyle', 'jared']);
    expect(result.agentCounts['gilfoyle']).toBe(0);
    expect(result.agentCounts['jared']).toBe(0);
    // With 3 agents, ideal is 2/3 ≈ 0.67, dinesh has 100% → imbalanced
    expect(result.imbalanced).toBe(true);
    // Suggestions should target 0-assignment agents
    expect(result.suggestions.length).toBeGreaterThan(0);
    const toAgents = result.suggestions.map(s => s.toAgent);
    expect(toAgents).toContain('gilfoyle');
    expect(toAgents).toContain('jared');
  });

  it('handles empty assignments', () => {
    const result = analyzeDistribution([], 0.5);
    expect(result.totalIssues).toBe(0);
    expect(result.imbalanced).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('computes correct agentCounts and totalIssues', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'gilfoyle'),
      assign(3, 'dinesh'),
      assign(4, 'jared'),
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.agentCounts).toEqual({ dinesh: 2, gilfoyle: 1, jared: 1 });
    expect(result.totalIssues).toBe(4);
  });

  it('records correct threshold and percentage in warnings', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'dinesh'),
      assign(3, 'dinesh'),
      assign(4, 'gilfoyle'),
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.threshold).toBe(0.5);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].percentage).toBe(0.75);
    expect(result.warnings[0].assignedCount).toBe(3);
  });

  it('generates rebalance suggestions from over- to under-assigned', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'dinesh'),
      assign(3, 'dinesh'),
      assign(4, 'gilfoyle'),
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].fromAgent).toBe('dinesh');
    expect(result.suggestions[0].toAgent).toBe('gilfoyle');
  });

  it('uses default threshold of 0.5', () => {
    const assignments = [
      assign(1, 'dinesh'),
      assign(2, 'dinesh'),
      assign(3, 'gilfoyle'),
    ];
    const result = analyzeDistribution(assignments);
    expect(result.threshold).toBe(0.5);
    // dinesh has 2/3 ≈ 67% > 50%
    expect(result.imbalanced).toBe(true);
  });
});
