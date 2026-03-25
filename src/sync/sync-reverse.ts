/**
 * T006: Reverse Sync Use Case
 *
 * Orchestrates extraction, filtering, deduplication, classification,
 * and writing of implementation learnings from Squad to spec directory.
 *
 * Clean Architecture: imports only from ../types.ts and port interfaces defined here.
 */

import type {
  ReverseSyncOptions,
  ReverseSyncResult,
  ReverseSyncState,
  ReverseSyncSourceType,
  ExtractedReverseLearning,
  LearningsMetadata,
} from '../types.js';

import {
  isValidReverseSyncOptions,
  applyPrivacyFilter,
  classifyLearning,
  categorizeLearning,
  generateLearningsMarkdown,
  createStructuredError,
  ErrorCodes,
} from '../types.js';

import { computeLearningFingerprint } from './sync-learnings.js';

/* ------------------------------------------------------------------ */
/*  Port interfaces (Dependency Inversion)                             */
/* ------------------------------------------------------------------ */

export interface LearningExtractor {
  extract(squadDir: string, sources: ReverseSyncSourceType[]): Promise<ExtractedReverseLearning[]>;
}

export interface SpecLearningsWriter {
  write(specDir: string, content: string, metadata: LearningsMetadata): Promise<string>;
}

export interface ReverseSyncStatePersistence {
  load(specDir: string): Promise<ReverseSyncState | null>;
  save(specDir: string, state: ReverseSyncState): Promise<void>;
}

export interface ReverseConstitutionWriter {
  append(path: string, entries: ExtractedReverseLearning[]): Promise<number>;
}

/* ------------------------------------------------------------------ */
/*  Use case                                                           */
/* ------------------------------------------------------------------ */

