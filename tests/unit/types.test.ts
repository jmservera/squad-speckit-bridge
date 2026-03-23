import { describe, it, expect } from 'vitest';
import {
  isValidConfig,
  computeRelevanceScore,
  compareSeverity,
  isHighSeverity,
  categorizeFindings,
  createDefaultConfig,
} from '../../src/types.js';
import type {
  BridgeConfig,
  DecisionEntry,
  ReviewFinding,
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
