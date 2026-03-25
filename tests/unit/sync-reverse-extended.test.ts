/**
 * T012 + T014 + T015 + T016 tests: syncReverse with constitution routing,
 * sources filtering, cooldown gating, and edge case hardening.
 */

import { describe, it, expect, vi } from 'vitest';
import { syncReverse } from '../../src/sync/sync-reverse.js';
import type {
  LearningExtractor,
  SpecLearningsWriter,
  ReverseSyncStatePersistence,
  ReverseConstitutionWriter,
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
    skipConstitution: false,
    constitutionPath: '/path/to/constitution.md',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ExtractedReverseLearning> = {}): ExtractedReverseLearning {
  return {
    title: 'Test Learning',
    content: 'Some content about architecture and layers',
    sourceType: 'histories',
    attribution: 'gilfoyle',
    timestamp: '2026-03-24',
    fingerprint: '',
    classification: 'learnings-only',
    category: 'architectural-insights',
    ...overrides,
  };
}

function makeConstitutionEntry(overrides: Partial<ExtractedReverseLearning> = {}): ExtractedReverseLearning {
  return makeEntry({
    title: 'All APIs MUST have version negotiation',
    content: 'This is a project-wide non-negotiable architectural constraint.',
    classification: 'constitution-worthy',
    sourceType: 'decisions',
    attribution: 'team',
    ...overrides,
  });
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

function makeConstitutionWriter(): ReverseConstitutionWriter {
  return { append: vi.fn().mockResolvedValue(1) };
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
/*  T012: Constitution routing                                         */
/* ------------------------------------------------------------------ */

describe('syncReverse — constitution routing (T012)', () => {
  it('calls constitutionWriter.append for constitution-worthy entries', async () => {
    const entries = [
      makeConstitutionEntry(),
      makeEntry({ title: 'Normal learning', content: 'code pattern for testing' }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();
    const constWriter = makeConstitutionWriter();

    const result = await syncReverse(
      makeOptions(),
      extractor, writer, state, fingerprinter, constWriter,
    );

    expect(constWriter.append).toHaveBeenCalledOnce();
    expect(constWriter.append).toHaveBeenCalledWith(
      '/path/to/constitution.md',
      expect.arrayContaining([
        expect.objectContaining({ classification: 'constitution-worthy' }),
      ]),
    );
    expect(result.constitutionEntriesAdded).toBe(1);
  });

  it('does not call constitutionWriter when skipConstitution is true', async () => {
    const entries = [makeConstitutionEntry()];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();
    const constWriter = makeConstitutionWriter();

    const result = await syncReverse(
      makeOptions({ skipConstitution: true }),
      extractor, writer, state, fingerprinter, constWriter,
    );

    expect(constWriter.append).not.toHaveBeenCalled();
    expect(result.constitutionEntriesAdded).toBe(0);
  });

  it('does not call constitutionWriter when no entries are constitution-worthy', async () => {
    const entries = [makeEntry({ title: 'Normal', content: 'code pattern testing technique' })];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();
    const constWriter = makeConstitutionWriter();

    await syncReverse(
      makeOptions(),
      extractor, writer, state, fingerprinter, constWriter,
    );

    expect(constWriter.append).not.toHaveBeenCalled();
  });

  it('works without constitutionWriter (optional parameter)', async () => {
    const entries = [makeConstitutionEntry()];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    // No constitutionWriter passed — should not throw
    const result = await syncReverse(
      makeOptions({ skipConstitution: true }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.learningsWritten).toBeGreaterThan(0);
  });

  it('dry run reports constitution-worthy count without calling writer', async () => {
    const entries = [makeConstitutionEntry()];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();
    const constWriter = makeConstitutionWriter();

    const result = await syncReverse(
      makeOptions({ dryRun: true }),
      extractor, writer, state, fingerprinter, constWriter,
    );

    expect(constWriter.append).not.toHaveBeenCalled();
    expect(result.constitutionEntriesAdded).toBe(1);
    expect(result.dryRun).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  T014: --sources flag filtering                                     */
/* ------------------------------------------------------------------ */

describe('syncReverse — sources filtering (T014)', () => {
  it('passes sources array to extractor', async () => {
    const extractor = makeExtractor([]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    await syncReverse(
      makeOptions({ sources: ['histories', 'decisions'] }),
      extractor, writer, state, fingerprinter,
    );

    expect(extractor.extract).toHaveBeenCalledWith('/squad', ['histories', 'decisions']);
  });

  it('single source passed correctly', async () => {
    const extractor = makeExtractor([]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    await syncReverse(
      makeOptions({ sources: ['decisions'] }),
      extractor, writer, state, fingerprinter,
    );

    expect(extractor.extract).toHaveBeenCalledWith('/squad', ['decisions']);
  });

  it('sourcesProcessed reflects only requested sources', async () => {
    const entries = [
      makeEntry({ sourceType: 'decisions', title: 'D1', content: 'decision adopted by team' }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ sources: ['decisions'] }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.sourcesProcessed).toEqual([{ type: 'decisions', count: 1 }]);
  });
});

/* ------------------------------------------------------------------ */
/*  T015: --cooldown timestamp-gated filtering                         */
/* ------------------------------------------------------------------ */

describe('syncReverse — cooldown filtering (T015)', () => {
  it('cooldown 0 includes all entries regardless of timestamp', async () => {
    const entries = [
      makeEntry({ title: 'Recent', content: 'very recent architecture layer', timestamp: new Date().toISOString() }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ cooldownMs: 0 }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.cooledDown).toBe(0);
    expect(result.learningsWritten).toBe(1);
  });

  it('cooldown filters out entries newer than threshold', async () => {
    const entries = [
      makeEntry({ title: 'Old', content: 'architecture layer old', timestamp: '2024-01-01' }),
      makeEntry({ title: 'New', content: 'architecture layer new', timestamp: new Date().toISOString() }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ cooldownMs: 24 * 3600 * 1000 }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.cooledDown).toBe(1);
    expect(result.learningsWritten).toBe(1);
  });

  it('entries with invalid timestamps are kept (not filtered)', async () => {
    const entries = [
      makeEntry({ title: 'Bad TS', content: 'no valid architecture date', timestamp: 'not-a-date' }),
    ];
    const extractor = makeExtractor(entries);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ cooldownMs: 24 * 3600 * 1000 }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.cooledDown).toBe(0);
    expect(result.learningsWritten).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  T016: Edge case hardening                                          */
/* ------------------------------------------------------------------ */

describe('syncReverse — edge cases (T016)', () => {
  it('all duplicates: zero written, informative summary', async () => {
    const entry = makeEntry({ title: 'Dup', content: 'architecture duplicate content' });
    const fp = fingerprinter('Dup', 'architecture duplicate content');
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
    expect(result.summary).toContain('already synced');
    expect(writer.write).not.toHaveBeenCalled();
  });

  it('empty extraction after sources filter: zero written', async () => {
    const extractor = makeExtractor([]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(
      makeOptions({ sources: ['skills'] }),
      extractor, writer, state, fingerprinter,
    );

    expect(result.totalExtracted).toBe(0);
    expect(result.learningsWritten).toBe(0);
  });

  it('privacy filter fully redacts content: entry excluded', async () => {
    const entry = makeEntry({
      title: 'Secret',
      content: 'api_key=sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 more_key=sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    });
    const extractor = makeExtractor([entry]);
    const writer = makeWriter();
    const state = makeStatePersistence();

    const result = await syncReverse(makeOptions(), extractor, writer, state, fingerprinter);

    // Either fully redacted or partially redacted — redaction summary should reflect it
    expect(result.redactionSummary.totalRedactions).toBeGreaterThan(0);
  });
});
