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
