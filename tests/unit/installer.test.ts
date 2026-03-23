import { describe, it, expect, vi } from 'vitest';
import { installBridge } from '../../src/install/installer.js';
import type { FrameworkDetector, FileDeployer } from '../../src/bridge/ports.js';
import { createDefaultConfig } from '../../src/types.js';

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

    const result = await installBridge(detector, deployer, templates, { config });

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

    const result = await installBridge(detector, deployer, templates, { config });

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

    const result = await installBridge(detector, deployer, templates, { config });

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
      installBridge(detector, deployer, templates, { config }),
    ).rejects.toThrow('No frameworks detected');
  });

  it('produces a valid InstallManifest', async () => {
    const detector = makeDetector();
    const deployer = makeDeployer();
    const config = createDefaultConfig();

    const result = await installBridge(detector, deployer, templates, { config });

    expect(result.manifest.version).toBe('0.1.0');
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

    await installBridge(detector, deployer, templates, { config });

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

    await installBridge(detector, deployer, templates, { config });

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

    const result = await installBridge(detector, deployer, templates, { config });

    // Should succeed without errors — re-install is idempotent
    expect(result.manifest.files).toHaveLength(3);
  });
});
