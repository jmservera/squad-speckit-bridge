/**
 * Integration tests for T025: SpecKitContextWriter adapter
 *
 * Tests writing ContextSummary to markdown with YAML frontmatter.
 * Uses temp directories for isolation.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SpecKitContextWriter } from '../../src/bridge/adapters/speckit-writer.js';
import type { ContextSummary } from '../../src/types.js';

function makeSummary(overrides?: Partial<ContextSummary>): ContextSummary {
  return {
    metadata: {
      generated: '2025-07-25T10:00:00.000Z',
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
});
