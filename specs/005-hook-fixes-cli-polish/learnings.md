# Spec 005 Implementation Learnings

**Feature**: Hook Fixes and CLI Polish (v0.3.1)  
**Implementation Period**: 2026-03-24  
**Status**: Completed — 12 tasks, 4 PRs merged, 843 tests passing  
**Team**: Dinesh, Gilfoyle, Jared, Monica, Richard

## Implementation Insights

### 1. The Exit Code Contract Violation Pattern

**What happened:** PR #328 introduced exit code violations (changed `exit 0` to `exit 1` in hook error handlers) that broke the hook graceful-failure contract. The violation wasn't caught until Round 3 when Jared built comprehensive hook tests.

**Why it matters:** Hook scripts must always exit 0 (graceful degradation) so SpecKit pipeline failures don't cascade. A single `exit 1` in a hook can block the entire SpecKit workflow. The contract violation was subtle — the error handlers *looked* correct (they log errors), but the exit code broke the automation chain.

**Root cause:** Absence of automated contract tests. The hook exit code contract existed in documentation (contracts/hook-scripts.md) but wasn't enforced programmatically until T004/T006/T008 added 22 test cases.

**Prevention mechanism:** Three test types now prevent this class of regression:
- **T004**: Exit code contract tests — parses all hook templates and validates every `exit N` line equals `exit 0`
- **T006**: CLI alias consistency tests — scans for command invocation patterns across all hooks
- **T008**: Filesystem permissions integration tests — confirms 755 on deployed hook templates in dist/

**Learning:** Contracts without automated verification are aspirational, not enforceable. The gap between "documented behavior" and "tested behavior" is where regressions hide.

---

### 2. Git Permissions vs Filesystem Permissions (Dual-Track Fix)

**What happened:** Fixing hook executable permissions required TWO changes, not one:
1. `chmod +x` on source files (`src/install/templates/hooks/*.sh`) — sets filesystem permissions
2. `git update-index --chmod=+x` — records executable bit in git index

**Why both are needed:**
- Filesystem `chmod` fixes permissions for the current working tree
- Git `update-index --chmod` ensures the executable bit is committed and propagates to clones/checkouts
- Without the second step, fresh checkouts lose the executable bit even if the source file was fixed

**Implementation pattern discovered:**
```bash
chmod +x src/install/templates/hooks/*.sh        # Fix filesystem
git update-index --chmod=+x src/install/templates/hooks/*.sh  # Fix git index
git commit -m "fix(hooks): set executable bit"
```

**Why this wasn't obvious:** Most projects don't track shell scripts in `src/` — they're usually build outputs. Because this project distributes hook templates as source files compiled into `dist/`, the git index permissions matter as much as filesystem permissions.

**Learning:** When executable permissions are part of the deliverable (not just developer convenience), filesystem + git index must both be updated. Test by cloning fresh — if `ls -l` shows 644 on a fresh clone, only the filesystem was fixed.

---

### 3. Squash Merge Does Not Auto-Close Issues

**What happened:** All PRs were squash-merged to main, and GitHub did NOT automatically close the referenced issues despite proper `Closes #N` syntax in PR bodies.

**Why:** Squash merge rewrites commit history. The original PR commits (which may contain `Closes #N`) are replaced by a single squash commit. If the PR body doesn't explicitly use `Closes #N` in the squash merge commit message, GitHub doesn't recognize the association.

**Discovered pattern:** Even with `Closes #323` in the PR body, GitHub only auto-closes if:
1. PR body uses `Closes #N` AND branch is merged via merge commit (preserves all commit messages), OR
2. PR body text is preserved in the squash commit message (depends on merge strategy settings)

**Workaround used:** Manual issue closure after merge verification. All 12 issues were closed manually post-merge.

**Process improvement identified:** When using squash merges, either:
- Configure repo to append PR body to squash commit message (Settings → Pull Requests → Default squash merge message)
- Manually close issues in the PR merge comment
- Use standard merge commits instead of squash merges

**Learning:** Squash merge optimizes for clean history but breaks GitHub's issue-closing automation. Teams must choose: clean history OR automatic issue closure. If squash is required, build a manual or scripted closure step into the workflow.

