# Squad Decisions

## Active Decisions

### Framework Classification: Squad + Spec Kit Are Complementary (2026-03-23)

**Decision:** Treat Squad and Spec Kit as complementary layers, not competitors.

- **Squad** = multi-agent orchestration with persistent memory (runtime layer)
- **Spec Kit** = structured specification pipeline (planning layer)

Neither alone covers full workflow. Squad lacks specification discipline. Spec Kit lacks parallel orchestration and agent memory.

**Impact:** Foundational for all subsequent framework selection and integration decisions.

---

### Integration Strategy: Pipeline Model with tasks.md Boundary (2026-03-23)

**Decision:** Adopt a pipeline integration model where Spec Kit serves as the upstream planning engine and Squad serves as the downstream execution engine.

- **Upstream:** Spec Kit (`spec.md` → `plan.md` → `tasks.md`)
- **Handoff:** `tasks.md` (machine-parseable API boundary)
- **Downstream:** Squad (assign → execute → coordinate → review)

**Recommended Actions:**
1. Build a Squad skill that parses Spec Kit's `tasks.md` and generates Coordinator-compatible work routing
2. Wire Spec Kit extension hooks (`after_tasks`, `after_implement`) to trigger Squad ceremonies
3. Do NOT run `/speckit.implement` and Squad's Coordinator simultaneously — choose one per cycle
4. Do NOT attempt full framework merge — destroys each framework's strengths

**Rationale:**
- Non-overlapping state directories (`.squad/` vs `.specify/`)
- Complementary strengths and weaknesses
- Zero modification needed to either framework
- Additive bridge approach

**Risks:**
- Workflow ownership conflict if both orchestrate execution simultaneously
- Agent prompt conflicts if same AI host configured by both frameworks

**Status:** Adopted; awaiting implementation

---

### Technical Compatibility: Coexistence Is Feasible (2026-03-23)

**Decision:** Squad and Spec Kit can safely coexist in the same repository with minimal integration work.

**Technical Facts:**
- **Zero directory conflicts:** `.squad/` and `.specify/` are independent
- **One manageable conflict:** `.github/copilot-instructions.md` (both tools write to it; solvable with section markers)
- **Natural data flow:** `tasks.md` output can feed Squad's workflow via ~100-line bridge script
- **Runtime compatibility:** Spec Kit (Python CLI) and Squad (Node.js/Copilot SDK) operate at different layers — no conflicts
- **Agent layer compatibility:** Spec Kit targets 25+ external AI tools; Squad defines virtual team members. Different layers entirely.

**Bridge Requirements:** ~100-line integration script to parse `tasks.md`, generate Squad work items, and handle merged instructions with section markers.

**Status:** Confirmed feasible; cleared for implementation

---

### Framework Weight and State Management Constraints (2026-03-23)

**Decision:** Framework selection and configuration must account for team size and state management risk.

**Patterns from Real Projects:**
1. **Framework Weight Must Match Team Size**
   - Squad's 12-agent model created coordination overhead for solo developer
   - Spec Kit's zero-agent model ideal for solo + Copilot
   - Need lightweight Squad mode (1-2 agents, no ceremonies) for small teams

2. **State Accumulation Is Critical Friction Point**
   - aithena's decisions.md reached 475KB — unusable as context
   - Both frameworks need automatic state pruning
   - Threshold-based archiving should be framework feature, not manual discipline

3. **Project Type Drives Framework Fit**
   - Greenfield → Spec Kit (spec-per-feature planning is fast)
   - Brownfield → Squad (issue routing, milestone management, team coordination)
   - Comparison should acknowledge this as primary driver

4. **Complementary Planning Models**
   - Spec Kit: structured planning (spec.md + plan.md + tasks.md)
   - Squad: issue-based routing
   - Combined model: specs for new features, issues for maintenance within same project

5. **Constitutional Governance Scales**
   - Spec Kit: single 15KB constitution (versioned)
   - Squad: distributed decisions across 5+ files
   - Squad needs a constitutional governance layer

6. **Progressive GitHub Integration**
   - sofia-cli: 0 Issues (too sparse for visibility)
   - aithena: 412 Issues (too dense for signal-to-noise)
   - Framework should support progressive adoption levels

**Status:** Confirmed patterns; design criteria established

---

### Memory Bridge — Squad State Feeds Into Spec Kit Planning (2026-03-23)

**Decision:** Build a context injection layer that reads Squad's `.squad/` memory artifacts and makes them available to Spec Kit's planning phases. Implemented as either a Spec Kit extension hook (`before_specify`) or a standalone bridge script.

**Mechanism:**
1. Before `/speckit.specify` or `/speckit.plan` runs, a bridge script reads:
   - `.squad/skills/*/SKILL.md` (compressed learnings — highest signal)
   - `.squad/decisions.md` (team decisions — filtered for relevance)
   - `.squad/agents/*/history.md` (agent learnings — summarized, not raw)
2. Produces a `squad-context.md` in the spec directory
3. Spec Kit's planning templates reference this file as additional context

**Constraints:**
- Read-only from Squad's side. Spec Kit never writes to `.squad/`.
- The reverse flow (Spec Kit → Squad) already exists via `tasks.md` handoff.
- Progressive summarization applies — don't dump 200KB of histories into planning context.

**Rationale:** Squad agents accumulate knowledge that Spec Kit's stateless planning cannot access. Without this bridge, every planning cycle starts from zero knowledge. With it, each cycle benefits from all prior execution experience.

**Status:** Proposed

---

### Task Creation Workflow — Lead-Reviewed Ceremony Before Issues (2026-03-23)

**Decision:** Adopt the following workflow for turning Spec Kit output into actionable work:

