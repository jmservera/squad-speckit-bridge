import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileSystemDeployer } from '../../src/install/adapters/file-deployer.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const expectedVersion = (require('../../package.json') as { version: string }).version;

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
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

    const paths = await deployer.deploy([
      { targetPath: 'sub/dir/file.md', content: '# Hello' },
    ]);

    expect(paths).toEqual(['sub/dir/file.md']);
    const content = await readFile(join(testDir, 'sub/dir/file.md'), 'utf-8');
    expect(content).toBe('# Hello');
  });

  it('creates parent directories automatically', async () => {
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

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
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

    await deployer.deploy([
      { targetPath: 'test/SKILL.md', content: '# Skill' },
    ]);

    const raw = await readFile(
      join(testDir, '.bridge-manifest.json'),
      'utf-8',
    );
    const manifest = JSON.parse(raw);
    expect(manifest.version).toBe(expectedVersion);
    expect(manifest.files).toContain('test/SKILL.md');
    expect(manifest.components.squadSkill).toBe(true);
  });

  it('returns deployed file list from listDeployed()', async () => {
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

    await deployer.deploy([
      { targetPath: 'a.md', content: 'a' },
      { targetPath: 'b.yml', content: 'b' },
    ]);

    const listed = await deployer.listDeployed();
    expect(listed).toContain('a.md');
    expect(listed).toContain('b.yml');
  });

  it('returns empty array from listDeployed() when no manifest', async () => {
    const deployer = new FileSystemDeployer(testDir, expectedVersion);
    const listed = await deployer.listDeployed();
    expect(listed).toEqual([]);
  });

  it('handles idempotent re-deploy', async () => {
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

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
    const deployer = new FileSystemDeployer(testDir, expectedVersion);

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

  describe('deployExecutable — T004 permission tests', () => {
    it('sets 0o755 permissions on deployed hook scripts', async () => {
      const deployer = new FileSystemDeployer(testDir, expectedVersion);

      await deployer.deployExecutable([
        { targetPath: 'hooks/after-tasks.sh', content: '#!/usr/bin/env bash\nexit 0' },
      ]);

      const info = await stat(join(testDir, 'hooks/after-tasks.sh'));
      // 0o755 = owner rwx, group rx, others rx
      expect(info.mode & 0o777).toBe(0o755);
    });

    it('sets 0o755 on all hook templates deployed together', async () => {
      const deployer = new FileSystemDeployer(testDir, expectedVersion);

      const hooks = [
        { targetPath: 'hooks/after-tasks.sh', content: '#!/usr/bin/env bash\nexit 0' },
        { targetPath: 'hooks/before-specify.sh', content: '#!/usr/bin/env bash\nexit 0' },
        { targetPath: 'hooks/after-implement.sh', content: '#!/usr/bin/env bash\nexit 0' },
      ];

      const paths = await deployer.deployExecutable(hooks);

      expect(paths).toHaveLength(3);
      for (const hookPath of paths) {
        const info = await stat(join(testDir, hookPath));
        expect(info.mode & 0o777).toBe(0o755);
      }
    });

    it('creates parent directories for executable files', async () => {
      const deployer = new FileSystemDeployer(testDir, expectedVersion);

      await deployer.deployExecutable([
        { targetPath: 'deep/nested/hook.sh', content: '#!/usr/bin/env bash' },
      ]);

      const content = await readFile(join(testDir, 'deep/nested/hook.sh'), 'utf-8');
      expect(content).toBe('#!/usr/bin/env bash');
      const info = await stat(join(testDir, 'deep/nested/hook.sh'));
      expect(info.mode & 0o777).toBe(0o755);
    });
  });
});
