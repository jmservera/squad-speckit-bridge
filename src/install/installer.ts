/**
 * T011: InstallBridge Use Case
 *
 * Orchestrates bridge installation: detect frameworks, determine components,
 * deploy files, produce InstallManifest. Handles degraded mode (one framework missing).
 *
 * Clean Architecture: imports ONLY from ../types.ts and ../bridge/ports.ts.
 * All I/O goes through port interfaces.
 */

import type { InstallManifest, DeploymentFile, BridgeConfig } from '../types.js';
import type { FrameworkDetector, FileDeployer } from '../bridge/ports.js';

export interface InstallOptions {
  config: BridgeConfig;
  force?: boolean;
}

export interface InstallResult {
  manifest: InstallManifest;
  warnings: string[];
}

export async function installBridge(
  detector: FrameworkDetector,
  deployer: FileDeployer,
  templates: {
    skillTemplate: string;
    ceremonyTemplate: string;
    extensionTemplate: string;
  },
  options: InstallOptions,
): Promise<InstallResult> {
  const { config, force = false } = options;
  const warnings: string[] = [];

  const squadDir = config.paths.squadDir;
  const specifyDir = config.paths.specifyDir;

  // Detect frameworks
  const hasSquad = await detector.detectSquad(squadDir);
  const hasSpecKit = await detector.detectSpecKit(specifyDir);

  if (!hasSquad && !hasSpecKit) {
    throw new Error(
      'No frameworks detected. Initialize Squad (.squad/) or Spec Kit (.specify/) first.',
    );
  }

  // Determine which components to deploy
  const files: DeploymentFile[] = [];
  const components = {
    squadSkill: false,
    specKitExtension: false,
    ceremonyDef: false,
  };

  if (hasSquad) {
    files.push({
      targetPath: `${squadDir}/skills/speckit-bridge/SKILL.md`,
      content: templates.skillTemplate,
    });
    components.squadSkill = true;

    files.push({
      targetPath: `${squadDir}/skills/speckit-bridge/ceremony.md`,
      content: templates.ceremonyTemplate,
    });
    components.ceremonyDef = true;
  } else {
    warnings.push(
      `Squad not detected (${squadDir}/ missing). Squad components skipped.`,
    );
  }

  if (hasSpecKit) {
    files.push({
      targetPath: `${specifyDir}/extensions/squad-bridge/extension.yml`,
      content: templates.extensionTemplate,
    });
    components.specKitExtension = true;
  } else {
    warnings.push(
      `Spec Kit not detected (${specifyDir}/ missing). Spec Kit components skipped.`,
    );
  }

  // Check for existing deployment (idempotent re-install)
  if (!force) {
    const existing = await deployer.listDeployed();
    if (existing.length > 0) {
      // Re-install: update in place — this is idempotent by design
    }
  }

  // Deploy files
  const deployedPaths = await deployer.deploy(files);

  const now = new Date().toISOString();
  const manifest: InstallManifest = {
    version: '0.1.0',
    installedAt: now,
    updatedAt: now,
    components,
    files: deployedPaths,
  };

  return { manifest, warnings };
}
