# Decision Proposal: Squad v0 Retrospective Findings

**Author:** Richard (Lead)
**Date:** 2026-03-23
**Type:** Process improvement
**Status:** Proposed

## Summary

Comprehensive meta-analysis of Squad v0 experience. Covers the full pipeline: spec → plan → tasks → issues → implementation for feature 003-e2e-demo-script.

## Key Findings

### What Worked
1. **Parallel fan-out research** is the highest-leverage pattern. Four agents producing independent analysis in ~15 min created spec input quality that single-agent work cannot match.
2. **Issue-driven implementation** (tasks.md → create-issues.sh → GitHub issues → commit-per-issue) produced clean, traceable code. 17 commits in 25 minutes, all linking to issues #205–#221.
3. **Clean Architecture as design constraint** before task generation inverted the default Spec Kit ordering and produced better parallelism signals in tasks.md.
4. **Decision inbox/merge pattern** eliminated parallel write conflicts across 4+ simultaneous agents.

### What Didn't Work
1. **243 total issues across the project** — too many. v0.2.0 alone generated ~50 issues for what was a moderate feature. The 50-task decomposition granularity is over-engineered for AI agents.
2. **Dinesh did 80% of implementation work** (193/210 squad issues). Agent distribution is severely unbalanced.
3. **33 issues still open** on the demo feature (T018–T050) with no implementation — the MVP checkpoint pattern works but leaves a long tail.
4. **create-issues.sh was a generated shell script**, not the bridge's own `issues` command. The bridge's tooling didn't eat its own dog food.
5. **No tests were written** for the demo feature (T037–T045 all open). All 183 passing tests are from the bridge core, not from 003.
6. **Label system fragmented**: phase labels (phase:setup, phase:foundational), layer labels (layer:entity), agent labels (squad:dinesh), and feature labels all coexist without a clear taxonomy.

### Process Improvements for v1

#### P0 — High Impact
1. **Reduce task granularity by 3x.** Target 15-20 tasks per feature, not 50. Group related changes (e.g., "implement orchestrator with timing and cleanup" instead of T008–T013 as 6 separate tasks). AI agents don't need the hand-holding that 1-file-per-task implies.
2. **Enforce agent distribution rules.** No single agent should hold >50% of issues. Ralph should rebalance when skew exceeds threshold.
3. **Use the bridge's own `issues` command** for issue creation. Dog-fooding validates the product and catches UX issues.

#### P1 — Medium Impact
4. **Add a "test-first" gate.** Tests (Phase 8) should not be a separate phase — they should be co-located with implementation tasks. Each task should include its test.
5. **Label taxonomy v2:** Use hierarchical labels: `area/demo`, `type/entity`, `agent/dinesh`, `phase/3-us1`. Drop standalone phase labels.
6. **Constitution must be customized before first spec run.** Make this a hard gate, not a warning. The workaround (derive from decisions.md) worked once but doesn't scale.

#### P2 — Nice to Have
7. **Auto-close issues on commit.** Commit messages reference issue numbers but don't use GitHub's "Fixes #N" syntax consistently.
8. **Track planning-to-implementation ratio.** This session spent ~3 hours planning and ~25 minutes implementing. The ratio should converge toward 1:1 as the process matures.
9. **Checkpoint ceremonies between phases.** The MVP checkpoint in tasks.md (Phase 3 end) is good — formalize it as a required human approval gate.

## Proposed Decision

Adopt P0 improvements immediately for the next feature cycle. Queue P1 for v1.0 planning. P2 deferred to backlog.

## Impact

- Reduces issue overhead by ~60%
- Distributes work more evenly across agents
- Validates the bridge product through self-use
- Catches test gaps before PR review
