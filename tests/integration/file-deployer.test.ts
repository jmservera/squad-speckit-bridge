import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileSystemDeployer } from '../../src/install/adapters/file-deployer.js';

describe('FileSystemDeployer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bridge-deploy-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('creates files with correct content', async () => {
    const deployer = new FileSystemDeployer(testDir);

    const paths = await deployer.deploy([
      { targetPath: 'sub/dir/file.md', content: '# Hello' },
    ]);

    expect(paths).toEqual(['sub/dir/file.md']);
    const content = await readFile(join(testDir, 'sub/dir/file.md'), 'utf-8');
    expect(content).toBe('# Hello');
  });

  it('creates parent directories automatically', async () => {
    const deployer = new FileSystemDeployer(testDir);

    await deployer.deploy([
      { targetPath: 'deep/nested/path/file.txt', content: 'content' },
    ]);

    const content = await readFile(
      join(testDir, 'deep/nested/path/file.txt'),
      'utf-8',
    );
    expect(content).toBe('content');
  });

  it('writes .bridge-manifest.json after deploy', async () => {
    const deployer = new FileSystemDeployer(testDir);

    await deployer.deploy([
      { targetPath: 'test/SKILL.md', content: '# Skill' },
    ]);

    const raw = await readFile(
      join(testDir, '.bridge-manifest.json'),
      'utf-8',
    );
    const manifest = JSON.parse(raw);
    expect(manifest.version).toBe('0.2.0');
    expect(manifest.files).toContain('test/SKILL.md');
    expect(manifest.components.squadSkill).toBe(true);
  });

  it('returns deployed file list from listDeployed()', async () => {
    const deployer = new FileSystemDeployer(testDir);

    await deployer.deploy([
      { targetPath: 'a.md', content: 'a' },
      { targetPath: 'b.yml', content: 'b' },
    ]);

    const listed = await deployer.listDeployed();
    expect(listed).toContain('a.md');
    expect(listed).toContain('b.yml');
  });

  it('returns empty array from listDeployed() when no manifest', async () => {
    const deployer = new FileSystemDeployer(testDir);
    const listed = await deployer.listDeployed();
    expect(listed).toEqual([]);
  });

  it('handles idempotent re-deploy', async () => {
    const deployer = new FileSystemDeployer(testDir);

    await deployer.deploy([
      { targetPath: 'file.md', content: 'v1' },
    ]);

    await deployer.deploy([
      { targetPath: 'file.md', content: 'v2' },
    ]);

    const content = await readFile(join(testDir, 'file.md'), 'utf-8');
    expect(content).toBe('v2');

    const raw = await readFile(
      join(testDir, '.bridge-manifest.json'),
      'utf-8',
    );
    const manifest = JSON.parse(raw);
    expect(manifest.files).toEqual(['file.md']);
  });

  it('preserves original installedAt on re-deploy', async () => {
    const deployer = new FileSystemDeployer(testDir);

    await deployer.deploy([{ targetPath: 'a.md', content: 'a' }]);

    const raw1 = await readFile(
      join(testDir, '.bridge-manifest.json'),
      'utf-8',
    );
    const manifest1 = JSON.parse(raw1);

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    await deployer.deploy([{ targetPath: 'a.md', content: 'updated' }]);

    const raw2 = await readFile(
      join(testDir, '.bridge-manifest.json'),
      'utf-8',
    );
    const manifest2 = JSON.parse(raw2);

    expect(manifest2.installedAt).toBe(manifest1.installedAt);
    expect(manifest2.updatedAt).not.toBe(manifest1.installedAt);
  });
});
