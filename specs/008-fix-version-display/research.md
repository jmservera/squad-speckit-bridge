# Research: Fix CLI Version Display Inconsistency

**Feature**: 008-fix-version-display  
**Date**: 2025-07-14  
**Status**: Complete

## Research Tasks

### R1: How to read package.json version at runtime in an ESM TypeScript project

**Decision**: Use `createRequire(import.meta.url)` from Node.js `module` stdlib to synchronously `require()` the `package.json` file from the project root.

**Rationale**:
- The project uses `"module": "Node16"` and `"type": "module"` (ESM).
- `tsconfig.json` already has `"resolveJsonModule": true`, so TypeScript supports JSON imports.
- However, a direct `import pkg from '../package.json' assert { type: 'json' }` approach has portability concerns: import assertions syntax varies across Node.js versions, and the relative path from `dist/` differs from `src/` at dev time.
- `createRequire(import.meta.url)` is stable, works across Node.js 14+, resolves paths correctly from both `src/` (tsx dev mode) and `dist/` (built mode), and is already a pattern used by the Node.js ecosystem for exactly this purpose.
- The `require()` call is synchronous, which is ideal for version reading at startup (no async overhead).

**Alternatives considered**:
1. **Static `import` of package.json**: Works in TypeScript but fragile in ESM — the relative path `../../package.json` from `dist/types.js` differs from `../package.json` in `src/types.ts`. The build copies `src/install/templates` to `dist/install/` but does NOT copy package.json into `dist/`. Rejected because it breaks when the directory depth changes.
2. **`readFileSync` with path resolution**: Works but requires importing `fs` and `path` — these are framework dependencies that would violate the Dependency Rule if used in the entity layer. Could work in the composition root but `createRequire` is cleaner.
3. **Build-time injection via define/replace plugin**: Stamp the version into a constant during `tsc` build. Rejected because the build script is plain `tsc && cp`, adding a Rollup/esbuild step for a single constant is disproportionate complexity. Also, `tsx` dev mode would bypass it.
4. **Environment variable at startup**: Set `BRIDGE_VERSION` in the bin shim. Rejected because it requires modifying the npm package's bin entry scripts, adds a fragile runtime dependency, and doesn't work for library consumers who import `main.ts` directly.

### R2: Where should the version reading logic live in Clean Architecture?

**Decision**: Create a `getVersion()` function in `src/types.ts` (entity layer) that accepts no framework imports — it will use `createRequire` which comes from Node.js `module` stdlib (not an external framework). However, to keep the entity layer maximally pure, an alternative is to resolve the version in the composition root (`main.ts`) and pass it as a string parameter.

**Updated Decision after deeper analysis**: Resolve version in **composition root** (`main.ts`). The entity layer stays pure — zero I/O, zero stdlib imports. The composition root already instantiates all adapters and wires all dependencies; adding one `const version = require('./package.json').version` call there is a natural fit.

**Rationale**:
- `types.ts` (entity layer) has a strict rule: "ZERO imports from external packages, ZERO I/O, pure data types and business rules" (line 5 comment).
- `createRequire` technically comes from Node.js stdlib (`node:module`), not an npm package, but it does perform I/O (reads a file). Placing it in `types.ts` would violate the spirit of the entity layer.
- The composition root (`main.ts`) already imports from `fs`, `path`, `node:url`, and all adapters. It is the designated place for framework concerns.
- Use cases (`installBridge`, `checkStatus`) will accept `version: string` as a parameter — a simple DTO value that crosses the boundary cleanly (Principle IV).

**Alternatives considered**:
1. **New `VersionProvider` port interface**: Overkill for a single string value. Port interfaces are for complex I/O boundaries (file systems, APIs, databases). A version string is a primitive that can be passed directly. Rejected for unnecessary abstraction.
2. **Entity-layer constant**: `export const VERSION = '0.3.1'` in types.ts. Rejected because it's another hardcoded value that must be manually updated.
3. **Adapter-level version reader**: A `PackageJsonVersionReader` adapter implementing a `VersionReader` port. Rejected for the same reason as #1 — excessive ceremony for reading a single string.

