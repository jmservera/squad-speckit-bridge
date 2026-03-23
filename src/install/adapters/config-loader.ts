/**
 * T018: ConfigFileLoader Adapter
 *
 * Reads bridge.config.json or package.json "squad-speckit-bridge" key,
 * merges with defaults, validates via isValidConfig().
 * Resolution order: env var → config file → package.json → defaults.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ConfigLoader } from '../../bridge/ports.js';
import type { BridgeConfig } from '../../types.js';
import { createDefaultConfig, isValidConfig } from '../../types.js';

export interface ConfigLoaderOptions {
  configPath?: string;
  baseDir?: string;
}

export class ConfigFileLoader implements ConfigLoader {
  private readonly configPath?: string;
  private readonly baseDir: string;

  constructor(options: ConfigLoaderOptions = {}) {
    this.configPath = options.configPath;
    this.baseDir = options.baseDir ?? process.cwd();
  }

  async load(): Promise<BridgeConfig> {
    const defaults = createDefaultConfig();

    // Priority 1: Explicit config path (CLI --config or BRIDGE_CONFIG env)
    const explicitPath = this.configPath ?? process.env.BRIDGE_CONFIG;
    if (explicitPath) {
      const config = await this.loadJsonFile(resolve(this.baseDir, explicitPath));
      if (config) {
        return this.mergeAndValidate(defaults, config);
      }
    }

    // Priority 2: bridge.config.json at repo root
    const bridgeConfig = await this.loadJsonFile(
      resolve(this.baseDir, 'bridge.config.json'),
    );
    if (bridgeConfig) {
      return this.mergeAndValidate(defaults, bridgeConfig);
    }

    // Priority 3: package.json "squad-speckit-bridge" key
    const pkgConfig = await this.loadFromPackageJson();
    if (pkgConfig) {
      return this.mergeAndValidate(defaults, pkgConfig);
    }

    // Priority 4: defaults
    return defaults;
  }

  private async loadJsonFile(
    path: string,
  ): Promise<Partial<BridgeConfig> | null> {
    try {
      const raw = await readFile(path, 'utf-8');
      return JSON.parse(raw) as Partial<BridgeConfig>;
    } catch {
      return null;
    }
  }

  private async loadFromPackageJson(): Promise<Partial<BridgeConfig> | null> {
    try {
      const pkgPath = resolve(this.baseDir, 'package.json');
      const raw = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const bridgeKey = pkg['squad-speckit-bridge'];
      if (bridgeKey && typeof bridgeKey === 'object') {
        return bridgeKey as Partial<BridgeConfig>;
      }
      return null;
    } catch {
      return null;
    }
  }

  private mergeAndValidate(
    defaults: BridgeConfig,
    overrides: Partial<BridgeConfig>,
  ): BridgeConfig {
    const merged: BridgeConfig = {
      contextMaxBytes: overrides.contextMaxBytes ?? defaults.contextMaxBytes,
      sources: {
        ...defaults.sources,
        ...(overrides.sources ?? {}),
      },
      summarization: {
        ...defaults.summarization,
        ...(overrides.summarization ?? {}),
      },
      hooks: {
        ...defaults.hooks,
        ...(overrides.hooks ?? {}),
      },
      sync: {
        ...defaults.sync,
        ...((overrides as Record<string, unknown>).sync as Record<string, unknown> ?? {}),
      },
      issues: {
        ...defaults.issues,
        ...((overrides as Record<string, unknown>).issues as Record<string, unknown> ?? {}),
      },
      paths: {
        ...defaults.paths,
        ...(overrides.paths ?? {}),
      },
    };

    if (!isValidConfig(merged)) {
      throw new Error(
        'Invalid bridge configuration. Check contextMaxBytes (1–32768), ' +
          'recencyBiasWeight (0.0–1.0), and maxDecisionAgeDays (>0).',
      );
    }

    return merged;
  }
}
