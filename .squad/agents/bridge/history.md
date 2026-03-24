# bridge — History

## Core Context

- **Role:** Lead Orchestrator for squad-speckit-bridge integration project
- **Domain:** Build hook-based integration between Squad (multi-agent orchestrator) and Spec Kit (specification pipeline)
- **Critical Systems:** 
  - Hook scripts (`before-specify.sh`, `after-implement.sh`, `after-tasks.sh`) — executable bits via git
  - CLI naming: `squask` primary alias (replaces `npx squad-speckit-bridge`)
  - Config: `autoCreateIssues` boolean in BridgeConfig.hooks controls automation
  - Demo command: ExecutionReport with success/failure variants, artifact cleanup logic
- **Key Patterns:**
  - Clean Architecture: entity/adapter/port boundaries strictly enforced
  - File permissions: Use `git update-index --chmod=+x` for hook executables
  - After-tasks automation: Issue creation with Squad label, graceful failure on missing config
  - Testing: Hook content validation + permission tests with `deployExecutable()` + cross-hook consistency
- **Status:** v0.3.1 spike complete; team napping after sync flywheel validation

## Learnings

### 2026-03-24: v0.3.1 Spike — Hook Scripts & CLI Polish

**Spike Tasks (T001–T012):**
- Verified baseline build/tests pass; added `autoCreateIssues` config option
- Set executable bits on hook scripts via git; verified permissions propagate to dist/
- Rewrote `after-tasks.sh` to automate issue creation with Squad label if `autoCreateIssues=true`
- Replaced `npx squad-speckit-bridge` with `squask` CLI alias across hook scripts
- Added unit + integration tests validating hook content, permissions, and CLI consistency
- Completed demo command documentation (API reference with schema, exit codes, examples)
- Verified all changes comply with five Clean Architecture constitutional principles

**Key Outcomes:**
- Hook pipeline is now fully automated (task creation → issue creation → Squad routing)
- CLI alias consistency enforced across all hooks
- Demo command fully documented with human + JSON output examples
- All tests passing; hook permissions correctly propagate through build

### 2026-03-24: Team Synthesis — Framework Research Complete

**Simultaneous team execution (background):**
- **Gilfoyle:** Frameworks are complementary (runtime vs planning layers); identified workflow friction points
- **Richard:** Pipeline integration strategy validated; tasks.md is perfect handoff boundary
- **Dinesh:** Technical feasibility confirmed; ~100-150 line bridge script adequate
- **Jared:** State accumulation #1 risk; framework weight must match team size
- **Monica:** Documented SpecKit→Squad handoff process; skill-driven knowledge transfer

**Consolidated Decisions:**
1. Framework Classification: Squad + Spec Kit complementary, not competitive
2. Integration Strategy: Pipeline model (Spec Kit upstream, Squad downstream)
3. Technical Approach: Additive bridge (zero framework modification)
4. Critical Risk: Automatic state pruning required for long-term use
5. Governance: Constitutional layer complements Squad's decision model

**Generic Patterns for Personal Squad:**
- State pruning as framework feature (avoid 475KB+ state files)
- Constitutional governance scales better than distributed decisions
- Progressive GitHub integration (0 to 412 issues based on project type)
- Team-size-driven framework configuration (solo ≠ 12-agent team)

### 2026-03-24: Knowledge Feedback Gap Analysis — Reverse Sync Architecture

**Gap Identified:** `squask sync` implements forward-only flow (tasks.md → Squad memory). No reverse enrichment post-implementation.

**Gilfoyle's Reverse Sync Proposal:**
- Source: Agent histories (`.squad/agents/*/history.md`), decisions.md, orchestration logs
- Target: New `specs/{id}/learnings.md` capturing implementation patterns, decisions, risks
- MVP: Manual ceremony (`squask sync-reverse <spec>` with `--cooldown 0` override)
- Phase 2: Time-gated automatic (24h default)
- Phase 3: Event-driven (on agent inbox entries)

**Critical Risks:**
- Data integrity: duplicates, stale info, circular loops (mitigate with fingerprints, versioning)
- Privacy: secrets, PII in raw histories (mitigate with regex masking, opt-in policy)
- State: timestamp drift, cooldown strictness (mitigate with UTC validation, defensive parsing)

**Architecture:** Entity types (ReverseSyncOptions) → Use case (syncReverse) → Ports (SpecWriter) → Adapters → CLI. Full research in `specs/006-knowledge-feedback-loop/research.md`.

### 2026-03-23: Framework Deep-Dive Summary

**Squad:**
- Multi-agent runtime for GitHub Copilot; persistent memory via `.squad/agents/{name}/history.md`
- Coordinator agent routes all work; Ralph monitors issues; drop-box pattern eliminates write conflicts
- Casting system assigns character names; progressive history summarization at ~12KB

**Spec Kit:**
- Specification-driven pipeline: Constitution → Specify → Plan → Tasks → Implement
- Agent-agnostic (23+ agents); strong template system; extension hooks for lifecycle automation
- No persistent agent memory; constitution serves as governance layer

**Key Insight:** Complementary layers. Squad optimizes for persistent parallel execution + memory; Spec Kit optimizes for structured specification before implementation.

### 2025-07-24: Spec Kit Plan Phase Execution

**Key Insights:**
- Plan phase is where spec meets implementation reality (technology choices, concrete design)
- Constitution as template requires reverse-engineering principles from decisions.md when uncustomized
- Research phase (parallel team work) + plan phase (sequential pipeline) produces dramatically better outcomes
- Data model emerges from spec's Key Entities section; plan adds fields, types, validation
- Contracts are the API surface for CLI tools; JSON output non-negotiable

**Learnings:**
- Progressive summarization strategy needed explicit design (priority → recency → compression)
- Template extraction can be automated (`update-agent-context.sh` parsing plan.md)
- Spec-per-feature + issue-per-task are complementary patterns for different lifecycle stages
