/**
 * SquadFileReader Adapter
 *
 * Implements SquadStateReader port — reads Squad memory artifacts from the
 * file system (.squad/ directory). Returns typed entities.
 *
 * Clean Architecture: adapter layer — wraps node:fs for the use case layer.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { SquadStateReader } from '../ports.js';
import type {
  SkillEntry,
  DecisionEntry,
  LearningEntry,
  LearningItem,
} from '../../types.js';

export class SquadFileReader implements SquadStateReader {
  constructor(private readonly squadDir: string) {}

  async readSkills(): Promise<SkillEntry[]> {
    const skillsDir = join(this.squadDir, 'skills');
    const entries: SkillEntry[] = [];

    try {
      const dirs = await readdir(skillsDir);
      for (const dir of dirs) {
        const skillPath = join(skillsDir, dir, 'SKILL.md');
        try {
          const content = await readFile(skillPath, 'utf-8');
          entries.push({
            name: dir,
            context: content.slice(0, 2000),
            patterns: extractListItems(content, 'pattern'),
            antiPatterns: extractListItems(content, 'anti-pattern'),
            rawSize: Buffer.byteLength(content, 'utf-8'),
          });
        } catch {
          // Skill file not found or unreadable — skip
        }
      }
    } catch {
      // Skills directory not found — return empty
    }

    return entries;
  }

  async readDecisions(): Promise<DecisionEntry[]> {
    const decisionsPath = join(this.squadDir, 'decisions.md');
    try {
      const content = await readFile(decisionsPath, 'utf-8');
      return parseDecisions(content);
    } catch {
      return [];
    }
  }

  async readLearnings(): Promise<LearningEntry[]> {
    const agentsDir = join(this.squadDir, 'agents');
    const entries: LearningEntry[] = [];

    try {
      const agents = await readdir(agentsDir);
      for (const agent of agents) {
        const historyPath = join(agentsDir, agent, 'history.md');
        try {
          const content = await readFile(historyPath, 'utf-8');
          const agentInfo = extractAgentInfo(content);
          entries.push({
            agentName: agent,
            agentRole: agentInfo.role,
            entries: agentInfo.learnings,
            rawSize: Buffer.byteLength(content, 'utf-8'),
          });
        } catch {
          // History file not found — skip
        }
      }
    } catch {
      // Agents directory not found — return empty
    }

    return entries;
  }
}

function extractListItems(content: string, keyword: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');
  let inSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes(keyword)) {
      inSection = true;
      continue;
    }
    if (inSection && line.match(/^#+\s/)) {
      inSection = false;
      continue;
    }
    if (inSection && line.match(/^[-*]\s+/)) {
      items.push(line.replace(/^[-*]\s+/, '').trim());
    }
  }

  return items;
}

function parseDecisions(content: string): DecisionEntry[] {
  const decisions: DecisionEntry[] = [];
  const sections = content.split(/^###\s+/m);

  for (const section of sections.slice(1)) {
    const lines = section.split('\n');
    const title = lines[0]?.trim() ?? '';
    if (!title) continue;

    const dateMatch = section.match(/\((\d{4}-\d{2}-\d{2})\)/);
    const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/);

    decisions.push({
      title: title.replace(/\s*\(\d{4}-\d{2}-\d{2}\)/, '').trim(),
      date: dateMatch?.[1] ?? '',
      status: statusMatch?.[1]?.trim() ?? 'unknown',
      summary: lines.slice(1, 5).join(' ').trim().slice(0, 200),
      relevanceScore: 0.5,
      fullContent: section.slice(0, 1000),
    });
  }

  return decisions;
}

function extractAgentInfo(content: string): {
  role: string;
  learnings: LearningItem[];
} {
  const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/);
  const role = roleMatch?.[1]?.trim() ?? 'unknown';

  const learnings: LearningItem[] = [];
  const learningMatches = content.matchAll(
    /^###\s+(\d{4}-\d{2}-\d{2}):\s*(.+)/gm,
  );
  for (const match of learningMatches) {
    const date = match[1];
    const title = match[2].trim();
    // Get summary from the next few lines
    const idx = content.indexOf(match[0]);
    const afterMatch = content.slice(idx + match[0].length, idx + match[0].length + 300);
    const summaryLines = afterMatch.split('\n').filter((l) => l.trim()).slice(0, 2);
    learnings.push({
      date,
      title,
      summary: summaryLines.join(' ').replace(/\*\*/g, '').trim().slice(0, 200),
    });
  }

  return { role, learnings };
}