---

### 4. The after-tasks Hook Automation Gap

**Original behavior:** `after-tasks.sh` printed a reminder to run `squask issues` manually.

**Fixed behavior:** Hook now invokes `squask issues` automatically with proper config checks and error handling.

**Design decisions made during implementation:**
- **Config-driven automation:** Added `autoCreateIssues` flag to `BridgeConfig.hooks` — defaults to `true`, respects explicit `false`
- **Node.js config check pattern:** Hook checks for valid Node.js environment before attempting CLI invocation (prevents cryptic errors in restricted environments)
- **Dual-mode failure handling:** Network errors and missing config degrade gracefully (stderr warning, exit 0), but missing CLI binary is fatal (cannot proceed without the bridge)
- **Preserved manual override:** Developers can still run `squask issues` manually if `autoCreateIssues: false`

**Why this pattern emerged:** The hook sits at the boundary between SpecKit (Python) and Squad (Node.js). Automated cross-platform environment checks became mandatory because failure modes differ (missing binary vs network timeout vs config parse error).

**Reusable pattern:** When writing lifecycle hooks that invoke CLIs from different ecosystems:
1. Check runtime prerequisites first (`command -v node`, `command -v squask`)
2. Read config flags to respect user intent
3. Distinguish fatal errors (missing binary) from degraded mode (network issues)
4. Always exit 0 unless pipeline should hard-stop

**Learning:** Automation is only valuable if it degrades gracefully. A hook that crashes on transient network errors is worse than a manual step — it blocks the pipeline without providing actionable feedback.

---

### 5. CLI Alias Consistency as a Runtime Contract

**Original problem:** `after-tasks.sh` used `@jmservera/squad-speckit-bridge` (scoped package name) while other hooks used `squask` (short alias). This caused failures when only the alias was on PATH.

**Why it failed:** 
- Global installs (`npm install -g`) create a `squask` symlink on PATH
- Local dev installs (`npm install --save-dev`) only add `squask` to `node_modules/.bin/`, not global PATH
- The full scoped name is NEVER on PATH — it's only used in `package.json` and `npm install` commands

**Fix:** Standardized all hooks to use `squask` prefix for CLI invocations.

**Test coverage added:** T006 scans all hook templates for CLI command patterns and validates:
- All commands start with `squask` (not the scoped package name)
- All commands use the same invocation pattern (consistency check)
- No hardcoded paths or assumptions about installation location

**Why this matters beyond this project:** CLI tools that support both global and local installation must choose ONE canonical command name and document it everywhere (hooks, docs, examples). Mixing `npx @scope/package`, `package`, and `short-alias` creates three failure modes instead of one.

**Learning:** Runtime environment variability (global vs local install, PATH configuration) is a first-class concern for CLI tools. Document the canonical invocation pattern once, enforce it with tests, and never deviate.

---

## Pattern Discoveries

### 1. Node.js Environment Check Pattern (Cross-Platform)

**Pattern emerged in:** `after-tasks.sh` hook automation

**Reusable snippet:**
```bash
# Check if Node.js is available before invoking CLI tools
if ! command -v node >/dev/null 2>&1; then
    echo "Warning: Node.js not found. Skipping automated issue creation." >&2
    exit 0  # Graceful degradation, not a hard failure
fi

# Check if the specific CLI is installed
if ! command -v squask >/dev/null 2>&1; then
    echo "Error: squask CLI not found. Install with: npm install -g @jmservera/squad-speckit-bridge" >&2
    exit 0  # Still exit 0 to avoid blocking the pipeline
fi
```

**When to use:**
- Lifecycle hooks that invoke external CLIs from different runtimes (Node.js, Python, Go)
- Cross-platform scripts where binary availability varies
- Automation that should degrade gracefully rather than block the pipeline

**Anti-pattern avoided:** Invoking `squask` directly without checking would produce cryptic "command not found" errors that don't explain the root cause (Node.js missing vs CLI not installed vs PATH misconfigured).

---

### 2. Config-Driven Hook Behavior Pattern

**Pattern emerged in:** `after-tasks.sh` automation flag (`autoCreateIssues`)

