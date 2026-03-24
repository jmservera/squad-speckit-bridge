/**
 * T025 + T034: SpecKitContextWriter Adapter
 *
 * Implements ContextWriter port. Converts ContextSummary entity to
 * markdown document with YAML frontmatter per research.md RC-3 format.
 * Writes to <spec-dir>/squad-context.md.
 *
 * T034: Also reads previous context metadata for cycle detection.
 *
 * Adapter layer — uses fs/promises and gray-matter (frameworks), implements port.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import matter from 'gray-matter';
import type { ContextWriter, PreviousContextMetadata } from '../ports.js';
import type { ContextSummary } from '../../types.js';

export class SpecKitContextWriter implements ContextWriter {
  private readonly specDir: string;

  constructor(specDir: string) {
    this.specDir = specDir;
  }

  async write(summary: ContextSummary): Promise<void> {
    const outputPath = join(this.specDir, 'squad-context.md');
    const content = this.renderMarkdown(summary);

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Read previous metadata, increment cycle count, update summary, and write.
   * Returns the new cycle count. Handles missing/corrupt previous metadata
   * by starting at cycle 1.
   */
  async writeWithCycleIncrement(summary: ContextSummary): Promise<number> {
    const previous = await this.readPreviousMetadata();
    const newCycleCount = previous !== null ? previous.cycleCount + 1 : 1;
    summary.metadata.cycleCount = newCycleCount;
    await this.write(summary);
    return newCycleCount;
  }

  /** T034: Read previous squad-context.md metadata for cycle detection. */
  async readPreviousMetadata(): Promise<PreviousContextMetadata | null> {
    const contextPath = join(this.specDir, 'squad-context.md');

    try {
      const raw = await readFile(contextPath, 'utf-8');
      if (raw.trim().length === 0) {
        return null;
      }

      let data: Record<string, unknown>;
      try {
        ({ data } = matter(raw));
      } catch {
        // Malformed frontmatter — treat as first cycle
        return null;
      }

      if (data.generated) {
        const generated = data.generated instanceof Date
          ? data.generated.toISOString()
          : String(data.generated);
        const cycleCount = typeof data.cycle_count === 'number' && data.cycle_count > 0
          ? data.cycle_count
          : 1;
        return { generated, cycleCount };
      }
      return null;
    } catch {
      // File doesn't exist — first cycle
      return null;
    }
  }

  private renderMarkdown(summary: ContextSummary): string {
    const lines: string[] = [];

    // YAML frontmatter
    lines.push('---');
    lines.push(`generated: ${summary.metadata.generated}`);
    lines.push(`cycle_count: ${summary.metadata.cycleCount}`);
    lines.push('sources:');
    lines.push(`  skills: ${summary.metadata.sources.skills}`);
    lines.push(`  decisions: ${summary.metadata.sources.decisions}`);
    lines.push(`  histories: ${summary.metadata.sources.histories}`);
    lines.push(`size_bytes: ${summary.metadata.sizeBytes}`);
    lines.push(`max_bytes: ${summary.metadata.maxBytes}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push('# Squad Context for Spec Kit Planning');
    lines.push('');

    // Skills section
    if (summary.content.skills.length > 0) {
      lines.push('## Team Skills (Highest Signal)');
      lines.push('');
      for (const skill of summary.content.skills) {
        lines.push(`### ${skill.name}`);
        lines.push('');
        lines.push(skill.context);

        if (skill.patterns.length > 0) {
          lines.push('');
          lines.push('**Patterns:**');
          for (const p of skill.patterns) {
            lines.push(`- ${p}`);
          }
        }

        if (skill.antiPatterns.length > 0) {
          lines.push('');
          lines.push('**Anti-Patterns:**');
          for (const ap of skill.antiPatterns) {
            lines.push(`- ${ap}`);
          }
        }

        lines.push('');
      }
    }

    // Decisions section
    if (summary.content.decisions.length > 0) {
      lines.push('## Relevant Decisions');
      lines.push('');
      for (const decision of summary.content.decisions) {
        lines.push(`### ${decision.title} (${decision.date})`);
        lines.push('');
        lines.push(`**Status:** ${decision.status}`);
        if (decision.summary) {
          lines.push('');
          lines.push(decision.summary);
        }
        lines.push('');
      }
    }

    // Learnings section
    if (summary.content.learnings.length > 0) {
      lines.push('## Agent Learnings (Summarized)');
      lines.push('');
      for (const learning of summary.content.learnings) {
        lines.push(`### ${learning.agentName} (${learning.agentRole})`);
        lines.push('');
        for (const entry of learning.entries) {
          lines.push(`**${entry.date}: ${entry.title}**`);
          lines.push('');
          lines.push(entry.summary);
          lines.push('');
        }
      }
    }

    // Warnings
    if (summary.content.warnings.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('*Warnings during context generation:*');
      for (const w of summary.content.warnings) {
        lines.push(`- ${w}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
