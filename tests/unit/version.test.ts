/**
 * T005: resolveVersion() unit tests
 *
 * Tests the single-source-of-truth version resolver: happy path,
 * missing package.json, empty version, and non-string version.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

describe('resolveVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns the correct version string from package.json', async () => {
    const { resolveVersion } = await import('../../src/main.js');
    expect(resolveVersion()).toBe(pkg.version);
  });

  it('returns a valid semver string', async () => {
    const { resolveVersion } = await import('../../src/main.js');
    expect(resolveVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('throws with "package.json" in message when file is unreadable', async () => {
    vi.doMock('node:module', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:module')>();
      return {
        ...actual,
        createRequire: (_url: string) => {
          const fn = (id: string) => {
            if (id.includes('package.json')) {
              throw new Error('Cannot find module: package.json');
            }
            return actual.createRequire(import.meta.url)(id);
          };
          fn.resolve = actual.createRequire(import.meta.url).resolve;
          return fn;
        },
      };
    });
    const { resolveVersion } = await import('../../src/main.js');
    expect(() => resolveVersion()).toThrow(/package\.json/);
  });

  it('throws with "version" in message when version field is empty', async () => {
    vi.doMock('node:module', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:module')>();
      return {
        ...actual,
        createRequire: (_url: string) => {
          const fn = (id: string) => {
            if (id.includes('package.json')) return { name: 'test', version: '' };
            return actual.createRequire(import.meta.url)(id);
          };
          fn.resolve = actual.createRequire(import.meta.url).resolve;
          return fn;
        },
      };
    });
    const { resolveVersion } = await import('../../src/main.js');
    expect(() => resolveVersion()).toThrow(/version/i);
  });

  it('throws when version field is a non-string type', async () => {
    vi.doMock('node:module', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:module')>();
      return {
        ...actual,
        createRequire: (_url: string) => {
          const fn = (id: string) => {
            if (id.includes('package.json')) return { name: 'test', version: 42 };
            return actual.createRequire(import.meta.url)(id);
          };
          fn.resolve = actual.createRequire(import.meta.url).resolve;
          return fn;
        },
      };
    });
    const { resolveVersion } = await import('../../src/main.js');
    expect(() => resolveVersion()).toThrow(/version/i);
  });
});
