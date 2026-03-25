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
    hookTemplates?: {
      afterTasks: string;
      beforeSpecify: string;
      afterImplement: string;
    };
  },
  options: InstallOptions,
  version: string,
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
  const hookFiles: DeploymentFile[] = [];
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

    // Deploy hook scripts as executable
    if (templates.hookTemplates) {
      const hooksBase = `${specifyDir}/extensions/squad-bridge/hooks`;

      if (config.hooks.afterTasks) {
        hookFiles.push({
          targetPath: `${hooksBase}/after-tasks.sh`,
          content: templates.hookTemplates.afterTasks,
        });
      }
      if (config.hooks.beforeSpecify) {
        hookFiles.push({
          targetPath: `${hooksBase}/before-specify.sh`,
          content: templates.hookTemplates.beforeSpecify,
        });
      }
      if (config.hooks.afterImplement) {
        hookFiles.push({
          targetPath: `${hooksBase}/after-implement.sh`,
          content: templates.hookTemplates.afterImplement,
        });
      }
    }
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

  // Deploy regular files
  const deployedPaths = await deployer.deploy(files);

  // Deploy hook scripts with executable permissions
  let hookPaths: string[] = [];
  if (hookFiles.length > 0) {
    hookPaths = await deployer.deployExecutable(hookFiles);
  }

  const allPaths = [...deployedPaths, ...hookPaths];

  const now = new Date().toISOString();
  const manifest: InstallManifest = {
    version,
    installedAt: now,
    updatedAt: now,
    components,
    files: allPaths,
  };

  return { manifest, warnings };
}
