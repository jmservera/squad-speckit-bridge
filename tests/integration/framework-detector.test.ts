import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileSystemFrameworkDetector } from '../../src/install/adapters/framework-detector.js';

describe('FileSystemFrameworkDetector', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('detects Squad when .squad/ exists', async () => {
    await mkdir(join(testDir, '.squad'), { recursive: true });
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSquad('.squad')).toBe(true);
  });

  it('returns false when .squad/ is missing', async () => {
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSquad('.squad')).toBe(false);
  });

  it('detects Spec Kit when .specify/ exists', async () => {
    await mkdir(join(testDir, '.specify'), { recursive: true });
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSpecKit('.specify')).toBe(true);
  });

  it('returns false when .specify/ is missing', async () => {
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSpecKit('.specify')).toBe(false);
  });

  it('handles custom directory paths', async () => {
    await mkdir(join(testDir, 'custom-squad'), { recursive: true });
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSquad('custom-squad')).toBe(true);
  });

  it('returns false when path is a file, not a directory', async () => {
    await writeFile(join(testDir, '.squad'), 'not a directory');
    const detector = new FileSystemFrameworkDetector(testDir);
    expect(await detector.detectSquad('.squad')).toBe(false);
  });
});
