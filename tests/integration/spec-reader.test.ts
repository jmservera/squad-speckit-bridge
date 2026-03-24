/**
 * Integration tests for T011: SpecReader adapter
 *
 * Tests against real fixture spec.md in tests/fixtures/review/.
 * Verifies FR-XXX parsing across multiple formats (bold, backtick, plain).
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { SpecFileReader } from '../../src/review/adapters/spec-reader.js';
import { parseRequirements } from '../../src/review/adapters/spec-reader.js';

const FIXTURE_SPEC = resolve(
  import.meta.dirname,
  '..',
  'fixtures',
  'review',
  'spec.md',
);

describe('SpecFileReader', () => {
  it('reads all FR entries from fixture spec.md', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const ids = reqs.map((r) => r.id);
    expect(ids).toContain('FR-001');
    expect(ids).toContain('FR-002');
    expect(ids).toContain('FR-003');
    expect(ids).toContain('FR-004');
    expect(ids).toContain('FR-005');
    expect(reqs).toHaveLength(5);
  });

  it('extracts titles correctly', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const fr1 = reqs.find((r) => r.id === 'FR-001');
    expect(fr1).toBeDefined();
    expect(fr1!.title).toMatch(/dashboard MUST render/i);
  });

  it('extracts acceptance criteria from sub-bullets', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const fr1 = reqs.find((r) => r.id === 'FR-001');
    expect(fr1).toBeDefined();
    expect(fr1!.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
    expect(fr1!.acceptanceCriteria[0]).toMatch(/grid cells/i);
  });

  it('parses backtick-wrapped FR IDs', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const fr4 = reqs.find((r) => r.id === 'FR-004');
    expect(fr4).toBeDefined();
    expect(fr4!.title).toMatch(/Widget plugins/);
  });

  it('extracts numbered acceptance criteria', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const fr4 = reqs.find((r) => r.id === 'FR-004');
    expect(fr4).toBeDefined();
    expect(fr4!.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
    expect(fr4!.acceptanceCriteria[0]).toMatch(/asynchronously/i);
  });

  it('parses plain FR IDs without formatting', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const fr5 = reqs.find((r) => r.id === 'FR-005');
    expect(fr5).toBeDefined();
    expect(fr5!.title).toMatch(/role-based access/i);
  });

  it('returns empty array for non-existent file', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements('/no/such/spec.md');
    expect(reqs).toHaveLength(0);
  });

  it('returns empty array for spec with no FR entries', () => {
    const reqs = parseRequirements('# Just a heading\n\nSome text without requirements.\n');
    expect(reqs).toHaveLength(0);
  });

  it('handles empty content gracefully', () => {
    const reqs = parseRequirements('');
    expect(reqs).toHaveLength(0);
  });

  it('does not pick up NFR entries', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(FIXTURE_SPEC);

    const ids = reqs.map((r) => r.id);
    expect(ids).not.toContain('NFR-001');
    expect(ids).not.toContain('NFR-002');
  });
});
