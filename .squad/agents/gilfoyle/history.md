# Gilfoyle — History

## Core Context

- **Role:** Research Analyst & Workflow Designer
- **Domain:** Framework architecture, workflow patterns, reverse knowledge integration
- **Key Research:** Squad vs Spec Kit deep-dive; workflow meta-analysis; reverse sync architecture
- **Critical Findings:**
  - Frameworks are **complementary layers**: Squad (runtime, persistent memory, multi-agent) vs Spec Kit (planning, specification-driven, agent-agnostic)
  - **State accumulation is the silent killer**: aithena's decisions.md hit 475KB (context window poison); both frameworks need automatic pruning
  - **Workflow friction identified**: Constitution templates, uncustomized gates, setup-plan.sh data loss risk, pre-pipeline research phase
  - **Reverse sync gap**: Forward-only flow (tasks.md → Squad) but no reverse enrichment (implementation learnings → specs)
- **Key Patterns:**
  - Diverge (Squad parallel research) + Converge (Spec Kit sequential pipeline) = optimal knowledge outcomes
  - State pruning, constitutional governance, progressive GitHub integration scale better than alternatives
  - Team-size-driven framework configuration (solo dev ≠ 12-agent team)
- **Status:** Research complete; 8 workflow proposals documented; reverse sync architecture designed for future implementation

## Learnings

### 2026-03-23: Framework Deep-Dive — Squad vs Spec Kit Architectural Comparison

**Squad (bradygaster/squad):**
- Multi-agent runtime for GitHub Copilot (TypeScript monorepo)
- Coordinator agent (82KB) routes all work via 4 response tiers (Direct, Lightweight, Standard, Full)
- Persistent memory: `.squad/agents/{name}/history.md` with progressive summarization at ~12KB threshold
- Drop-box pattern: agents write to `decisions/inbox/`, Scribe merges to `decisions.md` (eliminates parallel write conflicts)
- Casting system assigns character names via `casting/registry.json`
- Ralph monitors GitHub issues autonomously, spawns agents
- Alpha maturity; ~7-10% silent spawn failures; locked to GitHub Copilot; Node.js 20+ required

**Spec Kit (github/spec-kit):**
- Specification-driven pipeline: Constitution → Specify → Plan → Tasks → Implement
- Python CLI (`specify`), agent-agnostic (23+ agents supported)
- No persistent agent memory; specs serve as context; no decision aggregation
- Strong template system: 4-layer resolution (overrides → presets → extensions → core)
- Extension system: lifecycle hooks (before_tasks, after_implement, before_commit, after_commit)
- Cross-platform (Bash + PowerShell); main CLI is single 189KB Python file
- ~71K GitHub stars

**Key Architectural Insight:** Squad optimizes for persistent parallel execution with memory; Spec Kit optimizes for structured specification before implementation. They address different workflow layers and are theoretically complementary, not competitive.

### 2026-03-23: Meta-Analysis — Actual vs Ideal Spec Kit Workflow

