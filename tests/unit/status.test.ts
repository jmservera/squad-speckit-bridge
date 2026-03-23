import { describe, it, expect, vi } from 'vitest';
import { checkStatus } from '../../src/install/status.js';
import type {
  FrameworkDetector,
  FileDeployer,
  ConfigLoader,
} from '../../src/bridge/ports.js';
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
    deploy: vi.fn().mockResolvedValue([]),
    deployExecutable: vi.fn().mockResolvedValue([]),
    listDeployed: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeConfigLoader(
  overrides: Partial<ConfigLoader> = {},
): ConfigLoader {
  return {
    load: vi.fn().mockResolvedValue(createDefaultConfig()),
    ...overrides,
  };
}

describe('checkStatus', () => {
  it('reports both frameworks detected when present', async () => {
    const report = await checkStatus(
      makeDetector(),
      makeDeployer(),
      makeConfigLoader(),
    );

    expect(report.frameworks.squad.detected).toBe(true);
    expect(report.frameworks.specKit.detected).toBe(true);
  });

  it('reports frameworks not detected when absent', async () => {
    const detector = makeDetector({
      detectSquad: vi.fn().mockResolvedValue(false),
      detectSpecKit: vi.fn().mockResolvedValue(false),
    });

    const report = await checkStatus(
      detector,
      makeDeployer(),
      makeConfigLoader(),
    );

    expect(report.frameworks.squad.detected).toBe(false);
    expect(report.frameworks.specKit.detected).toBe(false);
  });

  it('reports components as installed when files are deployed', async () => {
    const deployer = makeDeployer({
      listDeployed: vi.fn().mockResolvedValue([
        '.squad/skills/speckit-bridge/SKILL.md',
        '.squad/skills/speckit-bridge/ceremony.md',
        '.specify/extensions/squad-bridge/extension.yml',
      ]),
    });

    const report = await checkStatus(
      makeDetector(),
      deployer,
      makeConfigLoader(),
    );

    expect(report.components.squadSkill.installed).toBe(true);
    expect(report.components.ceremonyDef.installed).toBe(true);
    expect(report.components.specKitExtension.installed).toBe(true);
    expect(report.components.manifest.installed).toBe(true);
    expect(report.installed).toBe(true);
  });

  it('reports components as not installed when no files deployed', async () => {
    const report = await checkStatus(
      makeDetector(),
      makeDeployer(),
      makeConfigLoader(),
    );

    expect(report.components.squadSkill.installed).toBe(false);
    expect(report.components.ceremonyDef.installed).toBe(false);
    expect(report.components.specKitExtension.installed).toBe(false);
    expect(report.components.manifest.installed).toBe(false);
    expect(report.installed).toBe(false);
  });

  it('includes config in the report', async () => {
    const report = await checkStatus(
      makeDetector(),
      makeDeployer(),
      makeConfigLoader(),
    );

    expect(report.config.contextMaxBytes).toBe(8192);
    expect(report.config.sources.skills).toBe(true);
  });

  it('includes version in the report', async () => {
    const report = await checkStatus(
      makeDetector(),
      makeDeployer(),
      makeConfigLoader(),
    );

    expect(report.version).toBe('0.2.0');
  });

  it('uses paths from config for detection', async () => {
    const customConfig = createDefaultConfig();
    customConfig.paths.squadDir = 'my-squad';
    customConfig.paths.specifyDir = 'my-specify';

    const detectSquad = vi.fn().mockResolvedValue(true);
    const detectSpecKit = vi.fn().mockResolvedValue(true);

    await checkStatus(
      { detectSquad, detectSpecKit },
      makeDeployer(),
      { load: vi.fn().mockResolvedValue(customConfig) },
    );

    expect(detectSquad).toHaveBeenCalledWith('my-squad');
    expect(detectSpecKit).toHaveBeenCalledWith('my-specify');
  });
});
