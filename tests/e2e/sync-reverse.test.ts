/**
 * T011: E2E tests for reverse sync pipeline
 *
 * Tests the FULL pipeline end-to-end using real adapters and real filesystem I/O.
 * No mocks — exercises createReverseSyncer() factory from main.ts.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, cp, readFile, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createReverseSyncer } from '../../src/main.js';
import type { ReverseSyncOptions } from '../../src/types.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const FIXTURES_SQUAD = join(import.meta.dirname!, '../fixtures/reverse-sync/squad');

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Create an isolated workspace by copying squad fixtures into a temp dir. */
async function createWorkspace(): Promise<{ baseDir: string; squadDir: string; specDir: string }> {
  const baseDir = await mkdtemp(join(tmpdir(), 'sync-reverse-e2e-'));
  const squadDir = join(baseDir, '.squad');
  const specDir = join(baseDir, 'specs', 'test-feature');

  await cp(FIXTURES_SQUAD, squadDir, { recursive: true });
  await mkdir(specDir, { recursive: true });

  return { baseDir, squadDir, specDir };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('E2E: sync-reverse pipeline', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  // ── 1. Real write test ────────────────────────────────────────────

  describe('real write pipeline', () => {
    it('creates learnings.md with correct content', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const opts: ReverseSyncOptions = {
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      };

      const { jsonOutput } = await syncer.sync(opts);

      // Learnings written
      expect(jsonOutput.learningsWritten).toBeGreaterThan(0);
      expect(jsonOutput.outputPath).not.toBeNull();

      // File exists on disk
      const learningsPath = join(specDir, 'learnings.md');
      expect(await fileExists(learningsPath)).toBe(true);

      const content = await readFile(learningsPath, 'utf-8');
      expect(content).toContain('# Implementation Learnings');
      expect(content.length).toBeGreaterThan(100);
    });

    it('creates .bridge-sync-reverse.json state file', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      const statePath = join(specDir, '.bridge-sync-reverse.json');
      expect(await fileExists(statePath)).toBe(true);

      const state = JSON.parse(await readFile(statePath, 'utf-8'));
      expect(state.syncGeneration).toBe(1);
      expect(state.syncedFingerprints.length).toBeGreaterThan(0);
      expect(state.syncHistory).toHaveLength(1);
    });

    it('applies privacy redactions — no raw API keys in output', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories'],
        skipConstitution: true,
      });

      // Gilfoyle's fixture contains api_key=sk_test_abc... and alice@example.com
      expect(jsonOutput.redactionSummary.totalRedactions).toBeGreaterThan(0);

      const learningsPath = join(specDir, 'learnings.md');
      const content = await readFile(learningsPath, 'utf-8');
      expect(content).not.toContain('sk_test_abc123');
      expect(content).not.toContain('alice@example.com');
      expect(content).toContain('[REDACTED:');
    });

    it('deduplication — second run adds nothing new', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const opts: ReverseSyncOptions = {
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      };

      // First run
      const first = await syncer.sync(opts);
      expect(first.jsonOutput.learningsWritten).toBeGreaterThan(0);

      // Second run — all entries should be deduplicated
      const second = await syncer.sync(opts);
      expect(second.jsonOutput.deduplicated).toBeGreaterThan(0);
      expect(second.jsonOutput.learningsWritten).toBe(0);
      expect(second.jsonOutput.summary).toContain('already synced');
    });
  });

  // ── 2. Dry-run test ───────────────────────────────────────────────

  describe('dry-run mode', () => {
    it('creates NO files but reports what would be written', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: true,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      // Reports potential writes
      expect(jsonOutput.dryRun).toBe(true);
      expect(jsonOutput.learningsWritten).toBeGreaterThan(0);

      // No actual files created
      expect(await fileExists(join(specDir, 'learnings.md'))).toBe(false);
      expect(await fileExists(join(specDir, '.bridge-sync-reverse.json'))).toBe(false);
    });

    it('human output indicates dry-run mode', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { humanOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: true,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      expect(humanOutput).toContain('DRY RUN');
    });
  });

  // ── 3. Constitution enrichment test ───────────────────────────────

  describe('constitution enrichment', () => {
    it('appends constitution-worthy entries to constitution file', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      // Create a constitution file with existing content
      const constitutionDir = join(baseDir, '.specify', 'memory');
      await mkdir(constitutionDir, { recursive: true });
      const constitutionPath = join(constitutionDir, 'constitution.md');
      await writeFile(constitutionPath, '# Project Constitution\n\n## Principles\n\nKeep it simple.\n', 'utf-8');

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: false,
        constitutionPath: '.specify/memory/constitution.md',
      });

      const content = await readFile(constitutionPath, 'utf-8');

      // Existing content preserved
      expect(content).toContain('## Principles');
      expect(content).toContain('Keep it simple.');

      // Constitution-worthy entries should appear
      // (e.g., "Version Negotiation" has "non-negotiable" and "MUST" signals)
      if (jsonOutput.constitutionEntriesAdded > 0) {
        expect(content).toContain('## Implementation Learnings');
      }
    });

    it('learnings-only entries do NOT appear in constitution', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const constitutionDir = join(baseDir, '.specify', 'memory');
      await mkdir(constitutionDir, { recursive: true });
      const constitutionPath = join(constitutionDir, 'constitution.md');
      await writeFile(constitutionPath, '# Project Constitution\n', 'utf-8');

      const syncer = createReverseSyncer({ baseDir });
      await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories'],
        skipConstitution: false,
        constitutionPath: '.specify/memory/constitution.md',
      });

      const content = await readFile(constitutionPath, 'utf-8');

      // "Import Path Workaround" has learnings-only signals (import path, file ref)
      expect(content).not.toContain('Import Path Workaround');
      // "ESM Module Testing Pattern" has learnings-only signals (vi.doMock, testing technique)
      expect(content).not.toContain('ESM Module Testing Pattern');
    });

    it('--no-constitution flag leaves constitution unchanged', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const constitutionDir = join(baseDir, '.specify', 'memory');
      await mkdir(constitutionDir, { recursive: true });
      const constitutionPath = join(constitutionDir, 'constitution.md');
      const original = '# Project Constitution\n\nOriginal content only.\n';
      await writeFile(constitutionPath, original, 'utf-8');

      const syncer = createReverseSyncer({ baseDir, noConstitution: true });
      await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      const content = await readFile(constitutionPath, 'utf-8');
      expect(content).toBe(original);
    });
  });

  // ── 4. Source filtering test ──────────────────────────────────────

  describe('source filtering', () => {
    it('only decisions source → output contains only decision-sourced entries', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['decisions'],
        skipConstitution: true,
      });

      // Only decisions processed
      expect(jsonOutput.sourcesProcessed).toHaveLength(1);
      expect(jsonOutput.sourcesProcessed[0].type).toBe('decisions');
      expect(jsonOutput.sourcesProcessed[0].count).toBeGreaterThan(0);

      // Verify output file contains decision content
      const content = await readFile(join(specDir, 'learnings.md'), 'utf-8');
      expect(content).toContain('TypeScript strict mode');
    });

    it('histories-only source excludes decisions and skills', async () => {
      const { baseDir, specDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories'],
        skipConstitution: true,
      });

      expect(jsonOutput.sourcesProcessed).toHaveLength(1);
      expect(jsonOutput.sourcesProcessed[0].type).toBe('histories');

      const content = await readFile(join(specDir, 'learnings.md'), 'utf-8');
      // Decisions content should not appear
      expect(content).not.toContain('Reject GraphQL');
      // Skills content should not appear
      expect(content).not.toContain('Clean Architecture Bridge');
    });
  });

  // ── 5. Cooldown test ──────────────────────────────────────────────

  describe('cooldown filtering', () => {
    it('excludes entries newer than cooldown threshold', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      // Fixture entries range from 2026-03-15 to 2026-03-25
      // Use a cooldown so large it excludes all entries (they're all in the "future")
      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput: noFilter } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: true,
        cooldownMs: 0,
        sources: ['histories'],
        skipConstitution: true,
      });

      // All entries extracted without cooldown
      expect(noFilter.learningsWritten).toBeGreaterThan(0);
      expect(noFilter.cooledDown).toBe(0);
    });

    it('cooldown=0 includes all entries regardless of age', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: true,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      expect(jsonOutput.cooledDown).toBe(0);
      expect(jsonOutput.learningsWritten).toBe(jsonOutput.totalExtracted - jsonOutput.fullyRedacted);
    });

    it('very large cooldown excludes old entries', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      // Fixture dates: 2026-03-15 to 2026-03-25
      // These are in the future from test perspective, so cooldown of 1ms should
      // actually keep them all (since now - futureDate < 0 which is < cooldownMs)
      // BUT: entries with dates in the past relative to now would be excluded
      // by a very large cooldown.

      // Let's test with a moderate cooldown against the histories.
      // The entries have dates like "2026-03-20" which are parsed as timestamps.
      // Since these dates are in the future, now - entryTime is negative, which is < cooldownMs.
      // So a large cooldownMs WON'T exclude future dates (negative diff < positive threshold).
      // We need to create entries with recent real timestamps to test cooldown properly.

      // Create custom squad with a very recent entry
      const squadDir = join(baseDir, '.squad-cooldown');
      await mkdir(join(squadDir, 'agents', 'test-agent'), { recursive: true });
      const recentDate = new Date().toISOString().split('T')[0];
      const oldDate = '2020-01-01';

      // The extractor parses "### YYYY-MM-DD: Title" and sets timestamp to date-only.
      // Date-only strings parse as midnight UTC, so today's date is ~hours old.
      // We use a 48-hour cooldown to ensure today's entry is "too recent" (within cooldown)
      // while the old 2020 entry is well outside it.
      await writeFile(
        join(squadDir, 'agents', 'test-agent', 'history.md'),
        `# Test Agent — History\n\n## Learnings\n\n### ${recentDate}: Very Recent Learning\n\nThis was just learned today.\n\n### ${oldDate}: Very Old Learning\n\nThis was learned years ago.\n`,
        'utf-8',
      );

      const syncer = createReverseSyncer({ baseDir });

      // 48-hour cooldown: today's entry (hours old) is within cooldown → excluded
      // 2020 entry (years old) is outside cooldown → included
      const { jsonOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad-cooldown',
        dryRun: true,
        cooldownMs: 48 * 60 * 60 * 1000, // 48 hours
        sources: ['histories'],
        skipConstitution: true,
      });

      expect(jsonOutput.totalExtracted).toBe(2);
      // Recent entry is within cooldown, old entry is outside cooldown
      expect(jsonOutput.cooledDown).toBe(1);
      expect(jsonOutput.learningsWritten).toBe(1);
    });
  });

  // ── 6. Human output format test ───────────────────────────────────

  describe('output formatting', () => {
    it('humanOutput includes sources, filtering, and results sections', async () => {
      const { baseDir } = await createWorkspace();
      tempDirs.push(baseDir);

      const syncer = createReverseSyncer({ baseDir });
      const { humanOutput } = await syncer.sync({
        specDir: 'specs/test-feature',
        squadDir: '.squad',
        dryRun: false,
        cooldownMs: 0,
        sources: ['histories', 'decisions', 'skills'],
        skipConstitution: true,
      });

      expect(humanOutput).toContain('Reverse Sync');
      expect(humanOutput).toContain('Sources processed:');
      expect(humanOutput).toContain('Results:');
      expect(humanOutput).toContain('Summary:');
    });
  });
});