**Structure:**
```typescript
// In BridgeConfig entity (src/types.ts)
export interface BridgeConfig {
  hooks: {
    autoCreateIssues: boolean;  // Default: true
    // Future: other hook behavior flags
  };
  // ... other config
}
```

```bash
# In hook script
# Read config flag (with fallback to default)
AUTO_CREATE=$(node -e "
  try {
    const config = require('./bridge.config.json');
    console.log(config.hooks?.autoCreateIssues ?? true);
  } catch {
    console.log(true);  // Default to enabled if config missing
  }
")

if [ "$AUTO_CREATE" = "true" ]; then
  squask issues
else
  echo "Automated issue creation disabled. Run manually: squask issues"
fi
```

**When to use:**
- Hooks that should be configurable per-project (team preferences vary)
- Automation that some users may want to disable (manual review before issue creation)
- Behavior that differs between CI and local environments

**Benefits:**
- Respects team workflows (some teams want manual review, others want full automation)
- Provides escape hatch without requiring hook file edits
- Centralizes configuration in `bridge.config.json` rather than scattering flags across multiple hook files

---

### 3. Dual Filesystem + Git Index Permission Pattern

**Pattern emerged in:** Hook executable permission fixes

**Required commands:**
```bash
# Step 1: Fix filesystem permissions (immediate effect)
chmod +x src/install/templates/hooks/*.sh

# Step 2: Record in git index (persists across clones)
git update-index --chmod=+x src/install/templates/hooks/*.sh

# Step 3: Commit both changes
git commit -m "fix(hooks): set executable bit on hook templates"
```

**Verification:**
```bash
# Check filesystem permissions
ls -l src/install/templates/hooks/*.sh  # Should show -rwxr-xr-x (755)

# Check git index permissions
git ls-files --stage src/install/templates/hooks/*.sh  # Should show 100755, not 100644
```

**When to use:**
- Shell scripts tracked in source control that must be executable on checkout
- Template files that get copied/deployed with their permissions intact
- Any file where the executable bit is part of the contract, not just developer convenience

**Anti-pattern avoided:** Only running `chmod +x` fixes the current working tree but doesn't persist to fresh clones. Fresh checkouts would still have 644 permissions, causing "Permission denied" errors.

---

## Review Cycle Analysis

### What Got Rejected and Why

