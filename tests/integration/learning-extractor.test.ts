/**
 * T007 tests: LearningExtractorAdapter integration tests
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { LearningExtractorAdapter } from '../../src/sync/adapters/learning-extractor.js';

const FIXTURES_DIR = join(import.meta.dirname!, '../fixtures/reverse-sync/squad');

describe('LearningExtractorAdapter', () => {
  const adapter = new LearningExtractorAdapter();

  it('extracts entries from agent histories', async () => {
    const results = await adapter.extract(FIXTURES_DIR, ['histories']);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.sourceType === 'histories')).toBe(true);

    const gilfoyleEntries = results.filter(r => r.attribution === 'gilfoyle');
    expect(gilfoyleEntries.length).toBeGreaterThan(0);
    expect(gilfoyleEntries.some(e => e.title.includes('Clean architecture'))).toBe(true);
  });

  it('extracts entries from decisions', async () => {
    const results = await adapter.extract(FIXTURES_DIR, ['decisions']);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.sourceType === 'decisions')).toBe(true);
    expect(results.every(r => r.attribution === 'team')).toBe(true);
    expect(results.some(e => e.title.includes('TypeScript strict mode'))).toBe(true);
  });

  it('extracts entries from skills', async () => {
    const results = await adapter.extract(FIXTURES_DIR, ['skills']);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.sourceType === 'skills')).toBe(true);
    expect(results.some(e => e.title.includes('Clean Architecture Bridge'))).toBe(true);
  });

  it('source filtering works — only histories, no decisions', async () => {
    const results = await adapter.extract(FIXTURES_DIR, ['histories']);

    expect(results.every(r => r.sourceType === 'histories')).toBe(true);
    expect(results.some(r => r.sourceType === 'decisions' as any)).toBe(false);
  });

  it('handles missing directories gracefully', async () => {
    const results = await adapter.extract('/nonexistent/squad/dir', ['histories', 'decisions', 'skills']);

    expect(results).toEqual([]);
  });

  it('attribution is correct per source type', async () => {
    const all = await adapter.extract(FIXTURES_DIR, ['histories', 'decisions', 'skills']);

    const histories = all.filter(r => r.sourceType === 'histories');
    expect(histories.every(r => typeof r.attribution === 'string' && r.attribution.length > 0)).toBe(true);
    // Agent name as attribution
    expect(histories.some(r => r.attribution === 'gilfoyle')).toBe(true);
    expect(histories.some(r => r.attribution === 'dinesh')).toBe(true);

    const decisions = all.filter(r => r.sourceType === 'decisions');
    expect(decisions.every(r => r.attribution === 'team')).toBe(true);

    const skills = all.filter(r => r.sourceType === 'skills');
    expect(skills.every(r => r.attribution === 'clean-architecture-bridge')).toBe(true);
  });

  it('extracts all three source types simultaneously', async () => {
    const results = await adapter.extract(FIXTURES_DIR, ['histories', 'decisions', 'skills']);

    const types = new Set(results.map(r => r.sourceType));
    expect(types.has('histories')).toBe(true);
    expect(types.has('decisions')).toBe(true);
    expect(types.has('skills')).toBe(true);
  });
});
