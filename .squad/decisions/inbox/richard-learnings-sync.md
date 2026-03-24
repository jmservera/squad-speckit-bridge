# Decision: Reverse Knowledge Sync — Implementation Learnings → Spec Enrichment

**Date:** 2026-03-24  
**Author:** Richard (Lead)  
**Context:** Spec 005 implementation complete (12 tasks, 4 PRs merged, 843 tests passing)  
**Type:** Process Standard

## Decision

**Adopt reverse knowledge sync as standard practice for all feature specs.**

After implementation completion, synthesize learnings back into the spec directory by creating a `learnings.md` file and adding an Implementation Notes section to `spec.md`.

## Rationale

**Problem:** Traditional spec workflow is forward-only (spec → plan → tasks → implement → ship). Implementation insights never flow back to enrich the specification. Each new spec starts cold, repeating the same discoveries.

**Solution:** Close the knowledge loop. After implementation, capture:
- What the spec didn't anticipate (git permissions dual-track, exit code regression patterns)
- Reusable patterns discovered (Node.js environment checks, config-driven behavior)
- Review cycle analysis (what got rejected and why)
- Test coverage insights (contract tests vs functionality tests)
- Architecture observations (layer discipline, compliance outcomes)
- Process metrics (approval rates, review cycles, parallel execution gains)

**Value:** Future specs become smarter. Patterns discovered in spec 005 (exit code contract tests, git index permissions) are now documented and reusable for spec 006+.

## Implementation Pattern

### 1. Create `specs/{feature}/learnings.md`

**Structure:**
- **Implementation Insights** — what the spec didn't predict
- **Pattern Discoveries** — reusable solutions
- **Review Cycle Analysis** — rejections and why
- **Test Coverage Insights** — what tests mattered most
- **Architecture Observations** — layer discipline, compliance
- **Process Observations** — what worked/didn't in Squad pipeline
- **Recommendations for Future Specs** — actionable guidance

### 2. Update `specs/{feature}/spec.md`

Add Implementation Notes section at end with:
- Brief summary of actual vs planned outcomes
- Key deviations from original spec
- Links to learnings.md for full details
- Process metrics (approval rate, review cycles, time saved)
- Future work identified

### 3. Update Agent History

Record what was synthesized and the patterns extracted.

## Evidence from Spec 005

**What was synthesized:**

1. **Exit Code Contract Violation Pattern**: PR #328 regression (exit 0 → exit 1) violated graceful-failure contract. Caught by automated tests (T004), not human review. **Learning:** Contracts without tests are aspirational, not enforceable.

2. **Git Permissions Dual-Track**: Executable permissions need both `chmod +x` (filesystem) AND `git update-index --chmod=+x` (git index). Only doing one breaks on fresh clones.

3. **Squash Merge Issue Closure Gap**: GitHub auto-close doesn't work with squash merges unless PR body is preserved in squash commit message. All 12 issues required manual closure.

4. **Node.js Environment Check Pattern**: Hooks invoking external CLIs must check runtime availability first (`command -v node`, `command -v squask`) to prevent cryptic errors.

5. **Config-Driven Hook Behavior**: `autoCreateIssues` flag pattern — default automation, provide opt-out, centralize control in config, respect team preferences.

**Reusable patterns documented:**
- Node.js environment check snippet (cross-platform hook automation)
- Config-driven behavior pattern (BridgeConfig + hook script integration)
- Dual filesystem + git index permission commands

**Process metrics captured:**
- 75% first-time PR approval rate (3/4 PRs approved on first review)
- 1.25 review cycles per PR (vs industry average 2-3)
- Parallel execution reduced 12 tasks to 3 rounds (60-70% time saved)

## Benefits

1. **Compound Learning**: Each spec teaches the next one. Spec 006 can reference spec 005's learnings for exit code patterns, permission handling, etc.

2. **Pattern Library**: Learnings files become a searchable pattern library. Need config-driven hook behavior? Reference spec 005. Need contract test patterns? Reference spec 005.

3. **Process Improvement**: Metrics in Implementation Notes (approval rates, review cycles) provide baseline for optimization. "Can we beat 75% first-time approval on the next spec?"

4. **Onboarding Value**: New team members read learnings to understand not just what was built, but why certain decisions were made and what patterns emerged.

5. **Knowledge Flywheel**: Spec quality improves over time because specifications learn from implementations. This is the bidirectional knowledge flow the bridge was designed to enable.

## Alternatives Considered

### Option 1: No reverse sync (status quo)
**Rejected:** Knowledge stays in agent histories and orchestration logs. Not discoverable, not structured, not reusable.

### Option 2: Single retrospective.md at repo root
**Rejected:** Cross-feature learnings get mixed. Hard to find spec-specific insights. Loses the spec-as-unit-of-work pattern.

### Option 3: Update spec.md inline during implementation
**Rejected:** Breaks the spec's role as immutable planning artifact. Spec describes intent; learnings describe outcomes. They're different documents.

### Option 4: Learnings in agent histories only
**Rejected:** Agent histories are append-only and verbose. Learnings files are curated, structured, and spec-scoped.

## Process Integration

**When to synthesize:**
- After all tasks complete, PRs merge, and tests pass
- Before marking the feature "done"
- Can be delegated to Lead (Richard) or distributed (each agent contributes section)

**Who synthesizes:**
- Lead role (Richard) for strategic synthesis
- OR: Scribe role for cross-agent aggregation
- OR: Specialist agents contribute domain sections (Gilfoyle → architecture, Jared → testing, Monica → docs)

**How much effort:**
- Spec 005: ~2-3 hours to read histories, orchestration logs, decisions, PRs, and synthesize
- ROI: 500+ lines of reusable patterns, process metrics, and future spec guidance

## Status

**Adopted for spec 005.** Ready to apply to all future specs.

**Next steps:**
1. Add "Reverse Sync" as a phase in SpecKit task templates (after implementation, before closure)
2. Update ceremonies.md to include learnings synthesis as final step in feature delivery
3. Train agents to reference `specs/*/learnings.md` when planning related features

## Success Criteria

**This decision succeeds if:**
- Spec 006+ references spec 005 learnings.md for at least one pattern
- Future specs show measurably better first-time approval rates (target: >80%)
- Pattern library grows organically (each spec adds 2-5 reusable patterns)
- Onboarding docs point to learnings files as "how we work" evidence

---

**Files affected:**
- `specs/005-hook-fixes-cli-polish/learnings.md` (created)
- `specs/005-hook-fixes-cli-polish/spec.md` (updated with Implementation Notes)
- `.squad/agents/richard/history.md` (updated with synthesis work)
- `.squad/decisions/inbox/richard-learnings-sync.md` (this file)
