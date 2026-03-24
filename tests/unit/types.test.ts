import { describe, it, expect } from 'vitest';
import {
  isValidConfig,
  computeRelevanceScore,
  compareSeverity,
  isHighSeverity,
  categorizeFindings,
  createDefaultConfig,
  analyzeDistribution,
  matchSkillsToTask,
} from '../../src/types.js';
import type {
  BridgeConfig,
  DecisionEntry,
  ReviewFinding,
  AgentAssignment,
  DistributionAnalysis,
  DistributionWarning,
  RebalanceSuggestion,
  SkillMatch,
  SkillInjection,
  DeadCodeEntry,
  DeadCodeReport,
  SpecRequirement,
  RequirementCoverage,
  ImplementationReview,
  TaskEntry,
  SkillEntry,
} from '../../src/types.js';

// Helper factories

function makeConfig(overrides: Partial<BridgeConfig> = {}): BridgeConfig {
  return { ...createDefaultConfig(), ...overrides };
}

function makeDecision(overrides: Partial<DecisionEntry> = {}): DecisionEntry {
  return {
    title: 'Test Decision',
    date: '2025-07-01',
    status: 'Active',
    summary: 'A test decision',
    relevanceScore: 0,
    fullContent: 'Full content here',
    ...overrides,
  };
}

function makeFinding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    type: 'risk',
    severity: 'medium',
    description: 'Test finding',
    reference: 'ref',
    recommendation: 'Fix it',
    ...overrides,
  };
}

// T006: isValidConfig

describe('isValidConfig', () => {
  it('accepts default config', () => {
    expect(isValidConfig(createDefaultConfig())).toBe(true);
  });

  it('accepts contextMaxBytes at lower bound (1)', () => {
    const config = makeConfig({ contextMaxBytes: 1 });
    expect(isValidConfig(config)).toBe(true);
  });

  it('accepts contextMaxBytes at upper bound (32768)', () => {
    const config = makeConfig({ contextMaxBytes: 32768 });
    expect(isValidConfig(config)).toBe(true);
  });

  it('rejects contextMaxBytes of 0', () => {
    const config = makeConfig({ contextMaxBytes: 0 });
    expect(isValidConfig(config)).toBe(false);
  });

  it('rejects negative contextMaxBytes', () => {
    const config = makeConfig({ contextMaxBytes: -100 });
    expect(isValidConfig(config)).toBe(false);
  });

  it('rejects contextMaxBytes over 32768', () => {
    const config = makeConfig({ contextMaxBytes: 32769 });
    expect(isValidConfig(config)).toBe(false);
  });

  it('accepts recencyBiasWeight of 0.0', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, recencyBiasWeight: 0.0 };
    expect(isValidConfig(config)).toBe(true);
  });

  it('accepts recencyBiasWeight of 1.0', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, recencyBiasWeight: 1.0 };
    expect(isValidConfig(config)).toBe(true);
  });

  it('rejects recencyBiasWeight below 0', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, recencyBiasWeight: -0.1 };
    expect(isValidConfig(config)).toBe(false);
  });

  it('rejects recencyBiasWeight above 1', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, recencyBiasWeight: 1.1 };
    expect(isValidConfig(config)).toBe(false);
  });

  it('rejects maxDecisionAgeDays of 0', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, maxDecisionAgeDays: 0 };
    expect(isValidConfig(config)).toBe(false);
  });

  it('rejects negative maxDecisionAgeDays', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, maxDecisionAgeDays: -5 };
    expect(isValidConfig(config)).toBe(false);
  });

  it('accepts maxDecisionAgeDays of 1', () => {
    const config = makeConfig();
    config.summarization = { ...config.summarization, maxDecisionAgeDays: 1 };
    expect(isValidConfig(config)).toBe(true);
  });
});

// T007: computeRelevanceScore

