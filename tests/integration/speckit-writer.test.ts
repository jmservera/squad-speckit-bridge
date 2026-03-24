/**
 * Integration tests for T025 + T004: SpecKitContextWriter adapter
 *
 * Tests writing ContextSummary to markdown with YAML frontmatter.
 * T004: Tests cycle metadata persistence (read, increment, overwrite).
 * Uses temp directories for isolation.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SpecKitContextWriter } from '../../src/bridge/adapters/speckit-writer.js';
import type { ContextSummary } from '../../src/types.js';

function makeSummary(overrides?: Partial<ContextSummary>): ContextSummary {
  return {
    metadata: {
      generated: '2025-07-25T10:00:00.000Z',
      cycleCount: 1,
      sources: {
        skills: 1,
        decisions: 1,
        histories: 1,
        skipped: [],
      },
      sizeBytes: 1024,
      maxBytes: 8192,
    },
    content: {
      skills: [
        {
          name: 'test-skill',
          context: 'Skill content here.',
          patterns: ['Pattern A'],
          antiPatterns: ['Anti-pattern A'],
          rawSize: 100,
        },
      ],
      decisions: [
        {
          title: 'Test Decision',
          date: '2025-07-20',
          status: 'Adopted',
          summary: 'Decision summary.',
          relevanceScore: 0.9,
          fullContent: 'Full content.',
        },
      ],
      learnings: [
        {
          agentName: 'test-agent',
          agentRole: 'Tester',
          entries: [
            {
              date: '2025-07-22',
              title: 'Test Learning',
              summary: 'Learned something.',
            },
          ],
          rawSize: 50,
        },
      ],
      warnings: [],
    },
    ...overrides,
  };
}

describe('SpecKitContextWriter', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('writes squad-context.md with YAML frontmatter', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    await writer.write(makeSummary());

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('generated: 2025-07-25T10:00:00.000Z');
    expect(content).toContain('skills: 1');
    expect(content).toContain('size_bytes: 1024');
    expect(content).toContain('max_bytes: 8192');
  });

  it('includes skills section in output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    await writer.write(makeSummary());

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('## Team Skills (Highest Signal)');
    expect(content).toContain('### test-skill');
    expect(content).toContain('Skill content here.');
    expect(content).toContain('Pattern A');
  });

  it('includes decisions section in output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    await writer.write(makeSummary());

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('## Relevant Decisions');
    expect(content).toContain('### Test Decision (2025-07-20)');
    expect(content).toContain('Decision summary.');
  });

  it('includes learnings section in output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    await writer.write(makeSummary());

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('## Agent Learnings (Summarized)');
    expect(content).toContain('### test-agent (Tester)');
    expect(content).toContain('Learned something.');
  });

  it('omits empty sections', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    const emptySummary = makeSummary();
    emptySummary.content.decisions = [];
    emptySummary.content.learnings = [];
    emptySummary.metadata.sources.decisions = 0;
    emptySummary.metadata.sources.histories = 0;

    await writer.write(emptySummary);

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('## Team Skills');
    expect(content).not.toContain('## Relevant Decisions');
    expect(content).not.toContain('## Agent Learnings');
  });

  it('creates target directory if missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const nestedDir = join(tempDir, 'nested', 'dir');
    const writer = new SpecKitContextWriter(nestedDir);

    await writer.write(makeSummary());

    const content = await readFile(join(nestedDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('# Squad Context for Spec Kit Planning');
  });

  it('includes warnings when present', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    const summary = makeSummary();
    summary.content.warnings = ['Skipped large skill'];

    await writer.write(summary);

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('Skipped large skill');
  });

  it('includes cycle_count in frontmatter', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    const summary = makeSummary();
    summary.metadata.cycleCount = 3;
    await writer.write(summary);

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('cycle_count: 3');
  });

  it('readPreviousMetadata returns null when no previous context', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    const meta = await writer.readPreviousMetadata();
    expect(meta).toBeNull();
  });

  it('readPreviousMetadata extracts generated timestamp and cycle count', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // Write a context first
    const summary = makeSummary();
    summary.metadata.cycleCount = 2;
    await writer.write(summary);

    // Now read previous metadata
    const meta = await writer.readPreviousMetadata();
    expect(meta).not.toBeNull();
    expect(meta!.generated).toBe('2025-07-25T10:00:00.000Z');
    expect(meta!.cycleCount).toBe(2);
  });

  // T004: Cycle metadata persistence tests

  it('writeWithCycleIncrement starts at cycle 1 on first write', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    const summary = makeSummary();
    const cycle = await writer.writeWithCycleIncrement(summary);

    expect(cycle).toBe(1);
    expect(summary.metadata.cycleCount).toBe(1);

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('cycle_count: 1');
  });

  it('writeWithCycleIncrement increments cycle count on subsequent writes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // First write
    const summary1 = makeSummary();
    const cycle1 = await writer.writeWithCycleIncrement(summary1);
    expect(cycle1).toBe(1);

    // Second write
    const summary2 = makeSummary();
    const cycle2 = await writer.writeWithCycleIncrement(summary2);
    expect(cycle2).toBe(2);

    // Third write
    const summary3 = makeSummary();
    const cycle3 = await writer.writeWithCycleIncrement(summary3);
    expect(cycle3).toBe(3);

    const content = await readFile(join(tempDir, 'squad-context.md'), 'utf-8');
    expect(content).toContain('cycle_count: 3');
  });

  it('writeWithCycleIncrement recovers from corrupted previous file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // Write a corrupted file manually
    await writeFile(
      join(tempDir, 'squad-context.md'),
      '---\nbroken: yaml: [invalid\n---\ngarbage content',
      'utf-8',
    );

    // Should recover gracefully and start at cycle 1
    const summary = makeSummary();
    const cycle = await writer.writeWithCycleIncrement(summary);
    expect(cycle).toBe(1);
  });

  it('readPreviousMetadata returns null for empty file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // Write an empty file
    await writeFile(join(tempDir, 'squad-context.md'), '', 'utf-8');

    const meta = await writer.readPreviousMetadata();
    expect(meta).toBeNull();
  });

  it('readPreviousMetadata returns null for malformed frontmatter', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // Write file with broken YAML frontmatter
    await writeFile(
      join(tempDir, 'squad-context.md'),
      '---\ninvalid: yaml: [broken\n---\nContent here',
      'utf-8',
    );

    const meta = await writer.readPreviousMetadata();
    expect(meta).toBeNull();
  });

  it('readPreviousMetadata defaults cycle_count to 1 for missing field', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    // Write file with frontmatter that has generated but no cycle_count
    await writeFile(
      join(tempDir, 'squad-context.md'),
      '---\ngenerated: 2025-07-25T10:00:00.000Z\n---\nContent',
      'utf-8',
    );

    const meta = await writer.readPreviousMetadata();
    expect(meta).not.toBeNull();
    expect(meta!.cycleCount).toBe(1);
  });

  it('readPreviousMetadata defaults cycle_count to 1 for non-numeric value', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speckit-writer-'));
    const writer = new SpecKitContextWriter(tempDir);

    await writeFile(
      join(tempDir, 'squad-context.md'),
      '---\ngenerated: 2025-07-25T10:00:00.000Z\ncycle_count: "not-a-number"\n---\nContent',
      'utf-8',
    );

    const meta = await writer.readPreviousMetadata();
    expect(meta).not.toBeNull();
    expect(meta!.cycleCount).toBe(1);
  });
});
