/**
 * T023: MarkdownFrontmatterParser Adapter
 *
 * Parses markdown files with gray-matter, converting raw parsed output
 * to entity types. Handles malformed files gracefully: skips unparseable
 * content and records warning strings.
 *
 * Adapter layer — uses gray-matter (framework), produces entity types.
 */

import matter from 'gray-matter';
import type {
  SkillEntry,
  DecisionEntry,
  LearningEntry,
  LearningItem,
} from '../types.js';

export interface ParseWarning {
  file: string;
  reason: string;
}

/**
 * Parse a SKILL.md file into a SkillEntry entity.
 * Extracts frontmatter metadata and content sections.
 */
export function parseSkillFile(
  rawContent: string,
  skillName: string,
  fileName: string,
  warnings: ParseWarning[],
): SkillEntry | null {
  try {
    const { content } = matter(rawContent);

    const patterns: string[] = [];
    const antiPatterns: string[] = [];

    // Extract patterns and anti-patterns from content
    const lines = content.split('\n');
    let currentSection: 'none' | 'patterns' | 'anti-patterns' = 'none';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section by heading keywords
      if (/^#+\s/.test(trimmed)) {
        const lower = trimmed.toLowerCase();
        if (
          lower.includes('anti-pattern') ||
          lower.includes('antipattern') ||
          lower.includes('not to do')
        ) {
          currentSection = 'anti-patterns';
        } else if (lower.includes('pattern') || lower.includes('do —')) {
          currentSection = 'patterns';
        } else {
          currentSection = 'none';
        }
        continue;
      }

      // Collect bullet items in the current section
      if (
        currentSection !== 'none' &&
        (trimmed.startsWith('- ') ||
          trimmed.startsWith('* ') ||
          trimmed.startsWith('• '))
      ) {
        const item = trimmed.replace(/^[-*•]\s+/, '');
        if (currentSection === 'patterns') {
          patterns.push(item);
        } else {
          antiPatterns.push(item);
        }
      }
    }

    return {
      name: skillName,
      context: content.trim(),
      patterns,
      antiPatterns,
      rawSize: new TextEncoder().encode(rawContent).length,
    };
  } catch (err) {
    warnings.push({
      file: fileName,
      reason:
        err instanceof Error
          ? `Parse error: ${err.message}`
          : 'Unknown parse error',
    });
    return null;
  }
}

/**
 * Parse decisions.md into DecisionEntry entities.
 * Splits on H3 headings (### ), extracts date from heading parenthetical,
 * and status from content.
 */
export function parseDecisionsFile(
  rawContent: string,
  fileName: string,
  warnings: ParseWarning[],
): DecisionEntry[] {
  try {
    const { content } = matter(rawContent);
    const decisions: DecisionEntry[] = [];

    // Split on H3 headings: ### Title (date)
    const sections = content.split(/^###\s+/m).filter((s) => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const headingLine = lines[0].trim();

      // Skip empty, H1/H2 headers, or governance/generic section headings
      if (!headingLine) continue;
      if (headingLine.startsWith('#')) continue;

      // Extract title and date from heading: "Title (YYYY-MM-DD)"
      const dateMatch = headingLine.match(/\((\d{4}-\d{2}-\d{2})\)/);
      const date = dateMatch ? dateMatch[1] : '';
      const title = headingLine
        .replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '')
        .trim();

      if (!title) continue;

      // Extract status from body
      const body = lines.slice(1).join('\n').trim();
      const statusMatch = body.match(/\*\*Status:\*\*\s*(.+)/);
      const status = statusMatch ? statusMatch[1].trim() : 'unknown';

      // First paragraph as summary
      const bodyLines = body.split('\n');
      const summaryLines: string[] = [];
      let foundContent = false;
      for (const bl of bodyLines) {
        const trimmed = bl.trim();
        if (!foundContent && trimmed === '') continue;
        if (!foundContent && trimmed.startsWith('**Status:**')) continue;
        if (!foundContent && trimmed.startsWith('---')) continue;
        if (foundContent && trimmed === '') break;
        foundContent = true;
        summaryLines.push(trimmed);
      }

      decisions.push({
        title,
        date,
        status,
        summary: summaryLines.join(' ').slice(0, 500),
        relevanceScore: 0, // computed later by use case
        fullContent: body,
      });
    }

    return decisions;
  } catch (err) {
    warnings.push({
      file: fileName,
      reason:
        err instanceof Error
          ? `Parse error: ${err.message}`
          : 'Unknown parse error',
    });
    return [];
  }
}

/**
 * Parse an agent's history.md into a LearningEntry entity.
 * Extracts agent name/role from header and learning sections by H3 headings.
 */
export function parseHistoryFile(
  rawContent: string,
  agentName: string,
  fileName: string,
  warnings: ParseWarning[],
): LearningEntry | null {
  try {
    const { content } = matter(rawContent);
    const entries: LearningItem[] = [];
    let agentRole = '';

    const lines = content.split('\n');

    // Extract role from "**Role:** xxx" pattern
    for (const line of lines) {
      const roleMatch = line.match(/\*\*Role:\*\*\s*(.+)/);
      if (roleMatch) {
        agentRole = roleMatch[1].trim();
        break;
      }
    }

    // Split on H3 headings for learning entries: ### YYYY-MM-DD: Title
    const sections = content.split(/^###\s+/m).filter((s) => s.trim());

    for (const section of sections) {
      const sectionLines = section.split('\n');
      const heading = sectionLines[0].trim();

      // Parse date and title from heading: "YYYY-MM-DD: Title" or "Date: Title"
      const dateMatch = heading.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)/);
      if (!dateMatch) continue;

      const date = dateMatch[1];
      const title = dateMatch[2].trim();
      const summary = sectionLines.slice(1).join('\n').trim();

      if (title) {
        entries.push({ date, title, summary });
      }
    }

    if (entries.length === 0 && content.trim().length === 0) {
      return null;
    }

    return {
      agentName,
      agentRole,
      entries,
      rawSize: new TextEncoder().encode(rawContent).length,
    };
  } catch (err) {
    warnings.push({
      file: fileName,
      reason:
        err instanceof Error
          ? `Parse error: ${err.message}`
          : 'Unknown parse error',
    });
    return null;
  }
}
