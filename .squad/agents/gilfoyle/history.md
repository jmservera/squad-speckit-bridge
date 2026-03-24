# Gilfoyle — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Research Analyst
- **Joined:** 2026-03-23T08:50:38.330Z

## Learnings

<!-- Append learnings below -->

### 2026-03-23: Framework Deep-Dive — Squad vs Spec Kit

**Squad (bradygaster/squad):**
- Multi-agent runtime for GitHub Copilot. TypeScript monorepo (squad-sdk + squad-cli). Alpha maturity.
- Coordinator agent (82KB `.github/agents/squad.agent.md`) routes all work. Four response tiers: Direct, Lightweight, Standard, Full.
- Agents have persistent memory via `.squad/agents/{name}/history.md`. Progressive summarization at ~12KB.
- Drop-box pattern: agents write to `decisions/inbox/`, Scribe merges to `decisions.md`. Eliminates parallel write conflicts.
- Casting system assigns names from 31 fictional universes. Persistent via `casting/registry.json`.
- Ralph = autonomous work monitor. Watches GitHub issues, spawns agents. Can run via cron in GitHub Actions.
- Key files: `team.md`, `routing.md`, `decisions.md`, `ceremonies.md`, agent `charter.md`/`history.md`.
- Locked to GitHub Copilot. Node.js 20+ required. ~7-10% silent success bug rate on agent spawns.

**Spec Kit (github/spec-kit):**
- Specification-driven development toolkit. Python CLI (`specify`). Agent-agnostic (23+ agents).
- Five-phase pipeline: Constitution → Specify → Plan → Tasks → Implement. Each phase produces markdown artifacts.
- No multi-agent orchestration. Single agent at a time. Human drives phase transitions.
- No persistent agent memory. Specs serve as context. No decision tracking aggregation.
- Strong template system: 4-layer resolution (overrides → presets → extensions → core).
- Extension system with lifecycle hooks (`before_tasks`, `after_implement`). Modular via `extension.yml` manifests.
- Key files: `specs/NNN-feature/spec.md`, `plan.md`, `tasks.md`, `.specify/memory/constitution.md`.
- ~71K stars. Cross-platform (Bash + PowerShell). Main CLI is a single 189KB Python file.

**Key architectural insight:** Squad optimizes for persistent parallel execution with memory; Spec Kit optimizes for structured specification before implementation. They address different parts of the agentic development workflow and are theoretically complementary.

### 2026-03-23: Team Synthesis — Framework Research Complete

**Simultaneous completion (background mode):**
- Richard proposed pipeline integration with tasks.md handoff
- Dinesh confirmed technical feasibility (~100-line bridge)
- Jared identified state accumulation as #1 risk factor

**Key team decisions recorded in decisions.md:**
1. Framework classification: complementary, not competitive
2. Integration strategy: pipeline model with zero framework modification
3. Technical approach: additive bridge (no merge)
4. Critical risk: automatic state pruning needed

**Generic patterns extracted to .squad/extract/ for personal squad:**
- State pruning as framework feature
- Constitutional governance at scale
- Progressive GitHub integration
- Team-size-driven framework configuration

### 2026-03-23: Meta-Analysis — Using Spec Kit to Design the Bridge

**Session workflow reconstruction:**
- Actual flow deviated significantly from ideal Spec Kit pipeline. Constitution was never customized. Clarify phase was initially skipped (added post-tasks after Juanma's directive). Clean Architecture was inserted between plan and tasks as an unscripted design session. Pipeline was re-run incrementally for US7 addition.
- The pattern **diverge (Squad parallel research) → converge (Spec Kit sequential pipeline)** emerged as the core value proposition. Four agents doing simultaneous research produced dramatically better spec quality than cold-start specification.

**Key friction points identified:**
1. `setup-plan.sh` overwrites plan.md on re-run — data loss risk mitigated only by git.
2. Clarify phase timing matters: post-tasks catches spec/task misalignment, pre-plan catches ambiguity. Both have value.
3. Uncustomized constitution creates fragile quality gates — Richard had to reverse-engineer principles from decisions.md.
4. Squad agents can't invoke Spec Kit VS Code chat commands — the core impedance mismatch the bridge must solve.
5. Human-in-the-loop directive changed governance model mid-session but wasn't captured in constitution.
6. Pre-pipeline research phase has no Spec Kit equivalent.

**Learnings that should shape the bridge:**
- L-1: `after_tasks` hook should trigger clarify + review (not just review).
- L-2: Bridge should detect template-only constitution and warn.
- L-3: Bridge must handle incremental pipeline re-runs safely (pre-phase artifact checks).
- L-4: Context summary should include workflow history, not just state.
- L-5: Research artifacts (`research-*.md`) should be discoverable by context command.
- L-6: Session retrospective (auto-capture workflow learnings) is a viable future feature (US8).
- L-7: `before_specify` hook gap in Spec Kit is the critical blocker for full automation.
- L-8: Governance decisions need boosted visibility in context summaries.

**Proposals written:**
- 3 actionable for v0.1 (clarify after tasks, constitution detection, setup-plan.sh warning)
- 3 deferred to v0.2 (workflow notes section, governance boosting, research scanning)
- Full analysis: `research-gilfoyle-meta-analysis.md` at repo root
- Decision proposals: `.squad/decisions/inbox/gilfoyle-workflow-learnings.md`

### 2025-07-24: T001 — Entity Types and Pure Functions (#256)

**Delivered:** 11 new entity types + 2 pure functions + 28 new unit tests (68 total in types.test.ts, 211 full suite).

**New types added to `src/types.ts`:**
- US-7 (Distribution): `AgentAssignment`, `DistributionWarning`, `RebalanceSuggestion`, `DistributionAnalysis`
- US-8 (Skill Matching): `SkillMatch`, `SkillInjection`
- US-9 (Dead Code): `DeadCodeEntry`, `DeadCodeReport`, `DeadCodeCategory` (union type)
- US-5 (Spec Requirements): `SpecRequirement`, `RequirementCoverage`, `ImplementationReview`

**Pure functions:**
- `analyzeDistribution(assignments, threshold?)` — counts per-agent issues, detects imbalance via configurable threshold (default 0.5), generates rebalance suggestions pointing to least-loaded agent.
- `matchSkillsToTask(task, skills)` — tokenizes task title+description and skill content, matches on >2-char keywords, returns sorted by relevance score.

**Design decisions:**
- Kept all new types and functions in Layer 0 (entities) — zero I/O, zero external imports. Matches existing pattern.
- `DeadCodeCategory` extracted as a named union type for reuse.
- `matchSkillsToTask` uses word-level tokenization (split on `\W+`, filter <=2 chars) — simple but effective for keyword matching without external NLP deps.
- `analyzeDistribution` suggests moves to the single least-loaded agent. Future improvement could distribute across multiple targets.