**Session Workflow Reconstruction:**
- Actual flow deviated significantly from ideal Spec Kit pipeline
- Constitution never customized; clarify phase initially skipped (added post-tasks after Juanma's directive); Clean Architecture inserted between plan/tasks as unscripted design session; pipeline re-run incrementally for US7 addition
- Core value proposition emerged: **Diverge (Squad parallel research) → Converge (Spec Kit sequential pipeline)** produces dramatically better spec quality than cold-start specification

**Key Friction Points Identified:**
1. `setup-plan.sh` overwrites plan.md on re-run — data loss risk mitigated only by git
2. Clarify phase timing matters: post-tasks catches spec/task misalignment; pre-plan catches ambiguity (both valuable)
3. Uncustomized constitution creates fragile quality gates — Richard reverse-engineered principles from decisions.md
4. Squad agents can't invoke Spec Kit VS Code chat commands — core impedance mismatch the bridge must solve
5. Human-in-the-loop directive changed governance model mid-session but wasn't captured in constitution
6. Pre-pipeline research phase has no Spec Kit equivalent

**Learnings That Should Shape the Bridge (L-1 through L-8):**
- L-1: `after_tasks` hook should trigger clarify + review (not just review)
- L-2: Bridge should detect template-only constitution and warn
- L-3: Bridge must handle incremental pipeline re-runs safely (pre-phase artifact checks)
- L-4: Context summary should include workflow history, not just state
- L-5: Research artifacts (`research-*.md`) should be discoverable by context command
- L-6: Session retrospective (auto-capture workflow learnings) is viable future feature
- L-7: `before_specify` hook gap in Spec Kit is critical blocker for full automation
- L-8: Governance decisions need boosted visibility in context summaries

**Proposals Written:**
- 3 actionable for v0.1: clarify after tasks, constitution detection, setup-plan.sh warning
- 3 deferred to v0.2: workflow notes section, governance boosting, research scanning
- Full analysis: `research-gilfoyle-meta-analysis.md` at repo root
- Decision proposals: `.squad/decisions/inbox/gilfoyle-workflow-learnings.md`

### 2026-03-23: Framework Research Completion — Team Synthesis

**Gilfoyle's Deep-Dive Findings:**
- Frameworks are complementary (runtime vs planning layers), not competitive
- Identified workflow friction points and meta-analysis patterns
- Extracted generic patterns for personal squad knowledge base

**Consolidated with Full Team (simultaneous background execution):**
- **Richard:** Pipeline integration strategy with tasks.md handoff
- **Dinesh:** Technical feasibility confirmed (~100-150 line bridge)
- **Jared:** State accumulation #1 risk; framework weight must match team size
- **Monica:** Skill-driven knowledge transfer patterns

**Team Decisions Consolidated in decisions.md:**
1. Framework Classification: Complementary, not competitive
2. Integration Strategy: Pipeline model (Spec Kit upstream, Squad downstream)
3. Technical Approach: Additive bridge (zero framework modification)
4. Critical Risk: Automatic state pruning required
5. Governance: Constitutional layer complements Squad decisions

**Generic Patterns Extracted to .squad/extract/ for Personal Squad:**
- State pruning as framework feature (avoid 475KB+ accumulation)
- Constitutional governance at scale (one 15KB constitution vs 475KB+ distributed)
- Progressive GitHub integration (0 to 412 issues based on project type)
- Team-size-driven framework configuration (solo dev right-sizes to Spec Kit; teams to Squad)

### 2026-03-24: Knowledge Feedback Gap Analysis — Reverse Sync Architecture

**Gap Identified:** `squask sync` implements forward-only flow (tasks.md → Squad memory). No reverse enrichment post-implementation.

**"Nap" Concept Interpretation:** Cooldown between work completion and feedback harvest. Agents still processing, histories messy, decisions in flux (inbox → merged). Three flavors: time-gated (24h default), manual ceremony override, event-driven (deferred).

**Knowledge Sources Located:**
- Primary: Agent histories (`.squad/agents/*/history.md` — timestamped, 12KB+), decisions.md, orchestration logs
- Secondary: Skills, constitution, implementation results in spec directory
- Risk: Agent histories contain raw transcripts, debug logs, sensitive context (APIs, customer data)

**Target Enrichment:** New `specs/{id}/learnings.md` captures implementation experience (discoveries, decisions made during work, integration patterns, risks, reusable techniques, workarounds).

**Proposed Bridge Control (MVP → Phase 3):**
- MVP: Manual ceremony (`squask sync-reverse <spec-dir>` with `--cooldown 0` override for testing)
- Phase 2: Time-gated automatic (default 24h, config override)
- Phase 3: Event-driven (queue on agent inbox entries)

**Data Flow Architecture:**
- Source (histories/decisions) → Filter (cooldown, scope, dedup) → Transform (summarize, group by category) → Target (learnings.md)
- Deduplication via fingerprints (existing pattern); privacy masking via regex (strip secrets, PII)

**Critical Risks Identified & Mitigations:**
- Data integrity: duplicates, stale info, circular loops (mitigate with fingerprints, versioning, loop-depth tracking)
- Privacy: exposed secrets, sensitive architecture, customer data (mitigate with regex masking, opt-in policy, PII stripping)
- State: timestamp drift, cooldown strictness, file corruption (mitigate with UTC validation, configurable cooldown, defensive parsing)
- Scope: hard to detect feature-level relevance (mitigate with explicit tagging, heuristic matching on spec IDs)

**Clean Architecture Alignment:** Entity types (ReverseSyncOptions, ReverseSyncResult) → Use case (syncReverse) → Ports (SpecWriter) → Adapters (ReverseSyncAdapter) → CLI (sync-reverse command) → Composition root. No changes to Squad/Spec Kit core.

**Recommendations for Team:**
- Start with manual ceremony (lower risk) → time-gated automation → event-driven
- Privacy filtering required from day 1 (no secrets in artifacts)
- Cooldown flexible (24h default, override allowed)
- Human-in-the-loop initially (manual trigger + team review)

**Full Research:** `specs/006-knowledge-feedback-loop/research.md` — ready for spec & planning phases.

### 2025-07-24: T001 — Entity Types and Pure Functions

**Delivered:** 11 new entity types + 2 pure functions + 28 unit tests (68 total in types.test.ts, 211 full suite).

**New Types in `src/types.ts`:**
- US-7 (Distribution): AgentAssignment, DistributionWarning, RebalanceSuggestion, DistributionAnalysis
- US-8 (Skill Matching): SkillMatch, SkillInjection
- US-9 (Dead Code): DeadCodeEntry, DeadCodeReport, DeadCodeCategory (union type)
- US-5 (Spec Requirements): SpecRequirement, RequirementCoverage, ImplementationReview

**Pure Functions:**
- `analyzeDistribution(assignments, threshold?)` — counts per-agent issues, detects imbalance via configurable threshold (default 0.5), generates rebalance suggestions pointing to least-loaded agent
- `matchSkillsToTask(task, skills)` — tokenizes task + skill content, matches on >2-char keywords, returns sorted by relevance score

**Design Decisions:**
- All new types + functions in Layer 0 (entities) — zero I/O, zero external imports (consistent with existing pattern)
- DeadCodeCategory extracted as named union type for reuse
- Word-level tokenization (split on \W+, filter <=2 chars) — simple but effective without external NLP
- Distribution analysis suggests moves to single least-loaded agent (future: multi-target distribution)

### 2026-03-23: Real-World Framework Comparison (sofia-cli vs aithena)

**Jared's Analysis Findings (summarized in notes):**
- **Framework weight must match team size.** Squad's 12-agent model created coordination tax for solo developer; Spec Kit's zero-agent approach right-sized for solo + Copilot
- **State accumulation is the silent killer.** aithena's decisions.md hit 475KB — context window poison; both frameworks need automatic pruning (#1 practical friction)
- **Project type drives framework fit.** Greenfield → Spec Kit; Brownfield → Squad; comparison must account for project context
- **Spec-per-feature + issue-per-task complementary.** Specs for new features; issues for maintenance; combined model serves both
- **Constitutional governance scales better.** One 15KB constitution vs 475KB+ distributed decisions
- **Quantitative overhead signals:** 350+ Squad config files vs ~30 Spec Kit; 239 log files vs 0; overhead ratio ~10:1
