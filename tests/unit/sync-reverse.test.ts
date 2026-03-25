/**
 * T006 tests: syncReverse() use case
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncReverse } from '../../src/sync/sync-reverse.js';
import type {
  LearningExtractor,
  SpecLearningsWriter,
  ReverseSyncStatePersistence,
} from '../../src/sync/sync-reverse.js';
import type {
  ReverseSyncOptions,
  ExtractedReverseLearning,
  ReverseSyncState,
} from '../../src/types.js';

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                    */
/* ------------------------------------------------------------------ */

function makeOptions(overrides: Partial<ReverseSyncOptions> = {}): ReverseSyncOptions {
  return {
    specDir: '/specs/009',
    squadDir: '/squad',
    dryRun: false,
    cooldownMs: 0,
    sources: ['histories', 'decisions', 'skills'],
    skipConstitution: true,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ExtractedReverseLearning> = {}): ExtractedReverseLearning {
  return {
    title: 'Test Learning',
    content: 'Some content body about architecture and layers',
    sourceType: 'histories',
    attribution: 'gilfoyle',
    timestamp: '2026-03-24',
    fingerprint: '',
    classification: 'learnings-only',
    category: 'architectural-insights',
    ...overrides,
  };
}

function makeExtractor(entries: ExtractedReverseLearning[] = [makeEntry()]): LearningExtractor {
  return { extract: vi.fn().mockResolvedValue(entries) };
}

function makeWriter(): SpecLearningsWriter {
  return { write: vi.fn().mockResolvedValue('/specs/009/learnings.md') };
}

function makeStatePersistence(state: ReverseSyncState | null = null): ReverseSyncStatePersistence {
  return {
    load: vi.fn().mockResolvedValue(state),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

const fingerprinter = (title: string, content: string) => {
  const normalized = `${title.trim().toLowerCase()}::${content.trim().toLowerCase()}`;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) & 0xffffffff;
  }
  return `fp_${(hash >>> 0).toString(36)}`;
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('syncReverse', () => {
  it('happy path: extract → filter → dedup → write → result', async () => {
    const entries = [
      makeEntry({ title: 'A', content: 'About architecture layers' }),
      makeEntry({ title: 'B', content: 'About integration patterns with API endpoint' }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    expect(result.totalExtracted).toBe(2);
    expect(result.learningsWritten).toBe(2);
    expect(result.dryRun).toBe(false);
    expect(result.outputPath).toBe('/specs/009/learnings.md');
    expect(writer.write).toHaveBeenCalledOnce();
    expect(state.save).toHaveBeenCalledOnce();
  });

  it('dry run: no writes, result.dryRun === true', async () => {
    const extractor = makeExtractor([makeEntry()]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ dryRun: true }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.dryRun).toBe(true);
    expect(result.outputPath).toBeNull();
    expect(writer.write).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });

  it('all duplicates: zero written', async () => {
    const entry = makeEntry({ title: 'A', content: 'Content A' });
    const fp = fingerprinter('A', 'Content A');
    const extractor = makeExtractor([entry]);
    const writer = makeWriter();
    const state = makeStatePersistence({
      lastReverseSyncTimestamp: '2026-03-24T00:00:00Z',
      syncedFingerprints: [fp],
      syncGeneration: 1,
      syncHistory: [],
    });

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    expect(result.deduplicated).toBe(1);
    expect(result.learningsWritten).toBe(0);
    expect(writer.write).not.toHaveBeenCalled();
  });

  it('cooldown filtering: recent entries excluded', async () => {
    const recentEntry = makeEntry({
      title: 'Recent',
      content: 'Too new',
      timestamp: new Date().toISOString(),
    });
    const extractor = makeExtractor([recentEntry]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ cooldownMs: 24 * 60 * 60 * 1000 }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.cooledDown).toBe(1);
    expect(result.learningsWritten).toBe(0);
  });

  it('empty extraction: no file written, learningsWritten === 0', async () => {
    const extractor = makeExtractor([]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    expect(result.totalExtracted).toBe(0);
    expect(result.learningsWritten).toBe(0);
    expect(result.outputPath).toBeNull();
    expect(writer.write).not.toHaveBeenCalled();
  });

  it('privacy filter applied to all entries', async () => {
    const entry = makeEntry({
      title: 'Has Secret',
      content: 'api_key = ABCDEFGHIJKLMNOPQR and user@example.com email',
    });
    const extractor = makeExtractor([entry]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    expect(result.redactionSummary.totalRedactions).toBeGreaterThan(0);
    expect(result.redactionSummary.types.length).toBeGreaterThan(0);
  });

  it('invalid options: throws with REVERSE_SYNC_FAILED error code', async () => {
    const extractor = makeExtractor();
    const writer = makeWriter();
    const state = makeStatePersistence();

    await expect(
      syncReverse(
        makeOptions({ specDir: '' }),
        extractor, writer, state, fingerprinter,
      ),
    ).rejects.toMatchObject({
      code: 'REVERSE_SYNC_FAILED',
      error: true,
    });
  });

  it('returns correct sourcesProcessed counts', async () => {
    const entries = [
      makeEntry({ sourceType: 'histories', title: 'H1', content: 'architecture' }),
      makeEntry({ sourceType: 'histories', title: 'H2', content: 'architecture 2' }),
      makeEntry({ sourceType: 'decisions', title: 'D1', content: 'decision adopted' }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    expect(result.sourcesProcessed).toEqual(
      expect.arrayContaining([
        { type: 'histories', count: 2 },
        { type: 'decisions', count: 1 },
      ]),
    );
  });
});
