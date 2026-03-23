# Richard — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Lead
- **Joined:** 2026-03-23T08:50:38.328Z

## Learnings

<!-- Append learnings below -->

### 2025-07-24 — Generating Clean Architecture-Aware Spec Kit Tasks

- **Clean Architecture inverts the natural Spec Kit task ordering.** Spec Kit's template suggests "Models → Services → Endpoints → Integration" which maps cleanly to domain-organized projects. But Clean Architecture demands **Entities → Use Cases → Adapters → Drivers** (innermost first). This means the Foundational phase must contain ALL entity types and port interfaces before any user story work begins — they are the shared inner core, not per-story concerns.
- **Port interfaces belong in Foundational, not in user stories.** The temptation is to define ports as you build each story. But since ports are in the use case layer (innermost after entities), and multiple stories implement the same ports (e.g., SquadStateReader is used by both US2 and US3), they must be defined upfront. This creates a larger Foundational phase but prevents adapter-first development.
- **The Dependency Rule creates natural parallelism.** Because inner layers have zero dependencies on outer layers, entity and port tasks can run in parallel. Use cases for independent stories (US1 and US2) can run in parallel. The constraint is adapters — they depend on both the ports they implement AND the framework libraries they wrap.
- **Reuse across stories is a dependency signal.** When US3 (Design Review) reuses the SquadFileReader adapter from US2 (Memory Bridge), that's a real dependency — US3 can't start adapter work until US2's adapter exists. The tasks must surface this explicitly rather than marking stories as fully independent.
- **Template files are adapters, not entities.** The SKILL.md, extension.yml, and ceremony.md templates are deployment artifacts — they belong in the adapter/framework layer, not in entities. This matters for task ordering: templates can be written in parallel with use cases since they're independent outer-layer concerns.
- **46 tasks across 9 phases is the right granularity.** Each task maps to exactly one file, one layer responsibility, and one testable unit. Finer granularity (splitting types.ts into per-entity files) would create unnecessary coordination overhead. Coarser granularity (combining use case + adapter in one task) would violate the Clean Architecture ordering principle.
- **The composition root (main.ts) is always the last task per story.** It's the only file that knows about both use cases AND adapters — it wires them together via constructor injection. Writing it before both layers exist is impossible. This is a natural consequence of the Dependency Rule.

### 2025-07-24 — Spec Kit Plan Phase Execution

- **The plan phase is where spec meets reality.** The spec deliberately avoids implementation details ("WHAT not HOW"), but the plan phase must make concrete technology choices — TypeScript vs shell, commander vs yargs, vitest vs jest. This is the correct boundary: spec defines capability, plan defines approach.
- **Constitution as template requires judgment.** When the constitution hasn't been customized, you can't mechanically check gates. Instead, derive reasonable principles from the project's established patterns (from decisions.md and prior research). Document what you assumed so future constitution customization can validate or correct.
- **Research phase resolves ambiguity, not implementation.** The one NEEDS CLARIFICATION in the spec (degraded mode UX) was genuinely a product decision. Research resolved it with "silent skip + warning" — the right default for a developer tool. The temptation to over-research technology choices is real but unnecessary when the team already has strong opinions (we chose TypeScript in our earlier research).
- **Data model emerges naturally from the spec's Key Entities section.** The spec already defined Context Summary, Design Review Record, Bridge Configuration, and Bridge Skill. The plan's data-model.md adds fields, types, validation rules, and relationships — the implementation-specific detail the spec correctly omitted.
- **Contracts are the bridge's API surface.** For a CLI tool, the contracts are command definitions with exact flags, output formats, and exit codes. JSON output mode is non-negotiable for machine consumption. Human-readable output is the default for developer experience.
- **Progressive summarization strategy needed explicit design.** The spec said "enforce a configurable maximum size" but didn't specify HOW to prioritize when content exceeds the limit. The three-tier approach (priority ordering → recency bias → content compression) mirrors how humans naturally triage information.
- **The `update-agent-context.sh` script auto-extracts tech stack from plan.md.** It parsed the Technical Context section and updated `.github/agents/copilot-instructions.md` with TypeScript/Node.js/gray-matter/commander context. This is the Spec Kit pipeline working as designed — plan artifacts feed agent awareness.

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

### 2025-07-24 — Writing a Spec Kit Specification (specify workflow)

