---
name: "knowledge-flywheel"
description: "The full knowledge flywheel pattern: execute → nap → squask sync → constitution → next cycle"
domain: "workflows, continuous-learning"
confidence: "medium"
source: "earned (v0.3.0 sync implementation + spec 005 learnings synthesis)"
---

## Context

The knowledge flywheel is a compounding learning loop that makes each planning cycle smarter than the last. It closes the gap between stateless planning (Spec Kit) and stateful execution (Squad).

**Traditional flow:** spec → plan → tasks → implement → ship (knowledge lost)  
**Flywheel flow:** spec → plan → tasks → implement → **learnings → enriched spec** → repeat (knowledge compounds)

The flywheel ensures that implementation learnings (what worked, what didn't, edge cases discovered) flow back into planning so future specs avoid past mistakes.

## Patterns

### The Full Cycle (6 Steps)

```
1. SPECIFY
   SpecKit phase: /speckit.specify → spec.md
   Input: Feature description + squad-context.md (prior learnings)
   
2. PLAN
   SpecKit phase: /speckit.plan → plan.md
   Input: spec.md + squad-context.md
   
3. TASKS
   SpecKit phase: /speckit.tasks → tasks.md
   Input: plan.md
   
4. EXECUTE
   Squad phase: Create issues → agents work → PRs merged
   Output: Code changes + decisions + agent history updates
   
5. NAP (Reflection)
   Manual step: Review what was learned
   Create specs/NNN-feature/learnings.md
   Update spec.md with Implementation Notes section
   
6. SYNC
   Bridge command: squask sync specs/NNN-feature
   Reads: learnings.md + agent history files
   Writes: .squad/agents/{name}/history.md (append)
           .specify/memory/constitution.md (append + version bump)
   
→ LOOP BACK TO STEP 1
   Next /speckit.specify now has enriched context
```

### Step 5: The Nap (Critical Non-Automated Step)

After execution, before starting the next cycle:

1. **Create `learnings.md` in spec directory**
   ```markdown
   # Implementation Learnings — Spec 005
   
   ## Implementation Insights
   - What worked well
   - What didn't work
   - Edge cases discovered
   
   ## Reusable Patterns
   - New patterns that generalize beyond this feature
   
   ## Architecture Observations
   - Layer discipline validated or violated
   
   ## Process Observations
   - Planning vs execution ratio
   - Review cycle efficiency
   
   ## Recommendations for Future Specs
   - What to do differently next time
   ```

2. **Update spec.md with Implementation Notes**
   Add a section at the end of spec.md:
   ```markdown
   ## Implementation Notes
   
   **Status:** ✅ Delivered (YYYY-MM-DD)
   
   **Actual vs Planned:**
   - All 5 user stories delivered
   - Deviations: [list key differences]
   
   **Key Learnings:**
   - [Summarize top 3-5 learnings]
   - See [learnings.md](./learnings.md) for full details
   
   **Process Metrics:**
   - 12 tasks across 3 phases
   - 75% first-review approval rate
   - 1.25 review cycles per PR
   ```

3. **Commit both files** — they are part of the spec artifact set

### Step 6: Squask Sync (Automated Knowledge Propagation)

```bash
# After learnings.md exists, run sync
squask sync specs/005-hook-fixes-cli-polish

# What it does:
# 1. Reads specs/005-*/learnings.md
# 2. Reads .squad/agents/*/history.md (since last sync)
# 3. Appends new learnings to agent history files
# 4. Appends curated learnings to .specify/memory/constitution.md
# 5. Updates constitution version (1.0.0 → 1.1.0) + Last Amended date
# 6. Writes sync state to .squad/.sync-state (idempotent, prevents duplicates)
```

**Sync state tracking (idempotent):**
```json
{
  "lastSync": "2025-03-24T14:32:00.000Z",
  "syncedSpecs": ["005-hook-fixes-cli-polish"],
  "syncedFingerprints": ["hash1", "hash2"]
}
```

Re-running sync on the same spec is safe — fingerprints prevent duplicate entries.

### Constitution Amendment Protocol (Part of Sync)

When sync writes to constitution:

```markdown
**Version**: 1.1.0 | **Last Amended**: 2025-03-24

## Learnings from 005-hook-fixes-cli-polish

### Exit Code Contract Violation Pattern
Contracts without automated tests are documentation, not enforcement.
PR #328 regression (exit 0 → exit 1) violated graceful-failure contract.
Solution: Add contract-specific tests (T004).

### Git Permissions Dual-Track
Executable permissions need both `chmod +x` (filesystem) AND 
`git update-index --chmod=+x` (git index) for clone persistence.
```

Version bumps:
- **Minor bump (1.0.0 → 1.1.0):** New learnings added
- **Major bump (1.x.x → 2.0.0):** Breaking principle changes (rare)
- **Patch bump (never):** Constitution uses major.minor.0 only

### Pre-Specify Context Injection

Before starting a new spec cycle, generate context:

```bash
# Generate squad-context.md for the next feature
squask context specs/006-new-feature

# What it includes:
# - Team Skills (highest signal)
# - Relevant Decisions (filtered for recency)
# - Agent Learnings (from history files, summarized)
# - Previous Spec Learnings (from learnings.md files)
```

Then run `/speckit.specify` — it will see squad-context.md and use it as context.

## Examples

### Full Flywheel Execution (Spec 005 → Spec 006)

```bash
# Spec 005 execution complete, PRs merged

# Step 5: Nap
vim specs/005-hook-fixes-cli-polish/learnings.md
# ... document insights, patterns, recommendations ...
vim specs/005-hook-fixes-cli-polish/spec.md
# ... add Implementation Notes section ...
git commit -m "chore: spec 005 learnings synthesis"

# Step 6: Sync
squask sync specs/005-hook-fixes-cli-polish
# Output:
# ✅ Synced 3 learnings to .squad/agents/richard/history.md
# ✅ Appended to .specify/memory/constitution.md (v1.0.0 → v1.1.0)
# ✅ Sync state saved (.squad/.sync-state)

# Next cycle starts
squask context specs/006-new-feature
# Output:
# ✅ Generated squad-context.md (8.2KB)
# - 4 skills (3.1KB)
# - 12 decisions (2.4KB)
# - 8 learnings (2.7KB)

# Now run SpecKit with enriched context
/speckit.specify "Add MCP server mode for bridge"
# SpecKit sees squad-context.md, uses it for planning
# Spec benefits from lessons learned in 005
```

### Learnings File Template

```markdown
# Implementation Learnings — Spec 005: Hook Fixes & CLI Polish

**Feature:** Hook exit codes, git permissions, CLI improvements  
**Cycle:** 2025-03-22 to 2025-03-24  
**Tasks:** 12 (T001-T012)  
**PRs:** 4 (all merged)  
**Test Coverage:** 843 tests passing

## Implementation Insights

### Exit Code Contract Violation Pattern
**What happened:** PR #328 changed hook exit code from 0 to 1, breaking graceful failure contract.  
**Why it matters:** Contracts without tests are just documentation.  
**Solution:** Add T004 (contract tests) to validate exit codes atomically.  
**Reusable:** Any contract (CLI, API, config) needs dedicated tests separate from functionality tests.

### Git Permissions Dual-Track
**What happened:** Hooks deployed but lost executable permissions on clone.  
**Root cause:** `chmod +x` modifies filesystem, not git index.  
**Solution:** `git update-index --chmod=+x` persists permissions in git.  
**Reusable:** All deployed scripts need both filesystem + git index permissions.

## Reusable Patterns

### Node.js Environment Check Pattern
```bash
if ! command -v node &>/dev/null; then
  echo "⚠️  Node.js not found — skipping hook" >&2
  exit 0  # Graceful degradation
fi
```

### Config-Driven Hook Behavior
```typescript
// BridgeConfig.hooks.autoCreateIssues: boolean
// Default to automation, provide config opt-out
if (config.hooks.autoCreateIssues) {
  await createIssues(tasks);
}
```

## Architecture Observations

✅ **Clean Architecture compliance validated**  
All changes in outer layers (adapters, CLI). Zero inner-layer modifications.  
Layer discipline holds even under tight deadlines.

## Process Observations

**Parallel task execution:** 60-70% time saved (T004+T006+T008 in parallel)  
**Comprehensive upfront spec:** 75% first-review approval rate (9 of 12 PRs)  
**Issue auto-closure gap:** Squash merge breaks GitHub auto-close (needs PR body preservation)

## Recommendations for Future Specs

1. **Design for actual workflow, not documented workflow** — Hooks designed for CLI but used via agents
2. **Test contracts atomically** — Separate exit code tests from functionality tests
3. **Git index permissions matter** — Add to deployment checklist
4. **Config flags > code changes** — autoCreateIssues flag prevents breaking existing workflows
5. **Exit 0 for graceful degradation** — Missing dependencies should warn, not fail
```

## Anti-Patterns

- **Skipping the nap** — Going straight from execution to next spec loses learnings
- **Sync without learnings.md** — Only agent history is synced; spec-level insights lost
- **Manual constitution edits** — Use `squask sync`; it handles version bumping + deduplication
- **Duplicate sync runs without checking state** — Sync is idempotent, but check `.squad/.sync-state` first
- **Ignoring squad-context.md during planning** — The whole point of the flywheel is to use prior learnings
- **Creating learnings.md without updating spec.md** — Spec should have Implementation Notes linking to learnings
- **Version bump without Last Amended date** — Constitution amendment protocol requires both
