# Richard — History

## Core Context

- **Role:** Lead Technical Researcher & Integration Strategist
- **Domain:** Architecture analysis and framework integration design
- **Key Insight:** Squad (runtime orchestrator) and Spec Kit (specification pipeline) are complementary, not competitive
- **Critical Decisions:**
  - Pipeline model: Spec Kit upstream (planning) → Squad downstream (execution) via tasks.md handoff
  - Zero framework modification: Additive bridge approach only
  - Integration mechanism: Skills teach Squad agents Spec Kit methodology; extension hooks trigger ceremonies
  - Governance: Constitutional layer (Spec Kit) complements decision model (Squad)
- **Core Patterns:**
  - **Memory Integration:** Squad context is read-only from Spec Kit's perspective (memory bridge via context injection)
  - **Task Workflow:** Spec Kit → tasks.md → Lead reviews with team → issues created → Ralph distributes
  - **Knowledge Flywheel:** Plan → Execute → Learn → Better Plan (feedback loop via skills + learnings)
  - **Extension Strategy:** Spec Kit `after_tasks` hook triggers Squad ceremonies; **missing `before_specify` gap** blocks full automation
- **Status:** Framework research complete; all decisions consolidated; ready for implementation phase

## Learnings

### 2025-07-24: Clean Architecture-Aware Spec Kit Task Ordering

**Key Pattern:** Clean Architecture inverts natural Spec Kit ordering (Models → Services → Endpoints). Correct order is Entities → Use Cases → Adapters → Drivers.