```
Spec Kit: spec → plan → tasks.md
    ↓
Squad Lead: Reviews tasks.md with team (Design Review ceremony)
    ↓
Lead/Coordinator: Creates GitHub issues (informed by team review)
    ↓
Ralph: Picks up issues, distributes via labels
    ↓
Squad agents: Execute, write learnings to history.md
    ↓
Memory bridge: Feeds learnings back into next Spec Kit cycle
```

**Key rule:** No issues are created until the Squad team has reviewed Spec Kit's task breakdown. The ceremony is where accumulated knowledge corrects planning blind spots.

**Rationale:**
- Spec Kit plans from specs alone — it has no project history or codebase memory.
- Squad agents know the tricky integrations, fragile modules, and prior decisions.
- Creating issues before team review wastes effort on tasks that will be immediately revised.
- The ceremony creates a natural human review checkpoint.
- The feedback loop (execution learnings → next planning cycle) is what makes the system compound.

**Status:** Proposed

---

## Generic Decisions for Extract

The following decisions apply broadly and are candidates for personal squad extraction:

1. **State Pruning as Framework Feature** — Automatic threshold-based archiving of decisions/logs prevents context pollution. Both frameworks should implement this.
2. **Constitutional Governance at Scale** — A centralized constitution (15KB, versioned) provides clearer governance than distributed decision files.
3. **Progressive GitHub Integration** — AI frameworks should support multiple adoption levels rather than forcing all-or-nothing GitHub integration.
4. **Team-Size-Driven Framework Configuration** — Agent count and ceremony overhead should scale with team size, not be fixed.

---

### Delivery Mechanism for Squad × Spec Kit Integration (2026-03-23)

**Decision:** Adopt a hybrid dual-sided integration package (Squad plugin + Spec Kit extension + shared bridge script).

**Architecture:**
- **Squad Plugin:** SKILL.md teaching agents about Spec Kit artifacts, Design Review ceremony definition
- **Spec Kit Extension:** after_tasks hook for automation, bridge-context command for memory injection
- **Shared Bridge:** ~150 LOC script reading .squad/ → squad-context.md, parsing tasks.md → JSON

**Deployment:** Single install.sh detecting both frameworks, copying components correctly.

**Evolution Path:**
1. **v0.1 (NOW):** Plugin SKILL.md (~100 LOC) + Extension hooks (~50 LOC) + bridge script (~150 LOC) = 300 LOC total. Manual trigger workaround for memory bridge.
2. **v0.2:** Package as installable plugin + extension with install script
3. **v1.0:** Wrap bridge as MCP server (~500 LOC) if loop proves valuable, adding tool calls (speckit_bridge_context, read_speckit_tasks, create_issues_from_tasks)

**Scoring Rationale (vs 4 alternatives):**
- Hybrid: 27/35 (full loop coverage, native DX on both sides)
- MCP Server only: 25/35 (over-engineered for v1, passive tools)
- Squad Plugin only: 22/35 (no Spec Kit lifecycle hooks)
- Spec Kit Extension only: 21/35 (missing before_specify hook, only 50% coverage)
- Standalone CLI: 19/35 (no agent discoverability, requires explicit instructions)

**Critical Gap & Workaround:**
- Spec Kit lacks `before_specify` / `before_plan` hooks needed for automatic memory bridge injection before planning
- Short-term: developer runs `/speckit.squad-bridge.context` command manually before `/speckit.specify`
- Medium-term: propose before_specify hook upstream to Spec Kit
- Long-term: MCP server agent tools make this transparent (agents call on demand)

**Status:** Approved for implementation. No framework modifications required.

---

### Technical Implementation Details — MCP & Extension Options (2026-03-23)

**Assessed by:** Dinesh (Integration Engineer)

**MCP Server Feasibility (if adopted in v1.0):**
- Transport: stdio subprocess (same as GitHub MCP, Playwright MCP)
- Tools (5): bridge_squad_context, read_speckit_tasks, create_issues_from_tasks, sync_learnings, check_integration_status
- Dependencies: @modelcontextprotocol/sdk, zod, @octokit/rest, gray-matter
- Setup: Add to ~/.copilot/mcp-config.json or .vscode/mcp.json
- Implementation LOC: ~500 (40 bootstrap + 120 bridge + 80 parse + 100 issues + 60 learnings + 40 status + 60 utils)
- Limitations: Passive (tools available, not auto-triggered); needs GitHub API token; parser updates on framework changes

**Squad Plugin Capabilities:**
- SKILL.md: Pure markdown knowledge injection, no executable code
- Ceremony definition: Can add to ceremonies.md
- Tool metadata: Can reference MCP tools in frontmatter (informational only, no installation)
- Gaps: No lifecycle hooks, file watching, or executable code path

**Spec Kit Extension Hooks (Verified):**
- ✅ after_tasks, after_implement, before_commit, after_commit, before_tasks (5 available)
- ❌ before_specify, before_plan (2 critical gaps)
- Shell script execution: Bash/PowerShell, any CLI tools, file I/O, API calls
- Setup: extension.yml manifest in .specify/extensions/{ext-id}/, hooks as .sh scripts

**Phased Approach Technical Roadmap:**
- Phase 1: Plugin SKILL.md + Extension after_tasks + shared bridge.js (prove loop)
- Phase 2: Wrap bridge as MCP server (improve parsing reliability)
- Phase 3: Propose before_specify hook to Spec Kit (enable full automation)

**Status:** Technical blueprint approved. Ready for Phase 1 implementation.

---

### Clean Architecture — Bridge Design (2026-03-23)

**Decision:** Apply Uncle Bob's Clean Architecture to the Squad-SpecKit bridge to maximize testability, maintainability, and framework independence.

