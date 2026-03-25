# CLI Version Contract

**Feature**: 008-fix-version-display  
**Date**: 2025-07-14

## Overview

This document defines the contract for version display across all CLI surfaces. All surfaces MUST display the same version string, dynamically resolved from `package.json`.

## Version Flag Contract

### `squask -V` / `squask --version`

**Output format**: Plain text, single line.

```
{version}
```

**Example**:
```
0.3.1
```

**Rules**:
- Output MUST be the exact `version` field from `package.json`
- No prefix (no `v`, no `Version:`)
- No trailing content (no build metadata unless in package.json)
- Identical output for all aliases: `squask`, `sqsk`, `squad-speckit-bridge`
- Exit code: `0`

## Install Command Contract

### Human-readable output (`squask install`)

The version MUST appear in the install summary output:

```
Bridge installed successfully (v{version})
  ...
```

**Rules**:
- Version in human output uses `v` prefix for readability
- Version MUST match `package.json`

### JSON output (`squask install --json`)

```json
{
  "dryRun": false,
  "version": "{version}",
  "frameworks": { ... },
  "installed": [ ... ],
  "warnings": [ ... ]
}
```

**Rules**:
- `version` field MUST be present at top level
- `version` MUST be exact string from `package.json` (no `v` prefix in JSON)
- Schema is unchanged; only the value source changes

## Bridge Manifest Contract

### `.bridge-manifest.json`

Written to disk during `squask install`:

```json
{
  "version": "{version}",
  "installedAt": "{ISO 8601}",
  "updatedAt": "{ISO 8601}",
  "components": {
    "squadSkill": true,
    "specKitExtension": true,
    "ceremonyDef": true
  },
  "files": [ ... ]
}
```

**Rules**:
- `version` field MUST match `package.json` at time of install
- On re-install/upgrade, `version` MUST be overwritten with the new value
- `installedAt` preserved from first install; `updatedAt` refreshed

## Status Report Contract

### `squask status`

**JSON output**:
```json
{
  "version": "{version}",
  "frameworks": { ... },
  "components": { ... },
  ...
}
```

**Human output**:
```
Squad-SpecKit Bridge v{version}
  ...
```

**Rules**:
- Version MUST match `package.json`
- Consistent across `--json` and human-readable formats

## Error Contract

When `package.json` cannot be read or `version` field is missing/empty:

```
Error: package.json "version" field is missing or empty. Cannot determine CLI version.
```

Or:

```
Error: Failed to read package.json: {system error message}
```

**Rules**:
- Exit code: `1`
- No fallback version displayed
- Clear actionable error message
- Error written to stderr
