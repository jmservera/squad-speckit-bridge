/**
 * T024: SquadFileReader Adapter
 *
 * Implements SquadStateReader port. Discovers and reads Squad memory
 * artifacts from the file system. Strictly read-only (FR-010).
 *
 * Adapter layer — uses fs/promises and glob (frameworks), implements port.
 */

import { readFile, stat } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { glob } from 'glob';
import type { SquadStateReader } from '../ports.js';
import type { SkillEntry, DecisionEntry, LearningEntry, AgentCharter, SkillFileContent } from '../../types.js';
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

  /** Check if a directory exists; returns false for ENOENT/ENOTDIR. */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const s = await stat(dirPath);
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  async readSkills(): Promise<SkillEntry[]> {
    const skillsDir = join(this.squadDir, 'skills');
    if (!(await this.directoryExists(skillsDir))) {
      return [];
    }

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
        if (content.trim().length === 0) {
          this.warnings.push({ file, reason: 'Empty file — skipped' });
          continue;
        }
        const skillName = basename(dirname(file));
        const entry = parseSkillFile(content, skillName, file, this.warnings);
        if (entry) {
          skills.push(entry);
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

    return skills;
  }

  async readDecisions(): Promise<DecisionEntry[]> {
    const decisionsPath = join(this.squadDir, 'decisions.md');

    try {
      const content = await readFile(decisionsPath, 'utf-8');
      if (content.trim().length === 0) {
        this.warnings.push({ file: decisionsPath, reason: 'Empty decisions file — skipped' });
        return [];
      }
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
    const agentsDir = join(this.squadDir, 'agents');
    if (!(await this.directoryExists(agentsDir))) {
      return [];
    }

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
        if (content.trim().length === 0) {
          this.warnings.push({ file, reason: 'Empty history file — skipped' });
          continue;
        }
        const agentName = basename(dirname(file));
        const entry = parseHistoryFile(content, agentName, file, this.warnings);
        if (entry) {
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

  async readAgentCharters(): Promise<AgentCharter[]> {
    const agentsDir = join(this.squadDir, 'agents');
    if (!(await this.directoryExists(agentsDir))) {
      return [];
    }



    const pattern = join(this.squadDir, 'agents', '*', 'charter.md');
    let files: string[];

    try {
      files = await glob(pattern.replace(/\\/g, '/'));
    } catch {
      return [];
    }

    const charters: AgentCharter[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        if (content.trim().length === 0) {
          this.warnings.push({ file, reason: 'Empty charter file — skipped' });
          continue;
        }


        const agentName = basename(dirname(file));
        const skills = this.extractSkillsFromCharter(content);
        charters.push({ agentName, skills });
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

    return charters;
  }

  async readSkillFiles(): Promise<SkillFileContent[]> {
    const skillsDir = join(this.squadDir, 'skills');
    if (!(await this.directoryExists(skillsDir))) {
      return [];
    }



    const pattern = join(this.squadDir, 'skills', '*', 'SKILL.md');
    let files: string[];

    try {
      files = await glob(pattern.replace(/\\/g, '/'));
    } catch {
      return [];
    }

    const results: SkillFileContent[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        if (content.trim().length === 0) {
          this.warnings.push({ file, reason: 'Empty skill file — skipped' });
          continue;
        }


        const name = basename(dirname(file));
        results.push({ name, content, sizeBytes: Buffer.byteLength(content, 'utf-8') });
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

    return results;
  }

  private extractSkillsFromCharter(content: string): string[] {
    const skills: string[] = [];
    const lines = content.split('\n');
    let inSkillSection = false;

    for (const line of lines) {
      if (/^##\s+.*(?:skill|expertise|capabilit)/i.test(line)) {
        inSkillSection = true;
        continue;
      }
      if (inSkillSection && /^##\s/.test(line)) {
        break;
      }
      if (inSkillSection) {
        const match = line.match(/^[-*]\s+(.+)/);
        if (match) {
          skills.push(match[1].trim());
        }
      }
    }

    return skills;
  }
}
