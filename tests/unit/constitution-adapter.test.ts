/**
 * Unit tests for ConstitutionAdapter
 *
 * Tests readConstitution() and appendLearnings() against real file system
 * with temp directories. Verifies version bumping, date updates, content
 * preservation, and directory creation.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConstitutionAdapter } from '../../src/sync/adapters/constitution-adapter.js';

describe('ConstitutionAdapter — readConstitution', () => {
  let tempDir: string;
  const adapter = new ConstitutionAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns content when file exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-read-'));
    const filePath = join(tempDir, 'constitution.md');
    const content = '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-20\n';
    await writeFile(filePath, content, 'utf-8');

    const result = await adapter.readConstitution(filePath);
    expect(result).toBe(content);
  });

  it('returns null when file does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-read-'));
    const filePath = join(tempDir, 'nonexistent.md');

    const result = await adapter.readConstitution(filePath);
    expect(result).toBeNull();
  });
});

describe('ConstitutionAdapter — appendLearnings', () => {
  let tempDir: string;
  const adapter = new ConstitutionAdapter();

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('appends a learnings section with spec ID and timestamp', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-append-'));
    const filePath = join(tempDir, 'constitution.md');
    await writeFile(
      filePath,
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-01\n',
      'utf-8',
    );

    await adapter.appendLearnings(filePath, 'test-spec', [
      { title: 'Cache strategy', content: 'Use Redis for sessions' },
    ]);

    const updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain('## Learnings from Spec test-spec');
    expect(updated).toContain('_Synced:');
    expect(updated).toContain('- **Cache strategy**: Use Redis for sessions');
  });

  it('bumps version (minor): 1.0.0 → 1.1.0', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-ver-'));
    const filePath = join(tempDir, 'constitution.md');
    await writeFile(
      filePath,
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-01\n',
      'utf-8',
    );

    await adapter.appendLearnings(filePath, 'spec-001', [
      { title: 'Learning', content: 'Content' },
    ]);

    const updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain('**Version**: 1.1.0');
    expect(updated).not.toContain('**Version**: 1.0.0');
  });

  it('updates Last Amended date to today', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-date-'));
    const filePath = join(tempDir, 'constitution.md');
    await writeFile(
      filePath,
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2020-01-01\n',
      'utf-8',
    );

    await adapter.appendLearnings(filePath, 'spec-001', [
      { title: 'Learning', content: 'Content' },
    ]);

    const today = new Date().toISOString().split('T')[0];
    const updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain(`**Last Amended**: ${today}`);
    expect(updated).not.toContain('**Last Amended**: 2020-01-01');
  });

  it('creates directory if it does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-mkdir-'));
    const nestedPath = join(tempDir, 'deeply', 'nested', 'memory', 'constitution.md');

    await adapter.appendLearnings(nestedPath, 'spec-001', [
      { title: 'Learning', content: 'Content' },
    ]);

    const content = await readFile(nestedPath, 'utf-8');
    expect(content).toContain('## Learnings from Spec spec-001');
  });

  it('creates a new constitution if none exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-new-'));
    const filePath = join(tempDir, 'constitution.md');

    await adapter.appendLearnings(filePath, 'spec-001', [
      { title: 'First learning', content: 'We learned this' },
    ]);

    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('# Project Constitution');
    expect(content).toContain('**Version**: 1.1.0');
    expect(content).toContain('## Learnings from Spec spec-001');
    expect(content).toContain('- **First learning**: We learned this');
  });

  it('preserves existing content (appends, does not overwrite)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-preserve-'));
    const filePath = join(tempDir, 'constitution.md');
    const original = [
      '# Project Constitution',
      '',
      '**Version**: 1.0.0 | **Last Amended**: 2025-07-01',
      '',
      '## Core Principles',
      '',
      '1. **Clean Architecture** — All dependencies point inward',
      '2. **Test-First** — Write tests before implementation',
      '',
    ].join('\n');
    await writeFile(filePath, original, 'utf-8');

    await adapter.appendLearnings(filePath, 'spec-001', [
      { title: 'New learning', content: 'Something new' },
    ]);

    const updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain('## Core Principles');
    expect(updated).toContain('**Clean Architecture**');
    expect(updated).toContain('**Test-First**');
    expect(updated).toContain('## Learnings from Spec spec-001');
    expect(updated).toContain('- **New learning**: Something new');
  });

  it('multiple appendLearnings calls bump version incrementally (1.0.0 → 1.1.0 → 1.2.0)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'const-multi-'));
    const filePath = join(tempDir, 'constitution.md');
    await writeFile(
      filePath,
      '# Project Constitution\n\n**Version**: 1.0.0 | **Last Amended**: 2025-07-01\n',
      'utf-8',
    );

    await adapter.appendLearnings(filePath, 'spec-001', [
      { title: 'First', content: 'First content' },
    ]);

    let updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain('**Version**: 1.1.0');

    await adapter.appendLearnings(filePath, 'spec-002', [
      { title: 'Second', content: 'Second content' },
    ]);

    updated = await readFile(filePath, 'utf-8');
    expect(updated).toContain('**Version**: 1.2.0');
    expect(updated).not.toContain('**Version**: 1.1.0');
    expect(updated).toContain('## Learnings from Spec spec-001');
    expect(updated).toContain('## Learnings from Spec spec-002');
  });
});
