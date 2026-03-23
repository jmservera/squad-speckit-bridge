/**
 * T012: CheckStatus Use Case
 *
 * Reads manifest, detects current framework state, produces a structured status report.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { InstallManifest, BridgeConfig } from '../types.js';
import type {
  FrameworkDetector,
  FileDeployer,
  ConfigLoader,
} from '../bridge/ports.js';

export interface FrameworkStatus {
  detected: boolean;
  path: string;
}

export interface ComponentStatus {
  installed: boolean;
  path?: string;
}

export interface StatusReport {
  version: string;
  frameworks: {
    squad: FrameworkStatus;
    specKit: FrameworkStatus;
  };
  components: {
    squadSkill: ComponentStatus;
    ceremonyDef: ComponentStatus;
    specKitExtension: ComponentStatus;
    manifest: ComponentStatus;
  };
  config: BridgeConfig;
  installed: boolean;
}

export async function checkStatus(
  detector: FrameworkDetector,
  deployer: FileDeployer,
  configLoader: ConfigLoader,
): Promise<StatusReport> {
  const config = await configLoader.load();

  const hasSquad = await detector.detectSquad(config.paths.squadDir);
  const hasSpecKit = await detector.detectSpecKit(config.paths.specifyDir);

  const deployedFiles = await deployer.listDeployed();

  const squadSkillPath = `${config.paths.squadDir}/skills/speckit-bridge/SKILL.md`;
  const ceremonyPath = `${config.paths.squadDir}/skills/speckit-bridge/ceremony.md`;
  const extensionPath = `${config.paths.specifyDir}/extensions/squad-bridge/extension.yml`;

  return {
    version: '0.1.0',
    frameworks: {
      squad: { detected: hasSquad, path: config.paths.squadDir },
      specKit: { detected: hasSpecKit, path: config.paths.specifyDir },
    },
    components: {
      squadSkill: {
        installed: deployedFiles.includes(squadSkillPath),
        path: deployedFiles.includes(squadSkillPath)
          ? squadSkillPath
          : undefined,
      },
      ceremonyDef: {
        installed: deployedFiles.includes(ceremonyPath),
        path: deployedFiles.includes(ceremonyPath)
          ? ceremonyPath
          : undefined,
      },
      specKitExtension: {
        installed: deployedFiles.includes(extensionPath),
        path: deployedFiles.includes(extensionPath)
          ? extensionPath
          : undefined,
      },
      manifest: {
        installed: deployedFiles.length > 0,
        path: deployedFiles.length > 0 ? '.bridge-manifest.json' : undefined,
      },
    },
    config,
    installed: deployedFiles.length > 0,
  };
}
