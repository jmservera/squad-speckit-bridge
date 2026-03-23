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
