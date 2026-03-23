/**
 * T022: BuildSquadContext Use Case
 *
 * Orchestrates the full context generation pipeline:
 *   1. Read Squad state via SquadStateReader port
 *   2. Score and prioritize entries
 *   3. Apply SummarizeContent
 *   4. Produce ContextSummary entity
 *   5. Write via ContextWriter port
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
 * Handles empty state gracefully (FR-019): if no sources are found,
 * produces a valid but empty ContextSummary.
 */
export async function buildSquadContext(
  reader: SquadStateReader,
  writer: ContextWriter,
  options: BuildContextOptions,
): Promise<BuildContextResult> {
  const { config } = options;

  // Read all configured sources in parallel
  const [skills, decisions, learnings] = await Promise.all([
    config.sources.skills ? reader.readSkills() : Promise.resolve([]),
    config.sources.decisions ? reader.readDecisions() : Promise.resolve([]),
    config.sources.histories ? reader.readLearnings() : Promise.resolve([]),
  ]);

  // Apply progressive summarization
  const summary = summarizeContent({
    skills,
    decisions,
    learnings,
    config,
  });

  // Write the context summary via the output port
  await writer.write(summary);

  return { summary };
}
