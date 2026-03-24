import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { SpecFileReader, parseRequirements } from '../../src/review/adapters/spec-reader.js';

const FIXTURE_DIR = 'tests/integration/.fixtures/spec-reader';

describe('parseRequirements (unit)', () => {
  it('parses basic FR-XXX requirements', () => {
    const content = `## Requirements
- **FR-001**: Must generate context
- **FR-002**: Must include skills section`;
    const reqs = parseRequirements(content);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].id).toBe('FR-001');
    expect(reqs[0].text).toBe('Must generate context');
    expect(reqs[1].id).toBe('FR-002');
    expect(reqs[1].text).toBe('Must include skills section');
  });

  it('preserves multi-paragraph descriptions', () => {
    const content = `## Context Generation
- **FR-001**: First paragraph of description.

  This is the second paragraph that continues
  the description with more detail.

  And a third paragraph with even more context.
- **FR-002**: Another requirement`;
    const reqs = parseRequirements(content);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].id).toBe('FR-001');
    expect(reqs[0].text).toContain('First paragraph');
    expect(reqs[0].text).toContain('second paragraph');
    expect(reqs[0].text).toContain('third paragraph');
    expect(reqs[1].id).toBe('FR-002');
    expect(reqs[1].text).toBe('Another requirement');
  });

  it('extracts category from nearest preceding heading', () => {
    const content = `## Context Generation
- **FR-001**: Generates context

## Distribution
- **FR-002**: Analyzes distribution`;
    const reqs = parseRequirements(content);
    expect(reqs[0].category).toBe('Context Generation');
    expect(reqs[1].category).toBe('Distribution');
  });

  it('handles missing category gracefully', () => {
    const content = `- **FR-001**: No heading above`;
    const reqs = parseRequirements(content);
    expect(reqs[0].category).toBe('');
  });

  it('handles empty content', () => {
    expect(parseRequirements('')).toEqual([]);
  });

  it('handles content with no FR entries', () => {
    expect(parseRequirements('Just some text\nwithout requirements')).toEqual([]);
  });
});

describe('SpecFileReader (integration)', () => {
  beforeEach(async () => {
    await mkdir(FIXTURE_DIR, { recursive: true });
  });

  it('reads and parses requirements from a spec file', async () => {
    await writeFile(
      `${FIXTURE_DIR}/spec.md`,
      `## Requirements
- **FR-001**: Must generate context
- **FR-002**: Must include skills section
`,
    );

    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(`${FIXTURE_DIR}/spec.md`);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].id).toBe('FR-001');
    expect(reqs[1].id).toBe('FR-002');
  });

  it('preserves multi-paragraph descriptions from file', async () => {
    await writeFile(
      `${FIXTURE_DIR}/multi.md`,
      `## Features
- **FR-010**: First paragraph.

  Second paragraph with details.
- **FR-011**: Simple one-liner
`,
    );

    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(`${FIXTURE_DIR}/multi.md`);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].text).toContain('First paragraph');
    expect(reqs[0].text).toContain('Second paragraph');
  });

  // Clean up
  afterAll(async () => {
    await rm(FIXTURE_DIR, { recursive: true, force: true }).catch(() => {});
  });
});
