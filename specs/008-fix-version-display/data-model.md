# Data Model: Fix CLI Version Display Inconsistency

**Feature**: 008-fix-version-display  
**Date**: 2025-07-14

## Entities

### InstallManifest (existing — no schema change)

The `InstallManifest` type in `src/types.ts` already has a `version: string` field. The schema is unchanged; only the **source** of the value changes (from hardcoded literal to dynamically resolved).

```typescript
// src/types.ts — EXISTING, NO CHANGE
export interface InstallManifest {
  version: string;         // ← already correct type; value source changes
  installedAt: string;     // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
  components: {
    squadSkill: boolean;
    specKitExtension: boolean;
    ceremonyDef: boolean;
  };
  files: string[];
}
```

**Validation rules**:
- `version` MUST be a non-empty string
- `version` SHOULD follow semver format (e.g., `"0.3.1"`)
- `version` MUST match the value in the project's `package.json`

### StatusReport (existing — no schema change)

```typescript
// src/install/status.ts — EXISTING, NO CHANGE
export interface StatusReport {
  version: string;         // ← value source changes
  frameworks: { ... };
  components: { ... };
  config: BridgeConfig;
  installed: boolean;
  warnings: string[];
  constitution?: ConstitutionStatus;
}
```

### PackageMetadata (implicit — used in composition root only)

This is not a formal entity type. It's the JSON structure of `package.json` as read by `createRequire`:

```typescript
// Used only in main.ts and cli/index.ts (outermost layer)
// Not exported as a type — it's a framework concern
interface PackageJson {
  version?: string;
  name?: string;
  // ... other fields not relevant to this feature
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    package.json (source of truth)                │
│                    { "version": "0.3.1" }                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ createRequire().require('../package.json')
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Composition Root (main.ts) / CLI Entry (cli/index.ts)          │
│  resolveVersion() → "0.3.1"                                     │
└──────┬───────────┬──────────────┬───────────────┬───────────────┘
       │           │              │               │
       ▼           ▼              ▼               ▼
  Commander    installBridge()  checkStatus()  dry-run output
  .version()   version param   version param   version param
       │           │              │               │
       ▼           ▼              ▼               ▼
  squask -V    manifest.json   status report   human/JSON output
  "0.3.1"     "version":"0.3.1" "0.3.1"       "0.3.1"
```

## State Transitions

No state machines in this feature. The version is a static value resolved once at startup and passed as a parameter. It does not change during the lifecycle of a command execution.

## Relationships

```
package.json  ──1:1──▶  resolveVersion()
                              │
                     ┌────────┼────────┬──────────┐
                     ▼        ▼        ▼          ▼
               CLI output  InstallManifest  StatusReport  Install output
               (stdout)    (.bridge-manifest.json)  (stdout)    (stdout/json)
```

## Affected Code Locations

| File | Layer | Current Value | Change |
|------|-------|---------------|--------|
| `src/cli/index.ts:26` | Framework | `'0.3.0'` | `resolveVersion()` |
| `src/main.ts:2` | Composition root | `v0.2.0` comment | Update comment or remove |
| `src/main.ts:119` | Composition root | `'0.2.0'` | `version` parameter |
| `src/main.ts:131` | Composition root | `'0.2.0'` | `version` parameter |
| `src/install/installer.ts:139` | Use case | `'0.2.0'` | Accept `version` param |
| `src/install/status.ts:86` | Use case | `'0.2.0'` | Accept `version` param |
| `src/install/adapters/file-deployer.ts:69` | Adapter | `'0.2.0'` | Accept `version` param |
