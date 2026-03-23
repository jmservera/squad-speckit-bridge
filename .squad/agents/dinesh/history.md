# Dinesh — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Integration Engineer
- **Joined:** 2026-03-23T08:50:38.331Z

## Learnings

<!-- Append learnings below -->

### 2026-03-23: Squad vs Spec Kit Technical Compatibility Analysis

- **Squad directory:** `.squad/` with team.md, routing.md, decisions.md, agents/{name}/charter.md+history.md, casting/ (JSON configs), orchestration-log/, log/, skills/, sessions/. Also `.github/agents/squad.agent.md` (81KB coordinator prompt), `.github/copilot-instructions.md`, and multiple `squad-*.yml` workflows.
- **Spec Kit directory:** `.specify/` with memory/constitution.md, scripts/, templates/, init-options.json, extensions/. Also `specs/NNN-feature/` for feature specs. Agent-specific command files in `.github/agents/speckit.*.agent.md` (for Copilot), `.claude/commands/`, `.cursor/commands/`, etc. Supports 25+ AI agents via AGENT_CONFIG dictionary.
- **No directory conflicts:** `.squad/` and `.specify/` are completely independent namespaces.
- **`.github/agents/` shared safely:** Squad writes `squad.agent.md`, Spec Kit writes `speckit.*.agent.md` — different filenames, same directory.
- **One real conflict:** `.github/copilot-instructions.md` is written by both tools. Needs section markers or merge script.
- **Squad state:** decisions.md (merge=union), per-agent history.md (merge=union), drop-box/inbox pattern for parallel writes, orchestration-log (ephemeral).
- **Spec Kit state:** constitution.md (project principles), specs/NNN/spec.md+plan.md+tasks.md (per-feature). No parallel write handling needed (single-agent model).
- **Runtime models are independent:** Squad = live multi-agent orchestrator on Copilot. Spec Kit = CLI scaffolder + shell scripts, agent-agnostic.
- **Natural integration point:** Spec Kit tasks.md → GitHub Issues with `squad` label → Squad's Ralph triage pipeline. Bridge script estimated at ~100-150 lines.
- **GitHub workflows don't conflict:** Squad prefixes all workflows `squad-*`. Spec Kit uses `release.yml`, `stale.yml`, etc. No name collisions.
- **Branch naming differs:** Squad uses `squad/{issue}-{slug}`, Spec Kit uses `NNN-short-name`. Non-conflicting but teams need a convention.

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team findings (simultaneous background execution):**
- Gilfoyle: complementary architectural layers (runtime vs planning)
- Richard: pipeline integration strategy with tasks.md handoff
- Jared: real-world patterns show state accumulation and team-size fit as critical factors

**Technical recommendation confirmed:**
Squad and Spec Kit can coexist safely with:
- Section markers in `.github/copilot-instructions.md`
- ~100-line bridge script (tasks.md → issues → Ralph triage)
- No framework modifications needed (additive approach)

**Implementation roadmap:**
1. Bridge script for tasks.md → Squad workflow
2. Handle copilot-instructions.md merge via markers
3. Define branch naming convention
4. Test with realistic multi-phase workflow
