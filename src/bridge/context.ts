/**
 * T022 + T034: BuildSquadContext Use Case
 *
 * Orchestrates the full context generation pipeline:
 *   1. Read previous context metadata for cycle detection (T034)
 *   2. Read Squad state via SquadStateReader port
 *   3. Score and prioritize entries
 *   4. Apply SummarizeContent with cycle awareness
 *   5. Produce ContextSummary entity with cycle count
 *   6. Write via ContextWriter port
 *
 * Imports ONLY from types.ts and ports.ts — no I/O, no frameworks.
 */

import type { BridgeConfig, ContextSummary } from '../types.js';
import type { SquadStateReader, ContextWriter } from './ports.js';
import { summarizeContent } from './summarizer.js';

export interface BuildContextOptions {
  config: BridgeConfig;
}

export interface BuildContextResult {
  summary: ContextSummary;
}

/**
 * Build Squad context for Spec Kit planning consumption.
 *
 * Reads all configured sources, applies progressive summarization,
 * writes the result via the context writer port.
 *
 * Cycle detection (T034): reads previous squad-context.md metadata
 * to extract last generation timestamp and cycle count. Passes timestamp
 * to readLearnings for incremental filtering and to summarizer for
 * recency bias weighting.
 */
export async function buildSquadContext(
  reader: SquadStateReader,
  writer: ContextWriter,
  options: BuildContextOptions,
): Promise<BuildContextResult> {
  const { config } = options;

  // T034: Detect previous cycle
  const previousMeta = await writer.readPreviousMetadata();
  const previousGenerated = previousMeta?.generated;
  const previousCycleCount = previousMeta?.cycleCount ?? 0;

  // Determine since-filter for incremental learning reads
  const sinceDateFilter = previousGenerated
    ? new Date(previousGenerated)
    : undefined;

  // Read all configured sources in parallel
  const [skills, decisions, learnings] = await Promise.all([
    config.sources.skills ? reader.readSkills() : Promise.resolve([]),
    config.sources.decisions ? reader.readDecisions() : Promise.resolve([]),
    config.sources.histories
      ? reader.readLearnings(sinceDateFilter)
      : Promise.resolve([]),
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

  // Write the context summary via the output port
  await writer.write(summary);

  return { summary };
}