describe('computeRelevanceScore', () => {
  it('returns ~1.0 for a decision made today', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2025-07-24' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeCloseTo(1.0, 2);
  });

  it('returns ~0.5 at 90-day half-life', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2025-04-25' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeCloseTo(0.5, 1);
  });

  it('returns score > 0.5 for recent decisions (<90 days)', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2025-07-01' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1.0);
  });

  it('returns score < 0.5 for old decisions (>90 days)', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2025-01-01' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeLessThan(0.5);
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0.5 (neutral) for unparseable date', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: 'not-a-date' });
    expect(computeRelevanceScore(decision, now)).toBe(0.5);
  });

  it('returns 0.5 for empty date string', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '' });
    expect(computeRelevanceScore(decision, now)).toBe(0.5);
  });

  it('returns value clamped to [0, 1]', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2020-01-01' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('handles future dates gracefully', () => {
    const now = new Date('2025-07-24');
    const decision = makeDecision({ date: '2025-12-31' });
    const score = computeRelevanceScore(decision, now);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// T008: ReviewFinding helpers

describe('compareSeverity', () => {
  it('sorts high before medium', () => {
    const high = makeFinding({ severity: 'high' });
    const medium = makeFinding({ severity: 'medium' });
    expect(compareSeverity(high, medium)).toBeLessThan(0);
  });

  it('sorts medium before low', () => {
    const medium = makeFinding({ severity: 'medium' });
    const low = makeFinding({ severity: 'low' });
    expect(compareSeverity(medium, low)).toBeLessThan(0);
  });

  it('returns 0 for equal severity', () => {
    const a = makeFinding({ severity: 'high' });
    const b = makeFinding({ severity: 'high' });
    expect(compareSeverity(a, b)).toBe(0);
  });

  it('works as Array.sort comparator', () => {
    const findings = [
      makeFinding({ severity: 'low', description: 'low' }),
      makeFinding({ severity: 'high', description: 'high' }),
      makeFinding({ severity: 'medium', description: 'medium' }),
    ];
    const sorted = [...findings].sort(compareSeverity);
    expect(sorted[0].severity).toBe('high');
    expect(sorted[1].severity).toBe('medium');
    expect(sorted[2].severity).toBe('low');
  });
});

describe('isHighSeverity', () => {
  it('returns true for high severity', () => {
    expect(isHighSeverity(makeFinding({ severity: 'high' }))).toBe(true);
  });

  it('returns false for medium severity', () => {
    expect(isHighSeverity(makeFinding({ severity: 'medium' }))).toBe(false);
  });

  it('returns false for low severity', () => {
    expect(isHighSeverity(makeFinding({ severity: 'low' }))).toBe(false);
  });
});

describe('categorizeFindings', () => {
  it('returns empty arrays for empty input', () => {
    const result = categorizeFindings([]);
    expect(result.missing_task).toEqual([]);
    expect(result.risk).toEqual([]);
    expect(result.ordering).toEqual([]);
    expect(result.decision_conflict).toEqual([]);
    expect(result.scope).toEqual([]);
  });

  it('groups findings by type', () => {
    const findings: ReviewFinding[] = [
      makeFinding({ type: 'risk', description: 'risk-1' }),
      makeFinding({ type: 'scope', description: 'scope-1' }),
      makeFinding({ type: 'risk', description: 'risk-2' }),
      makeFinding({ type: 'missing_task', description: 'missing-1' }),
    ];
    const result = categorizeFindings(findings);
    expect(result.risk).toHaveLength(2);
    expect(result.scope).toHaveLength(1);
    expect(result.missing_task).toHaveLength(1);
    expect(result.ordering).toHaveLength(0);
    expect(result.decision_conflict).toHaveLength(0);
  });

  it('preserves finding objects (no cloning)', () => {
    const finding = makeFinding({ type: 'ordering' });
    const result = categorizeFindings([finding]);
    expect(result.ordering[0]).toBe(finding);
  });
});

// T010: createDefaultConfig

describe('createDefaultConfig', () => {
  it('returns a valid config', () => {
    expect(isValidConfig(createDefaultConfig())).toBe(true);
  });

  it('sets contextMaxBytes to 8192', () => {
    expect(createDefaultConfig().contextMaxBytes).toBe(8192);
  });

  it('enables all sources by default', () => {
    const config = createDefaultConfig();
    expect(config.sources.skills).toBe(true);
    expect(config.sources.decisions).toBe(true);
    expect(config.sources.histories).toBe(true);
  });

  it('sets recencyBiasWeight to 0.7', () => {
    expect(createDefaultConfig().summarization.recencyBiasWeight).toBe(0.7);
  });

  it('sets maxDecisionAgeDays to 90', () => {
    expect(createDefaultConfig().summarization.maxDecisionAgeDays).toBe(90);
  });

  it('enables afterTasks hook', () => {
    expect(createDefaultConfig().hooks.afterTasks).toBe(true);
  });

  it('sets squadDir to .squad', () => {
    expect(createDefaultConfig().paths.squadDir).toBe('.squad');
  });

  it('sets specifyDir to .specify', () => {
    expect(createDefaultConfig().paths.specifyDir).toBe('.specify');
  });

  it('returns independent objects (no shared references)', () => {
    const a = createDefaultConfig();
    const b = createDefaultConfig();
    a.contextMaxBytes = 1;
    expect(b.contextMaxBytes).toBe(8192);
  });
});

// T001: Entity type shape tests

describe('T001: New entity types', () => {
  it('AgentAssignment has correct shape', () => {
    const a: AgentAssignment = { issueNumber: 1, agentName: 'gilfoyle', labels: ['bug'] };
    expect(a.issueNumber).toBe(1);
    expect(a.agentName).toBe('gilfoyle');
    expect(a.labels).toEqual(['bug']);
  });

  it('DistributionWarning has correct shape', () => {
    const w: DistributionWarning = { agentName: 'dinesh', assignedCount: 5, percentage: 0.6, message: 'overloaded' };
    expect(w.percentage).toBe(0.6);
  });

  it('RebalanceSuggestion has correct shape', () => {
    const s: RebalanceSuggestion = { fromAgent: 'dinesh', toAgent: 'gilfoyle', issueNumbers: [1, 2], rationale: 'balance' };
    expect(s.issueNumbers).toHaveLength(2);
  });

  it('SkillMatch has correct shape', () => {
    const m: SkillMatch = { skillName: 'clean-arch', relevanceScore: 0.8, matchedKeywords: ['bridge'], contentSize: 500 };
    expect(m.relevanceScore).toBe(0.8);
  });

  it('SkillInjection has correct shape', () => {
    const inj: SkillInjection = {
      taskId: 'T001',
      injectedSkills: [],
      totalContentSize: 0,
      truncated: false,
      budgetBytes: 8192,
    };
    expect(inj.truncated).toBe(false);
  });

  it('DeadCodeEntry has correct shape', () => {
    const e: DeadCodeEntry = {
      filePath: 'src/foo.ts',
      exportName: 'unusedFn',
      lineRange: [10, 20],
      category: 'unused_export',
      associatedCommand: null,
    };
    expect(e.lineRange).toEqual([10, 20]);
    expect(e.category).toBe('unused_export');
  });

  it('DeadCodeReport has correct shape', () => {
    const r: DeadCodeReport = {
      entries: [],
      totalLines: 100,
      exercisedLines: 40,
      removedLines: 10,
      baselineCoverage: 0.6,
      finalCoverage: 0.8,
    };
    expect(r.finalCoverage).toBeGreaterThan(r.baselineCoverage);
  });

  it('SpecRequirement has correct shape', () => {
    const req: SpecRequirement = { id: 'FR-001', text: 'Must generate context', category: 'Context Generation' };
    expect(req.id).toBe('FR-001');
  });

  it('RequirementCoverage has correct shape', () => {
    const cov: RequirementCoverage = {
      requirement: { id: 'FR-001', text: 'test', category: 'cat' },
      covered: true,
      evidence: ['src/context.ts'],
      gaps: [],
    };
    expect(cov.covered).toBe(true);
  });

  it('ImplementationReview has correct shape', () => {
    const rev: ImplementationReview = {
      specPath: 'specs/001/spec.md',
      implementationDir: 'src/',
      requirements: [],
      coveragePercent: 100,
      timestamp: '2025-07-24T00:00:00Z',
      summary: 'All covered',
    };
    expect(rev.coveragePercent).toBe(100);
  });
});

// T001: analyzeDistribution

describe('analyzeDistribution', () => {
  function makeAssignments(counts: Record<string, number>): AgentAssignment[] {
    const result: AgentAssignment[] = [];
    let issueNum = 1;
    for (const [agent, count] of Object.entries(counts)) {
      for (let i = 0; i < count; i++) {
        result.push({ issueNumber: issueNum++, agentName: agent, labels: [] });
      }
    }
    return result;
  }

  it('returns empty analysis for no assignments', () => {
    const result = analyzeDistribution([]);
    expect(result.totalIssues).toBe(0);
    expect(result.imbalanced).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it('detects balanced distribution', () => {
    const assignments = makeAssignments({ gilfoyle: 3, dinesh: 3, richard: 4 });
    const result = analyzeDistribution(assignments);
    expect(result.totalIssues).toBe(10);
    expect(result.imbalanced).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects imbalanced distribution exceeding threshold', () => {
    const assignments = makeAssignments({ gilfoyle: 8, dinesh: 1, richard: 1 });
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.imbalanced).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].agentName).toBe('gilfoyle');
    expect(result.warnings[0].percentage).toBe(0.8);
  });

  it('uses default threshold of 0.5', () => {
    const assignments = makeAssignments({ gilfoyle: 6, dinesh: 4 });
    const result = analyzeDistribution(assignments);
    expect(result.threshold).toBe(0.5);
    expect(result.imbalanced).toBe(true);
    expect(result.warnings[0].agentName).toBe('gilfoyle');
  });

  it('generates rebalance suggestions for imbalanced distributions', () => {
    const assignments = makeAssignments({ gilfoyle: 8, dinesh: 2 });
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].fromAgent).toBe('gilfoyle');
    expect(result.suggestions[0].toAgent).toBe('dinesh');
    expect(result.suggestions[0].issueNumbers.length).toBeGreaterThan(0);
  });

  it('handles single agent (all issues to one agent)', () => {
    const assignments = makeAssignments({ gilfoyle: 5 });
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.imbalanced).toBe(true);
    // No suggestions when only one agent
    expect(result.suggestions).toHaveLength(0);
  });

  it('correctly counts per-agent issues', () => {
    const assignments = makeAssignments({ a: 2, b: 3, c: 1 });
    const result = analyzeDistribution(assignments);
    expect(result.agentCounts).toEqual({ a: 2, b: 3, c: 1 });
  });

  it('warning message includes percentage and threshold', () => {
    const assignments = makeAssignments({ over: 6, under: 1 });
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.warnings[0].message).toContain('86%');
    expect(result.warnings[0].message).toContain('50%');
  });

  it('custom threshold of 1.0 never triggers warnings', () => {
    const assignments = makeAssignments({ gilfoyle: 10 });
    const result = analyzeDistribution(assignments, 1.0);
    expect(result.imbalanced).toBe(false);
  });

  it('strict threshold catches mild imbalance', () => {
    const assignments = makeAssignments({ a: 4, b: 3, c: 3 });
    const result = analyzeDistribution(assignments, 0.3);
    expect(result.imbalanced).toBe(true);
    expect(result.warnings[0].agentName).toBe('a');
  });
});

