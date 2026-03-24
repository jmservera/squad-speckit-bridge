/**
 * Unit tests for T022 + T003: BuildSquadContext use case
 *
 * Tests with mocked ports — no real filesystem access.
 * Validates orchestration logic, source toggles, empty state handling,
 * and T003 hardening (graceful errors, warnings, partial failures).
 */

import { describe, it, expect, vi } from 'vitest';
import { buildSquadContext } from '../../src/bridge/context.js';
import type { SquadStateReader, ContextWriter } from '../../src/bridge/ports.js';
import type { BridgeConfig, ContextSummary, SkillEntry, DecisionEntry, LearningEntry } from '../../src/types.js';
import { createDefaultConfig } from '../../src/types.js';

function makeReader(overrides?: Partial<SquadStateReader>): SquadStateReader {
  return {
    readSkills: vi.fn().mockResolvedValue([]),
    readDecisions: vi.fn().mockResolvedValue([]),
    readLearnings: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeWriter(): ContextWriter & { captured: ContextSummary | null } {
  const writer = {
    captured: null as ContextSummary | null,
    write: vi.fn(async (summary: ContextSummary) => {
      writer.captured = summary;
    }),
    readPreviousMetadata: vi.fn().mockResolvedValue(null),
  };
  return writer;
}

function makeConfig(overrides?: Partial<BridgeConfig>): BridgeConfig {
  return { ...createDefaultConfig(), ...overrides };
}

describe('BuildSquadContext', () => {
  it('reads all sources and writes context summary', async () => {
    const skills: SkillEntry[] = [
      { name: 'test', context: 'Content', patterns: [], antiPatterns: [], rawSize: 10 },
    ];
    const reader = makeReader({
      readSkills: vi.fn().mockResolvedValue(skills),
    });
    const writer = makeWriter();
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(reader.readSkills).toHaveBeenCalledOnce();
    expect(reader.readDecisions).toHaveBeenCalledOnce();
    expect(reader.readLearnings).toHaveBeenCalledOnce();
    expect(writer.write).toHaveBeenCalledOnce();
    expect(result.summary.metadata.sources.skills).toBe(1);
  });

  it('produces valid ContextSummary within budget', async () => {
    const skills: SkillEntry[] = [
      { name: 'big', context: 'x'.repeat(2000), patterns: [], antiPatterns: [], rawSize: 2000 },
    ];
    const reader = makeReader({
      readSkills: vi.fn().mockResolvedValue(skills),
    });
    const writer = makeWriter();
    const config = makeConfig({ contextMaxBytes: 4096 });

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary.metadata.sizeBytes).toBeLessThanOrEqual(4096);
  });

  it('handles empty state gracefully (FR-019)', async () => {
    const reader = makeReader();
    const writer = makeWriter();
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary.content.skills).toHaveLength(0);
    expect(result.summary.content.decisions).toHaveLength(0);
    expect(result.summary.content.learnings).toHaveLength(0);
    expect(writer.write).toHaveBeenCalledOnce();
  });

  it('skips sources when disabled in config', async () => {
    const reader = makeReader({
      readSkills: vi.fn().mockResolvedValue([{ name: 'x', context: 'y', patterns: [], antiPatterns: [], rawSize: 1 }]),
      readDecisions: vi.fn().mockResolvedValue([{ title: 'D', date: '2025-01-01', status: 'Active', summary: 'S', relevanceScore: 1, fullContent: 'F' }]),
    });
    const writer = makeWriter();
    const config = makeConfig();
    config.sources.decisions = false;
    config.sources.histories = false;

    await buildSquadContext(reader, writer, { config });

    expect(reader.readSkills).toHaveBeenCalledOnce();
    expect(reader.readDecisions).not.toHaveBeenCalled();
    expect(reader.readLearnings).not.toHaveBeenCalled();
  });

  it('returns the summary in the result', async () => {
    const reader = makeReader();
    const writer = makeWriter();
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary).toBeDefined();
    expect(result.summary.metadata).toBeDefined();
    expect(result.summary.content).toBeDefined();
  });

  it('passes all sources to summarizer', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);
    const dateStr = recentDate.toISOString().slice(0, 10);

    const skills: SkillEntry[] = [
      { name: 's1', context: 'skill', patterns: ['p'], antiPatterns: ['a'], rawSize: 50 },
    ];
    const decisions: DecisionEntry[] = [
      { title: 'D1', date: dateStr, status: 'Adopted', summary: 'dec', relevanceScore: 0, fullContent: 'full' },
    ];
    const learnings: LearningEntry[] = [
      { agentName: 'agent', agentRole: 'role', entries: [{ date: dateStr, title: 'L1', summary: 'learned' }], rawSize: 50 },
    ];

    const reader = makeReader({
      readSkills: vi.fn().mockResolvedValue(skills),
      readDecisions: vi.fn().mockResolvedValue(decisions),
      readLearnings: vi.fn().mockResolvedValue(learnings),
    });
    const writer = makeWriter();
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary.metadata.sources.skills).toBe(1);
    expect(result.summary.metadata.sources.decisions).toBe(1);
    expect(result.summary.metadata.sources.histories).toBe(1);
  });

  it('increments cycle count when previous context exists (T034)', async () => {
    const reader = makeReader();
    const writer = makeWriter();
    writer.readPreviousMetadata = vi.fn().mockResolvedValue({
      generated: '2025-07-20T00:00:00.000Z',
      cycleCount: 3,
    });
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary.metadata.cycleCount).toBe(4);
  });

  it('starts at cycle 1 when no previous context (T034)', async () => {
    const reader = makeReader();
    const writer = makeWriter();
    const config = makeConfig();

    const result = await buildSquadContext(reader, writer, { config });

    expect(result.summary.metadata.cycleCount).toBe(1);
  });

  it('passes since-filter to readLearnings when previous context exists (T034)', async () => {
    const reader = makeReader();
    const writer = makeWriter();
    writer.readPreviousMetadata = vi.fn().mockResolvedValue({
      generated: '2025-07-20T00:00:00.000Z',
      cycleCount: 1,
    });
    const config = makeConfig();

    await buildSquadContext(reader, writer, { config });

    expect(reader.readLearnings).toHaveBeenCalledWith(new Date('2025-07-20T00:00:00.000Z'));
  });

  // --- T003: Hardening tests ---

  describe('T003: graceful error handling', () => {
    it('produces valid output when readSkills throws (missing skills dir)', async () => {
      const reader = makeReader({
        readSkills: vi.fn().mockRejectedValue(new Error('ENOENT: no such directory .squad/skills')),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.content.skills).toHaveLength(0);
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Skipped skills'),
      );
      expect(writer.write).toHaveBeenCalledOnce();
    });

    it('produces valid output when readDecisions throws', async () => {
      const reader = makeReader({
        readDecisions: vi.fn().mockRejectedValue(new Error('ENOENT: no such file decisions.md')),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.content.decisions).toHaveLength(0);
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Skipped decisions'),
      );
      expect(writer.write).toHaveBeenCalledOnce();
    });

    it('produces valid output when readLearnings throws', async () => {
      const reader = makeReader({
        readLearnings: vi.fn().mockRejectedValue(new Error('ENOENT: no such directory .squad/agents')),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.content.learnings).toHaveLength(0);
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Skipped histories'),
      );
      expect(writer.write).toHaveBeenCalledOnce();
    });

    it('produces valid output when ALL readers throw (completely missing .squad/)', async () => {
      const err = new Error('ENOENT: .squad/ does not exist');
      const reader = makeReader({
        readSkills: vi.fn().mockRejectedValue(err),
        readDecisions: vi.fn().mockRejectedValue(err),
        readLearnings: vi.fn().mockRejectedValue(err),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.content.skills).toHaveLength(0);
      expect(result.summary.content.decisions).toHaveLength(0);
      expect(result.summary.content.learnings).toHaveLength(0);
      expect(result.summary.content.warnings).toHaveLength(3);
      expect(result.warnings).toHaveLength(3);
      expect(writer.write).toHaveBeenCalledOnce();
    });

    it('still reads working sources when one reader throws', async () => {
      const skills: SkillEntry[] = [
        { name: 'ok', context: 'works', patterns: [], antiPatterns: [], rawSize: 5 },
      ];
      const reader = makeReader({
        readSkills: vi.fn().mockResolvedValue(skills),
        readDecisions: vi.fn().mockRejectedValue(new Error('missing')),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.metadata.sources.skills).toBe(1);
      expect(result.summary.content.decisions).toHaveLength(0);
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Skipped decisions'),
      );
    });

    it('handles readPreviousMetadata throwing gracefully', async () => {
      const reader = makeReader();
      const writer = makeWriter();
      writer.readPreviousMetadata = vi.fn().mockRejectedValue(
        new Error('ENOENT: squad-context.md not found'),
      );
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.metadata.cycleCount).toBe(1);
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Could not read previous metadata'),
      );
      expect(writer.write).toHaveBeenCalledOnce();
    });

    it('handles writer.write throwing gracefully', async () => {
      const reader = makeReader();
      const writer = makeWriter();
      writer.write = vi.fn().mockRejectedValue(
        new Error('EACCES: permission denied'),
      );
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary).toBeDefined();
      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('Failed to write context'),
      );
    });

    it('preserves non-Error rejection values in warnings', async () => {
      const reader = makeReader({
        readSkills: vi.fn().mockRejectedValue('string error'),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.summary.content.warnings).toContainEqual(
        expect.stringContaining('string error'),
      );
    });

    it('returns warnings array in result for caller inspection', async () => {
      const reader = makeReader({
        readSkills: vi.fn().mockRejectedValue(new Error('boom')),
      });
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Skipped skills');
    });

    it('returns empty warnings array on success', async () => {
      const reader = makeReader();
      const writer = makeWriter();
      const config = makeConfig();

      const result = await buildSquadContext(reader, writer, { config });

      expect(result.warnings).toEqual([]);
    });
  });
});
