/**
 * T007: LearningExtractorAdapter
 *
 * Implements the LearningExtractor port.
 * Reads agent histories, team decisions, and skill files from the Squad directory.
 *
 * Adapter layer — uses fs/promises and directory listing (framework), implements port.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { LearningExtractor } from '../sync-reverse.js';
import type { ExtractedReverseLearning, ReverseSyncSourceType } from '../../types.js';

export class LearningExtractorAdapter implements LearningExtractor {

  async extract(
    squadDir: string,
    sources: ReverseSyncSourceType[],
  ): Promise<ExtractedReverseLearning[]> {
    const learnings: ExtractedReverseLearning[] = [];

    if (sources.includes('histories')) {
      const historyLearnings = await this.extractFromHistories(squadDir);
      learnings.push(...historyLearnings);
    }

    if (sources.includes('decisions')) {
      const decisionLearnings = await this.extractFromDecisions(squadDir);
      learnings.push(...decisionLearnings);
    }

    if (sources.includes('skills')) {
      const skillLearnings = await this.extractFromSkills(squadDir);
      learnings.push(...skillLearnings);
    }

    return learnings;
  }

  private async extractFromHistories(squadDir: string): Promise<ExtractedReverseLearning[]> {
    const learnings: ExtractedReverseLearning[] = [];
    const agentsDir = join(squadDir, 'agents');

    let agentDirs: string[];
    try {
      agentDirs = await readdir(agentsDir);
    } catch {
      return [];
    }

    for (const agentName of agentDirs) {
      const historyPath = join(agentsDir, agentName, 'history.md');
      try {
        const agentStat = await stat(join(agentsDir, agentName));
        if (!agentStat.isDirectory()) continue;

        const content = await readFile(historyPath, 'utf-8');
        const entries = this.parseHistoryLearnings(content, agentName);
        learnings.push(...entries);
      } catch {
        // Skip unreadable or missing history files
      }
    }

    return learnings;
  }

  private parseHistoryLearnings(
    content: string,
    agentName: string,
  ): ExtractedReverseLearning[] {
    const entries: ExtractedReverseLearning[] = [];

    // T016: Gracefully skip if no "## Learnings" section
    const learningsMatch = content.match(/^## Learnings\s*$/m);
    if (!learningsMatch) return entries;

    const learningsStart = learningsMatch.index! + learningsMatch[0].length;
    const remainingContent = content.slice(learningsStart);
    const nextSectionMatch = remainingContent.match(/^## (?!#)/m);
    const learningsContent = nextSectionMatch
      ? remainingContent.slice(0, nextSectionMatch.index)
      : remainingContent;

    // T016: Skip if learnings section is empty
    if (learningsContent.trim().length === 0) return entries;

    const sections = learningsContent.split(/^### /m).filter(s => s.trim());

    for (const section of sections) {
      try {
        const lines = section.split('\n');
        const heading = lines[0].trim();
        const dateMatch = heading.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)/);
        if (!dateMatch) continue;

        const timestamp = dateMatch[1];
        const title = dateMatch[2].trim();
        const body = lines.slice(1).join('\n').trim();

        if (title) {
          entries.push({
            title,
            content: body || title,
            sourceType: 'histories',
            attribution: agentName,
            timestamp,
            fingerprint: '',
            classification: 'learnings-only',
            category: 'architectural-insights',
          });
        }
      } catch {
        // T016: Skip malformed entries gracefully
      }
    }

    return entries;
  }

  private async extractFromDecisions(squadDir: string): Promise<ExtractedReverseLearning[]> {
    const entries: ExtractedReverseLearning[] = [];
    const decisionsPath = join(squadDir, 'decisions.md');

    let content: string;
    try {
      content = await readFile(decisionsPath, 'utf-8');
    } catch {
      return [];
    }

    // Parse decision entries: ### Title (YYYY-MM-DD)
    const sections = content.split(/^### /m).filter(s => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const heading = lines[0].trim();

      // Match "Title (YYYY-MM-DD)" pattern
      const dateMatch = heading.match(/^(.+?)\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
      if (!dateMatch) continue;

      const title = dateMatch[1].trim();
      const timestamp = dateMatch[2];
      const body = lines.slice(1).join('\n').trim();

      entries.push({
        title,
        content: body || title,
        sourceType: 'decisions',
        attribution: 'team',
        timestamp,
        fingerprint: '',
        classification: 'learnings-only',
        category: 'decisions',
      });
    }

    return entries;
  }

  private async extractFromSkills(squadDir: string): Promise<ExtractedReverseLearning[]> {
    const entries: ExtractedReverseLearning[] = [];
    const skillsDir = join(squadDir, 'skills');

    let skillDirs: string[];
    try {
      skillDirs = await readdir(skillsDir);
    } catch {
      return [];
    }

    for (const skillName of skillDirs) {
      const skillPath = join(skillsDir, skillName, 'SKILL.md');
      try {
        const skillStat = await stat(join(skillsDir, skillName));
        if (!skillStat.isDirectory()) continue;

        const content = await readFile(skillPath, 'utf-8');

        // Extract the skill title from H1 or directory name
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : basename(skillName);

        entries.push({
          title,
          content: content.trim(),
          sourceType: 'skills',
          attribution: skillName,
          timestamp: new Date().toISOString().split('T')[0],
          fingerprint: '',
          classification: 'learnings-only',
          category: 'reusable-techniques',
        });
      } catch {
        // Skip unreadable skill files
      }
    }

    return entries;
  }
}