- **WHAT not HOW is harder than it sounds.** The biggest discipline in Spec Kit's specify phase is resisting implementation details. Every instinct says "~150 LOC shell script" or "JSON output format" — but those are planning/implementation decisions, not specification. The spec describes *capabilities and behaviors*, not technology choices.
- **User stories as independently testable slices.** Spec Kit wants each story to be a viable MVP on its own. This forced better decomposition — e.g., "installation" is P1 because nothing else works without it, and it's independently valuable even without automation hooks.
- **Progressive summarization is a spec-level concern.** The context size limit (FR-009) and progressive summarization (FR-017) are functional requirements, not implementation details. They describe *what the system must do*, leaving *how* to the plan phase.
- **Limit NEEDS CLARIFICATION to genuine ambiguity.** The 3-max rule is good discipline. Most "unclear" things have reasonable defaults. Only the degraded-mode UX question (silent skip vs. explicit confirmation) genuinely needs product owner input — it's a scope/UX decision with no obvious default.
- **Edge cases are where the spec earns its keep.** The most valuable part of the spec isn't the happy path — it's the edge cases (governance contradictions, framework removal, malformed inputs). These are the scenarios that would bite during implementation without upfront thinking.
- **Checklist as living validation.** The quality checklist isn't just a checkbox exercise — it's a forcing function that catches spec drift. The "no implementation details" check caught several near-misses during drafting.

### 2025-07-25 — Spec Kit Clarify Phase (Post-Tasks, Auto-Resolve)

- **The highest-impact ambiguity was the simplest to resolve.** FR-020's degraded mode question was explicitly marked NEEDS CLARIFICATION — it was the only formal marker. The answer (silent skip + stderr warning) was obvious from the acceptance scenarios (US1 scenarios 2-3 already describe partial installs). The lesson: if the spec's own user stories already imply the answer, the question is about making implicit behavior explicit, not about making a new decision.
- **Terminology drift is real and insidious.** "Context summary", "context document", and "context summary document" were used interchangeably 9+ times across the spec. None were wrong, but inconsistency creates confusion during implementation (what's the file called? what's the entity called?). Normalizing to "context summary" aligns with the `ContextSummary` entity name — code and spec now speak the same language.
- **The Design Review Record lifecycle was a genuine gap.** The spec described outcomes ("completes with approval", "completes with requested changes") without defining the state machine. Three states (`pending`, `approved`, `changes_requested`) were sufficient — a fourth (`in_progress`) was rejected as unnecessary for a one-shot evaluation. This matters for T005 (entity type definition) and T028 (review use case).
- **Observability is always underspecified in CLI tools.** The spec had `--json` and `--quiet` but no diagnostic output for debugging. Adding `--verbose` (FR-021) is a low-cost, high-value addition that prevents "why did the bridge skip my decisions.md?" confusion. Tasks T019 and T042 need updating to include this flag.
- **Post-tasks clarification catches spec/task misalignment.** Running clarify AFTER tasks revealed that T019 (CLI entry point) doesn't list `--verbose` as a global option, and T005 (entity types) doesn't enumerate the `approvalStatus` values. These are low-risk gaps (implementers can infer) but demonstrate that clarification after task decomposition surfaces different issues than clarification before planning.

### 2026-03-23 — Re-running the Spec Kit Pipeline with Incremental Changes

- **setup-plan.sh overwrites plan.md with a template.** The script is designed for initial plan creation, not incremental re-runs. When re-running the pipeline on an existing spec, run setup-plan.sh for path discovery but immediately restore plan.md from git if it gets overwritten. Use the JSON output for paths only.
- **Incremental story addition is surgically precise.** Adding US7 to an existing spec with 6 stories required updates in 4 exact locations: user stories section, functional requirements, success criteria, and clarifications. The rest of the spec stays untouched. Same pattern for tasks.md — new phase inserted, dependency diagram updated, implementation strategy extended.
- **The clarify phase catches cross-reference errors introduced by new content.** US7's acceptance scenario 2 referenced a "sync" command that doesn't exist in the CLI contracts. This kind of terminology drift is exactly what the clarify scan is designed to catch — errors introduced during content addition, not during initial drafting.
- **Task numbering must be contiguous and non-conflicting.** The existing tasks went T001–T046. Adding US7 required T047–T051. The phase numbering also shifts — Phase 9 (formerly Polish) becomes Phase 10 to accommodate the new US7 phase at Phase 9. This cascading renumber is the price of insertion-ordered task IDs.
- **FR clarifications should be precise, not aspirational.** "Runnable code examples" (FR-024) was vague for static docs. Clarifying to "copy-pasteable shell command examples with expected output" makes the requirement testable and unambiguous. Always ask: can an implementer verify this requirement passed?
