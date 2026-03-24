/**
 * T022 + T034 + T003: BuildSquadContext Use Case
 *
 * Orchestrates the full context generation pipeline:
 *   1. Read previous context metadata for cycle detection (T034)
 *   2. Read Squad state via SquadStateReader port
 *   3. Score and prioritize entries
 *   4. Apply SummarizeContent with cycle awareness
 *   5. Produce ContextSummary entity with cycle count
 *   6. Write via ContextWriter port
 *
 * T003 hardening: graceful handling of missing/partial .squad/ subdirs,
 * valid output with warnings for skipped sources, empty-source scenarios.
 *
 * Imports ONLY from types.ts and ports.ts — no I/O, no frameworks.
 */

import type {
  BridgeConfig,
  ContextSummary,
  DecisionEntry,
  LearningEntry,
  SkillEntry,
} from '../types.js';
import type { SquadStateReader, ContextWriter } from './ports.js';
import { summarizeContent } from './summarizer.js';

export interface BuildContextOptions {
  config: BridgeConfig;
}

export interface BuildContextResult {
  summary: ContextSummary;
  warnings: string[];
}

/** Safely call an async reader, returning fallback on error and collecting a warning. */
async function safeRead<T>(
  fn: () => Promise<T>,
  fallback: T,
  sourceName: string,
  warnings: string[],
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    warnings.push(
      `Skipped ${sourceName}: ${message}`,
    );
    return fallback;
  }
}

/**
 * Build Squad context for Spec Kit planning consumption.
 *
 * Reads all configured sources, applies progressive summarization,
 * writes the result via the context writer port.
 *
 * Gracefully handles missing/partial .squad/ directories by catching
 * reader errors and producing valid output with warnings for any
 * skipped sources.
 */
export async function buildSquadContext(
  reader: SquadStateReader,
  writer: ContextWriter,
  options: BuildContextOptions,
): Promise<BuildContextResult> {
  const { config } = options;
  const warnings: string[] = [];

  // T034: Detect previous cycle (non-fatal if unavailable)
  let previousGenerated: string | undefined;
  let previousCycleCount = 0;
  try {
    const previousMeta = await writer.readPreviousMetadata();
    previousGenerated = previousMeta?.generated;
    previousCycleCount = previousMeta?.cycleCount ?? 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not read previous metadata: ${message}`);
  }

  // Determine since-filter for incremental learning reads
  const sinceDateFilter = previousGenerated
    ? new Date(previousGenerated)
    : undefined;

  // Read all configured sources in parallel with graceful fallbacks
  const [skills, decisions, learnings] = await Promise.all([
    config.sources.skills
      ? safeRead<SkillEntry[]>(
          () => reader.readSkills(),
          [],
          'skills',
          warnings,
        )
      : Promise.resolve([] as SkillEntry[]),
    config.sources.decisions
      ? safeRead<DecisionEntry[]>(
          () => reader.readDecisions(),
          [],
          'decisions',
          warnings,
        )
      : Promise.resolve([] as DecisionEntry[]),
    config.sources.histories
      ? safeRead<LearningEntry[]>(
          () => reader.readLearnings(sinceDateFilter),
          [],
          'histories',
          warnings,
        )
      : Promise.resolve([] as LearningEntry[]),
  ]);

  // Apply progressive summarization with cycle awareness
  const summary = summarizeContent({
    skills,
    decisions,
    learnings,
    config,
    previousGenerated,
  });

  // T034: Track cycle count in output metadata
  summary.metadata.cycleCount = previousCycleCount + 1;

  // Merge orchestration-level warnings into summary
  summary.content.warnings = [
    ...warnings,
    ...summary.content.warnings,
  ];

  // Write the context summary (non-fatal if writer fails)
  try {
    await writer.write(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to write context: ${message}`);
    summary.content.warnings = [
      ...summary.content.warnings,
      `Failed to write context: ${message}`,
    ];
  }

  return { summary, warnings };
}