**Architecture Structure:**
- **Layer 0 (Entities):** Pure business logic — ContextBudget, RelevanceScorer, ReviewFinding, BridgeConfig. Zero dependencies, no I/O.
- **Layer 1 (Use Cases):** Application orchestration — GenerateContext, PrepareReview, InstallBridge, CheckStatus. Define ports, depend only on entities and port interfaces.
- **Layer 2 (Adapters):** Format conversion — SquadFileSystemAdapter, SpecKitFileSystemAdapter, ConfigFileAdapter, CLIAdapter, ManifestAdapter, GitHubIssueAdapter (v1.0). Implement use case ports.
- **Layer 3 (Frameworks/Drivers):** External libraries — commander, gray-matter, fs, Octokit, glob. Replaceable, zero business logic.

**Dependency Rule:** All arrows point inward. Entities → Use Cases ← Adapters. Adapters never reference adapters; adapters never reference use cases; use cases never reference adapters.

**Port Interface Strategy:**
- **Input Ports:** GenerateContextPort, PrepareReviewPort, InstallBridgePort, CheckStatusPort. Called by CLI adapter.
- **Output Ports:** SquadStatePort, SpecKitStatePort, ConfigPort, FrameworkDetectorPort, FileWriterPort, IssueTrackerPort. Implemented by adapters, injected into use cases via constructor.
- Port interfaces defined IN the use case layer. Adapters implement them in the outer layer.

**Data Transfer Objects (DTOs):**
- 7 DTO types crossing boundaries: SkillEntry, DecisionEntry, LearningEntry, TaskEntry, ContextSummaryDTO, ReviewRecordDTO, InstallManifestDTO
- 3 Request DTOs: GenerateContextRequest, PrepareReviewRequest, InstallBridgeRequest
- **No raw markdown, file paths, or format-specific data** crosses the adapter → use case boundary
- Adapters parse markdown (gray-matter) and produce clean typed DTOs; use cases consume DTOs and produce DTOs; adapters convert output DTOs to final formats

**Test Pyramid (60 tests):**
- **Entity Tests (15):** Pure unit tests, no mocks, test ContextBudget allocation, RelevanceScorer recency bias, ReviewFinding severity, BridgeConfig validation
- **Use Case Tests (20):** Mock ports, test orchestration logic (GenerateContext, PrepareReview, InstallBridge, CheckStatus)
- **Adapter Tests (12):** Integration tests against real fixture files (.squad/, specs/ structures)
- **CLI Tests (8):** Snapshot tests verifying human-readable and JSON output formatting
- **E2E Tests (5):** Full pipeline tests with temporary directories, real adapters, complete flow verification

