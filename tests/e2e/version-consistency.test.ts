/**
 * T012: Version Consistency E2E Tests
 *
 * Verifies all CLI surfaces (resolveVersion, install --dry-run --json,
 * status --json) report the same version matching package.json.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { resolveVersion, createInstaller, createStatusChecker } from '../../src/main.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

describe('version consistency across CLI surfaces', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'version-e2e-'));
    await mkdir(join(testDir, '.squad'), { recursive: true });
    await mkdir(join(testDir, '.specify'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('resolveVersion() matches package.json version', () => {
    expect(resolveVersion()).toBe(pkg.version);
  });

  it('install --dry-run --json version matches package.json', async () => {
    const installer = createInstaller({ baseDir: testDir });
    const result = await installer.install({ dryRun: true });
    expect(result.jsonOutput.version).toBe(pkg.version);
  });

  it('status --json version matches package.json', async () => {
    const checker = createStatusChecker({ baseDir: testDir });
    const result = await checker.check();
    expect(result.jsonOutput.version).toBe(pkg.version);
  });

  it('all three surfaces report the identical version', async () => {
    const versionFlag = resolveVersion();

    const installer = createInstaller({ baseDir: testDir });
    const installResult = await installer.install({ dryRun: true });

    const checker = createStatusChecker({ baseDir: testDir });
    const statusResult = await checker.check();

    // All must be identical to each other and to package.json
    expect(versionFlag).toBe(pkg.version);
    expect(installResult.jsonOutput.version).toBe(pkg.version);
    expect(statusResult.jsonOutput.version).toBe(pkg.version);
    expect(versionFlag).toBe(installResult.jsonOutput.version);
    expect(versionFlag).toBe(statusResult.jsonOutput.version);
  });
});
