import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigFileLoader } from '../../src/install/adapters/config-loader.js';

describe('ConfigFileLoader', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bridge-config-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('returns defaults when no config files exist', async () => {
    const loader = new ConfigFileLoader({ baseDir: testDir });
    const config = await loader.load();

    expect(config.contextMaxBytes).toBe(8192);
    expect(config.sources.skills).toBe(true);
    expect(config.summarization.recencyBiasWeight).toBe(0.7);
  });

  it('loads from bridge.config.json', async () => {
    await writeFile(
      join(testDir, 'bridge.config.json'),
      JSON.stringify({ contextMaxBytes: 4096 }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    const config = await loader.load();

    expect(config.contextMaxBytes).toBe(4096);
    // Defaults for unspecified values
    expect(config.sources.skills).toBe(true);
  });

  it('loads from package.json squad-speckit-bridge key', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'squad-speckit-bridge': { contextMaxBytes: 2048 },
      }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    const config = await loader.load();

    expect(config.contextMaxBytes).toBe(2048);
  });

  it('prefers bridge.config.json over package.json', async () => {
    await writeFile(
      join(testDir, 'bridge.config.json'),
      JSON.stringify({ contextMaxBytes: 4096 }),
    );
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'squad-speckit-bridge': { contextMaxBytes: 2048 },
      }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    const config = await loader.load();

    expect(config.contextMaxBytes).toBe(4096);
  });

  it('loads from explicit config path', async () => {
    await writeFile(
      join(testDir, 'custom.json'),
      JSON.stringify({ contextMaxBytes: 1024 }),
    );

    const loader = new ConfigFileLoader({
      configPath: 'custom.json',
      baseDir: testDir,
    });
    const config = await loader.load();

    expect(config.contextMaxBytes).toBe(1024);
  });

  it('merges partial config with defaults', async () => {
    await writeFile(
      join(testDir, 'bridge.config.json'),
      JSON.stringify({
        sources: { skills: false },
      }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    const config = await loader.load();

    expect(config.sources.skills).toBe(false);
    expect(config.sources.decisions).toBe(true);
    expect(config.sources.histories).toBe(true);
    expect(config.contextMaxBytes).toBe(8192);
  });

  it('throws on invalid config values', async () => {
    await writeFile(
      join(testDir, 'bridge.config.json'),
      JSON.stringify({ contextMaxBytes: 0 }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    await expect(loader.load()).rejects.toThrow('Invalid bridge configuration');
  });

  it('throws on recencyBiasWeight out of range', async () => {
    await writeFile(
      join(testDir, 'bridge.config.json'),
      JSON.stringify({
        summarization: { recencyBiasWeight: 2.0 },
      }),
    );

    const loader = new ConfigFileLoader({ baseDir: testDir });
    await expect(loader.load()).rejects.toThrow('Invalid bridge configuration');
  });
});
