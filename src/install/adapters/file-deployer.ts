/**
 * T017: FileDeployer Adapter
 *
 * Renders template files to target paths and manages .bridge-manifest.json.
 * Implements FileDeployer port. Handles idempotent re-installation.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { FileDeployer } from '../../bridge/ports.js';
import type { DeploymentFile, InstallManifest } from '../../types.js';

const MANIFEST_FILENAME = '.bridge-manifest.json';

export class FileSystemDeployer implements FileDeployer {
  private readonly baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  async deploy(files: DeploymentFile[]): Promise<string[]> {
    const deployedPaths: string[] = [];

    for (const file of files) {
      const fullPath = resolve(this.baseDir, file.targetPath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content, 'utf-8');
      deployedPaths.push(file.targetPath);
    }

    // Write manifest with deployed file list
    await this.writeManifest(deployedPaths);

    return deployedPaths;
  }

  async listDeployed(): Promise<string[]> {
    const manifest = await this.readManifest();
    if (!manifest) return [];
    return manifest.files;
  }

  private async writeManifest(files: string[]): Promise<void> {
    const manifestPath = resolve(this.baseDir, MANIFEST_FILENAME);
    const existing = await this.readManifest();

    const now = new Date().toISOString();
    const manifest: InstallManifest = {
      version: '0.1.0',
      installedAt: existing?.installedAt ?? now,
      updatedAt: now,
      components: {
        squadSkill: files.some((f) => f.includes('SKILL.md')),
        specKitExtension: files.some((f) => f.includes('extension.yml')),
        ceremonyDef: files.some((f) => f.includes('ceremony.md')),
      },
      files,
    };

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  }

  private async readManifest(): Promise<InstallManifest | null> {
    try {
      const manifestPath = resolve(this.baseDir, MANIFEST_FILENAME);
      const raw = await readFile(manifestPath, 'utf-8');
      return JSON.parse(raw) as InstallManifest;
    } catch {
      return null;
    }
  }
}
