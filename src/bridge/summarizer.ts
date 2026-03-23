/**
 * T021: SummarizeContent Use Case
 *
 * Three-tier progressive summarization per research.md RC-4:
 *   1. Priority ordering: skills (full) → decisions (filtered) → learnings (summarized)
 *   2. Recency bias within sections using computeRelevanceScore
 *   3. Content compression for large entries (first paragraph + bullet lists)
 *
 * Pure logic — imports ONLY from types.ts. No I/O, no frameworks.
 */

import type {
  BridgeConfig,
  ContextSummary,
  DecisionEntry,
  LearningEntry,
  SkillEntry,
} from '../types.js';
import { computeRelevanceScore } from '../types.js';

export interface SummarizeInput {
  skills: SkillEntry[];
  decisions: DecisionEntry[];
  learnings: LearningEntry[];
  config: BridgeConfig;
}

/** Compress a large text block: keep first paragraph + bullet/numbered lists. */
export function compressContent(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let foundFirstParagraph = false;
  let inFirstParagraph = true;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inFirstParagraph) {
      if (trimmed === '' && result.length > 0) {
        // End of first paragraph
        inFirstParagraph = false;
        foundFirstParagraph = true;
        result.push('');
        continue;
      }
      result.push(line);
      continue;
    }

    // After first paragraph: only keep bullet/numbered list items and headings
    if (
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('• ') ||
      /^\d+\.\s/.test(trimmed) ||
      trimmed.startsWith('#')
    ) {
      result.push(line);
    }
  }

  if (!foundFirstParagraph) {
    return text;
  }

  // Remove trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result.join('\n');
}

