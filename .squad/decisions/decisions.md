# Team Decisions

---

## Decision 001: Version Threading via Constructor Injection on Adapters

**Author:** Dinesh  
**Date:** 2025-07-15  
**Spec:** 008-fix-version-display  
**Status:** Implemented

### Context

Spec 008 required threading a dynamic version string from `package.json` through all CLI surfaces. The `FileSystemDeployer` adapter writes `version` into `.bridge-manifest.json`, but the `FileDeployer` port interface has no version concept.

### Decision

Pass version via `FileSystemDeployer` constructor rather than modifying the `FileDeployer` port interface. The composition root resolves version once at factory creation time and injects it into the deployer.

### Rationale

- Port interface stays stable — no downstream impact on tests or other potential adapter implementations
- Constructor injection is the standard wiring pattern in this codebase (see `FileSystemFrameworkDetector(baseDir)`)
- Version doesn't change during process lifetime, so constructor-time resolution is correct
- `resolveVersion()` is synchronous (`createRequire`), so it can be called at factory creation without async ceremony

### Alternatives Considered

1. **Add version to `FileDeployer.deploy()` signature** — Rejected. Would change the port contract for all callers and tests, higher blast radius for a wiring concern.
2. **Add `setVersion()` method** — Rejected. Mutable state on the adapter is an anti-pattern when constructor injection works.
3. **Modify port to include version** — Rejected. Version is a deployment metadata concern, not a file deployment contract concern.

---

## Decision 002: Skill Extraction from Sync Flywheel Implementation

**Date:** 2026-03-24  
**Decider:** Richard (Lead)  
**Status:** Implemented

### Context

After completing v0.3.0 sync implementation (knowledge flywheel feature), we accumulated new patterns and conventions that should be preserved as skills for future agent use.

### Decision

Extracted and documented reusable patterns into three categories:

1. **Updated existing skills:**
   - `clean-architecture-bridge/SKILL.md` — Added port/adapter wiring patterns from sync implementation (AgentHistoryReader, ConstitutionWriter examples)
   - `project-conventions/SKILL.md` — Filled template with actual project conventions (task IDs, constitution protocol, error handling, testing, code style)

2. **Created new skill:**
   - `knowledge-flywheel/SKILL.md` — Full 6-step compounding learning loop (specify → plan → tasks → execute → nap → sync → repeat)

3. **Skipped non-applicable patterns:**
   - Worktree parallel development was mentioned in task description but not used in actual implementation

### Rationale

**Why update clean-architecture-bridge:**
- Sync implementation demonstrated excellent new port/adapter examples not in current skill
- AgentHistoryReader + ConstitutionWriter show optional port pattern (feature flags via undefined)
- Conditional adapter wiring in composition root is a reusable pattern

**Why fill project-conventions:**
- Currently empty template with placeholders
- Project has clear conventions (task ID format, constitution amendment protocol, error handling)
- Future agents benefit from explicit conventions documentation

**Why create knowledge-flywheel:**
- New pattern not covered by existing skills
- Closes gap between stateless planning (Spec Kit) and stateful execution (Squad)
- Proven in spec 005 cycle (learnings.md + sync command + constitution updates)
- Critical for compounding team learning across cycles

**Confidence levels:**
- `clean-architecture-bridge` updates: high (extends existing proven patterns)
- `project-conventions` updates: medium (extracted from real code, team uses)
- `knowledge-flywheel`: medium (one full cycle completed, proven but not yet habitual)

### Alternatives Considered

1. **Wait for more cycles before documenting flywheel** — Rejected: Pattern is working now, documentation prevents drift
2. **Document worktree patterns even without usage** — Rejected: Skills should reflect actual practice, not aspirational patterns
3. **Create separate skill for constitution protocol** — Rejected: It's a project convention, belongs in project-conventions skill

### Impact

**Positive:**
- Future agents have clearer guidance on Clean Architecture wiring patterns
- Project conventions are now documented (no more empty template)
- Knowledge flywheel is codified, preventing silent return to stateless planning

**Next Steps:**
- Use knowledge-flywheel skill for spec 006+ planning
- Update skills as patterns evolve (skills are living documents)
- Monitor whether agents actually follow documented conventions

### Validation

Verified:
- All 3 skills updated/created (clean-architecture-bridge: 14KB, project-conventions: 7.3KB, knowledge-flywheel: 9.2KB)
- Formats match `.squad/templates/skill.md` structure
- Confidence levels set appropriately
- Cross-references to actual code (src/sync/adapters/, src/main.ts, commits)
- Anti-patterns documented
