/**
 * Unit tests for T021: SummarizeContent use case
 *
 * Pure logic — no mocks needed. Tests progressive summarization,
 * budget enforcement, content compression, and recency filtering.
 */

import { describe, it, expect } from 'vitest';
import { summarizeContent, compressContent } from '../../src/bridge/summarizer.js';
import type { BridgeConfig, SkillEntry, DecisionEntry, LearningEntry } from '../../src/types.js';
import { createDefaultConfig } from '../../src/types.js';

function makeConfig(overrides?: Partial<BridgeConfig>): BridgeConfig {
  return { ...createDefaultConfig(), ...overrides };
}

function makeSkill(overrides?: Partial<SkillEntry>): SkillEntry {
  return {
    name: 'test-skill',
    context: 'Test skill context content.',
    patterns: ['Pattern A'],
    antiPatterns: ['Anti-pattern A'],
    rawSize: 100,
    ...overrides,
  };
}

function makeDecision(overrides?: Partial<DecisionEntry>): DecisionEntry {
  // Use a recent date to avoid being filtered by maxDecisionAgeDays
  const recent = new Date();
  recent.setDate(recent.getDate() - 5);
  return {
    title: 'Test Decision',
    date: recent.toISOString().slice(0, 10),
    status: 'Adopted',
    summary: 'A test decision summary.',
    relevanceScore: 0.8,
    fullContent: 'Full content of the test decision.',
    ...overrides,
  };
}

function makeLearning(overrides?: Partial<LearningEntry>): LearningEntry {
  return {
    agentName: 'test-agent',
    agentRole: 'Tester',
    entries: [
      {
        date: '2025-07-22',
        title: 'Test Learning',
        summary: 'Learned something about testing.',
      },
    ],
    rawSize: 100,
    ...overrides,
  };
}

describe('SummarizeContent', () => {
  it('produces ContextSummary with all sources', () => {
    const result = summarizeContent({
      skills: [makeSkill()],
      decisions: [makeDecision()],
      learnings: [makeLearning()],
      config: makeConfig(),
    });

    expect(result.metadata.sources.skills).toBe(1);
    expect(result.metadata.sources.decisions).toBe(1);
    expect(result.metadata.sources.histories).toBe(1);
    expect(result.content.skills).toHaveLength(1);
    expect(result.content.decisions).toHaveLength(1);
    expect(result.content.learnings).toHaveLength(1);
  });

  it('enforces contextMaxBytes budget', () => {
    const largeSkill = makeSkill({
      name: 'large-skill',
      context: 'x'.repeat(5000),
    });
    const config = makeConfig({ contextMaxBytes: 1024 });

    const result = summarizeContent({
      skills: [largeSkill],
      decisions: [makeDecision()],
      learnings: [makeLearning()],
      config,
    });

    expect(result.metadata.sizeBytes).toBeLessThanOrEqual(1024);
  });

  it('prioritizes skills over decisions over learnings', () => {
    const config = makeConfig({ contextMaxBytes: 800 });

    const result = summarizeContent({
      skills: [makeSkill({ context: 'x'.repeat(200) })],
      decisions: [makeDecision({ summary: 'y'.repeat(200) })],
      learnings: [makeLearning()],
      config,
    });

    // Skills should always be included first
    expect(result.content.skills.length).toBeGreaterThanOrEqual(1);
    expect(result.metadata.sizeBytes).toBeLessThanOrEqual(800);
  });

  it('handles empty sources gracefully', () => {
    const result = summarizeContent({
      skills: [],
      decisions: [],
      learnings: [],
      config: makeConfig(),
    });

    expect(result.metadata.sources.skills).toBe(0);
    expect(result.metadata.sources.decisions).toBe(0);
    expect(result.metadata.sources.histories).toBe(0);
    expect(result.content.skills).toHaveLength(0);
    expect(result.content.decisions).toHaveLength(0);
    expect(result.content.learnings).toHaveLength(0);
  });

  it('respects source toggles in config', () => {
    const config = makeConfig();
    config.sources.decisions = false;
    config.sources.histories = false;

    const result = summarizeContent({
      skills: [makeSkill()],
      decisions: [makeDecision()],
      learnings: [makeLearning()],
      config,
    });

    expect(result.content.skills).toHaveLength(1);
    expect(result.content.decisions).toHaveLength(0);
    expect(result.content.learnings).toHaveLength(0);
  });

  it('filters decisions by maxDecisionAgeDays', () => {
    const config = makeConfig();
    config.summarization.maxDecisionAgeDays = 30;

    const recent = makeDecision({
      title: 'Recent',
      date: new Date().toISOString().slice(0, 10),
    });
    const old = makeDecision({
      title: 'Old',
      date: '2020-01-01',
    });

    const result = summarizeContent({
      skills: [],
      decisions: [recent, old],
      learnings: [],
      config,
    });

    expect(result.content.decisions.some((d) => d.title === 'Recent')).toBe(true);
    expect(result.content.decisions.some((d) => d.title === 'Old')).toBe(false);
  });

  it('sorts decisions by relevance score (most recent first)', () => {
    const config = makeConfig();
    config.summarization.maxDecisionAgeDays = 365;

    const older = makeDecision({
      title: 'Older',
      date: '2025-01-01',
    });
    const newer = makeDecision({
      title: 'Newer',
      date: new Date().toISOString().slice(0, 10),
    });

    const result = summarizeContent({
      skills: [],
      decisions: [older, newer],
      learnings: [],
      config,
    });

    if (result.content.decisions.length >= 2) {
      expect(result.content.decisions[0].title).toBe('Newer');
    }
  });

  it('records skipped entries when budget exceeded', () => {
    // Budget smaller than overhead (300) + any content
    const config = makeConfig({ contextMaxBytes: 200 });

    const result = summarizeContent({
      skills: [
        makeSkill({
          name: 'big',
          context: 'x'.repeat(2000),
          patterns: [],
          antiPatterns: [],
        }),
      ],
      decisions: [],
      learnings: [],
      config,
    });

    expect(result.metadata.sources.skipped.length).toBeGreaterThan(0);
  });
});

describe('compressContent', () => {
  it('keeps first paragraph and bullet lists', () => {
    const input = `First paragraph of content.

Second paragraph with more details that should be removed.

- Bullet item 1
- Bullet item 2

Another paragraph to remove.

* Star bullet item`;

    const result = compressContent(input);
    expect(result).toContain('First paragraph');
    expect(result).toContain('Bullet item 1');
    expect(result).toContain('Star bullet item');
    expect(result).not.toContain('Second paragraph');
    expect(result).not.toContain('Another paragraph');
  });

  it('returns full text if no paragraph break', () => {
    const input = 'Single paragraph with no breaks.';
    expect(compressContent(input)).toBe(input);
  });
});
