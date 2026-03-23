/**
 * Integration tests for T024: SquadFileReader adapter
 *
 * Tests against real fixture files in tests/fixtures/squad/.
 * Verifies file discovery, parsing, and graceful error handling.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { SquadFileReader } from '../../src/bridge/adapters/squad-file-reader.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'squad');

describe('SquadFileReader', () => {
  it('reads skill files from fixture directory', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const skills = await reader.readSkills();

    expect(skills.length).toBeGreaterThanOrEqual(2);

    const names = skills.map((s) => s.name);
    expect(names).toContain('project-conventions');
    expect(names).toContain('testing-patterns');
  });

  it('extracts patterns and anti-patterns from skills', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const skills = await reader.readSkills();

    const conventions = skills.find((s) => s.name === 'project-conventions');
    expect(conventions).toBeDefined();
    expect(conventions!.patterns.length).toBeGreaterThan(0);
    expect(conventions!.antiPatterns.length).toBeGreaterThan(0);
  });

  it('reads decisions from fixture decisions.md', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const decisions = await reader.readDecisions();

    expect(decisions.length).toBeGreaterThanOrEqual(2);

    const titles = decisions.map((d) => d.title);
    expect(titles).toContain('Use Clean Architecture');
    expect(titles).toContain('Pipeline Integration Model');
  });

  it('parses decision dates and status', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const decisions = await reader.readDecisions();

    const arch = decisions.find((d) => d.title === 'Use Clean Architecture');
    expect(arch).toBeDefined();
    expect(arch!.date).toBe('2025-07-20');
    expect(arch!.status).toBe('Adopted');
  });

  it('reads agent histories from fixture directory', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const learnings = await reader.readLearnings();

    expect(learnings.length).toBeGreaterThanOrEqual(2);

    const names = learnings.map((l) => l.agentName);
    expect(names).toContain('dinesh');
    expect(names).toContain('richard');
  });

  it('extracts agent role and learning entries', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    const learnings = await reader.readLearnings();

    const dinesh = learnings.find((l) => l.agentName === 'dinesh');
    expect(dinesh).toBeDefined();
    expect(dinesh!.agentRole).toBe('Integration Engineer');
    expect(dinesh!.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty arrays for non-existent squad directory', async () => {
    const reader = new SquadFileReader('/non/existent/dir');

    const skills = await reader.readSkills();
    const decisions = await reader.readDecisions();
    const learnings = await reader.readLearnings();

    expect(skills).toHaveLength(0);
    expect(decisions).toHaveLength(0);
    expect(learnings).toHaveLength(0);
  });

  it('accumulates warnings without throwing', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);
    await reader.readSkills();
    await reader.readDecisions();
    await reader.readLearnings();

    const warnings = reader.getWarnings();
    // No malformed files in fixtures, so no warnings expected
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('filters learnings by date when since parameter is provided (T035)', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);

    // All learnings without filter
    const allLearnings = await reader.readLearnings();
    const totalEntries = allLearnings.reduce((acc, l) => acc + l.entries.length, 0);

    // Filter to only very recent (future) date — should get none
    const futureDate = new Date('2099-01-01');
    const filteredLearnings = await (new SquadFileReader(FIXTURES_DIR)).readLearnings(futureDate);
    const filteredEntries = filteredLearnings.reduce((acc, l) => acc + l.entries.length, 0);

    expect(totalEntries).toBeGreaterThan(0);
    expect(filteredEntries).toBe(0);
  });

  it('returns all learnings when since parameter is undefined (T035)', async () => {
    const reader = new SquadFileReader(FIXTURES_DIR);

    const allLearnings = await reader.readLearnings();
    const undefinedFilter = await reader.readLearnings(undefined);

    expect(allLearnings.length).toBe(undefinedFilter.length);
  });
});
