/**
 * SpecFileReader — Parses FR-XXX requirements from spec markdown.
 *
 * Handles multi-paragraph descriptions: collects all text after an FR-
 * entry until the next FR- entry or end of file.
 *
 * Clean Architecture: implements SpecReader port from ../../bridge/ports.ts.
 */

import { readFile } from 'node:fs/promises';
import type { SpecReader } from '../../bridge/ports.js';
import type { SpecRequirement } from '../../types.js';

/** Matches lines like `- **FR-001**: Description text` or `- **FR-001** Description text` */
const FR_LINE_RE = /^-\s+\*\*(?<id>FR-\d+)\*\*[:\s]*(?<text>.*)$/;

/**
 * Extracts a category from the nearest preceding markdown heading.
 * Returns '' if no heading precedes the line.
 */
function extractCategory(lines: string[], endIndex: number): string {
  for (let i = endIndex - 1; i >= 0; i--) {
    const heading = lines[i].match(/^#{1,6}\s+(.+)/);
    if (heading) {
      return heading[1].trim();
    }
  }
  return '';
}

export class SpecFileReader implements SpecReader {
  async readRequirements(specPath: string): Promise<SpecRequirement[]> {
    const content = await readFile(specPath, 'utf-8');
    return parseRequirements(content);
  }
}

/**
 * Pure parsing function — exported for direct unit testing.
 *
 * Collects multi-paragraph description text: after an FR- line, all
 * subsequent non-empty lines (and blank lines between paragraphs) are
 * appended to the description until the next FR- entry or EOF.
 */
export function parseRequirements(content: string): SpecRequirement[] {
  const lines = content.split('\n');
  const requirements: SpecRequirement[] = [];
  let current: { id: string; textParts: string[]; category: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(FR_LINE_RE);

    if (match?.groups) {
      // Flush previous requirement
      if (current) {
        requirements.push({
          id: current.id,
          text: current.textParts.join('\n').trim(),
          category: current.category,
        });
      }

      current = {
        id: match.groups.id,
        textParts: match.groups.text.trim() ? [match.groups.text.trim()] : [],
        category: extractCategory(lines, i),
      };
    } else if (current) {
      // Continue collecting description text (including blank lines)
      current.textParts.push(line);
    }
  }

  // Flush last requirement
  if (current) {
    requirements.push({
      id: current.id,
      text: current.textParts.join('\n').trim(),
      category: current.category,
    });
  }

  return requirements;
}