export async function syncReverse(
  options: ReverseSyncOptions,
  extractor: LearningExtractor,
  writer: SpecLearningsWriter,
  statePersistence: ReverseSyncStatePersistence,
  fingerprinter: (title: string, content: string) => string,
  constitutionWriter?: ReverseConstitutionWriter,
): Promise<ReverseSyncResult> {
  // 1. Validate options
  if (!isValidReverseSyncOptions(options)) {
    throw createStructuredError(
      ErrorCodes.REVERSE_SYNC_FAILED,
      'Invalid reverse sync options',
    );
  }

  // 2. Load previous sync state
  const prevState = await statePersistence.load(options.specDir);
  const existingFingerprints = new Set(prevState?.syncedFingerprints ?? []);

  // 3. Extract learnings via extractor port
  const rawLearnings = await extractor.extract(options.squadDir, options.sources);

  // 4. Apply privacy filter to each learning
  let totalRedactions = 0;
  const redactionTypesSet = new Set<string>();
  let fullyRedacted = 0;

  const filtered = rawLearnings.map(learning => {
    const titleResult = applyPrivacyFilter(learning.title);
    const contentResult = applyPrivacyFilter(learning.content);

    totalRedactions += titleResult.redactionCount + contentResult.redactionCount;
    for (const t of titleResult.redactionTypes) redactionTypesSet.add(t);
    for (const t of contentResult.redactionTypes) redactionTypesSet.add(t);

    return {
      ...learning,
      title: titleResult.filtered,
      content: contentResult.filtered,
    };
  });

  // Remove fully-redacted entries (content is entirely redaction markers)
  const afterPrivacy = filtered.filter(l => {
    const strippedContent = l.content.replace(/\[REDACTED:[^\]]+\]/g, '').trim();
    if (strippedContent.length === 0 && l.content.includes('[REDACTED:')) {
      fullyRedacted++;
      return false;
    }
    return true;
  });

  // 5. Compute fingerprints and deduplicate against state
  let deduplicated = 0;
  const afterDedup = afterPrivacy.filter(l => {
    const fp = fingerprinter(l.title, l.content);
    if (existingFingerprints.has(fp)) {
      deduplicated++;
      return false;
    }
    return true;
  });

  // 6. Apply cooldown filtering
  let cooledDown = 0;
  const now = Date.now();
  const afterCooldown = afterDedup.filter(l => {
    if (options.cooldownMs <= 0) return true;
    const entryTime = new Date(l.timestamp).getTime();
    if (isNaN(entryTime)) return true;
    if (now - entryTime < options.cooldownMs) {
      cooledDown++;
      return false;
    }
    return true;
  });

  // 7. Classify each learning
  const classified = afterCooldown.map(l => ({
    ...l,
    classification: classifyLearning(l.title, l.content),
  }));

  // 8. Categorize each learning
  const categorized: ExtractedReverseLearning[] = classified.map(l => ({
    ...l,
    category: categorizeLearning(l.title, l.content),
    fingerprint: fingerprinter(l.title, l.content),
  }));

  // Compute source counts
  const sourceCounts: Record<ReverseSyncSourceType, number> = {
    histories: 0,
    decisions: 0,
    skills: 0,
  };
  for (const entry of rawLearnings) {
    sourceCounts[entry.sourceType]++;
  }

  const sourcesProcessed = options.sources.map(type => ({
    type,
    count: sourceCounts[type],
  }));

  const constitutionEntries = categorized.filter(l => l.classification === 'constitution-worthy');

  let outputPath: string | null = null;
  let constitutionEntriesAdded = 0;

  // 9. If not dryRun, write learnings.md via writer port
  if (!options.dryRun && categorized.length > 0) {
    const specId = options.specDir.replace(/\/+$/, '').split('/').pop() ?? 'unknown';
    const agents = [...new Set(categorized.map(l => l.attribution))];

    const timestamps = categorized
      .map(l => l.timestamp)
      .filter(Boolean)
      .sort();
    const start = timestamps[0]?.split('T')[0] ?? new Date().toISOString().split('T')[0];
    const end = timestamps[timestamps.length - 1]?.split('T')[0] ?? start;

    const metadata: LearningsMetadata = {
      featureName: specId,
      specId,
      executionPeriod: { start, end },
      agents,
    };

    const markdownContent = generateLearningsMarkdown(categorized, metadata);
    outputPath = await writer.write(options.specDir, markdownContent, metadata);
  }

  // 9b. Constitution enrichment: append constitution-worthy entries
  if (!options.dryRun && !options.skipConstitution && constitutionEntries.length > 0 && constitutionWriter && options.constitutionPath) {
    constitutionEntriesAdded = await constitutionWriter.append(options.constitutionPath, constitutionEntries);
  } else if (options.dryRun || options.skipConstitution) {
    // In dry-run or skip mode, report potential count without writing
    constitutionEntriesAdded = options.skipConstitution ? 0 : constitutionEntries.length;
  }

  // 10. Update sync state via statePersistence port
  if (!options.dryRun) {
    const newFingerprints = categorized.map(l => l.fingerprint);
    const newState: ReverseSyncState = {
      lastReverseSyncTimestamp: new Date().toISOString(),
      syncedFingerprints: [...existingFingerprints, ...newFingerprints],
      syncGeneration: (prevState?.syncGeneration ?? 0) + 1,
      syncHistory: [
        ...(prevState?.syncHistory ?? []),
        {
          syncTimestamp: new Date().toISOString(),
          learningsWritten: categorized.length,
          learningsDeduplicated: deduplicated,
          constitutionEntriesAdded,
          sourcesProcessed: options.sources,
          outputPath,
        },
      ],
    };
    await statePersistence.save(options.specDir, newState);
  }

  // 11. Return result
  const summary = categorized.length > 0
    ? `${categorized.length} new learnings from ${rawLearnings.length} total extracted (${deduplicated} deduped, ${cooledDown} cooled down)`
    : `No new learnings — all ${rawLearnings.length} entries already synced in previous runs.`;

  return {
    totalExtracted: rawLearnings.length,
    deduplicated,
    cooledDown,
    fullyRedacted,
    learningsWritten: categorized.length,
    constitutionEntriesAdded,
    sourcesProcessed,
    outputPath,
    dryRun: options.dryRun,
    redactionSummary: {
      totalRedactions,
      types: Array.from(redactionTypesSet),
    },
    summary,
  };
}
