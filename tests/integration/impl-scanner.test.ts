/**
 * Integration tests for T011: ImplementationScanner adapter
 *
 * Scans tests/fixtures/review/src/ for evidence of FR-XXX coverage.
 * Verifies file discovery, line attribution, and kind classification.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { SourceImplementationScanner } from '../../src/review/adapters/impl-scanner.js';
import { classifyKind } from '../../src/review/adapters/impl-scanner.js';

const FIXTURE_SRC = resolve(
  import.meta.dirname,
  '..',
  'fixtures',
  'review',
  'src',
);

describe('SourceImplementationScanner', () => {
  it('finds evidence for known FR IDs across fixture files', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, [
      'FR-001', 'FR-002', 'FR-003', 'FR-004',
    ]);

    expect(evidence.length).toBeGreaterThan(0);

    const coveredIds = new Set(evidence.map((e) => e.requirementId));
    expect(coveredIds.has('FR-001')).toBe(true);
    expect(coveredIds.has('FR-002')).toBe(true);
    expect(coveredIds.has('FR-003')).toBe(true);
    expect(coveredIds.has('FR-004')).toBe(true);
  });

  it('returns relative file paths', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-001']);

    expect(evidence.length).toBeGreaterThan(0);
    for (const e of evidence) {
      expect(e.filePath).not.toMatch(/^\//);
      expect(e.filePath).toMatch(/dashboard-grid\.ts$/);
    }
  });

  it('returns correct line numbers', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-001']);

    for (const e of evidence) {
      expect(e.line).toBeGreaterThan(0);
      expect(typeof e.line).toBe('number');
    }
  });

  it('classifies comment evidence correctly', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-002']);

    const comments = evidence.filter((e) => e.kind === 'comment');
    expect(comments.length).toBeGreaterThan(0);
  });

  it('classifies annotation evidence correctly', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-001', 'FR-002', 'FR-004']);

    const annotations = evidence.filter((e) => e.kind === 'annotation');
    expect(annotations.length).toBeGreaterThan(0);
  });

  it('returns empty array for unmatched IDs', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-999']);
    expect(evidence).toHaveLength(0);
  });

  it('returns empty array for empty ID list', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, []);
    expect(evidence).toHaveLength(0);
  });

  it('returns empty array for non-existent directory', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan('/no/such/dir', ['FR-001']);
    expect(evidence).toHaveLength(0);
  });

  it('does not match FR-005 when no source files reference it', async () => {
    const scanner = new SourceImplementationScanner();
    const evidence = await scanner.scan(FIXTURE_SRC, ['FR-005']);
    expect(evidence).toHaveLength(0);
  });
});

describe('classifyKind', () => {
  it('detects // comments', () => {
    expect(classifyKind('  // FR-001: grid layout')).toBe('comment');
  });

  it('detects /* comments', () => {
    expect(classifyKind('  /* FR-001 */')).toBe('comment');
  });

  it('detects # comments', () => {
    expect(classifyKind('# FR-001 implementation')).toBe('comment');
  });

  it('detects JSDoc * lines', () => {
    expect(classifyKind(' * FR-001: implements grid')).toBe('comment');
  });

  it('detects @implements annotations', () => {
    expect(classifyKind(' * @implements FR-001')).toBe('annotation');
  });

  it('detects @requirement annotations', () => {
    expect(classifyKind(' * @requirement FR-002')).toBe('annotation');
  });

  it('detects @satisfies annotations', () => {
    expect(classifyKind(' * @satisfies FR-004')).toBe('annotation');
  });

  it('defaults to reference for inline code', () => {
    expect(classifyKind('  const fr = "FR-001";')).toBe('reference');
  });
});
