/**
 * T011: ImplementationScanner Adapter
 *
 * Implements ImplementationScanner port. Scans source files under a
 * given directory for comments, annotations, or string references
 * that mention FR-XXX requirement IDs.
 *
 * Detection kinds: comment, annotation, reference.
 *
 * Clean Architecture: adapter layer — may import node:fs and glob.
 */

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { glob } from 'glob';
import type { ImplementationScanner } from '../ports.js';
import type { ImplementationEvidence } from '../../types.js';

const SOURCE_EXTENSIONS = '**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,java,sh}';

export class SourceImplementationScanner implements ImplementationScanner {
  async scan(
    srcDir: string,
    requirementIds: string[],
  ): Promise<ImplementationEvidence[]> {
    if (requirementIds.length === 0) return [];

    let files: string[];
    try {
      const pattern = `${srcDir.replace(/\\/g, '/')}/${SOURCE_EXTENSIONS}`;
      files = await glob(pattern, { nodir: true });
    } catch {
      return [];
    }

    const idSet = new Set(requirementIds);
    const evidence: ImplementationEvidence[] = [];

    for (const filePath of files) {
      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const matches = line.matchAll(/FR-\d{3,4}/g);
        for (const m of matches) {
          const frId = m[0];
          if (!idSet.has(frId)) continue;

          evidence.push({
            requirementId: frId,
            filePath: relative(srcDir, filePath).replace(/\\/g, '/'),
            line: lineIdx + 1,
            snippet: line.trim(),
            kind: classifyKind(line),
          });
        }
      }
    }

    return evidence;
  }
}

/**
 * Classify a line as comment, annotation, or generic reference.
 * Exported for direct testing.
 */
export function classifyKind(
  line: string,
): 'comment' | 'annotation' | 'reference' {
  const trimmed = line.trim();

  // Annotation patterns: @requirement, @implements, @satisfies
  if (/@(?:requirement|implements|satisfies)\s+FR-/i.test(trimmed)) {
    return 'annotation';
  }

  // Comment patterns: //, /*, #, *, /**
  if (
    /^\s*\/\//.test(line) ||
    /^\s*\/\*/.test(line) ||
    /^\s*\*/.test(line) ||
    /^\s*#/.test(line)
  ) {
    return 'comment';
  }

  return 'reference';
}
