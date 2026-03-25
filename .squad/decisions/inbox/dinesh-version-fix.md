# Decision: Version Threading via Constructor Injection on Adapters

**Author:** Dinesh  
**Date:** 2025-07-15  
**Spec:** 008-fix-version-display  
**Status:** Implemented

## Context

Spec 008 required threading a dynamic version string from `package.json` through all CLI surfaces. The `FileSystemDeployer` adapter writes `version` into `.bridge-manifest.json`, but the `FileDeployer` port interface has no version concept.

## Decision

Pass version via `FileSystemDeployer` constructor rather than modifying the `FileDeployer` port interface. The composition root resolves version once at factory creation time and injects it into the deployer.

## Rationale

- Port interface stays stable — no downstream impact on tests or other potential adapter implementations
- Constructor injection is the standard wiring pattern in this codebase (see `FileSystemFrameworkDetector(baseDir)`)
- Version doesn't change during process lifetime, so constructor-time resolution is correct
- `resolveVersion()` is synchronous (`createRequire`), so it can be called at factory creation without async ceremony

## Alternatives Considered

1. **Add version to `FileDeployer.deploy()` signature** — Rejected. Would change the port contract for all callers and tests, higher blast radius for a wiring concern.
2. **Add `setVersion()` method** — Rejected. Mutable state on the adapter is an anti-pattern when constructor injection works.
3. **Modify port to include version** — Rejected. Version is a deployment metadata concern, not a file deployment contract concern.
