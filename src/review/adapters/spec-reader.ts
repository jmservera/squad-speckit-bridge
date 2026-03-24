/**
 * T011: SpecReader Adapter
 *
 * Implements SpecReader port. Parses spec.md files for FR-XXX
 * (Functional Requirement) entries.
 *
 * Supported formats:
 *   - **FR-001**: Title text here
 *   - FR-001: Title text here
 *   - `FR-001`: Title text here
 *   - Bullet lines starting with FR-XXX
 *
 * Acceptance criteria are extracted from subsequent bullet lines that
 * start with a number or dash under a requirement heading.
 *
 * Clean Architecture: adapter layer — may import node:fs.
 */

import { readFile } from 'node:fs/promises';
import type { SpecReader } from '../ports.js';
import type { FunctionalRequirement } from '../../types.js';

export class SpecFileReader implements SpecReader {
  async readRequirements(specPath: string): Promise<FunctionalRequirement[]> {
    let content: string;
    try {
      content = await readFile(specPath, 'utf-8');
    } catch {
      return [];
    }
    return parseRequirements(content);
  }
}

// FR-XXX pattern: captures the ID (FR- followed by digits)
const FR_LINE_RE =
  /^[\s*-]*(?:\*\*|`)?(?<id>FR-\d{3,4})(?:\*\*|`)?[:\s]+(?<title>.+)/;

/**
 * Parse functional requirements from spec content.
 * Exported for direct unit-testing without file I/O.
 */
export function parseRequirements(content: string): FunctionalRequirement[] {
  const requirements: FunctionalRequirement[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(FR_LINE_RE);
    if (!match?.groups) {
      i++;
      continue;
    }

    const id = match.groups.id;
    const titleRaw = match.groups.title
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .trim();

    // Gather the full description block: the FR line plus continuation lines
    const descLines = [lines[i].trim()];
    const criteria: string[] = [];

    i++;
    // Collect continuation lines (indented, or numbered/dashed sub-items)
    while (i < lines.length) {
      const line = lines[i];

      // Stop at next FR entry, heading, or blank line followed by non-continuation
      if (FR_LINE_RE.test(line)) break;
      if (/^#{1,4}\s/.test(line)) break;

      const trimmed = line.trim();
      if (trimmed === '') {
        // Peek ahead: if the next non-blank line is not indented or a sub-bullet, stop
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j >= lines.length) break;
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed.startsWith('-') && !nextTrimmed.match(/^\d+\./)) break;
        i++;
        continue;
      }

      // Acceptance criteria: numbered or dashed sub-bullets
      if (/^\s*[-•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        criteria.push(trimmed.replace(/^[-•]\s+/, '').replace(/^\d+\.\s+/, ''));
      }

      descLines.push(trimmed);
      i++;
    }

    requirements.push({
      id,
      title: titleRaw,
      description: descLines.join(' '),
      acceptanceCriteria: criteria,
    });
  }

  return requirements;
}
