/**
 * T024: SquadFileReader Adapter
 *
 * Implements SquadStateReader port. Discovers and reads Squad memory
 * artifacts from the file system. Strictly read-only (FR-010).
 *
 * Adapter layer — uses fs/promises and glob (frameworks), implements port.
 */

import { readFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { glob } from 'glob';
import type { SquadStateReader } from '../ports.js';
import type { SkillEntry, DecisionEntry, LearningEntry } from '../../types.js';
import {
  parseSkillFile,
  parseDecisionsFile,
  parseHistoryFile,
} from '../parser.js';
import type { ParseWarning } from '../parser.js';

export class SquadFileReader implements SquadStateReader {
  private readonly squadDir: string;
  private readonly warnings: ParseWarning[] = [];

  constructor(squadDir: string) {
    this.squadDir = squadDir;
  }

  /** Get accumulated warnings from parsing. */
  getWarnings(): ParseWarning[] {
    return [...this.warnings];
  }

  async readSkills(): Promise<SkillEntry[]> {
    const pattern = join(this.squadDir, 'skills', '*', 'SKILL.md');
    let files: string[];

    try {
      files = await glob(pattern.replace(/\\/g, '/'));
    } catch {
      return [];
    }

    const skills: SkillEntry[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const skillName = basename(dirname(file));
        const entry = parseSkillFile(content, skillName, file, this.warnings);
        if (entry) {
          skills.push(entry);
        }
      } catch (err) {
        // ENOENT or permission errors — skip gracefully
        if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        this.warnings.push({
          file,
          reason: err instanceof Error ? err.message : 'Read error',
        });
      }
    }

    return skills;
  }

  async readDecisions(): Promise<DecisionEntry[]> {
    const decisionsPath = join(this.squadDir, 'decisions.md');

    try {
      const content = await readFile(decisionsPath, 'utf-8');
      return parseDecisionsFile(content, decisionsPath, this.warnings);
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      this.warnings.push({
        file: decisionsPath,
        reason: err instanceof Error ? err.message : 'Read error',
      });
      return [];
    }
  }

  async readLearnings(since?: Date): Promise<LearningEntry[]> {
    const pattern = join(this.squadDir, 'agents', '*', 'history.md');
    let files: string[];

    try {
      files = await glob(pattern.replace(/\\/g, '/'));
    } catch {
      return [];
    }

    const learnings: LearningEntry[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const agentName = basename(dirname(file));
        const entry = parseHistoryFile(content, agentName, file, this.warnings);
        if (entry) {
          // T035: Apply date filtering if since parameter provided
          if (since) {
            const filtered = entry.entries.filter((e) => {
              const d = Date.parse(e.date);
              return !isNaN(d) && new Date(d) >= since;
            });
            if (filtered.length > 0) {
              learnings.push({ ...entry, entries: filtered });
            }
          } else {
            learnings.push(entry);
          }
        }
      } catch (err) {
        if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        this.warnings.push({
          file,
          reason: err instanceof Error ? err.message : 'Read error',
        });
      }
    }

    return learnings;
  }

  async readConstitution(): Promise<string | null> {
    // Look in .specify/memory/constitution.md (Spec Kit location)
    const specifyConstitutionPath = join(
      this.squadDir, '..', '.specify', 'memory', 'constitution.md',
    );
    // Also check the squad dir parent for .specify
    const paths = [
      specifyConstitutionPath,
      join(dirname(this.squadDir), '.specify', 'memory', 'constitution.md'),
    ];

    for (const p of paths) {
      try {
        return await readFile(p, 'utf-8');
      } catch {
        // Try next path
      }
    }

    return null;
  }
}
