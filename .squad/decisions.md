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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