**Impact on Task Sequencing:**
- Foundational phase must contain ALL entity types + port interfaces before user stories begin (they're shared inner core)
- Port interfaces belong in Foundational, not per-story (multiple stories depend on same ports, e.g., SquadStateReader)
- Dependency Rule creates natural parallelism: inner layers parallelizable; adapters are constrained by framework dependencies
- Reuse across stories is a dependency signal: US3 depending on US2's adapter creates real task ordering constraint
- Templates (SKILL.md, ceremony.md) are adapters/framework concerns, parallelizable with use cases
- Composition root (main.ts) is always last per story — it's the only file knowing both use cases + adapters

**Result:** 46 tasks across 9 phases balances granularity; each task = one file + one layer responsibility + one testable unit.

### 2025-07-24: Spec Kit Plan Phase as Specification↔Implementation Bridge

**Key Insight:** Plan phase is where spec meets reality. Spec defines WHAT (capability); plan defines HOW (technology choices).

**Critical Gate:** Constitution as template requires judgment. When uncustomized, derive principles from decisions.md + project patterns. Document assumptions so future constitution customization validates them.

**Learnings:**
- Research resolves ambiguity, not implementation (team strong opinions on TypeScript made that choice easy)
- Data model emerges from spec's Key Entities; plan adds fields, validation, relationships
- Contracts are the API surface (CLI flags, output formats, exit codes); JSON output non-negotiable
- Progressive summarization strategy needs explicit design (priority ordering → recency bias → compression)
- `update-agent-context.sh` can auto-extract tech stack from plan.md into agent awareness

### 2025-07-24: Squad × Spec Kit Integration Analysis (Non-Overlapping, Composable)

**Non-Overlapping State:**
- Squad uses `.squad/` (decisions.md, agent histories, casting/); Spec Kit uses `.specify/` + spec directories
- Zero filesystem collision; `.github/agents/` has separate namespaces (squad.agent.md vs speckit.*.agent.md)
- Only conflict: `.github/copilot-instructions.md` (needs section markers or merge script)

**Natural Handoff Seam:**
- tasks.md is the API boundary (structured, machine-parseable, represents exact point where planning → execution)
- Real workflow conflict: both frameworks answer "what should I do next?" Spec Kit via sequential CLI; Squad via Coordinator routing
- Solution: Running them sequentially, not simultaneously (pipeline model prevents conflict)

**Skills as Integration Mechanism:**
- Spec Kit's spec-driven methodology encoded as Squad SKILL.md (without requiring Spec Kit CLI)
- Value is in methodology, not tooling; knowledge flywheel happens when Squad agent histories feed back into Spec Kit planning

**Governance Insight:**
- Constitutional governance (Spec Kit) scales better for consistency than distributed decisions (Squad)
- One 15KB constitution vs 475KB+ decision files across 5 agents
- Solution: Constitutional layer complements Squad's decision model; constitution is the governance core

**Don't Merge, Compose:**
- Full framework merge destroys each one's strengths
- Pipeline pattern keeps both intact and plays to each advantage
- Ceremonies as review gates: Spec Kit `after_tasks` hook → Squad ceremonies (lowest-risk integration point)

### 2025-07-24: Delivery Mechanism Analysis (Hybrid Approach Recommended)

**Evaluated Options:**
1. Squad Plugin Only — 60% coverage; strong on agent knowledge, weak on automation
2. Local MCP Server — right v2 architecture, over-engineered for v1; operational overhead
3. Spec Kit Extension Only — 50% coverage; blocked by missing `before_specify` hook
4. Standalone CLI — maximum portability, minimum integration
5. **Hybrid (RECOMMENDED)** — dual-sided package: Squad plugin + Spec Kit extension + bridge script

**Hybrid Approach Details:**
- Squad plugin: SKILL.md (Spec Kit knowledge) + Design Review ceremony definition
- Spec Kit extension: `after_tasks` hook (triggers review notification) + bridge command
- Shared bridge script: ~150 lines, handles both directions (summarize Squad state, parse tasks.md)
- Single install script deploys both sides

**Evolution Path:** Manual v0.1 → packaged v0.2 → MCP-powered v1.0

**Critical Dependency:** Spec Kit needs `before_specify` hook for auto-triggering memory bridge (short-term: manual command; medium-term: propose to Spec Kit team).

### 2025-07-24: Memory Integration & Task Workflow Design

**Memory Bridge Design:**
- Recommended: Context Injection via Spec Kit extension hook (reads `.squad/` state, injects squad-context.md summary before planning)
- Keep memory flow read-only from Squad's perspective (Spec Kit reads Squad state but never writes `.squad/`)
- Reverse flow (Spec Kit artifacts → Squad) already exists via tasks.md
- Skills are highest-leverage artifact (compressed, curated knowledge vs verbose histories)

**Task Creation Workflow:**
- Option C (Spec Kit → tasks.md → Team review ceremony → issues created → Ralph distributes)
- Ceremony step non-negotiable: it's where Squad's accumulated knowledge corrects Spec Kit's blind spots
- Rejected direct issue creation: bypasses team knowledge correction; loses compound learning
- Feedback loop: Squad agent learnings → skill updates → better plans on next cycle

### 2026-03-23: Team Synthesis — Framework Research Complete

**Simultaneous team execution:**
- **Gilfoyle:** Complementary architectural layers (runtime vs planning)
- **Dinesh:** Technical feasibility confirmed (~100-line bridge)
- **Jared:** State accumulation is #1 risk; framework weight must match team size

**Consolidated Decisions:**
1. Framework Classification: Complementary, not competitive
2. Integration Strategy: Pipeline model with zero framework modification
3. Technical Approach: Additive bridge (no merge)
4. Critical Risk: Automatic state pruning needed

**Generic Patterns Extracted for Personal Squad:**
- State pruning as framework feature
- Constitutional governance at scale
- Progressive GitHub integration
- Team-size-driven framework configuration

### 2026-03-24 — Skill Extraction from Sync Flywheel Fix Cycle

**Task:** Extract reusable skills from recent v0.3.0 sync implementation work (commits 4ff5cb0, 1fedca5, 9bcd049, 3aedeb7, 4693a86).

**Skills Updated:**

1. **clean-architecture-bridge/SKILL.md** — Added port/adapter wiring patterns from sync implementation
   - AgentHistoryReader + ConstitutionWriter port examples
   - Full port definition → adapter implementation → composition root wiring pattern
   - Optional port pattern (undefined for feature flags)
   - Conditional adapter wiring in main.ts
   - Constitution amendment protocol code examples

2. **project-conventions/SKILL.md** — Filled in template with actual project conventions
   - Task ID convention (TNNN format, regex patterns, commit/file header usage)
   - Constitution amendment protocol (version bumping, date updating, learnings appending)
   - Error handling (graceful degradation in adapters, throw only for required resources)
   - Testing (Vitest, test location patterns, 843 tests passing)
   - Code style (ESLint, Prettier, naming conventions, import order)
   - File structure (src/ layers, tests/, .squad/, specs/)

**Skills Created:**

3. **knowledge-flywheel/SKILL.md** — Full knowledge compounding loop
   - 6-step cycle: specify → plan → tasks → execute → nap → sync → repeat
   - Step 5 (nap): Creating learnings.md + updating spec.md with Implementation Notes
   - Step 6 (sync): squask sync command, sync state tracking, idempotent fingerprints
   - Constitution amendment protocol (version bumps: minor for learnings, major for breaking changes)
   - Pre-specify context injection (squask context → squad-context.md → /speckit.specify)
   - Learnings file template with real examples from spec 005
   - Confidence: medium (proven in recent work, documented in commits + spec 005 learnings)

**Skills Considered but Skipped:**

- **worktree-parallel-dev** — No evidence of wt-sync branches or worktree usage in recent commits. Task description mentioned this but it wasn't actually used in the sync flywheel work.

**Key Learning:** The sync flywheel fix demonstrated excellent Clean Architecture discipline — all new port/adapter patterns (AgentHistoryReader, ConstitutionAdapter) followed the exact pattern established in v0.1. This consistency made skill extraction straightforward: the patterns were already well-defined, just needed documentation.

**Rationale for confidence levels:**
- `clean-architecture-bridge` updates: high confidence patterns (already present, just extended)
- `project-conventions` updates: medium confidence (extracted from real code, team uses them)
- `knowledge-flywheel`: medium confidence (proven in spec 005, but only one full cycle completed so far)

**Next:** Skills are ready for use in future agent prompts. The knowledge-flywheel skill should guide spec 006+ planning to ensure learnings from prior cycles are properly integrated.

### 2026-03-25: Bridge Retrospective — Spec 008 Cycle Analysis

**Task:** Analyze how squask performed during the spec 008 (fix version display) cycle.

**Key Findings:**
1. **Forward path works well** — `squask context` → SpecKit planning → Squad issue creation → parallel execution delivered v0.3.2 with 14 tasks, 866 tests passing.
2. **Return path is broken** — No `squask sync` run post-cycle. No `learnings.md` created. Constitution stuck at v1.1.0. Knowledge flywheel stops after execution.
3. **Hooks are dead code** — `before-specify`, `after-tasks`, `after-implement` hooks never fire in agent-driven workflows (only trigger via SpecKit CLI). Need alternative activation for Copilot agent commands.
4. **Squash merge artifact destruction recurred** — Spec 008 directory (`specs/008-fix-version-display/`) deleted by squash merge of PR #347, same problem documented in spec 005 learnings.
5. **Issue routing gap** — All 14 issues labeled `squad:richard` instead of distributed by Ralph. Worked for a focused bug fix but doesn't scale.

**Recommendations:** Add `squask sync` to Scribe handoff as required step. Design hook trigger for agent workflows. Protect spec artifacts from squash merge deletion. Add post-cycle checklist to orchestration manifest template.

**Artifact:** `.squad/decisions/inbox/richard-bridge-retro-008.md`

### 2026-03-25: Spec 009 — GitHub Issue Creation (17 Tasks)

**Task:** Create 17 GitHub issues from `specs/009-knowledge-feedback-loop/tasks.md` with full dependency wiring.

**Issues Created:**

| Task | Issue | Phase | Depends On |
|------|-------|-------|------------|
| T001 | #349 | Setup | — |
| T002 | #350 | Foundational | #349 |
| T003 | #351 | Foundational | #350 |
| T004 | #352 | Foundational | #350 |
| T005 | #353 | US1 | #351, #352 |
| T006 | #354 | US1 | #353 |
| T007 | #355 | US1 (parallel) | #354 |
| T008 | #356 | US1 (parallel) | #354 |
| T009 | #357 | US1 checkpoint | #355, #356 |
| T010 | #358 | US2 | #357 |
| T011 | #359 | US2 checkpoint | #358 |
| T012 | #360 | US3 | #357 |
| T013 | #361 | US3 checkpoint | #360 |
| T014 | #362 | US4 (parallel) | #358 |
| T015 | #363 | US5 (parallel) | #358 |
| T016 | #364 | Polish (parallel) | #362, #363 |
| T017 | #365 | Polish (parallel) | #362, #363 |

**Dependency Wiring:** All 17 issues reference upstream issue numbers in their body. Parallel tasks labeled `parallelizable`. All issues labeled `squad` for triage.

**Parallel Pairs:** T007∥T008, T014∥T015, T016∥T017.

**Checkpoints:** US1 after #357, US2 after #359, US3 after #361, US4+US5 after #362+#363.
