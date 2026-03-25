/**
 * T012: ReverseConstitutionAdapter
 *
 * Implements the ReverseConstitutionWriter port for reverse sync.
 * Appends constitution-worthy learnings under an "## Implementation Learnings" section.
 *
 * Adapter layer — uses fs/promises (framework), implements port.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ReverseConstitutionWriter } from '../sync-reverse.js';
import type { ExtractedReverseLearning } from '../../types.js';

export class ReverseConstitutionAdapter implements ReverseConstitutionWriter {

  async append(path: string, entries: ExtractedReverseLearning[]): Promise<number> {
    if (entries.length === 0) return 0;

    let existing: string;
    try {
      existing = await readFile(path, 'utf-8');
    } catch {
      existing = '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: ' +
        new Date().toISOString().split('T')[0] + '\n';
    }

    // Build entry lines
    const newLines: string[] = [];
    for (const entry of entries) {
      const dateStr = entry.timestamp.split('T')[0];
      newLines.push(`### ${entry.title}`);
      newLines.push(entry.content);
      newLines.push(`*Source: ${entry.attribution}, ${dateStr}*`);
      newLines.push('');
    }

    // Check if "## Implementation Learnings" section already exists
    const sectionHeader = '## Implementation Learnings';
    const sectionIndex = existing.indexOf(sectionHeader);

    let updated: string;
    if (sectionIndex !== -1) {
      // Find the end of the section (next ## or EOF)
      const afterHeader = existing.slice(sectionIndex + sectionHeader.length);
      const nextSectionMatch = afterHeader.match(/\n## (?!#)/);
      if (nextSectionMatch && nextSectionMatch.index !== undefined) {
        // Insert before the next section
        const insertPoint = sectionIndex + sectionHeader.length + nextSectionMatch.index;
        updated = existing.slice(0, insertPoint) + '\n' + newLines.join('\n') + existing.slice(insertPoint);
      } else {
        // Append at end of file
        updated = existing.trimEnd() + '\n\n' + newLines.join('\n');
      }
    } else {
      // Add new section at the end
      updated = existing.trimEnd() + '\n\n' + sectionHeader + '\n\n' + newLines.join('\n');
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, updated, 'utf-8');

    return entries.length;
  }
}
