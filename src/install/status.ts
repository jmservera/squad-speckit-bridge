/**
 * T012: CheckStatus Use Case
 *
 * Reads manifest, detects current framework state, produces a structured status report.
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 */

import type { InstallManifest, BridgeConfig, ConstitutionStatus } from '../types.js';
import { detectConstitution } from '../types.js';
import type {
  FrameworkDetector,
  FileDeployer,
  ConfigLoader,
  SquadStateReader,
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
  warnings: string[];
  constitution?: ConstitutionStatus;
}

export async function checkStatus(
  detector: FrameworkDetector,
  deployer: FileDeployer,
  configLoader: ConfigLoader,
  squadReader: SquadStateReader | undefined,
  version: string,
): Promise<StatusReport> {
  const config = await configLoader.load();

  const hasSquad = await detector.detectSquad(config.paths.squadDir);
  const hasSpecKit = await detector.detectSpecKit(config.paths.specifyDir);

  const deployedFiles = await deployer.listDeployed();

  const squadSkillPath = `${config.paths.squadDir}/skills/speckit-bridge/SKILL.md`;
  const ceremonyPath = `${config.paths.squadDir}/skills/speckit-bridge/ceremony.md`;
  const extensionPath = `${config.paths.specifyDir}/extensions/squad-bridge/extension.yml`;

  const warnings: string[] = [];

  // US7: Constitution detection
  let constitution: ConstitutionStatus | undefined;
  if (squadReader?.readConstitution) {
    try {
      const content = await squadReader.readConstitution();
      constitution = detectConstitution(content);
      warnings.push(...constitution.warnings);
    } catch {
      // Skip if constitution reading fails
    }
  }

  // US7: Plan.md overwrite warning
  if (hasSpecKit) {
    warnings.push(
      'WARNING: Running setup-plan.sh will overwrite existing plan.md. ' +
      'Always commit plan.md before re-running Spec Kit pipeline phases.',
    );
  }

  return {
    version,
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
    warnings,
    constitution,
  };
}