### R3: How to handle missing or malformed package.json at runtime

**Decision**: Throw a descriptive `Error` with a clear message if package.json is missing or the version field is absent/empty. Do not fall back to a hardcoded version.

**Rationale**:
- FR-008 requires: "If the package metadata cannot be read or the version field is missing/empty, the system MUST display a clear error message rather than showing a blank, undefined, or fallback version."
- A fallback version would mask deployment problems. Failing loudly is correct.
- The error is thrown at startup in the composition root, so it fails fast before any command executes.

**Implementation**:
```typescript
// In main.ts (composition root)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function resolveVersion(): string {
  try {
    const pkg = require('../package.json') as { version?: string };
    if (!pkg.version || typeof pkg.version !== 'string' || pkg.version.trim() === '') {
      throw new Error(
        'package.json "version" field is missing or empty. Cannot determine CLI version.'
      );
    }
    return pkg.version;
  } catch (err) {
    if (err instanceof Error && err.message.includes('package.json')) throw err;
    throw new Error(
      `Failed to read package.json: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
```

**Alternatives considered**:
1. **Fallback to "unknown"**: Rejected per FR-008. Stale/wrong versions caused this bug — a soft fallback would repeat the same class of error.
2. **Fallback to "0.0.0-dev"**: Mildly better but still masks the problem. Rejected.
3. **Log warning and continue**: Rejected. Version is used in manifests that other tools consume; an incorrect value silently propagates.

### R4: How to thread the version into CLI Commander.js registration

**Decision**: Call `resolveVersion()` at module load time in `cli/index.ts` (or pass it from the composition root) and use `program.version(resolvedVersion)`.

**Rationale**:
- `cli/index.ts` is in the framework/driver layer — it's allowed to call the composition root or use resolved values.
- Commander's `.version()` method accepts a string. No special handling needed.
- The version must be resolved before `program.parse()` is called.

**Implementation approach**: Export `resolveVersion()` from `main.ts` and import it in `cli/index.ts`, or resolve the version at the top of `cli/index.ts` directly (since it's the outermost layer and is allowed to perform I/O).

**Chosen**: Resolve in `cli/index.ts` directly since it's the outermost framework layer and already imports from `main.ts`. This avoids adding an export to the library's public surface.

### R5: Impact on existing tests

**Decision**: Update test assertions that expect hardcoded version strings (`'0.2.0'`, `'0.3.0'`) to instead verify the version matches the package.json value dynamically.

**Affected test files**:
| Test File | Current Assertion | New Assertion |
|-----------|-------------------|---------------|
| `tests/unit/installer.test.ts` | `expect(result.manifest.version).toBe('0.2.0')` | `expect(result.manifest.version).toBe(expectedVersion)` where `expectedVersion` is read from package.json in test setup |
| `tests/unit/status.test.ts` | `expect(report.version).toBe('0.2.0')` | Same pattern |
| `tests/integration/file-deployer.test.ts` | `expect(manifest.version).toBe('0.2.0')` | Same pattern |

**New test files**:
| Test File | Purpose |
|-----------|---------|
| `tests/unit/version.test.ts` | Test `resolveVersion()` — normal case, missing package.json, empty version field |
| `tests/e2e/version-consistency.test.ts` | Verify all CLI surfaces show consistent version |

### R6: Build mode vs. dev mode path resolution

**Decision**: `createRequire(import.meta.url)` resolves paths relative to the calling file's location. In both modes:
- **Dev mode** (`tsx src/cli/index.ts`): `import.meta.url` points to `src/cli/index.ts`, so `require('../package.json')` resolves to `<root>/package.json` ✓
- **Built mode** (`node dist/cli/index.js`): `import.meta.url` points to `dist/cli/index.ts`, so `require('../package.json')` resolves to `<root>/package.json` ✓

Both resolve correctly because `src/` and `dist/` are at the same depth relative to the project root, and `createRequire` follows Node.js module resolution (walks up to find `package.json`).

**Verification**: Tested with `node -e "import { createRequire } from 'module'; const require = createRequire(import.meta.url); const pkg = require('./package.json'); console.log(pkg.version);"` → outputs `0.3.1` ✓
