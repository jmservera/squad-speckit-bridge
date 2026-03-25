/**
 * T013: Integration tests for constitution enrichment via reverse sync
 *
 * Tests the constitution writer adapter's interaction with the full reverse sync pipeline.
 * Uses real filesystem I/O, no mocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { syncReverse } from '../../src/sync/sync-reverse.js';
import { computeLearningFingerprint } from '../../src/sync/sync-learnings.js';
import { LearningExtractorAdapter } from '../../src/sync/adapters/learning-extractor.js';
import { SpecLearningsWriterAdapter } from '../../src/sync/adapters/spec-learnings-writer.js';
import { ReverseSyncStateAdapter } from '../../src/sync/adapters/reverse-sync-state-adapter.js';
import { ReverseConstitutionAdapter } from '../../src/sync/adapters/reverse-constitution-adapter.js';
import type { ReverseSyncOptions, ExtractedReverseLearning } from '../../src/types.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a minimal Squad directory with entries that have known classification:
 * - Constitution-worthy: entries with "non-negotiable", "MUST", "all features"
 * - Learnings-only: entries with "workaround", "debug", "vi.doMock", file refs
 */
async function createSquadWithMixedEntries(squadDir: string): Promise<void> {
  await mkdir(join(squadDir, 'agents', 'alpha'), { recursive: true });

  // Agent with mixed entries
  await writeFile(
    join(squadDir, 'agents', 'alpha', 'history.md'),
    `# Alpha — Agent History

## Learnings

### 2026-01-10: Non-Negotiable API Versioning Rule

All public APIs MUST have version negotiation — this is a non-negotiable
architectural constraint for all features project-wide.

### 2026-01-11: Quick Debug Workaround

Quick workaround for debug output in src/utils.ts:42 — toggle the verbose
flag when running integration tests locally. This is an implementation detail.

### 2026-01-12: Project-Wide Compatibility Requirement

Every spec MUST include backward compatibility analysis — this applies to
all features and is a breaking change gate.

### 2026-01-13: Vi.doMock Testing Technique

Use vi.doMock for testing ESM modules with dynamic imports. This is a code pattern
specific to our test infrastructure. Implementation detail for test files.

### 2026-01-14: Architecture Constraint for All Services

Every microservice MUST implement health check endpoints — this is a non-negotiable
requirement for all features across the project.
`,
    'utf-8',
  );

  // Minimal decisions file
  await writeFile(
    join(squadDir, 'decisions.md'),
    `# Squad Decisions

## Active Decisions

### Enforce strict typing everywhere (2026-01-15)

**Status**: Adopted

The team chose to enforce strict TypeScript mode for all new code project-wide. This is non-negotiable.
`,
    'utf-8',
  );
}

/* ------------------------------------------------------------------ */
/*  Shared adapter instances                                           */
/* ------------------------------------------------------------------ */

