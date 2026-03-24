/**
 * ConstitutionAdapter
 * Implements ConstitutionWriter port.
 * Reads and appends curated learnings to .specify/memory/constitution.md.
 * Adapter layer — uses fs/promises (framework), implements port.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ConstitutionWriter } from '../sync-learnings.js';

export class ConstitutionAdapter implements ConstitutionWriter {

  async readConstitution(constitutionPath: string): Promise<string | null> {
    try {
      return await readFile(constitutionPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async appendLearnings(
    constitutionPath: string,
    specId: string,
    learnings: { title: string; content: string }[],
  ): Promise<string> {
    let existing = await this.readConstitution(constitutionPath);
    if (existing === null) {
      existing = '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: ' +
        new Date().toISOString().split('T')[0] + '\n';
    }

    // Bump version (minor): 1.0.0 → 1.1.0
    existing = existing.replace(
      /\*\*Version\*\*:\s*(\d+)\.(\d+)\.(\d+)/,
      (_match, major, minor, _patch) => {
        return `**Version**: ${major}.${parseInt(minor, 10) + 1}.0`;
      },
    );

    // Update Last Amended date
    const today = new Date().toISOString().split('T')[0];
    existing = existing.replace(
      /\*\*Last Amended\*\*:\s*\S+/,
      `**Last Amended**: ${today}`,
    );

    // Build the learnings section
    const lines: string[] = [
      '',
      `## Learnings from Spec ${specId}`,
      '',
      `_Synced: ${new Date().toISOString()}_`,
      '',
    ];

    for (const learning of learnings) {
      lines.push(`- **${learning.title}**: ${learning.content}`);
    }
    lines.push('');

    const updated = existing + lines.join('\n');

    await mkdir(dirname(constitutionPath), { recursive: true });
    await writeFile(constitutionPath, updated, 'utf-8');

    return constitutionPath;
  }
}