// T001: matchSkillsToTask

describe('matchSkillsToTask', () => {
  function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
    return {
      id: 'T001',
      title: 'Implement bridge context generation',
      description: 'Build the context summary generator with clean architecture patterns',
      dependencies: [],
      status: 'pending',
      ...overrides,
    };
  }

  function makeSkill(overrides: Partial<SkillEntry> = {}): SkillEntry {
    return {
      name: 'clean-architecture',
      context: 'Bridge project structure',
      patterns: ['dependency injection', 'port interfaces'],
      antiPatterns: ['direct import'],
      rawSize: 1000,
      ...overrides,
    };
  }

  it('returns empty array when no skills match', () => {
    const task = makeTask({ title: 'unrelated xyz', description: 'nothing here' });
    const skills = [makeSkill({ name: 'database', context: 'sql', patterns: ['orm'], antiPatterns: ['raw'] })];
    const result = matchSkillsToTask(task, skills);
    expect(result).toEqual([]);
  });

  it('matches skills by keyword overlap', () => {
    const task = makeTask({ title: 'clean architecture bridge', description: 'patterns for context' });
    const skill = makeSkill({ name: 'clean-architecture', patterns: ['clean', 'bridge', 'context'] });
    const result = matchSkillsToTask(task, [skill]);
    expect(result).toHaveLength(1);
    expect(result[0].skillName).toBe('clean-architecture');
    expect(result[0].matchedKeywords.length).toBeGreaterThan(0);
  });

  it('returns results sorted by relevance score descending', () => {
    const task = makeTask({ title: 'bridge context clean arch', description: 'patterns injection' });
    const high = makeSkill({ name: 'high-match', patterns: ['bridge', 'context', 'clean', 'patterns', 'injection'], antiPatterns: [], rawSize: 500 });
    const low = makeSkill({ name: 'low-match', patterns: ['bridge'], antiPatterns: [], context: 'unrelated stuff', rawSize: 200 });
    const result = matchSkillsToTask(task, [low, high]);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].relevanceScore).toBeGreaterThanOrEqual(result[1].relevanceScore);
  });

  it('relevance score is between 0 and 1', () => {
    const task = makeTask();
    const skill = makeSkill();
    const result = matchSkillsToTask(task, [skill]);
    for (const m of result) {
      expect(m.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(m.relevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('includes contentSize from skill rawSize', () => {
    const task = makeTask({ title: 'bridge', description: 'context' });
    const skill = makeSkill({ name: 'test-skill', patterns: ['bridge'], rawSize: 4096 });
    const result = matchSkillsToTask(task, [skill]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].contentSize).toBe(4096);
  });

  it('handles empty skills array', () => {
    const result = matchSkillsToTask(makeTask(), []);
    expect(result).toEqual([]);
  });

  it('ignores short words (<=2 chars)', () => {
    const task = makeTask({ title: 'an is to', description: 'do it be' });
    const skill = makeSkill({ patterns: ['an', 'is', 'to'], antiPatterns: [] });
    const result = matchSkillsToTask(task, [skill]);
    // Only matches on words > 2 chars
    const shortOnly = result.filter(m => m.matchedKeywords.every(k => k.length <= 2));
    expect(shortOnly).toHaveLength(0);
  });

  it('matching is case-insensitive', () => {
    const task = makeTask({ title: 'BRIDGE Context', description: 'PATTERNS' });
    const skill = makeSkill({ patterns: ['bridge', 'context', 'patterns'] });
    const result = matchSkillsToTask(task, [skill]);
    expect(result.length).toBeGreaterThan(0);
  });
});
