/**
 * T015: matchSkillsToTask — Skill Matching Pipeline
 *
 * Keyword-based matching between task descriptions and skill content.
 * Context-window-aware truncation (8KB default, configurable to 32KB).
 * Pure function at the core; adapter integration via SquadStateReader port.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ./ports.ts.
 */

import type { SkillEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Configuration & types
// ---------------------------------------------------------------------------

export interface SkillMatchConfig {
  /** Maximum bytes for matched skill context. Default: 8192 (8KB). Max: 32768. */
  maxContextBytes: number;
  /** Minimum relevance score (0–1) to include a skill. Default: 0.1 */
  minRelevance: number;
}

export interface SkillMatch {
  skill: SkillEntry;
  relevance: number;
  matchedKeywords: string[];
}

export interface SkillMatchResult {
  matches: SkillMatch[];
  prompt: string;
  totalSkills: number;
  includedSkills: number;
  truncated: boolean;
  contextBytes: number;
  maxContextBytes: number;
}

const DEFAULT_CONFIG: SkillMatchConfig = {
  maxContextBytes: 8192,
  minRelevance: 0.1,
};

// ---------------------------------------------------------------------------
// Keyword extraction (pure)
// ---------------------------------------------------------------------------

/** Common stop words to exclude from keyword extraction. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he',
  'she', 'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your',
  'his', 'their', 'not', 'no', 'nor', 'so', 'if', 'then', 'else', 'when',
  'up', 'out', 'about', 'into', 'over', 'after', 'before', 'between',
  'under', 'above', 'such', 'each', 'which', 'what', 'who', 'whom',
  'how', 'all', 'both', 'few', 'more', 'most', 'other', 'some', 'any',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
  'using', 'use', 'implement', 'create', 'add', 'make', 'set',
]);

/**
 * Extracts meaningful keywords from text.
 * Tokenises on non-alphanumeric boundaries, lowercases, deduplicates,
 * and filters stop words and very short tokens.
 */
export function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t));

  return [...new Set(tokens)];
}

// ---------------------------------------------------------------------------
// Relevance scoring (pure)
// ---------------------------------------------------------------------------

/**
 * Computes keyword-overlap relevance between a task and a skill.
 * Returns a score 0–1 based on what fraction of task keywords appear
 * in the skill's combined text (name + context + patterns + antiPatterns).
 */
export function scoreSkillRelevance(
  taskKeywords: string[],
  skill: SkillEntry,
): { score: number; matchedKeywords: string[] } {
  if (taskKeywords.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }

  // Build a searchable text block from the skill
  const skillText = [
    skill.name,
    skill.context,
    ...skill.patterns,
    ...skill.antiPatterns,
  ]
    .join(' ')
    .toLowerCase();

  const matched: string[] = [];
  for (const kw of taskKeywords) {
    if (skillText.includes(kw)) {
      matched.push(kw);
    }
  }

  return {
    score: matched.length / taskKeywords.length,
    matchedKeywords: matched,
  };
}

// ---------------------------------------------------------------------------
// Context truncation (pure)
// ---------------------------------------------------------------------------

function byteSize(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Truncates text to fit within a byte budget, breaking at newlines.
 */
export function truncateToBytes(text: string, maxBytes: number): string {
  if (byteSize(text) <= maxBytes) {
    return text;
  }

  const lines = text.split('\n');
  const result: string[] = [];
  let used = 0;

  for (const line of lines) {
    const lineBytes = byteSize(line + '\n');
    if (used + lineBytes > maxBytes) {
      break;
    }
    result.push(line);
    used += lineBytes;
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Prompt rendering (pure)
// ---------------------------------------------------------------------------

function renderSkillBlock(match: SkillMatch): string {
  const lines: string[] = [];
  lines.push(`### ${match.skill.name} (relevance: ${Math.round(match.relevance * 100)}%)`);
  lines.push('');
  lines.push(match.skill.context);

  if (match.skill.patterns.length > 0) {
    lines.push('');
    lines.push('**Patterns:**');
    for (const p of match.skill.patterns) {
      lines.push(`- ${p}`);
    }
  }

  if (match.skill.antiPatterns.length > 0) {
    lines.push('');
    lines.push('**Anti-patterns:**');
    for (const ap of match.skill.antiPatterns) {
      lines.push(`- ${ap}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main pipeline (pure)
// ---------------------------------------------------------------------------

/**
 * Matches skills to a task description using keyword overlap.
 * Returns matched skills with a ready-to-inject prompt string,
 * truncated to the configured context window budget.
 *
 * Pure function: takes task description + skills array, returns analysis.
 */
export function matchSkillsToTask(
  taskDescription: string,
  skills: SkillEntry[],
  config: Partial<SkillMatchConfig> = {},
): SkillMatchResult {
  const resolvedConfig: SkillMatchConfig = { ...DEFAULT_CONFIG, ...config };
  const maxBytes = Math.min(Math.max(resolvedConfig.maxContextBytes, 0), 32768);

  if (skills.length === 0 || taskDescription.trim().length === 0) {
    return {
      matches: [],
      prompt: '',
      totalSkills: skills.length,
      includedSkills: 0,
      truncated: false,
      contextBytes: 0,
      maxContextBytes: maxBytes,
    };
  }

  const taskKeywords = extractKeywords(taskDescription);

  // Score each skill
  const scored: SkillMatch[] = skills
    .map(skill => {
      const { score, matchedKeywords } = scoreSkillRelevance(taskKeywords, skill);
      return { skill, relevance: score, matchedKeywords };
    })
    .filter(m => m.relevance >= resolvedConfig.minRelevance)
    .sort((a, b) => b.relevance - a.relevance);

  // Render prompt with budget enforcement
  const header = '## Relevant Skills\n\n';
  let prompt = header;
  let usedBytes = byteSize(header);
  const included: SkillMatch[] = [];
  let truncated = false;

  for (const match of scored) {
    const block = renderSkillBlock(match) + '\n\n';
    const blockBytes = byteSize(block);

    if (usedBytes + blockBytes > maxBytes) {
      truncated = true;
      // Try truncated version of this skill's context
      const remainingBytes = maxBytes - usedBytes;
      if (remainingBytes > 100) {
        const truncatedBlock = truncateToBytes(block, remainingBytes);
        prompt += truncatedBlock;
        usedBytes += byteSize(truncatedBlock);
        included.push(match);
      }
      break;
    }

    prompt += block;
    usedBytes += blockBytes;
    included.push(match);
  }

  const finalPrompt = prompt.trimEnd();

  return {
    matches: included,
    prompt: included.length > 0 ? finalPrompt : '',
    totalSkills: skills.length,
    includedSkills: included.length,
    truncated,
    contextBytes: included.length > 0 ? byteSize(finalPrompt) : 0,
    maxContextBytes: maxBytes,
  };
}