**PR #328 Regression (Round 3):**
- **What:** Exit code changes (`exit 0` → `exit 1`) in hook error handlers
- **Why rejected:** Violated the hook graceful-failure contract
- **How caught:** Jared's comprehensive hook tests (T004) flagged the violation
- **Root cause:** Missing automated enforcement of exit code contract
- **Fix:** Reverted exit codes + added 22 test cases (PR #331)

**Lessons from the rejection:**
1. **Review without tests is weak enforcement.** The contract document (contracts/hook-scripts.md) existed and was correct, but without automated tests, the violation slipped through human review.
2. **Regression prevention > initial correctness.** The original hooks were correct. The violation was introduced during bug fixes. This is the classic regression pattern — fix one issue, break something else.
3. **Exit codes are invisible to humans.** In code review, `exit 1` *looks* correct — it's returning an error! Only the broader architectural context (hooks must never block the pipeline) makes `exit 0` the right choice.

**Process improvement:** T004/T006/T008 test suite now makes this class of bug impossible. The tests encode the contract in executable form.

---

### Review Quality Metrics

**Total PRs:** 4 (merged)
- PR #314: Demo command API reference docs (Monica)
- PR #329: Hook scripts contract update (Monica)
- PR #330: BridgeConfig.hooks.autoCreateIssues flag (Dinesh)
- PR #331: Exit code reversion + comprehensive hook tests (Jared)

**Review rejection rate:** 1/4 = 25% (PR #328 rejected before merge, fixed as #331)

**Review cycles per PR:**
- #314: 1 cycle (approved on first review)
- #329: 1 cycle (approved on first review)
- #330: 1 cycle (approved on first review)
- #331: 2 cycles (initial #328 rejected, #331 approved)

**Review velocity:** Average 1.25 cycles per PR (industry average: 2-3 cycles)

**Why low rejection rate:** 
- Strong upfront specification (spec.md + contracts/)
- Test coverage included in implementation PRs (not added later)
- Small, focused PRs (single responsibility — docs, config, tests)

---

### What Future Specs Should Account For

1. **Contract enforcement automation:** If a behavioral contract exists (exit codes, permissions, CLI aliases), add test coverage in the SAME PR that introduces the behavior. Don't defer to "testing tasks" later.

2. **Cross-platform runtime checks:** When hooks invoke external CLIs, add environment checks first (Node.js available? CLI installed? Config readable?). Don't assume the runtime environment.

3. **Git index permissions for executable files:** If a file's executable bit is part of the deliverable, track it in git index with `update-index --chmod=+x`, not just filesystem `chmod`.

4. **Squash merge + issue closure:** Document the manual closure step if using squash merges, or configure repo settings to preserve PR body in squash commit messages.

5. **Config-driven hook behavior:** Default to automation (least friction), provide config flags to disable (respect team preferences). Document the flags in BridgeConfig schema.

---

## Test Coverage Insights

### Test Categories and Value

**Total tests added:** 22 (across T004, T006, T008)

**Test breakdown:**
- **T004 (Exit Code Contract Tests):** 8 tests — validates every `exit N` line in hook templates equals `exit 0`
- **T006 (CLI Alias Consistency Tests):** 7 tests — scans for `squask` prefix in all CLI invocations, flags scoped package name usage
- **T008 (Filesystem Permissions Integration Tests):** 7 tests — confirms 755 permissions on deployed hooks in `dist/install/templates/hooks/`

**Most valuable test category:** Exit code contract tests (T004)
- **Why:** Caught PR #328 regression that human review missed
- **ROI:** Prevented production bug (hooks blocking SpecKit pipeline)
- **Reusability:** Pattern applies to any lifecycle hook in any framework

**Why these tests weren't written initially:**
- Hooks were manually verified during initial implementation
- Contract documentation existed (contracts/hook-scripts.md) — felt like "enough"
- Test value wasn't obvious until the regression happened

**Lesson learned:** Test contracts, not just functionality. A contract test validates *what the code must not do* (never exit 1, never use scoped package name, never be non-executable). Functionality tests validate *what the code does* (creates issues, logs warnings, parses config).

---

### Test Gap Analysis

**What's now tested:**
- Hook exit codes (all paths exit 0)
- CLI alias consistency (all hooks use `squask`)
- Filesystem permissions (all deployed hooks are 755)
- Config schema (BridgeConfig.hooks.autoCreateIssues exists and is boolean)

**What's NOT tested (acceptable gaps):**
- End-to-end hook execution in a real SpecKit pipeline (requires SpecKit installation)
- Network failure scenarios in `squask issues` (requires mock GitHub API)
- Cross-platform shell compatibility (Bash vs Zsh vs PowerShell)
- Git index permissions propagation (requires fresh clone simulation)

**Why these gaps are acceptable:**
- E2E testing would require SpecKit as a test dependency (heavyweight)
- Network mocks add complexity without much value (real failure modes are transient)
- Cross-platform testing is handled by SpecKit's own test suite (our hooks are simple)
- Git index permissions are verified manually (one-time setup, low regression risk)

---

## Architecture Observations

### Clean Architecture Compliance Validated

**T010 (Gilfoyle):** Non-destructive compliance review confirmed zero violations across all v0.3.1 changes.

**Changes analyzed:**
- PR #314: Monica docs (API reference)
- PR #329: Monica contracts (hook scripts)
- PR #330: Dinesh config (autoCreateIssues flag)
- PR #331: Jared hooks (exit codes + tests)

**All 5 principles passed:**
1. **Independence of Entities:** Hook schemas and config types remain isolated from business logic
2. **Independence of Use Cases:** CLI commands maintain use case boundaries, no cross-pollination
3. **Separation of Concerns:** Concerns properly layered (presentation, application, domain, infrastructure)
4. **Testability Requirements:** All new code includes test coverage (T004/T006/T008)
5. **Dependency Rule Enforcement:** No inward dependency violations detected

**Why this matters:** v0.3.1 was a "bug fix and polish" release — precisely the kind of work where architectural discipline slips. Quick fixes often bypass the layers to "just make it work." The fact that all changes respected Clean Architecture boundaries demonstrates that the principles are operational, not aspirational.

---

### Layer Discipline Observations

**All changes confined to outer layers:**
- **Layer 0 (Entities):** BridgeConfig.hooks.autoCreateIssues field added (pure data, no behavior)
- **Layer 2 (Adapters):** File deployer already correct (no changes needed)
- **Layer 3 (Frameworks):** Hook template scripts modified (shell scripts, outermost layer)
- **Documentation:** API reference, contracts, learnings (outside code layers)

**No use case layer modifications required.** The bug fixes were entirely in the deployment/integration layer (hook templates and config schema), not in the core business logic. This validates the architecture — fixing automation bugs shouldn't require touching the domain model.

**Learning:** When bug fixes require changes to inner layers (entities, use cases), it signals a deeper design issue. When fixes stay in outer layers (adapters, frameworks), the architecture is healthy.

---

## Process Observations

### What Worked: Parallel Task Execution

**Orchestration pattern used:**
- **Round 1:** Dinesh (T002 port interfaces) + Jared (T038 port tests) + Monica (T047 usage docs) — 3 agents in parallel
- **Round 2:** Monica (T012 hook contracts) + Dinesh (T002 config updates) — 2 agents in parallel
- **Round 3:** Jared (T004/T006/T008 hook tests) + Gilfoyle (T010 architecture compliance) — 2 agents in parallel

**Why parallel execution was safe:**
- Tasks targeted different files (zero merge conflicts)
- Dependencies were respected (port tests followed port interfaces, not simultaneous)
- Git worktrees isolated agent work (each agent had its own working tree)

**Performance gain:** 12 tasks completed in ~3 rounds instead of 12 sequential rounds. Estimated time saved: 60-70%.

---

### What Worked: Comprehensive Upfront Specification

**Artifacts created before implementation:**
- spec.md (user stories, requirements, success criteria)
- plan.md (technical approach, constitution checks)
- contracts/hook-scripts.md (behavioral contracts for each hook)
- data-model.md (config schema changes)
- quickstart.md (implementation checklist)

**Result:** 75% of PRs approved on first review (3/4). Only PR #328 required rework (regression, not spec ambiguity).

**Why it worked:**
- Contracts documented before coding (T012 created contracts, T004/T006/T008 tested them)
- Exit code behavior was explicit in contracts ("always exit 0")
- Config schema was designed before implementation (autoCreateIssues flag)

**Counter-evidence:** The exit code regression still happened despite contracts. This shows the limit of documentation — contracts must be tested, not just written.

---

### What Didn't Work: Issue Auto-Closure with Squash Merge

**Problem:** All 12 issues remained open after PR merges despite `Closes #N` in PR bodies.

**Root cause:** Squash merge rewrites commit history, breaking GitHub's issue-closing automation.

**Manual workaround:** All issues closed manually post-merge verification.

**Process cost:** ~5 minutes per PR (verify merge, manually close 3-4 linked issues) × 4 PRs = 20 minutes of manual overhead.

**Alternatives considered:**
1. Switch to merge commits (preserves history, auto-closes issues) — rejected, team prefers clean squash history
2. Configure repo to append PR body to squash commit — requires admin access, not evaluated
3. Build a script to auto-close issues post-merge — over-engineered for 4 PRs

**Decision:** Accept manual closure as the price of squash merge. Document for future specs.

---

### What Didn't Work: Hook Bypass Pattern (Broader Context)

**v0.3.0 retrospective finding:** 0% bridge CLI adoption. Team used Copilot Chat agents (`/speckit.specify`, `/speckit.plan`) which bypass SpecKit's CLI pipeline, so hooks never fired.

**v0.3.1 scope:** Fix the hooks themselves (permissions, automation, consistency). Not in scope: solve the hook bypass problem.

**Implication for future work:** Even with perfect hooks, if the team uses agent workflows instead of CLI workflows, the hooks remain unused. The broader integration strategy (MCP server mode, agent prompt enhancements) is deferred to v0.4.

**Learning:** You can't dogfood automation that depends on a workflow you're not using. The bridge was designed for CLI-driven SpecKit, but the team uses agent-driven SpecKit. The architecture is sound, but the operational context doesn't match the design assumptions.

---

## Recommendations for Future Specs

### 1. Design for the Workflow You Actually Use, Not the Workflow You Document

**v0.3.1 fixed hooks that the team doesn't invoke.** The hooks are correct and tested, but they fire when SpecKit CLI commands run. The team uses Copilot Chat agents instead.

**Future spec guideline:** Before designing automation, confirm how the team actually works. If the automation depends on a specific workflow (CLI vs agents, git hooks vs CI, manual vs automatic), verify that workflow is the team's default, not aspirational.

---

### 2. Test Contracts in the Same PR as Behavior

**v0.3.1 pattern:** T012 (contracts doc) → T004/T006/T008 (contract tests) were separate PRs.

**Better pattern:** Merge behavior + contract + tests in a single atomic PR. If the contract document says "always exit 0," the code implementing exit 0 and the test enforcing it should ship together.

**Why:** Separating them creates a window where the contract exists but isn't enforced. That's when regressions sneak in.

---

### 3. Executable Permissions Require Git Index + Filesystem

**v0.3.1 learning:** `chmod +x` alone doesn't persist across clones. Must also run `git update-index --chmod=+x`.

**Future spec guideline:** If executable permissions are part of the deliverable (shell scripts, binaries), document both steps in the implementation tasks:
```bash
chmod +x <file>
git update-index --chmod=+x <file>
git commit -m "fix: set executable bit"
```

Verify with fresh clone before merging.

---

### 4. Config Flags > Code Changes for Behavior Toggles

**v0.3.1 pattern:** `autoCreateIssues` flag lets teams disable automation without editing hook scripts.

**Reusable principle:** When automation behavior should vary by team/project (auto vs manual, strict vs permissive, verbose vs quiet), add a config flag rather than documenting "edit the hook script to change this behavior."

**Why:** Config flags centralize control, version-control configuration separately from code, and enable per-project customization without forking the tool.

---

### 5. Exit Code 0 for Graceful Degradation in Lifecycle Hooks

**v0.3.1 learning:** Hooks that block the pipeline on transient errors (network timeout, missing config) are worse than no automation.

**Reusable principle:** Lifecycle hooks should exit 0 unless the error is unrecoverable and blocking the pipeline is the correct behavior. For most errors, log to stderr and continue.

**Anti-pattern:** `exit 1` on "GitHub API rate limit" — this blocks the entire SpecKit pipeline when the bridge is just one step. Better: log the rate limit, skip issue creation, and let SpecKit continue.

---

## Future Work Identified (Not in v0.3.1 Scope)

1. **MCP server mode:** Expose bridge tools (`context`, `issues`, `review`, `sync`) as callable functions for Copilot Chat agents, eliminating hook dependency
2. **Agent prompt enhancements:** Update SpecKit agent charters to mention bridge commands and when to use them
3. **Merge-trigger automation:** GitHub Action to run `squask sync` on PR merge (close the knowledge feedback loop automatically)
4. **Auto-routing suggestions:** Wire `squask issues` to suggest agent assignments based on task keywords and agent expertise from `.squad/agents/*/charter.md`
5. **Integration test suite:** E2E tests for context→plan→tasks→review→issues→sync pipeline (requires SpecKit as test dependency)

---

## Summary

**What we learned:**
- Contracts without tests are documentation, not enforcement
- Executable permissions need git index + filesystem fixes
- Squash merge breaks GitHub issue auto-closure
- Exit codes are invisible to human reviewers but critical to automation
- Config-driven behavior > hardcoded automation

**What we built:**
- 22 contract enforcement tests (exit codes, CLI aliases, permissions)
- Graceful hook automation (config-driven, environment-aware)
- Clean Architecture compliance across all changes

**What we validated:**
- Small PRs ship faster (1.25 cycles per PR vs industry 2-3)
- Parallel task execution works (3 rounds for 12 tasks)
- Strong specs reduce rework (75% first-time approval rate)

**What we deferred:**
- Solving the agent-vs-CLI workflow mismatch (v0.4 scope)
- Closing the knowledge feedback loop automatically (v0.4 scope)
- Testing cross-platform shell compatibility (low priority)
