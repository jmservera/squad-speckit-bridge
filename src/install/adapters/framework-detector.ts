/**
 * T013: FrameworkDetector Adapter
 *
 * Detects .squad/ and .specify/ directories using fs/promises.
 * Implements FrameworkDetector port from ports.ts.
 */

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FrameworkDetector } from '../../bridge/ports.js';

export class FileSystemFrameworkDetector implements FrameworkDetector {
  private readonly baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  async detectSquad(dir: string): Promise<boolean> {
    return this.directoryExists(resolve(this.baseDir, dir));
  }

  async detectSpecKit(dir: string): Promise<boolean> {
    return this.directoryExists(resolve(this.baseDir, dir));
  }

  private async directoryExists(fullPath: string): Promise<boolean> {
    try {
      const stats = await stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
