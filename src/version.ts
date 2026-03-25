/**
 * Internal version resolver.
 *
 * Single source of truth — reads version from package.json at runtime.
 * NOT re-exported from the package entrypoint (src/main.ts).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function resolveVersion(): string {
  try {
    const pkg = require('../package.json') as { version?: string };
    if (!pkg.version || typeof pkg.version !== 'string' || pkg.version.trim() === '') {
      throw new Error(
        'package.json "version" field is missing or empty. Cannot determine CLI version.',
      );
    }
    return pkg.version;
  } catch (err) {
    if (err instanceof Error && err.message.includes('package.json')) throw err;
    throw new Error(
      `Failed to read package.json: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
