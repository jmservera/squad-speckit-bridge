/**
 * T008: SpecLearningsWriterAdapter
 *
 * Implements the SpecLearningsWriter port.
 * Writes learnings.md to the spec directory.
 *
 * Adapter layer — uses fs/promises (framework), implements port.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { SpecLearningsWriter } from '../sync-reverse.js';
import type { LearningsMetadata } from '../../types.js';

export class SpecLearningsWriterAdapter implements SpecLearningsWriter {

  async write(specDir: string, content: string, _metadata: LearningsMetadata): Promise<string> {
    const outputPath = resolve(join(specDir, 'learnings.md'));
    await mkdir(specDir, { recursive: true });
    await writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }
}