const extractor = new LearningExtractorAdapter();
const writer = new SpecLearningsWriterAdapter();
const statePersistence = new ReverseSyncStateAdapter();
const constitutionWriter = new ReverseConstitutionAdapter();

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Integration: constitution enrichment via reverse sync', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  // ── 1. Constitution append test ───────────────────────────────────

  describe('constitution append', () => {
    it('appends new entries under ## Implementation Learnings, preserving existing content', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'const-append-'));
      tempDirs.push(baseDir);

      const specDir = join(baseDir, 'specs', 'test');
      const squadDir = join(baseDir, '.squad');
      const constitutionPath = join(baseDir, 'constitution.md');

      await mkdir(specDir, { recursive: true });
      await createSquadWithMixedEntries(squadDir);

      // Pre-populate constitution with existing content
      const existingContent = `# Project Constitution

## Core Values

- Clean Architecture always
- Test everything

## Other Section

Some important notes here.
`;
      await writeFile(constitutionPath, existingContent, 'utf-8');

      const result = await syncReverse(
        {
          specDir,
          squadDir,
          dryRun: false,
          cooldownMs: 0,
          sources: ['histories', 'decisions'],
          skipConstitution: false,
          constitutionPath,
        },
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      const content = await readFile(constitutionPath, 'utf-8');

      // Existing content preserved
      expect(content).toContain('## Core Values');
      expect(content).toContain('Clean Architecture always');
      expect(content).toContain('## Other Section');

      // Constitution-worthy entries should be added
      if (result.constitutionEntriesAdded > 0) {
        expect(content).toContain('## Implementation Learnings');
      }
    });
  });

  // ── 2. Classification gate test ───────────────────────────────────

  describe('classification gate', () => {
    it('only constitution-worthy entries reach constitution; learnings-only stay in learnings.md', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'const-classify-'));
      tempDirs.push(baseDir);

      const specDir = join(baseDir, 'specs', 'test');
      const squadDir = join(baseDir, '.squad');
      const constitutionPath = join(baseDir, 'constitution.md');

      await mkdir(specDir, { recursive: true });
      await createSquadWithMixedEntries(squadDir);
      await writeFile(constitutionPath, '# Project Constitution\n', 'utf-8');

      const result = await syncReverse(
        {
          specDir,
          squadDir,
          dryRun: false,
          cooldownMs: 0,
          sources: ['histories'],
          skipConstitution: false,
          constitutionPath,
        },
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      const constitutionContent = await readFile(constitutionPath, 'utf-8');
      const learningsContent = await readFile(join(specDir, 'learnings.md'), 'utf-8');

      // Learnings-only entries should NOT appear in constitution
      // "Quick Debug Workaround" has "workaround", "debug", file ref → learnings-only
      expect(constitutionContent).not.toContain('Quick Debug Workaround');
      // "Vi.doMock Testing Technique" has "vi.doMock", "code pattern" → learnings-only
      expect(constitutionContent).not.toContain('Vi.doMock Testing Technique');

      // All entries should appear in learnings.md
      expect(learningsContent.length).toBeGreaterThan(100);
      expect(result.learningsWritten).toBeGreaterThan(0);

      // At least some constitution-worthy entries should exist
      // "Non-Negotiable API Versioning Rule" has "non-negotiable", "MUST" → constitution-worthy
      expect(result.constitutionEntriesAdded).toBeGreaterThan(0);
    });
  });

  // ── 3. --no-constitution flag test ────────────────────────────────

  describe('--no-constitution flag', () => {
    it('skipConstitution=true leaves constitution file unchanged', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'const-skip-'));
      tempDirs.push(baseDir);

      const specDir = join(baseDir, 'specs', 'test');
      const squadDir = join(baseDir, '.squad');
      const constitutionPath = join(baseDir, 'constitution.md');

      await mkdir(specDir, { recursive: true });
      await createSquadWithMixedEntries(squadDir);

      const original = '# Project Constitution\n\nOriginal content, untouched.\n';
      await writeFile(constitutionPath, original, 'utf-8');

      const result = await syncReverse(
        {
          specDir,
          squadDir,
          dryRun: false,
          cooldownMs: 0,
          sources: ['histories', 'decisions'],
          skipConstitution: true,
        },
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        // No constitution writer passed when skipping
        undefined,
      );

      const content = await readFile(constitutionPath, 'utf-8');
      expect(content).toBe(original);

      // Learnings still written
      expect(result.learningsWritten).toBeGreaterThan(0);
      // Constitution entries reported as 0
      expect(result.constitutionEntriesAdded).toBe(0);
    });
  });

  // ── 4. Deduplication across constitution ──────────────────────────

  describe('deduplication across constitution', () => {
    it('running twice does not duplicate entries in constitution', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'const-dedup-'));
      tempDirs.push(baseDir);

      const specDir = join(baseDir, 'specs', 'test');
      const squadDir = join(baseDir, '.squad');
      const constitutionPath = join(baseDir, 'constitution.md');

      await mkdir(specDir, { recursive: true });
      await createSquadWithMixedEntries(squadDir);
      await writeFile(constitutionPath, '# Project Constitution\n', 'utf-8');

      const opts: ReverseSyncOptions = {
        specDir,
        squadDir,
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions'],
        skipConstitution: false,
        constitutionPath,
      };

      // First run
      const first = await syncReverse(
        opts,
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      const afterFirst = await readFile(constitutionPath, 'utf-8');

      // Second run — sync state should deduplicate everything
      const second = await syncReverse(
        opts,
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      const afterSecond = await readFile(constitutionPath, 'utf-8');

      // Second run should add 0 new constitution entries
      expect(second.constitutionEntriesAdded).toBe(0);
      expect(second.deduplicated).toBeGreaterThan(0);

      // Constitution file should not have grown (or only trivially if format differs)
      // The key check: no duplicate section titles
      if (first.constitutionEntriesAdded > 0) {
        expect(afterSecond).toContain('## Implementation Learnings');
        // Count occurrences of the section header — should be exactly 1
        const sectionCount = (afterSecond.match(/## Implementation Learnings/g) || []).length;
        expect(sectionCount).toBe(1);
      }
    });
  });

  // ── 5. Empty constitution-worthy set ──────────────────────────────

  describe('empty constitution-worthy set', () => {
    it('learnings-only entries do not modify constitution or add empty section', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'const-empty-'));
      tempDirs.push(baseDir);

      const specDir = join(baseDir, 'specs', 'test');
      const squadDir = join(baseDir, '.squad');
      const constitutionPath = join(baseDir, 'constitution.md');

      await mkdir(specDir, { recursive: true });

      // Create squad with ONLY learnings-only entries (workarounds, debug, code patterns)
      await mkdir(join(squadDir, 'agents', 'beta'), { recursive: true });
      await writeFile(
        join(squadDir, 'agents', 'beta', 'history.md'),
        `# Beta — Agent History

## Learnings

### 2026-02-01: Quick Debug Fix

A workaround for debug output in tests/unit/helper.ts:15 — toggle verbose
flag when running locally. Implementation detail only.

### 2026-02-02: Testing Pattern With vi.doMock

Use vi.doMock for ESM module testing. This code pattern is specific to
our test infrastructure and is an implementation detail.

### 2026-02-03: Import Path Config Tweak

Config tweak for import paths in tsconfig — use path aliases to avoid
brittle relative imports. A refactor convenience.
`,
        'utf-8',
      );

      const original = '# Project Constitution\n\nKeep it clean.\n';
      await writeFile(constitutionPath, original, 'utf-8');

      const result = await syncReverse(
        {
          specDir,
          squadDir,
          dryRun: false,
          cooldownMs: 0,
          sources: ['histories'],
          skipConstitution: false,
          constitutionPath,
        },
        extractor,
        writer,
        statePersistence,
        computeLearningFingerprint,
        constitutionWriter,
      );

      const content = await readFile(constitutionPath, 'utf-8');

      // Constitution should be unchanged — no empty "## Implementation Learnings" section
      expect(content).toBe(original);
      expect(result.constitutionEntriesAdded).toBe(0);

      // But learnings.md should still have been written
      expect(result.learningsWritten).toBeGreaterThan(0);
      expect(await fileExists(join(specDir, 'learnings.md'))).toBe(true);
    });
  });
});