**Anti-Patterns to Prevent (8 violations documented):**
1. gray-matter imports in use cases or entities → ❌ (format parsing is adapter's job)
2. `.squad/` or `.specify/` path references in use cases → ❌ (paths are framework detail)
3. `node:fs` imports in use cases → ❌ (all I/O through ports)
4. `commander` imports outside CLI adapter → ❌ (CLI framework confined to outermost layer)
5. Adapter-to-adapter calls → ❌ (only composition root wires adapters)
6. Business logic in adapters → ❌ (adapters do format conversion only)
7. Format-specific output from use cases → ❌ (use cases return DTOs; adapters format)
8. `process.env` in use cases → ❌ (ConfigPort handles env resolution)

**Project Structure (Clean Layering):**
```
src/
  entities/                  (4 files, pure logic, zero I/O)
  use-cases/                 (4 files + ports/, orchestration)
  adapters/                  (7 files, format conversion)
  dto/                       (10 files, boundary data)
  main.ts                    (composition root)
tests/
  entities/                  (pure unit)
  use-cases/                 (mocked ports)
  adapters/                  (real fixtures)
  cli/                       (snapshots)
  e2e/                       (full pipeline)
  fixtures/                  (squad/, specify/)
```

**Dependency Flow Diagram:**
- CLI Adapter / Squad FS Adapter / SpecKit Adapter (Layer 3)
- ↓ call / implement
- Use Cases (Layer 1) — define ports, orchestrate entities
- ↓ depend on
- Entities (Layer 0) — pure business logic

**Rationale:**
- Dependency rule prevents framework concerns from polluting business logic
- Port interfaces abstract external formats and I/O
- Constructor injection (no service locator) makes dependencies explicit and testable
- DTO discipline ensures clean boundaries
- Test pyramid with per-layer strategies enables high confidence with fast execution
- Task ordering (entities first, then use cases, then adapters, then composition) maximizes parallelism

**Leads:** Richard (architecture), Dinesh (boundary analysis)  
**Status:** Design approved. Ready for Layer 0 implementation task breakdown.

---

### Human-in-the-Loop Governance — Product Owner Review (2026-03-23)

**Decision:** Juanma (jmservera) is part of the team as Product Owner and human reviewer for critical decisions.

**Scope:**
- Important clarification questions → escalate to Juanma for review
- Team should not auto-accept all clarifications
- Decisions requiring human judgment → route through Juanma

**Rationale:** Ensures human oversight on critical choices, preserves accountability, leverages product owner perspective.

**Status:** Active; implemented immediately

---

### Specification Workflow Learnings (2026-03-23)

**Decision:** Six workflow enhancements proposed based on meta-analysis of this session's Spec Kit usage.

**Proposals (v0.1 — actionable immediately):**

1. **FR-014 Enhancement:** `after_tasks` hook should trigger both clarify pass and Design Review notification
   - Evidence: Juanma directed "always run clarify after tasks"
   - Impact: Catches spec/task misalignment (missing flags, undefined enum values) missed by pre-plan clarification
   - Modification: T036 (after-tasks.sh) to run clarify before review notification

2. **FR-025 (New Requirement):** Detect uncustomized constitutions and warn developer
   - Evidence: This session's constitution remained a `[PLACEHOLDER]` template throughout
   - Workaround: Team reverse-engineered principles from decisions.md (fragile but effective)
   - Implementation: T012 (CheckStatus use case) adds constitution template detection; context command warns on placeholder markers

3. **SKILL.md Template Warning:** Document `setup-plan.sh` overwrite risk explicitly
   - Evidence: Richard lost plan.md content on incremental re-run; required `git restore` recovery
   - Pattern: "Always commit artifacts before re-running Spec Kit pipeline phases"
   - Modification: T039–T040 (bridge SKILL.md template) adds explicit setup-plan.sh re-run warning

**Proposals (v0.2 — deferred, queue for next cycle):**

4. **Workflow Notes Section in Context Summary** — Enhance context summary to include "Workflow Notes" tier surfacing Spec Kit pipeline patterns, phase ordering lessons, and friction points alongside technical learnings. Deferred implementation: SummarizeContent (T021).

5. **Governance Decision Visibility** — Decisions tagged with governance keywords (escalate, human review, approval required, human-in-the-loop) should appear in dedicated "Governance" section above regular decisions and receive boosted relevance. Deferred implementation: RelevanceScorer (T007), context summary format.

6. **Pre-Pipeline Research Phase Support** — `context` command should optionally discover and summarize research artifacts (`research-*.md` files). Squad's research phase predates Spec Kit's planning; currently untracked by pipeline. Deferred implementation: BuildSquadContext (T022).

**Classification:** All project-specific to Squad-SpecKit bridge; no generic patterns extracted.

**Status:** v0.1 proposals approved for implementation; v0.2 queued for prioritization

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Critical decisions requiring human judgment → escalate to Product Owner (Juanma)

---

## User Directives (2026-03-24)

### Issue Creation Ownership

**Date:** 2026-03-24T07:50:16Z  
**Source:** Juanma (Product Owner)

The SpecKit+Squad pipeline workflow:
- **SpecKit generates:** `tasks.md` (autonomous planning output)
- **Squad takes over:** Squad Coordinator creates GitHub issues from `tasks.md`
- **SpecKit never creates:** SpecKit must NOT create issues directly

**Why:** Preserves Squad's issue lifecycle (labeling, triage, squad:member assignment). Previous approach (SpecKit creating issues) bypassed Squad's routing layer, breaking team coordination.

**Reproducible Process:**
1. SpecKit: `specify` → `plan` → `tasks` → produces `tasks.md`
2. Design Review ceremony: Squad validates task breakdown against team knowledge
3. Squad Coordinator: Creates GitHub issues with `squad` labels from `tasks.md`
4. Ralph/Lead: Applies `squad:{member}` labels during triage
5. Agents: Pick up work via normal squad lifecycle

**Status:** Active; encoded in Monica's handoff skill (`.squad/skills/speckit-squad-handoff/SKILL.md`)

---

### Parallel Agent Worktree Protocol

**Date:** 2026-03-24T07:55:00Z  
**Source:** Juanma (Product Owner)

Always use `git worktree` when spawning parallel agents that write code. Each agent gets its own worktree so branches don't conflict.

**Why:** Prevents file conflicts when multiple agents work simultaneously on different issues/branches.

**Status:** Active; to be implemented in Ralph's agent spawning protocol

---

### Bridge Integration Sequence Design Requirement

**Date:** 2026-03-24T07:56:00Z  
**Source:** Juanma (Product Owner)

The bridge must embed the correct step sequence for integrating SpecKit and Squad as a **formal spec** (not just documentation).

**Requirement:** Design the pipeline programmatically so it's reproducible and automated:
- SpecKit generates tasks → Squad creates issues → Lead triages → agents work

**Why:** The bridge is the orchestrator-of-orchestrators and must control the handoff programmatically, not rely on human coordination alone. Future teams need codified, executable integration logic.

**Status:** Queued for design phase; requires formal spec.md creation before implementation begins

---

## Post-v0.3.0 Analysis Decisions

### Pipeline Architecture Is Sound But Adoption Is Low (2026-03-24)

**Decision:** The SpecKit→Squad pipeline architecture is correctly designed. Every step exists. The handoff boundary (tasks.md) is well-defined. Agent orchestration was excellent (correct routing, parallel batching, worktree isolation, 6.25% review rejection rate).

**Critical Gap:** The bridge CLI was bypassed in favor of manual workarounds.
- Issue creation: Used hand-written shell script (50 hardcoded `gh issue create` commands) instead of `squask issues`
- Context injection: `squask context` never run; `before-specify.sh` hook never fired (hooks fire for CLI, not for Copilot Chat agents)
- Knowledge sync: `squask sync` never run; knowledge feedback loop completed zero rotations

**Verdict:** The bridge is a well-engineered machine that nobody turned on. The problem is not architecture — it's adoption and operational discipline.

**Root Cause:** Hooks depend on SpecKit's CLI pipeline. Team used Copilot Chat agents exclusively (`/speckit.specify`, `/speckit.plan`), which bypass hooks. The bridge was designed for a CLI workflow but deployed in an agent workflow.

**Next Steps:**
1. **P0 (immediate):** Dogfood the bridge on next feature — use `squask context`, `squask issues`, `squask review`, `squask sync` instead of workarounds
2. **P1 (next sprint):** Close the knowledge loop — wire SpecKit agents to read squad-context.md; add MCP server mode to eliminate agent-hook gap
3. **P2 (next cycle):** Reduce dead code (1,500 LOC never used); fix 3 critical bugs (template permissions, command naming, CLI version)

**Impact:** If the team doesn't actively use the bridge on the next cycle, the entire integration strategy fails. The bridge must be turned on to be validated.

**Status:** Proposed for team action; Richard's full retrospective in `.squad/decisions/inbox/richard-pipeline-retrospective.md` (merging to this file)

---

### Bridge Hooks Structurally Sound, Operational Risks Identified (2026-03-24)

**Decision:** The three-hook model (before-specify, after-tasks, after-implement) is structurally sound and correctly covers key boundaries. Squad-side GitHub Actions workflows are well-built and functional.

**Operational Risks:**
1. **Template permission bug (critical):** `before-specify.sh` and `after-implement.sh` templates are 644 (not executable). Fresh `squask install` will fail with `Permission denied` if copying without fixing permissions.
2. **Command name inconsistency (critical):** `after-tasks.sh` uses scoped name `@jmservera/squad-speckit-bridge` while others use unscoped `squad-speckit-bridge`. Fragile if package installed locally.
3. **CLI version stale (critical):** `src/cli/index.ts` reports 0.2.0 but `package.json` is 0.3.0.
4. **Issue creation gap (significant):** `after-tasks.sh` sends Design Review notification but does NOT auto-create issues. Manual `squask issues` call still required. Documentation vs reality mismatch.
5. **Missing hooks (significant):** No `after-plan`, `after-review`, or `on-rejection` hooks. Gaps between Design Review approval and issue creation.

**Inventory:**
- CLI Commands: 7 commands, 1 used (14% adoption rate: only `install` was used; `context`, `review`, `issues`, `sync`, `demo` all bypassed)
- Skills: 4 skills created (`speckit-bridge`, `clean-architecture-bridge`, `project-conventions` placeholder, `speckit-squad-handoff`); none consumed by agent prompts
- Agent Charters: Zero mentions of bridge, SpecKit, or integration workflow
- Dead Code: ~1,500 LOC (squask context/review/issues/sync/demo, three hooks, speckit.taskstoissues agent, project-conventions placeholder)

**Verdict:** Hooks designed well, but adoption is broken. The agent-CLI gap is architectural.

**Fix Priority:**
- **P0:** Fix three critical bugs (permissions, naming, version)
- **P1:** Decide if `after-tasks.sh` should auto-create issues or if manual ceremony is intentional (and document clearly)
- **P2:** Add MCP server mode so Copilot Chat agents can call bridge tools directly, eliminating the hook bypass problem

**Status:** Proposed; Gilfoyle's full audit in `.squad/decisions/inbox/gilfoyle-hooks-audit.md` (merging to this file)

---

### Recommended Automation Priority (P0-P3) (2026-03-24)

**Decision:** The bridge CLI identified 10 recommendations. Prioritize in three tiers:

**P0 (immediate — must complete before next feature):**
1. Dogfood the bridge: `squask context`, `squask issues`, `squask review`, `squask sync` on next feature (not shell scripts)
2. Close the knowledge loop: Prove `squask context` + `squask sync` work end-to-end
3. Fix three critical bugs: Template permissions, command naming, CLI version

**P1 (next sprint — required for uninterrupted workflow):**
1. Auto-route rejected PRs to different agent per lockout rule
2. Wire `squask issues` with routing suggestions based on task keywords + agent expertise
3. Add merge-trigger GitHub Action: `squask sync` on PR merge to main
4. MCP server mode: Expose `bridge_context`, `bridge_review`, `bridge_issues`, `bridge_sync` as tools Copilot Chat agents can call directly

**P2 (next cycle — hygiene and correctness):**
1. Auto-prune merged `squad/*` branches (60 stale branches accumulate signal-to-noise)
2. Consolidate `speckit.taskstoissues` agent and `squask issues` (two mechanisms guarantee one gets ignored)
3. Right-size task generation: Template targets 15-20 tasks per feature (v0.3.0 had 50 = excessive friction)
4. Create learnings directory structure: `specs/{feature}/learnings/` with extracted patterns

**P3 (future):**
1. Version sync: Build step to inject package.json version into CLI
2. Remove dead code: Fill `project-conventions/SKILL.md` with actual conventions extracted from codebase
3. Add integration tests: Zero tests verify end-to-end flow (context→plan→tasks→review→issues→sync)

**Status:** Ranked by dependency and urgency; ready for implementation planning

---

### Hooks Never Fire With Copilot Chat Agents (Design Decision) (2026-03-24)

**Decision:** Hooks are designed for SpecKit CLI pipeline. When SpecKit agents are invoked via Copilot Chat (`/speckit.specify`, `/speckit.plan`), they bypass hooks because the Chat interface doesn't invoke the SpecKit extension system.

**Consequence:** The bridge was designed for CLI workflow (hooks fire) but deployed in agent workflow (hooks don't fire). This caused:
- `before-specify.sh` never ran → no context injection
- `after-tasks.sh` never ran → no Design Review notification
- `after-implement.sh` never ran → no knowledge sync

**Solution (P1):** Replace hook-based approach with MCP server mode, where bridge tools are available as Copilot Chat tool calls directly. Eliminates the agent-CLI gap permanently.

**Interim Workaround:** Add manual prompts to SpecKit agents: "Before planning, run `npx squask context <spec-dir>`" and "After implementation, run `npx squask sync <spec-dir>`"

**Status:** Architecture decision; influences bridge future design

---

### Issue Creation Should Use `squask issues`, Not Shell Scripts (2026-03-24)

**Decision:** Feature 003 created 50 GitHub issues via hand-written `create-issues.sh` shell script with 50 hardcoded `gh issue create` commands. This bypassed the bridge's `squask issues` command (which has deduplication, routing suggestions, dry-run preview).

**Why This Happened:** Friction. Running `squask issues tasks.md` for the first time felt riskier than a shell script. The bridge CLI has high friction for first-time users.

**Fix:** Ensure `squask issues --dry-run` is frictionless enough that a shell script feels like more work, not less. The command must be:
- Clearly safe (--dry-run preview shows exactly what it will create)
- Fast feedback on first run
- Idempotent (safe to re-run)
- Integrated with agent routing (suggests `squad:{member}` labels based on task keywords)

**Enforcement:** Next feature MUST use `squask issues`. If UX is bad, file bugs. If command fails, fix it. Either way, we need the feedback to improve the bridge.

**Status:** Decision + action item; affects next feature cycle

---

### SpecKit Agent Workflows Must Inject Squad Context (2026-03-24)

**Decision:** The `before-specify.sh` hook is designed to run `squask context` before planning. Since hooks don't fire for Copilot Chat agents, this step never happens.

**Action:** Update SpecKit agent prompts (`.github/agents/speckit.specify.yaml`, `.github/agents/speckit.plan.yaml`) to check for and consume `squad-context.md` if it exists in the spec directory. Add to agent instructions:
- "Before planning, check if `squad-context.md` exists in the current spec directory and incorporate its context"
- "If `squad-context.md` doesn't exist, run `npx squask context <spec-dir>` first"

**Why:** The knowledge flywheel (Squad learnings → SpecKit context → better planning) is designed but never activated. This closes the loop.

**Status:** Design decision; requires agent prompt updates before next feature

---

### Squad-Context Loop Must Complete Full Rotation (2026-03-24)

**Decision:** The knowledge feedback loop has completed zero rotations: SpecKit→Squad via tasks.md works; Squad→SpecKit via squad-context.md was never attempted.

**Test Plan:** Before next feature cycle, execute full loop:
1. **Generate context:** Run `squask context specs/004/` to generate `squad-context.md` from v0.3.0 learnings
2. **Use context:** Run `/speckit.specify` for feature 004 with context present; verify plan/tasks reflect Squad knowledge
3. **Sync learnings:** Run `squask sync specs/004/` after feature 004 implementation; verify learnings written to `.squad/`

**Success Criteria:** Feature 004's spec.md explicitly references learnings from v0.3.0 (e.g., "Avoid 50 tasks; target 15-20 per PR feedback")

**Status:** Proposed test; blocks P0 dogfooding requirement

---

### Team Must Actively Use Bridge or Deprecate It (2026-03-24)

**Decision:** The bridge has been built with high engineering quality but achieved 14% adoption (1 of 7 commands used). The issue is not code quality — it's workflow friction and lack of demonstrated value.

**Mandate:** Next feature cycle MUST use the bridge tools (`squask context`, `squask issues`, `squask review`, `squask sync`) instead of manual workarounds. This is non-negotiable validation.

**If bridge is not used:** Recommend deprecation. High maintenance cost for unused code.

**If bridge is used and works:** Invest in P1 recommendations (MCP server mode, auto-routing, merge-trigger sync). The bridge becomes core infrastructure.

**Accountability:** Lead (Richard) owns verifying bridge usage on next cycle. Gilfoyle owns auditing hook execution. Juan (Product Owner) owns setting this as a team norm.

**Status:** Team decision; affects roadmap priority

---

---

### Hook Exit Code Contract Must Be Tested (2026-03-24)

**Author:** Jared (Data Analyst)  
**Date:** 2026-03-24  
**Context:** PR #328 changed hook error handlers from `exit 0` to `exit 1`, violating the hook contract (specs/005-hook-fixes-cli-polish/contracts/hook-scripts.md).

**Decision:** All hook templates must have automated tests asserting `exit 0` on every exit path. This prevents future regressions where someone changes exit codes without realizing the contract constraint.

**Tests Added (PR #331):**
- Every `exit N` line in every template is validated to be `exit 0`
- Cross-hook scan ensures CLI alias consistency (squask, not scoped package names)
- Integration test confirms 755 permissions on deployed hooks

**Rationale:** The exit code violation was caught by review, not automation. Adding the exit-code contract as a unit test makes this class of bug impossible going forward.

**Classification:** Project-specific (applies to this codebase's hook system)

**Status:** Implemented and validated in PR #331; merged.


---

### User Directive: Close Knowledge Flywheel with Reverse Sync (2026-03-24T22:39:26Z)

**Author:** Juanma (via Copilot)  
**Date:** 2026-03-24  
**Type:** Requirement

**Directive:** After a spec's implementation is complete, Squad learnings and memories must be synced BACK into the spec artifacts (not squad → tasks, but squad-knowledge → spec enrichment). This is the reverse direction of `squask sync`.

**Timing:** Should happen after a "nap" (cooldown period) from the Squad, not immediately after execution. The bridge must control this step so it's reproducible.

**Why:** User request — closes the knowledge flywheel. Specs should get smarter after each implementation cycle. Currently `squask sync` only goes forward (spec → squad context). The reverse path (squad learnings → spec) doesn't exist yet.

**Status:** Approved for Phase 1 MVP (manual ceremony)

**Classification:** Project-specific + architectural (this bridge's reverse sync feature, applies only here)

---

### Decision: Knowledge Feedback Loop Architecture (2026-03-24)

**Author:** Gilfoyle (Research Analyst)  
**Date:** 2026-03-24  
**Context:** Juanma's directive identified critical gap: bridge syncs forward only (specs → squad context → implementation). After implementation, learnings stay trapped in Squad memory. Spec artifacts never benefit from team experience.

**Decision:** Implement reverse knowledge sync as a phased feature.

**Phase 1 (MVP v0.1) — Manual Ceremony:**
```bash
squask sync-reverse <spec-dir> [--dry-run] [--cooldown 0]
```
- Reads recent learnings from `.squad/agents/*/history.md` and `.squad/decisions.md`
- Applies privacy filtering (regex masks secrets, strips PII)
- Deduplicates via fingerprints
- Writes to `specs/{id}/learnings.md`
- Teams manually trigger after implementation is stable

**Output Structure** (learnings.md):
- Architectural Insights
- Integration Patterns
- Performance Notes
- Decisions Made During Implementation
- Reusable Techniques
- Risks & Workarounds

**Cooldown:** 24 hours default (only processes learnings >24h old). Ceremony can override with `--cooldown 0`.

**Key Design Decisions:**
1. Manual, not automatic (proven pattern, human judgment needed)
2. Cooldown is configurable, respects team workflow
3. Privacy filtering required from day 1 (secrets/PII prevention)
4. learnings.md is separate artifact, doesn't mutate spec.md
5. Feature-level scope is explicit in MVP (not heuristic)

**Phase 2+ (v0.2+):** Time-gated automation, Spec Kit hook integration, feature scope detection

**Rationale:** Low risk (manual trigger, human review), closes core feedback gap, enables validation before Phase 2.

**Status:** Approved for implementation

**Classification:** Architectural + project-specific (reverse sync for this bridge; learnings.md pattern may generalize)

---

### Decision: Reverse Knowledge Sync — Standard Practice for All Specs (2026-03-24)

**Author:** Richard (Lead)  
**Date:** 2026-03-24  
**Type:** Process Standard

**Decision:** Adopt reverse knowledge sync as standard practice for all feature specs.

After implementation completion, synthesize learnings back into the spec directory by creating a `learnings.md` file and adding an Implementation Notes section to `spec.md`.

**Pattern Applied to Spec 005:**

**learnings.md (528 lines)** includes:
- Exit Code Contract Violation Pattern: PR #328 regression caught by automated tests
- Git Permissions Dual-Track: `chmod +x` + `git update-index --chmod=+x` requirement
- Squash Merge Issue Closure Gap: Manual issue closure needed for PR body preservation
- Node.js Environment Check Pattern: `command -v` checks for external CLI availability
- Config-Driven Hook Behavior Pattern: `autoCreateIssues` flag, centralized config control

**spec.md (Implementation Notes section)** includes:
- Summary of actual vs planned outcomes
- Key deviations from original spec
- Links to learnings.md
- Process metrics: 75% first-time PR approval, 1.25 review cycles per PR, 60-70% time saved via parallel execution

**Benefits:**
1. **Compound Learning**: Each spec teaches the next. Spec 006 references spec 005 patterns.
2. **Pattern Library**: Searchable reusable patterns (config-driven behavior, contract tests, permission handling)
3. **Process Improvement**: Metrics provide baseline for optimization
4. **Onboarding Value**: New members understand not just what was built, but why
5. **Knowledge Flywheel**: Spec quality improves over time

**When to Synthesize:** After all tasks complete, PRs merge, tests pass. Before marking "done".

**Who:** Lead role (Richard) or distributed (agents contribute domain sections).

**Effort:** ~2-3 hours per spec (Spec 005 validated this).

**Status:** Adopted for spec 005. Ready to apply to all future specs.

**Next Steps:**
1. Add "Reverse Sync" as phase in SpecKit task templates
2. Update ceremonies.md to include learnings synthesis
3. Train agents to reference `specs/*/learnings.md` when planning

**Classification:** Process standard, project-specific (pattern applies to this project's spec workflow)

---


---

### Bridge Hook Redesign Required — Agent Workflows Bypass CLI (2026-03-25)

**Author:** Richard + Gilfoyle (Lead + Research Analyst)  
**Date:** 2026-03-25  
**Type:** Architecture Decision  
**Severity:** Critical (knowledge flywheel blocked)

**Decision:** Current bridge hooks (`before-specify.sh`, `after-tasks.sh`, `after-implement.sh`) are designed for SpecKit CLI workflows but are **dead code in agent-driven workflows**. Team uses Squad agents (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`) which bypass the Spec Kit CLI entirely, preventing hooks from ever firing.

**Root Cause (Architectural):**
- Hooks are registered with SpecKit CLI and fire when CLI commands execute
- Squad agents invoke SpecKit services directly (no CLI invocation)
- `SPECKIT_SPEC_DIR` environment variable is not set in agent context
- No mechanism for agents to signal hook execution to OS/CI

**Impact:**
- `before-specify.sh` never runs: context must be generated manually
- `after-tasks.sh` never runs: issue creation is manual shell script, not automated
- `after-implement.sh` never runs: `squask sync` never auto-triggers, breaking knowledge flywheel

**This Is Not a Bug:** It's a fundamental mismatch between tool philosophies (CLI-first vs agent-first). Neither is wrong; they optimize for different workflows.

**Recommendation:** Choose one of three paths:
1. **Coordinator post-step** — After agent orchestration completes, Coordinator spawns final step: `squask sync` + `squask install`
2. **Scribe responsibility** — Expand Scribe handoff to include mandatory `squask sync` call
3. **Orchestration manifest entry** — Add "bridge-sync" spawn to orchestration template as final step before marking done

**Status:** Identified as critical blocker. Awaiting leadership decision on redesign path.

**Classification:** Project-specific (applies to squad-speckit bridge integration architecture)

---

### Knowledge Flywheel Blocked — Sync Not Run After Spec 008 (2026-03-25)

**Author:** Richard (Lead)  
**Date:** 2026-03-25  
**Type:** Process Decision  
**Severity:** High (breaks compound learning)

**Decision:** Spec 008 completed execution but `squask sync` was never run post-cycle. Learnings are trapped in orchestration logs instead of flowing back into team knowledge system (constitution, agent histories, decision framework).

**Evidence:**
- No `learnings.md` created for spec 008
- No `squask sync` run; no `.squad/.sync-state` file
- Constitution still at v1.1.0 (from spec 005)
- Three valuable learnings captured only in logs:
  1. **Version threading via constructor injection** (Clean Architecture pattern)
  2. **Squash merge artifact destruction** (recurring issue from spec 005)
  3. **Label routing gap** (informal distribution vs formal Ralph routing)

**Impact:** Spec 008 knowledge cannot compound into spec 009. Constitutional governance stagnates.

**Required Actions:**
1. Create `specs/008-fix-version-display/learnings.md` (restore from git history if needed)
2. Run `squask sync specs/008-fix-version-display`
3. Verify constitution bumped to v1.2.0+

**Process Requirement:** Make `squask sync` a **mandatory post-cycle step**, not optional. Add to:
- Orchestration manifest template (post-cycle checklist)
- Scribe handoff responsibilities
- Definition of "spec done"

**Status:** Requires immediate remediation. Future specs should include this in orchestration manifest from start.

**Classification:** Project-specific (addresses spec workflow for this codebase)

---

### Post-Cycle Checklist Required (2026-03-25)

**Author:** Richard (Lead)  
**Date:** 2026-03-25  
**Type:** Process Standard

**Decision:** Establish mandatory post-cycle checklist to complete the knowledge flywheel and bridge integration.

**Checklist:**
```
## Post-Cycle: Learnings & Sync

Before marking spec done:
- [ ] Create learnings.md with implementation notes, patterns, and decisions
- [ ] Update spec.md with Implementation Notes section (actual vs planned)
- [ ] Run `squask sync specs/NNN-feature`
- [ ] Verify constitution version bumped (from sync)
- [ ] Run `squask install` (if hooks modified)
- [ ] Archive spec artifacts if squash merge is planned
```

**Who:** Lead (Richard role) with support from domain agents.

**Timing:** After all PRs merge, tests pass, release tagged. Before orchestration session closes.

**Effort:** 2-3 hours per spec (spec 005 validated this).

**Status:** Adopted for future specs. Spec 008 requires remediation.

**Classification:** Process standard, project-specific (pattern applies to this project's spec workflow)

---

### Squash Merge Breaks Spec Artifact Continuity — Recurring Issue (2026-03-25)

**Author:** Richard (Lead)  
**Date:** 2026-03-25  
**Type:** Technical Issue  
**Severity:** Medium (recurring from spec 005)

**Decision:** Squash merge of implementation PR deletes spec artifacts from the repository tree. This happened in spec 005 (documented in learnings) and again in spec 008.

**Evidence (Spec 008):**
- Spec 008 directory created in commit `74dfbcd`: `specs/008-fix-version-display/` with spec.md, plan.md, tasks.md
- PR #347 merged as squash commit `d751484`
- Squash merge created new commit from PR branch (which didn't include spec files — they were in main separately)
- Result: spec.md, plan.md, tasks.md deleted from tree after merge

**Root Cause:** Squash merges linearize the PR branch history but don't preserve files that exist only in main (not in the PR branch).

**Workaround Options:**
1. **Non-squashed merge for spec PRs** — Use regular merge commits (not squash) for implementation PRs to preserve spec artifact links
2. **Spec artifacts committed before branching** — Commit spec.md, plan.md, tasks.md to main in a separate commit before creating implementation branch
3. **CI check** — Add verification that spec artifacts aren't deleted by PR merge

**Status:** Documented but not yet resolved. Should be fixed before spec 009.

**Classification:** Project-specific (applies to this project's git workflow + spec structure)

---

### Parallel Execution Works Well — 95% Efficiency Achievable (2026-03-25)

**Author:** Jared (Data Analyst)  
**Date:** 2026-03-25  
**Type:** Operational Pattern

**Decision:** Spec 008 achieved 95% parallelization efficiency by running source + test work in parallel with zero serialization. This is the baseline for single-concern features.

**Metrics:**
- **Cycle time:** 7h 48m (spec to release)
- **Parallelism:** 95% (near theoretical max; only unavoidable dependencies: tasks→implementation, code→review)
- **Issue throughput:** 2.2 issues/hour (47% improvement vs spec 005)
- **Test density:** 88% coverage (50 new tests across 5 files)
- **Review cycles:** 1 (rework, zero rejections)

**Key Success Factors:**
1. **Feature scope matched task granularity** (14 tasks for single-concern feature)
2. **No dependencies between source and test work** (Dinesh and Jared started simultaneously)
3. **Unified PR strategy** (all 14 tasks in single merge, not fragmented)

**Stage-Level Breakdown:**
| Stage | Duration | Agents | Overlap |
|-------|----------|--------|---------|
| Spec→Tasks | 31m | — | — |
| Implementation | 21m | Dinesh (src 14m) + Jared (tests 21m) | 100% |
| Review | 40m | Richard + Dinesh | 100% |
| Release | 4m | — | 100% |
| **Total** | **96m** | — | — |

**Comparison:** Spec 005 took ~8h (20% longer) with 4 agents and 3+ review cycles. Spec 008's 7h 48m with 2 agents sets new baseline.

**Recommendations for Future:**
1. Target 7h cycle time for single-concern features (matching spec 008)
2. Plan 10-12h for multi-concern features (like spec 005)
3. Run architecture review before coding to reduce review-cycle rework
4. Maintain current parallel discipline (src + tests concurrent)

**Status:** Pattern established. Ready for adoption across team.

**Classification:** Generic (applies to any parallel feature development, not squad-speckit specific)

---

