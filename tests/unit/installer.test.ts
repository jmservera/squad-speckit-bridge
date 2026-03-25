import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { installBridge } from '../../src/install/installer.js';
import type { FrameworkDetector, FileDeployer } from '../../src/bridge/ports.js';
import { createDefaultConfig } from '../../src/types.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const expectedVersion = (require('../../package.json') as { version: string }).version;

function makeDetector(
  overrides: Partial<FrameworkDetector> = {},
): FrameworkDetector {
  return {
    detectSquad: vi.fn().mockResolvedValue(true),
    detectSpecKit: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeDeployer(
  overrides: Partial<FileDeployer> = {},
): FileDeployer {
  return {
    deploy: vi.fn().mockImplementation(async (files) =>
      files.map((f: { targetPath: string }) => f.targetPath),
    ),
    deployExecutable: vi.fn().mockImplementation(async (files) =>
      files.map((f: { targetPath: string }) => f.targetPath),
    ),
    listDeployed: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const templates = {
  skillTemplate: '# Skill template',
  ceremonyTemplate: '# Ceremony template',
  extensionTemplate: 'id: squad-bridge',
};

describe('installBridge', () => {
  it('deploys all components when both frameworks detected', async () => {
    const detector = makeDetector();
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config }, expectedVersion);

    expect(result.manifest.components.squadSkill).toBe(true);
    expect(result.manifest.components.specKitExtension).toBe(true);
    expect(result.manifest.components.ceremonyDef).toBe(true);
    expect(result.manifest.files).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
  });

  it('deploys Squad-only components when Spec Kit missing', async () => {
    const detector = makeDetector({
      detectSpecKit: vi.fn().mockResolvedValue(false),
    });
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config }, expectedVersion);

    expect(result.manifest.components.squadSkill).toBe(true);
    expect(result.manifest.components.specKitExtension).toBe(false);
    expect(result.manifest.components.ceremonyDef).toBe(true);
    expect(result.manifest.files).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Spec Kit not detected');
  });

  it('deploys SpecKit-only components when Squad missing', async () => {
    const detector = makeDetector({
      detectSquad: vi.fn().mockResolvedValue(false),
    });
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config }, expectedVersion);

    expect(result.manifest.components.squadSkill).toBe(false);
    expect(result.manifest.components.specKitExtension).toBe(true);
    expect(result.manifest.components.ceremonyDef).toBe(false);
    expect(result.manifest.files).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Squad not detected');
  });

  it('throws when no frameworks detected', async () => {
    const detector = makeDetector({
      detectSquad: vi.fn().mockResolvedValue(false),
      detectSpecKit: vi.fn().mockResolvedValue(false),
    });
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    await expect(
      installBridge(detector, deployer, templates, { config }, expectedVersion),
    ).rejects.toThrow('No frameworks detected');
  });

  it('produces a valid InstallManifest', async () => {
    const detector = makeDetector();
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config }, expectedVersion);

    expect(result.manifest.version).toBe(expectedVersion);
    expect(result.manifest.installedAt).toBeTruthy();
    expect(result.manifest.updatedAt).toBeTruthy();
  });

  it('passes correct file paths to deployer', async () => {
    const detector = makeDetector();
    const deployMock = vi.fn().mockImplementation(async (files) =>
      files.map((f: { targetPath: string }) => f.targetPath),
    );
    const deployer = makeDeployer({ deploy: deployMock });
    const config = createDefaultConfig();

    await installBridge(detector, deployer, templates, { config }, expectedVersion);

    const deployedFiles = deployMock.mock.calls[0][0];
    expect(deployedFiles).toHaveLength(3);
    expect(deployedFiles[0].targetPath).toContain('SKILL.md');
    expect(deployedFiles[1].targetPath).toContain('ceremony.md');
    expect(deployedFiles[2].targetPath).toContain('extension.yml');
  });

  it('uses custom paths from config', async () => {
    const detector = makeDetector();
    const deployMock = vi.fn().mockImplementation(async (files) =>
      files.map((f: { targetPath: string }) => f.targetPath),
    );
    const deployer = makeDeployer({ deploy: deployMock });
    const config = createDefaultConfig();
    config.paths.squadDir = 'custom-squad';
    config.paths.specifyDir = 'custom-specify';

    await installBridge(detector, deployer, templates, { config }, expectedVersion);

    const deployedFiles = deployMock.mock.calls[0][0];
    expect(deployedFiles[0].targetPath).toContain('custom-squad');
    expect(deployedFiles[2].targetPath).toContain('custom-specify');
  });

  it('handles idempotent re-install with existing deployment', async () => {
    const detector = makeDetector();
    const deployer = makeDeployer({
      listDeployed: vi.fn().mockResolvedValue([
        '.squad/skills/speckit-bridge/SKILL.md',
      ]),
    });
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config }, expectedVersion);

    // Should succeed without errors — re-install is idempotent
    expect(result.manifest.files).toHaveLength(3);
  });
});

