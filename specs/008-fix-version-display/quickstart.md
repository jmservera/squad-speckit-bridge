# Quickstart: Fix CLI Version Display Inconsistency

**Feature**: 008-fix-version-display  
**Branch**: `008-fix-version-display`

## What This Feature Does

Eliminates all hardcoded version strings from the CLI tool so that every version display — `squask -V`, install output, bridge manifest, and status reports — reads dynamically from `package.json`. After this fix, bumping the version in `package.json` is the only step needed to update all version displays.

## Architecture Overview

```
package.json ──read──▶ resolveVersion() ──pass as string──▶ all use cases & CLI
```

**Key design decision**: Version is resolved in the **composition root** (`main.ts`) and **CLI entry** (`cli/index.ts`), then passed as a plain `string` parameter through existing function signatures. No new ports, no new adapters, no new abstractions.

## Files to Change (7 source files, 5 test files)

### Source Changes

| File | Change | Layer |
|------|--------|-------|
| `src/cli/index.ts` | Replace `program.version('0.3.0')` with `program.version(resolveVersion())` | Framework |
| `src/main.ts` | Add `resolveVersion()` function; pass version to `installBridge()`, `checkStatus()`, dry-run output | Composition root |
| `src/install/installer.ts` | Add `version: string` to `InstallOptions`; use in manifest creation | Use case |
| `src/install/status.ts` | Add `version: string` parameter to `checkStatus()`; use in report | Use case |
| `src/install/adapters/file-deployer.ts` | Accept `version` parameter in `writeManifest()`; use in manifest JSON | Adapter |

### Test Changes

| File | Change |
|------|--------|
| `tests/unit/version.test.ts` | **NEW** — Test `resolveVersion()` with valid, missing, and empty package.json |
| `tests/unit/installer.test.ts` | Update assertions to use dynamic version |
| `tests/unit/status.test.ts` | Update assertions to use dynamic version |
| `tests/integration/file-deployer.test.ts` | Update manifest version assertions |
| `tests/e2e/version-consistency.test.ts` | **NEW** — Verify all CLI surfaces show same version |

## How to Verify

```bash
# 1. Build
npm run build

# 2. Run tests
npm test

# 3. Check version consistency manually
node dist/cli/index.js --version      # Should show package.json version
node dist/cli/index.js install --dry-run --json | jq .version  # Same version
node dist/cli/index.js status --json | jq .version             # Same version

# 4. Verify no hardcoded versions remain
grep -rn "version.*'0\.\(2\|3\)\.0'" src/  # Should return nothing
grep -rn "'0\.2\.0'" src/                    # Should return nothing
grep -rn "'0\.3\.0'" src/                    # Should return nothing
```

## Implementation Order (Clean Architecture: inside-out)

1. **Use case signatures** — Add `version` parameter to `installBridge()` and `checkStatus()`
2. **Adapter signatures** — Add `version` parameter to `FileDeployer.writeManifest()`
3. **Composition root** — Add `resolveVersion()` to `main.ts`, pass to all factories
4. **CLI entry** — Use `resolveVersion()` in `program.version()`
5. **Update tests** — Fix assertions, add new test files
6. **Remove stale version comment** — Clean up `main.ts` line 2 header
7. **Verify** — `npm test`, manual CLI checks, grep for remaining hardcoded versions
