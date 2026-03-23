# Richard — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Lead
- **Joined:** 2026-03-23T08:50:38.328Z

## Learnings

<!-- Append learnings below -->

### 2025-07-24 — Squad × Spec Kit Integration Analysis

- **Non-overlapping state:** Squad uses `.squad/`, Spec Kit uses `.specify/` + agent dirs. Zero filesystem collision. This is the foundation that makes integration viable.
- **Natural handoff seam:** `tasks.md` is the API boundary. Spec Kit produces it (structured, with dependency ordering and `[P]` parallelism markers). Squad's Coordinator can consume it for agent routing.
- **The real conflict is workflow ownership:** Both frameworks answer "what should I do next?" — Spec Kit via sequential commands, Squad via Coordinator routing. Running both simultaneously during execution creates conflicting work streams.
- **Skills as the integration mechanism:** Spec Kit's spec-driven methodology can be encoded as Squad SKILL.md files without needing Spec Kit's CLI. The value is in the methodology, not the tooling.
- **Knowledge flywheel opportunity:** The highest-leverage integration is a feedback loop — Squad agent histories informing Spec Kit's next planning cycle, creating compound improvement over time.
- **Don't merge, compose:** Full framework merge destroys each framework's strengths. The "pipeline" pattern (Spec Kit plans → Squad executes) keeps both intact and plays to each one's advantage.
- **Ceremonies as review gates:** Spec Kit's extension hooks (`after_tasks`, `after_implement`) can trigger Squad ceremonies. This is the lowest-risk, cleanest integration point.

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team update (simultaneous background execution):**
- Gilfoyle completed deep-dive: frameworks are complementary (runtime vs planning layers)
- Dinesh completed compatibility analysis: technically feasible, ~100-line bridge needed
- Jared completed usage patterns: state accumulation is #1 risk, framework weight matters

**Decision consolidated in decisions.md:**
Adopt pipeline integration model: Spec Kit (upstream planning) → Squad (downstream execution), handoff via tasks.md. Zero modification to either framework. Additive bridge approach recommended.

**Action items from team research:**
1. Build Squad skill to parse tasks.md
2. Wire Spec Kit hooks to trigger Squad ceremonies
3. Implement automatic state pruning (critical for long projects)
4. Lightweight Squad mode for small teams

### 2025-07-24 — Delivery Mechanism Analysis

**Research completed: Both frameworks have mature extension systems.**

- **Squad plugins:** Bundle skills, agent templates, ceremony definitions, decisions entries. Installed via `squad plugin marketplace`. Skills (SKILL.md) are the key extensibility — compressed knowledge. MCP servers are also supported (on-demand, not daemons), discovered by prefix scanning.
- **Spec Kit extensions:** Installed to `.specify/extensions/{ext-id}/`. Manifest via `extension.yml`. Hooks: `after_tasks`, `after_implement`, `before_commit`, `after_commit`. **Critical gap: `before_specify` and `before_plan` hooks DON'T EXIST** — the memory bridge needs to run before planning, but there's no hook for it.
- **Key finding:** Neither framework's extension system alone covers the full integration loop. Squad plugins handle knowledge + ceremonies but can't trigger on Spec Kit lifecycle. Spec Kit extensions handle hooks + context but can't teach Squad agents methodology.

**Evaluated 5 delivery options:**
1. Squad Plugin Only — 60% coverage. Strong on agent knowledge, weak on automation.
2. Local MCP Server — right v2 architecture, over-engineered for v1. Adds operational overhead.
3. Spec Kit Extension Only — 50% coverage. Critically hampered by missing `before_*` hooks.
4. Standalone CLI — maximum portability, minimum integration. "Duct tape" approach.
5. **Hybrid (RECOMMENDED)** — dual-sided package deploying Squad plugin + Spec Kit extension + shared bridge script. Single install, both frameworks get native-feeling integration.

**Recommendation: Dual-Sided Integration Package (Hybrid)**
- Squad plugin: SKILL.md (Spec Kit knowledge) + Design Review ceremony definition
- Spec Kit extension: `after_tasks` hook (triggers review notification) + bridge command
- Shared bridge script: ~150 lines, handles both directions (summarize Squad state, parse tasks.md)
- Single install script deploys both sides
- Evolution path: manual v0.1 → packaged v0.2 → MCP-powered v1.0

**Critical dependency:** Spec Kit needs `before_specify` hook for auto-triggering memory bridge. Short-term workaround: manual command. Medium-term: propose hook to Spec Kit team.

### 2025-07-24 — Memory Integration & Task Workflow Design

**Question 1: Memory bridge design (Squad memory → Spec Kit planning)**

- **Recommended approach: Context Injection via Spec Kit extension hook.** Build a Spec Kit extension that reads `.squad/` state (decisions.md, agent histories, skills/) and injects a `squad-context.md` summary into the spec directory before `/speckit.specify` runs. This keeps both frameworks unmodified while bridging memory across the boundary.
- **Key insight:** The memory bridge should be *read-only from Squad's perspective* — Spec Kit reads Squad state but never writes to `.squad/`. The reverse flow (Spec Kit artifacts → Squad) already exists via `tasks.md`.
- **Rejected "conversation" model:** Having Spec Kit agents literally converse with Squad agents pre-decision is architecturally wrong — it creates a runtime dependency between planning and execution layers. Instead, treat Squad memory as a *static knowledge base* consumed at planning time.
- **Skills are the highest-leverage memory artifact.** Agent histories are verbose; decisions.md is append-only and gets large. Skills are *compressed, curated knowledge* — exactly what a planning engine needs. Feed skills first, decisions second, histories last (if at all).

**Question 2: Task creation workflow**

- **Recommended approach: Option C — Spec Kit → tasks.md → Lead reviews with team (ceremony) → issues created → Ralph distributes.** The ceremony step is non-negotiable. It's where Squad's accumulated knowledge corrects Spec Kit's blind spots.
- **Key insight:** Spec Kit has never seen your codebase's history. It plans from specs alone. Squad agents know where the dragons live — the fragile modules, the tricky integrations, the decisions made three sprints ago. Without the review ceremony, you're throwing away compound knowledge.
- **Rejected "Spec Kit creates issues directly":** This bypasses the team entirely. You lose the knowledge correction step. Issues would be technically correct but strategically naive.
- **Rejected "hybrid" (Spec Kit creates issues, Lead re-triages):** Creating issues you plan to immediately change is waste. Review *before* creation, not after.
- **Feedback loop design:** After task completion, Squad agents write learnings to history.md. On the next planning cycle, the memory bridge feeds those learnings back into Spec Kit. This is the knowledge flywheel — each iteration produces better plans because agents remember what worked.