// --- T006: after-tasks hook automation tests ---

const HOOKS_DIR = resolve(__dirname, '../../src/install/templates/hooks');

function readHook(name: string): string {
  return readFileSync(join(HOOKS_DIR, name), 'utf-8');
}

describe('after-tasks hook automation — T006', () => {
  const hook = readHook('after-tasks.sh');

  it('contains squask issues invocation', () => {
    expect(hook).toContain('squask issues');
  });

  it('has error handling block for squask command', () => {
    expect(hook).toContain('|| {');
    expect(hook).toContain('WARNING: Issue creation failed');
  });

  it('checks bridge config before running', () => {
    expect(hook).toContain('BRIDGE_CONFIG');
    expect(hook).toContain('HOOK_ENABLED');
  });

  it('validates SPECKIT_SPEC_DIR is set', () => {
    expect(hook).toContain('SPECKIT_SPEC_DIR');
  });

  it('exits 0 on error — hooks must not block pipeline', () => {
    // Every exit in the file must be exit 0
    const exitLines = hook.split('\n').filter((l) => /^\s*exit\s+\d/.test(l));
    expect(exitLines.length).toBeGreaterThan(0);
    for (const line of exitLines) {
      expect(line.trim()).toBe('exit 0');
    }
  });

  it('uses set -euo pipefail for strict mode', () => {
    expect(hook).toContain('set -euo pipefail');
  });

  it('starts with bash shebang', () => {
    expect(hook.startsWith('#!/usr/bin/env bash')).toBe(true);
  });
});

// --- T008: Cross-hook CLI alias consistency ---

describe('cross-hook CLI alias consistency — T008', () => {
  const hookFiles = readdirSync(HOOKS_DIR).filter((f) => f.endsWith('.sh'));
  const SCOPED_PACKAGE_PATTERNS = [
    '@jmservera/squad-speckit-bridge',
    'npx squad-speckit-bridge',
    'npx @jmservera',
  ];

  it('finds all 3 hook templates', () => {
    expect(hookFiles).toHaveLength(3);
    expect(hookFiles).toContain('after-tasks.sh');
    expect(hookFiles).toContain('before-specify.sh');
    expect(hookFiles).toContain('after-implement.sh');
  });

  for (const hookFile of hookFiles) {
    describe(hookFile, () => {
      const content = readHook(hookFile);

      it('does not invoke the bridge via scoped package names', () => {
        // Lines that are just echo'd install instructions are acceptable
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comment lines and echo/print lines (install instructions)
          if (trimmed.startsWith('#') || trimmed.startsWith('echo')) continue;
          for (const pattern of SCOPED_PACKAGE_PATTERNS) {
            expect(trimmed).not.toContain(pattern);
          }
        }
      });

      it('uses squask CLI alias for bridge commands', () => {
        // Every hook that invokes the bridge CLI should use `squask`, not npx or scoped names
        const commandLines = content.split('\n').filter(
          (l) => l.includes('squask ') || l.includes('npx ') || l.includes('squad-speckit-bridge'),
        );
        for (const line of commandLines) {
          // Lines checking command availability are OK
          if (line.includes('command -v')) continue;
          // Informational echo lines with install instructions are OK
          if (line.trim().startsWith('echo') && line.includes('npm install')) continue;
          expect(line).toContain('squask');
          expect(line).not.toContain('npx squad-speckit-bridge');
        }
      });

      it('exits 0 on all exit paths — hooks must not block pipeline', () => {
        const exitLines = content.split('\n').filter((l) => /^\s*exit\s+\d/.test(l));
        expect(exitLines.length).toBeGreaterThan(0);
        for (const line of exitLines) {
          expect(line.trim()).toBe('exit 0');
        }
      });
    });
  }
});