/** Estimate byte size of a string (UTF-8). */
function byteSize(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Score and sort decisions by relevance, filter by age. */
function filterDecisions(
  decisions: DecisionEntry[],
  config: BridgeConfig,
): DecisionEntry[] {
  const now = new Date();
  const maxAgeDays = config.summarization.maxDecisionAgeDays;

  return decisions
    .map((d) => ({
      ...d,
      relevanceScore: computeRelevanceScore(d, now),
    }))
    .filter((d) => {
      // Filter out decisions older than maxDecisionAgeDays
      const parsed = Date.parse(d.date);
      if (isNaN(parsed)) return true; // keep undated decisions
      const ageDays =
        (now.getTime() - new Date(parsed).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays <= maxAgeDays;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/** Summarize learnings: keep most recent entries from each agent. */
function summarizeLearnings(learnings: LearningEntry[]): LearningEntry[] {
  return learnings.map((le) => {
    // Sort entries by date (most recent first), then compress
    const sorted = [...le.entries].sort((a, b) => {
      const da = Date.parse(a.date);
      const db = Date.parse(b.date);
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return db - da;
    });

    // Compress each entry's summary
    const compressed = sorted.map((entry) => ({
      ...entry,
      summary: compressContent(entry.summary),
    }));

    return {
      ...le,
      entries: compressed,
      rawSize: byteSize(compressed.map((e) => e.summary).join('\n')),
    };
  });
}

/** Render a skill entry to markdown for size estimation. */
function renderSkill(skill: SkillEntry): string {
  const lines: string[] = [];
  lines.push(`### ${skill.name}`);
  lines.push('');
  lines.push(skill.context);

  if (skill.patterns.length > 0) {
    lines.push('');
    lines.push('**Patterns:**');
    for (const p of skill.patterns) {
      lines.push(`- ${p}`);
    }
  }

  if (skill.antiPatterns.length > 0) {
    lines.push('');
    lines.push('**Anti-Patterns:**');
    for (const ap of skill.antiPatterns) {
      lines.push(`- ${ap}`);
    }
  }

  return lines.join('\n');
}

/** Render a decision entry to markdown. */
function renderDecision(d: DecisionEntry): string {
  return `### ${d.title} (${d.date})\n\n**Status:** ${d.status}\n\n${d.summary}`;
}

/** Render a learning entry to markdown. */
function renderLearning(le: LearningEntry): string {
  const lines: string[] = [];
  lines.push(`### ${le.agentName} (${le.agentRole})`);
  for (const entry of le.entries) {
    lines.push('');
    lines.push(`**${entry.date}: ${entry.title}**`);
    lines.push(entry.summary);
  }
  return lines.join('\n');
}

/**
 * Progressive summarization — fit content within contextMaxBytes budget.
 *
 * Priority order: skills full → decisions filtered → learnings summarized.
 * Each tier is added only if budget remains.
 */
export function summarizeContent(input: SummarizeInput): ContextSummary {
  const { config } = input;
  const budget = config.contextMaxBytes;
  const warnings: string[] = [];

  // Track included content
  const includedSkills: SkillEntry[] = [];
  const includedDecisions: DecisionEntry[] = [];
  const includedLearnings: LearningEntry[] = [];
  const skipped: string[] = [];

  // Overhead for section headers and frontmatter (~300 bytes estimated)
  const overhead = 300;
  let usedBytes = overhead;

  // Tier 1: Skills — full content, highest priority
  if (config.sources.skills) {
    for (const skill of input.skills) {
      const rendered = renderSkill(skill);
      const size = byteSize(rendered);
      if (usedBytes + size <= budget) {
        includedSkills.push(skill);
        usedBytes += size;
      } else {
        // Try compressed version
        const compressed = compressContent(rendered);
        const compressedSize = byteSize(compressed);
        if (usedBytes + compressedSize <= budget) {
          includedSkills.push({
            ...skill,
            context: compressContent(skill.context),
          });
          usedBytes += compressedSize;
        } else {
          skipped.push(`skill:${skill.name} (${size} bytes, budget exceeded)`);
          warnings.push(`Skipped skill "${skill.name}" — exceeds budget`);
        }
      }
    }
  }

  // Tier 2: Decisions — filtered by recency and scored
  if (config.sources.decisions) {
    const filtered = filterDecisions(input.decisions, config);
    for (const decision of filtered) {
      const rendered = renderDecision(decision);
      const size = byteSize(rendered);
      if (usedBytes + size <= budget) {
        includedDecisions.push(decision);
        usedBytes += size;
      } else {
        // Try with just summary (no fullContent)
        const shortRendered = `### ${decision.title} (${decision.date})\n\n**Status:** ${decision.status}`;
        const shortSize = byteSize(shortRendered);
        if (usedBytes + shortSize <= budget) {
          includedDecisions.push({
            ...decision,
            summary: '',
            fullContent: '',
          });
          usedBytes += shortSize;
        } else {
          skipped.push(`decision:${decision.title}`);
        }
      }
    }
  }

  // Tier 3: Learnings — summarized and compressed
  if (config.sources.histories) {
    const summarized = summarizeLearnings(input.learnings);
    for (const learning of summarized) {
      const rendered = renderLearning(learning);
      const size = byteSize(rendered);
      if (usedBytes + size <= budget) {
        includedLearnings.push(learning);
        usedBytes += size;
      } else {
        // Try with fewer entries
        const reduced = { ...learning, entries: learning.entries.slice(0, 2) };
        const reducedRendered = renderLearning(reduced);
        const reducedSize = byteSize(reducedRendered);
        if (usedBytes + reducedSize <= budget) {
          includedLearnings.push(reduced);
          usedBytes += reducedSize;
        } else {
          skipped.push(`learning:${learning.agentName}`);
        }
      }
    }
  }

  return {
    metadata: {
      generated: new Date().toISOString(),
      sources: {
        skills: includedSkills.length,
        decisions: includedDecisions.length,
        histories: includedLearnings.length,
        skipped,
      },
      sizeBytes: usedBytes,
      maxBytes: budget,
    },
    content: {
      skills: includedSkills,
      decisions: includedDecisions,
      learnings: includedLearnings,
      warnings,
    },
  };
}
