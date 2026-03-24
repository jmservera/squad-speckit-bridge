import { describe, it, expect } from 'vitest';
import {
  matchSkillsToTask,
  extractKeywords,
  scoreSkillRelevance,
  truncateToBytes,
} from '../../src/bridge/skill-matcher.js';
import type { SkillEntry } from '../../src/types.js';

function makeSkill(overrides: Partial<SkillEntry> = {}): SkillEntry {
  return {
    name: 'test-skill',
    context: 'Test skill context about testing patterns.',
    patterns: ['Write unit tests first'],
    antiPatterns: ['Skip tests for speed'],
    rawSize: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractKeywords
// ---------------------------------------------------------------------------

describe('extractKeywords', () => {
  it('extracts meaningful tokens from text', () => {
    const kws = extractKeywords('Implement JWT authentication module');
    expect(kws).toContain('jwt');
    expect(kws).toContain('authentication');
    expect(kws).toContain('module');
  });

  it('filters stop words', () => {
    const kws = extractKeywords('Create a new API for the users');
    expect(kws).not.toContain('a');
    expect(kws).not.toContain('the');
    expect(kws).not.toContain('for');
    expect(kws).toContain('api');
    expect(kws).toContain('users');
  });

  it('removes short tokens (< 3 chars)', () => {
    const kws = extractKeywords('Go to DB and fix it');
    expect(kws).not.toContain('go');
    expect(kws).not.toContain('db');
    expect(kws).not.toContain('it');
    expect(kws).toContain('fix');
  });

  it('deduplicates tokens', () => {
    const kws = extractKeywords('test test test pattern');
    expect(kws.filter(k => k === 'test')).toHaveLength(1);
  });

  it('returns empty array for empty string', () => {
    expect(extractKeywords('')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// scoreSkillRelevance
// ---------------------------------------------------------------------------

describe('scoreSkillRelevance', () => {
  it('returns high score when all keywords match', () => {
    const skill = makeSkill({
      name: 'testing-patterns',
      context: 'Unit testing and integration testing patterns for APIs.',
      patterns: ['test-driven development'],
    });
    const kws = ['testing', 'patterns', 'apis'];
    const result = scoreSkillRelevance(kws, skill);

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.matchedKeywords).toContain('testing');
    expect(result.matchedKeywords).toContain('patterns');
  });

  it('returns 0 when no keywords match', () => {
    const skill = makeSkill({
      name: 'database',
      context: 'PostgreSQL and Redis caching strategies.',
    });
    const kws = ['authentication', 'jwt', 'tokens'];
    const result = scoreSkillRelevance(kws, skill);

    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it('returns 0 for empty keyword list', () => {
    const skill = makeSkill();
    const result = scoreSkillRelevance([], skill);
    expect(result.score).toBe(0);
  });

  it('matches against patterns and antiPatterns', () => {
    const skill = makeSkill({
      name: 'ci-pipelines',
      context: 'Basic CI setup.',
      patterns: ['automated deployment pipeline'],
      antiPatterns: ['manual releases without verification'],
    });
    const kws = ['deployment', 'pipeline', 'verification'];
    const result = scoreSkillRelevance(kws, skill);

    expect(result.matchedKeywords).toContain('deployment');
    expect(result.matchedKeywords).toContain('pipeline');
    expect(result.matchedKeywords).toContain('verification');
    expect(result.score).toBe(1.0);
  });

  it('does NOT match partial substrings (word boundary matching)', () => {
    const skill = makeSkill({
      name: 'auth-service',
      context: 'Handle user authentication and authorization tokens.',
      patterns: ['Use JWT bearer tokens'],
      antiPatterns: [],
    });
    // "cat" should NOT match "authentication" or "concatenation"
    const result = scoreSkillRelevance(['cat'], skill);
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it('matches exact whole words only', () => {
    const skill = makeSkill({
      name: 'api-gateway',
      context: 'The API gateway handles routing.',
      patterns: [],
      antiPatterns: [],
    });
    const result = scoreSkillRelevance(['api', 'gateway'], skill);
    expect(result.score).toBe(1.0);
    expect(result.matchedKeywords).toContain('api');
    expect(result.matchedKeywords).toContain('gateway');
  });
});

// ---------------------------------------------------------------------------
// truncateToBytes
// ---------------------------------------------------------------------------

describe('truncateToBytes', () => {
  it('returns full text when within budget', () => {
    const text = 'Hello world';
    expect(truncateToBytes(text, 1000)).toBe(text);
  });

  it('truncates at line boundaries', () => {
    const text = 'Line one\nLine two\nLine three\nLine four';
    const result = truncateToBytes(text, 20);
    expect(result).toContain('Line one');
    expect(result).not.toContain('Line four');
  });

  it('returns empty string for zero budget', () => {
    expect(truncateToBytes('Hello', 0)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// matchSkillsToTask — core pipeline
// ---------------------------------------------------------------------------

describe('matchSkillsToTask', () => {
  it('returns empty result for empty skills array', () => {
    const result = matchSkillsToTask('Implement auth', []);
    expect(result.matches).toHaveLength(0);
    expect(result.prompt).toBe('');
    expect(result.totalSkills).toBe(0);
    expect(result.includedSkills).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it('returns empty result for empty task description', () => {
    const result = matchSkillsToTask('', [makeSkill()]);
    expect(result.matches).toHaveLength(0);
    expect(result.prompt).toBe('');
  });

  it('matches relevant skills to a task', () => {
    const skills = [
      makeSkill({
        name: 'api-design',
        context: 'REST API design patterns with authentication and JWT tokens.',
        patterns: ['Use bearer tokens for API auth'],
      }),
      makeSkill({
        name: 'database',
        context: 'PostgreSQL schema design and query optimization.',
        patterns: ['Normalize to 3NF'],
      }),
    ];

    const result = matchSkillsToTask(
      'Design the REST API authentication with JWT bearer tokens',
      skills,
    );

    expect(result.includedSkills).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].skill.name).toBe('api-design');
    expect(result.matches[0].relevance).toBeGreaterThan(0);
  });

  it('sorts matches by relevance descending', () => {
    const skills = [
      makeSkill({
        name: 'low-match',
        context: 'Generic infrastructure tooling.',
      }),
      makeSkill({
        name: 'high-match',
        context: 'TypeScript testing with vitest and unit test patterns.',
        patterns: ['Test-driven development', 'Unit test coverage'],
      }),
    ];

    const result = matchSkillsToTask(
      'Write unit tests for TypeScript modules using vitest',
      skills,
    );

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].skill.name).toBe('high-match');
  });

  it('filters skills below minRelevance threshold', () => {
    const skills = [
      makeSkill({
        name: 'unrelated',
        context: 'Quantum computing and protein folding simulations.',
      }),
    ];

    const result = matchSkillsToTask('Build a REST API endpoint', skills, {
      minRelevance: 0.1,
    });

    expect(result.matches).toHaveLength(0);
    expect(result.includedSkills).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Context-window budget enforcement
  // ---------------------------------------------------------------------------

  it('enforces maxContextBytes budget (8KB default)', () => {
    const bigContext = 'x'.repeat(5000);
    const skills = [
      makeSkill({ name: 'skill-a', context: `Alpha testing ${bigContext}` }),
      makeSkill({ name: 'skill-b', context: `Beta testing ${bigContext}` }),
      makeSkill({ name: 'skill-c', context: `Gamma testing ${bigContext}` }),
    ];

    const result = matchSkillsToTask('Alpha Beta Gamma testing skills', skills);

    expect(result.contextBytes).toBeLessThanOrEqual(8192);
    expect(result.maxContextBytes).toBe(8192);
  });

  it('sets truncated flag when skills are cut off', () => {
    const bigContext = 'y'.repeat(6000);
    const skills = [
      makeSkill({ name: 'skill-a', context: `Relevant testing ${bigContext}` }),
      makeSkill({ name: 'skill-b', context: `Relevant patterns ${bigContext}` }),
    ];

    const result = matchSkillsToTask('Relevant testing patterns', skills);

    expect(result.truncated).toBe(true);
  });

  it('respects configurable maxContextBytes up to 32KB', () => {
    const bigContext = 'z'.repeat(10000);
    const skills = [
      makeSkill({ name: 'skill-a', context: `Relevant testing ${bigContext}` }),
      makeSkill({ name: 'skill-b', context: `Relevant patterns ${bigContext}` }),
      makeSkill({ name: 'skill-c', context: `Relevant design ${bigContext}` }),
    ];

    const result = matchSkillsToTask('Relevant testing patterns design', skills, {
      maxContextBytes: 32768,
    });

    expect(result.contextBytes).toBeLessThanOrEqual(32768);
    expect(result.maxContextBytes).toBe(32768);
    expect(result.includedSkills).toBeGreaterThanOrEqual(2);
  });

  it('caps maxContextBytes at 32768 even if higher is requested', () => {
    const result = matchSkillsToTask('test', [makeSkill()], {
      maxContextBytes: 99999,
    });

    expect(result.maxContextBytes).toBe(32768);
  });

  // ---------------------------------------------------------------------------
  // Prompt rendering
  // ---------------------------------------------------------------------------

  it('renders prompt with skill blocks including patterns', () => {
    const skills = [
      makeSkill({
        name: 'api-design',
        context: 'API design with REST patterns.',
        patterns: ['RESTful resource naming'],
        antiPatterns: ['Deeply nested routes'],
      }),
    ];

    const result = matchSkillsToTask('REST API design patterns resource naming', skills);

    expect(result.prompt).toContain('## Relevant Skills');
    expect(result.prompt).toContain('### api-design');
    expect(result.prompt).toContain('**Patterns:**');
    expect(result.prompt).toContain('RESTful resource naming');
    expect(result.prompt).toContain('**Anti-patterns:**');
    expect(result.prompt).toContain('Deeply nested routes');
  });

  it('includes relevance percentage in prompt', () => {
    const skills = [
      makeSkill({
        name: 'testing',
        context: 'Unit testing patterns for TypeScript modules.',
      }),
    ];

    const result = matchSkillsToTask('TypeScript unit testing modules', skills);

    expect(result.prompt).toMatch(/relevance: \d+%/);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles skills with empty context gracefully', () => {
    const skills = [
      makeSkill({ name: 'empty-skill', context: '', patterns: [], antiPatterns: [] }),
    ];

    const result = matchSkillsToTask('anything', skills);
    // Empty skill has no keywords to match — should be filtered out
    expect(result.includedSkills).toBe(0);
  });

  it('handles whitespace-only task description', () => {
    const result = matchSkillsToTask('   ', [makeSkill()]);
    expect(result.matches).toHaveLength(0);
  });

  it('tracks totalSkills even when none match', () => {
    const skills = [makeSkill(), makeSkill({ name: 'other-skill' })];
    const result = matchSkillsToTask('quantum entanglement spacetime', skills);

    expect(result.totalSkills).toBe(2);
    expect(result.includedSkills).toBe(0);
  });

  it('reports contextBytes accurately', () => {
    const skills = [
      makeSkill({
        name: 'clean-arch',
        context: 'Clean architecture patterns for TypeScript projects.',
        patterns: ['Dependency inversion'],
      }),
    ];

    const result = matchSkillsToTask(
      'Clean architecture TypeScript dependency patterns',
      skills,
    );

    const encoder = new TextEncoder();
    const expectedBytes = encoder.encode(result.prompt).length;
    expect(result.contextBytes).toBe(expectedBytes);
  });
});
