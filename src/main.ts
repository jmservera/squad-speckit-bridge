/**
 * T020: Composition Root
 *
 * Wires real adapters into use cases via constructor injection.
 * The ONLY file that knows about all layers. No business logic here.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileSystemFrameworkDetector } from './install/adapters/framework-detector.js';
import { FileSystemDeployer } from './install/adapters/file-deployer.js';
import { ConfigFileLoader } from './install/adapters/config-loader.js';
import { installBridge } from './install/installer.js';
import { checkStatus } from './install/status.js';
import type { StatusReport } from './install/status.js';
import type { InstallManifest } from './types.js';

// Resolve template directory relative to this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, 'install', 'templates');

async function loadTemplate(name: string): Promise<string> {
  const templatePath = resolve(TEMPLATES_DIR, name);
  return readFile(templatePath, 'utf-8');
}

export interface InstallerOptions {
  configPath?: string;
  squadDir?: string;
  specifyDir?: string;
  baseDir?: string;
}

export interface InstallOutput {
  humanOutput: string;
  jsonOutput: {
    version: string;
    frameworks: {
      squad: { detected: boolean; path: string };
      specKit: { detected: boolean; path: string };
    };
    installed: string[];
    warnings: string[];
  };
}

export interface StatusOutput {
  humanOutput: string;
  jsonOutput: StatusReport;
}

export function createInstaller(options: InstallerOptions = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const detector = new FileSystemFrameworkDetector(baseDir);
  const deployer = new FileSystemDeployer(baseDir);
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });

  return {
    async install(opts: { force?: boolean } = {}): Promise<InstallOutput> {
      const config = await configLoader.load();

      // Apply CLI overrides
      if (options.squadDir) config.paths.squadDir = options.squadDir;
      if (options.specifyDir) config.paths.specifyDir = options.specifyDir;

      // Load templates
      const [skillTemplate, ceremonyTemplate, extensionTemplate] =
        await Promise.all([
          loadTemplate('skill.md'),
          loadTemplate('ceremony.md'),
          loadTemplate('extension.yml'),
        ]);

      const result = await installBridge(
        detector,
        deployer,
        { skillTemplate, ceremonyTemplate, extensionTemplate },
        { config, force: opts.force },
      );

      const humanOutput = formatInstallHuman(result.manifest, result.warnings, config);
      const jsonOutput = formatInstallJson(result.manifest, result.warnings, config);

      return { humanOutput, jsonOutput };
    },
  };
}

export function createStatusChecker(
  options: { configPath?: string; baseDir?: string } = {},
) {
  const baseDir = options.baseDir ?? process.cwd();
  const detector = new FileSystemFrameworkDetector(baseDir);
  const deployer = new FileSystemDeployer(baseDir);
  const configLoader = new ConfigFileLoader({
    configPath: options.configPath,
    baseDir,
  });

  return {
    async check(): Promise<StatusOutput> {
      const report = await checkStatus(detector, deployer, configLoader);
      return {
        humanOutput: formatStatusHuman(report),
        jsonOutput: report,
      };
    },
  };
}

// --- Output formatters (adapter-level concern) ---

function formatInstallHuman(
  manifest: InstallManifest,
  warnings: string[],
  config: { paths: { squadDir: string; specifyDir: string } },
): string {
  const lines: string[] = [];
  lines.push(`Squad-SpecKit Bridge v${manifest.version}`);
  lines.push('');
  lines.push('Detecting frameworks...');

  if (manifest.components.squadSkill) {
    lines.push(`  ✓ Squad detected at ${config.paths.squadDir}/`);
  } else {
    lines.push(`  ⚠ Squad not detected (${config.paths.squadDir}/ missing)`);
  }

  if (manifest.components.specKitExtension) {
    lines.push(`  ✓ Spec Kit detected at ${config.paths.specifyDir}/`);
  } else {
    lines.push(`  ⚠ Spec Kit not detected (${config.paths.specifyDir}/ missing)`);
  }

  lines.push('');

  const isPartial =
    !manifest.components.squadSkill || !manifest.components.specKitExtension;
  if (isPartial) {
    lines.push('Installing partial components...');
  } else {
    lines.push('Installing components...');
  }

  for (const file of manifest.files) {
    lines.push(`  ✓ ${file}`);
  }
  lines.push(`  ✓ Manifest: .bridge-manifest.json`);

  lines.push('');

  if (isPartial) {
    lines.push(
      `Partial installation complete. ${manifest.files.length} files created.`,
    );
    if (!manifest.components.squadSkill) {
      lines.push(
        'To complete: Initialize Squad, then run `squad-speckit-bridge install` again.',
      );
    }
    if (!manifest.components.specKitExtension) {
      lines.push(
        'To complete: Initialize Spec Kit, then run `squad-speckit-bridge install` again.',
      );
    }
  } else {
    lines.push(
      `Installation complete. ${manifest.files.length} files created.`,
    );
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  return lines.join('\n');
}

function formatInstallJson(
  manifest: InstallManifest,
  warnings: string[],
  config: { paths: { squadDir: string; specifyDir: string } },
) {
  return {
    version: manifest.version,
    frameworks: {
      squad: {
        detected: manifest.components.squadSkill,
        path: config.paths.squadDir,
      },
      specKit: {
        detected: manifest.components.specKitExtension,
        path: config.paths.specifyDir,
      },
    },
    installed: manifest.files,
    warnings,
  };
}

function formatStatusHuman(report: StatusReport): string {
  const lines: string[] = [];
  lines.push(`Squad-SpecKit Bridge v${report.version}`);
  lines.push('');
  lines.push('Frameworks:');
  lines.push(
    `  Squad:    ${report.frameworks.squad.detected ? '✓' : '✗'} ${report.frameworks.squad.detected ? 'detected' : 'not detected'} at ${report.frameworks.squad.path}/`,
  );
  lines.push(
    `  Spec Kit: ${report.frameworks.specKit.detected ? '✓' : '✗'} ${report.frameworks.specKit.detected ? 'detected' : 'not detected'} at ${report.frameworks.specKit.path}/`,
  );

  lines.push('');
  lines.push('Bridge Components:');

  const comp = report.components;
  lines.push(
    `  Squad skill:      ${comp.squadSkill.installed ? '✓ installed' : '✗ not installed'}${comp.squadSkill.path ? ` (${comp.squadSkill.path})` : ''}`,
  );
  lines.push(
    `  Ceremony def:     ${comp.ceremonyDef.installed ? '✓ installed' : '✗ not installed'}${comp.ceremonyDef.path ? ` (${comp.ceremonyDef.path})` : ''}`,
  );
  lines.push(
    `  Spec Kit ext:     ${comp.specKitExtension.installed ? '✓ installed' : '✗ not installed'}${comp.specKitExtension.path ? ` (${comp.specKitExtension.path})` : ''}`,
  );
  lines.push(
    `  Manifest:         ${comp.manifest.installed ? '✓ present' : '✗ not found'}${comp.manifest.path ? ` (${comp.manifest.path})` : ''}`,
  );

  lines.push('');
  lines.push('Configuration:');
  lines.push(`  Context max size: ${report.config.contextMaxBytes} bytes`);
  lines.push(
    `  After-tasks hook: ${report.config.hooks.afterTasks ? 'enabled' : 'disabled'}`,
  );

  const sources: string[] = [];
  if (report.config.sources.skills) sources.push('skills');
  if (report.config.sources.decisions) sources.push('decisions');
  if (report.config.sources.histories) sources.push('histories');
  lines.push(`  Sources:          ${sources.join(', ')}`);

  return lines.join('\n');
}
