# Framework Deep-Dive: Squad vs Spec Kit

**Analyst:** Gilfoyle (Research Analyst)
**Date:** 2026-03-23
**Status:** Complete

---

## Part 1: Squad

**Repo:** [bradygaster/squad](https://github.com/bradygaster/squad)
**Language:** TypeScript (monorepo: `@bradygaster/squad-sdk` + `@bradygaster/squad-cli`)
**Maturity:** Alpha (experimental). 1400+ automated tests. Active development.
**Platform:** GitHub Copilot (CLI + VS Code)

---

### 1.1 Architecture Overview

Squad is a multi-agent runtime that creates a persistent AI development team inside your Git repository. The system has three layers:

1. **Coordinator Agent** (`.github/agents/squad.agent.md`) — The single entry point. An ~82KB markdown file that defines all routing logic, response tiers, and agent spawn rules. Runs as a GitHub Copilot agent.

2. **Specialist Agents** (`.squad/agents/{name}/`) — Domain-specific agents (frontend, backend, tester, lead, etc.) each with their own `charter.md` (identity/expertise) and `history.md` (accumulated knowledge).

3. **Background Agents** — Scribe (silent memory manager) and Ralph (work monitor). Fixed names, not subject to casting.

**SDK Structure** (`packages/squad-sdk/src/`):
```
adapter/       — Platform adapters (CLI, VS Code)
agents/        — Agent lifecycle management
build/         — Build system for squad.config.ts
builders/      — Builder pattern APIs
casting/       — Name assignment from fictional universes
client/        — Client abstractions
config/        — Configuration system
coordinator/   — Message routing engine
hooks/         — Pre/post hook pipelines
marketplace/   — Plugin marketplace
ralph/         — Work monitor logic
remote/        — Remote team connections
roles/         — Role definitions
runtime/       — Execution runtime
sharing/       — Export/import
skills/        — Compressed learnings
streams/       — Real-time streaming
tools/         — Custom tool definitions
upstream/      — Upstream Squad sources
utils/         — Shared utilities
```

**File Structure** (`.squad/`):
```
.squad/
├── team.md              # Roster — who's on the team
├── routing.md           # Pattern-matching routing rules
├── decisions.md         # Shared brain — all team decisions
├── ceremonies.md        # Sprint ceremonies config
├── casting/
│   ├── policy.json      # Casting configuration
│   ├── registry.json    # Persistent name→agent mapping
│   └── history.json     # Universe usage history
├── agents/
│   ├── {name}/
│   │   ├── charter.md   # Identity, expertise, voice
│   │   └── history.md   # Accumulated project knowledge
│   └── scribe/
│       └── charter.md   # Silent memory manager
├── skills/              # Compressed learnings (SKILL.md files)
├── identity/
│   ├── now.md           # Current team focus
│   └── wisdom.md        # Reusable patterns
├── decisions/
│   └── inbox/           # Drop-box for agent decision proposals
├── orchestration-log/   # What was spawned, why, what happened
└── log/                 # Full session history (searchable)
```

### 1.2 Core Philosophy

**Mental model: A persistent software team that lives in your repo.**

Squad treats AI agents as team members, not tools. Each member has a name (from a fictional universe — The Wire, Seinfeld, etc.), a specialty, a voice, and accumulated memory. The team gets better over time because knowledge compounds across sessions via `history.md` files.

The fundamental insight: **context isolation scales better than context sharing.** Instead of one agent trying to understand your entire codebase, five agents each get their own 200K token context window focused on their domain. Total reasoning capacity: ~1M tokens across the team.

Everything is in Git. Clone the repo, get the team — with all their knowledge.

### 1.3 Agent Coordination Model

**Coordinator-centric routing.** All user messages flow through the Coordinator, which:

1. **Reads context** — `team.md`, `routing.md`, `casting/registry.json` (in parallel on session start)
2. **Matches routing rules** — Pattern-matches against `routing.md` to identify responsible agent(s)
3. **Selects response tier** — Four tiers based on complexity:
   - **Direct**: Coordinator answers (simple queries)
   - **Lightweight**: One agent, minimal prompt (small tasks)
   - **Standard**: One agent, full context (charter + history + decisions)
   - **Full**: Multiple agents in parallel + Scribe (complex tasks)
4. **Spawns agents** — Uses the `task` tool to spawn agents in separate context windows. Multiple agents run in parallel.
5. **Chains follow-up work** — When agents complete, the Coordinator immediately chains dependent tasks.

**The Drop-Box Pattern:** Agents never write directly to shared files like `decisions.md`. Instead, they write to individual files in `.squad/decisions/inbox/`. The Scribe merges these into the canonical `decisions.md`. This eliminates file conflicts during parallel execution.

**Key coordination mechanisms:**
- `routing.md` — Declarative routing rules (pattern → agent mapping)
- `decisions.md` — Shared brain; every agent reads this before starting
- `team.md` — Roster of active team members
- Scribe — Silent background agent that merges decisions, writes logs, manages Git commits
- Ralph — Work monitor that watches GitHub issues and auto-spawns agents

### 1.4 State Management

**Everything persists as files in `.squad/`, committed to Git.**

| State | File | Mechanism |
|-------|------|-----------|
| Team roster | `team.md` | Coordinator writes on init |
| Agent identity | `agents/{name}/charter.md` | Created once, rarely modified |
| Agent memory | `agents/{name}/history.md` | Append-only; progressive summarization at ~12KB |
| Team decisions | `decisions.md` | Scribe merges from `decisions/inbox/` |
| Decision proposals | `decisions/inbox/{agent}-{slug}.md` | Drop-box pattern; cleared after merge |
| Routing rules | `routing.md` | Updated when team composition changes |
| Casting state | `casting/registry.json` | Persistent name↔agent mapping |
| Session logs | `log/{timestamp}-{topic}.md` | Scribe writes after each session |
| Orchestration logs | `orchestration-log/{timestamp}-{agent}.md` | What was spawned, why, result |
| Skills | `skills/SKILL.md` | Compressed learnings from repeated patterns |

**Git attributes:** Append-only files use `merge=union` to enable clean merges across branches.

**Progressive summarization:** When `history.md` exceeds ~12KB, older entries get summarized. When `decisions.md` exceeds ~20KB, entries older than 30 days are archived to `decisions-archive.md`.

**Ralph's state is session-scoped** — not persisted to disk. He tracks active/idle status, round count, and stats only during the current session.

### 1.5 Strengths

1. **Persistent, learning agents.** Knowledge genuinely compounds. After a few sessions, agents know your conventions, architecture, and preferences. They stop asking questions they've already answered.

2. **True parallel execution.** Multiple agents work simultaneously in separate context windows. ~1M total tokens of reasoning capacity vs. 200K for a single agent.

3. **Git-native state.** Everything is markdown files in `.squad/`. Clone = team transfer. Diffs show what changed. Branch isolation works naturally.

4. **Drop-box pattern.** Elegant solution to the parallel write conflict problem. No locks, no race conditions — just individual files + a merge step.

5. **Casting system.** Names from fictional universes create memorable, consistent identities. Agents feel like team members, not function calls. The naming is deterministic and persistent.

6. **SDK-first path.** TypeScript SDK (`squad-sdk`) provides programmatic control: custom tools, hook pipelines, file-write guards, PII scrubbing, event-driven monitoring.

7. **Ceremonies and governance.** Sprint ceremonies (retros, design reviews), proposal-first workflow, quality gates. Structure that scales with team complexity.

8. **GitHub Issues integration.** Ralph can auto-triage issues, assign them to squad members, and spawn agents to work on them without human intervention.

### 1.6 Weaknesses

1. **Alpha maturity.** APIs and CLI commands may change between releases. The initialization flow has known fragility — race conditions for auto-casting, divergent CLI/extension flows.

2. **Platform lock-in.** Requires GitHub Copilot. No support for Claude Code, Cursor, Gemini, or other AI coding tools. VS Code has limitations (no per-spawn model selection, no SQL tool).

3. **Silent success bug.** ~7-10% of background agent spawns complete work but return no text response. Platform-level issue that Squad works around via filesystem checks.

4. **Cold start problem.** First session is the least capable. Agents haven't accumulated knowledge yet. There's a ramp-up period before the team is effective.

5. **Coordinator bottleneck.** The 82KB `squad.agent.md` file is monolithic. All routing logic, all modes, all rules live in one massive markdown prompt. Changes propagate slowly.

6. **Context window pressure.** While each agent gets 200K tokens, the coordinator's prompt alone consumes ~6.6% of that. Veterans use ~4.5%. Complex projects could still hit limits.

7. **Node.js requirement.** Requires Node.js 20+. Python, Ruby, Go projects still need a Node runtime just for Squad tooling.

8. **Learning curve.** Understanding routing, response tiers, casting, ceremonies, the drop-box pattern, Scribe, Ralph — there's a lot of conceptual overhead before you're productive.

### 1.7 Key Differentiators

- **Persistent named identities** from fictional universes (no other framework does this)
- **Drop-box pattern** for conflict-free parallel writes
- **Progressive summarization** of agent memory (prevents context bloat)
- **Ralph** — autonomous work monitor that can run 24/7 via GitHub Actions cron
- **Ceremonies** — sprint-style rituals (retros, design reviews) baked into the framework
- **Git-native everything** — state is just files; no external database, no service

---

## Part 2: Spec Kit

**Repo:** [github/spec-kit](https://github.com/github/spec-kit)
**Language:** Python (`specify` CLI) + Shell scripts (Bash + PowerShell)
**Maturity:** Early (v0.1.x series). Active development. ~71K stars, 6000+ forks.
**Platform:** Agent-agnostic (23+ AI agents supported)

---

### 2.1 Architecture Overview

Spec Kit is a specification-driven development toolkit. It provides a structured workflow that transforms natural language feature descriptions into executable specifications, implementation plans, and task lists — then hands those to AI coding agents for implementation.

**Core components:**

1. **`specify` CLI** (`src/specify_cli/`) — Python CLI tool that initializes projects, manages extensions, presets, and agent configurations.
   - `__init__.py` (189KB) — Main CLI logic
   - `agents.py` (20KB) — Agent configuration and integration (`AGENT_CONFIG` dict)
   - `extensions.py` (74KB) — Extension system
   - `presets.py` (63KB) — Template customization system

2. **Slash Commands** (`templates/commands/`) — Markdown files with YAML frontmatter that define the SDD workflow steps. Installed into agent-specific directories during `specify init`.

3. **Shell Scripts** (`scripts/bash/` + `scripts/powershell/`) — Cross-platform scripts that slash commands invoke:
   - `create-new-feature.sh` — Creates feature branch, spec directory, spec.md
   - `check-prerequisites.sh` — Validates tool availability
   - `update-agent-context.sh` — Updates agent-specific context files
   - `setup-plan.sh` — Sets up plan directory structure
   - `common.sh` — Shared utilities

4. **Templates** (`templates/`) — Markdown templates for specs, plans, tasks, checklists, agent files

**File Structure** (created by `specify init`):
```
.specify/
├── memory/
│   └── constitution.md    # Project governing principles
├── scripts/               # Bash + PowerShell scripts
├── templates/             # Document templates
├── extensions/            # Installed extensions
├── presets/               # Template customizations
└── overrides/             # Highest-priority template overrides

specs/
├── 001-feature-name/
│   ├── spec.md            # Feature specification
│   ├── plan.md            # Technical implementation plan
│   ├── tasks.md           # Executable task list
│   ├── data-model.md      # Data model (if applicable)
│   ├── contracts/         # API contracts
│   └── research.md        # Research notes
├── 002-another-feature/
│   └── ...

# Agent-specific directories (varies by agent):
.github/agents/            # GitHub Copilot
.claude/commands/           # Claude Code
.gemini/                    # Gemini
# ... etc for 23+ agents
```

### 2.2 Core Philosophy

**Mental model: Specification as the source of truth for AI-driven implementation.**

Spec Kit inverts the typical "vibe coding" approach. Instead of asking an AI to just "build X," you go through a structured refinement pipeline:

1. **Constitution** → Establish project principles (like a team constitution)
2. **Specify** → Define WHAT to build (user stories, acceptance criteria, requirements)
3. **Plan** → Define HOW to build it (tech stack, architecture, data model, contracts)
4. **Tasks** → Break the plan into ordered, parallelizable, independently testable tasks
5. **Implement** → Execute tasks against the spec

The key insight: **AI agents produce better code when given structured specifications rather than vague prompts.** By investing time upfront in specification, you get more predictable, higher-quality output.

Each phase produces markdown artifacts that serve as context for the next phase. The spec drives the plan, the plan drives the tasks, the tasks drive the implementation.

### 2.3 Agent Coordination Model

**Sequential pipeline, not parallel orchestration.** Spec Kit does not coordinate multiple agents simultaneously. Instead:

1. **Single-agent workflow.** At any given time, one AI agent is executing one slash command. The user drives progression through the phases.

2. **Shared context via artifacts.** Agents coordinate implicitly through the specification documents. Each phase reads the output of the previous phase:
   - `/speckit.specify` reads user input → writes `spec.md`
   - `/speckit.plan` reads `spec.md` → writes `plan.md`, `data-model.md`, `contracts/`
   - `/speckit.tasks` reads `plan.md`, `spec.md` → writes `tasks.md`
   - `/speckit.implement` reads `tasks.md` → executes implementation

3. **Agent-agnostic commands.** The same slash commands work across 23+ AI agents (Claude Code, Copilot, Cursor, Gemini, Qwen, Kimi, Mistral, etc.). The `AGENT_CONFIG` dictionary maps each agent to its command directory format and file conventions.

4. **No inter-agent communication.** There's no mechanism for two agents to talk to each other. Coordination happens through the artifact chain.

5. **Human-in-the-loop.** The user decides when to move from specify → plan → tasks → implement. Each transition is a deliberate human action.

### 2.4 State Management

**Specification files are the state.** There's no separate state management layer.

| State | File | Mechanism |
|-------|------|-----------|
| Project principles | `.specify/memory/constitution.md` | Created by `/speckit.constitution` |
| Feature specification | `specs/NNN-feature/spec.md` | Created by `/speckit.specify` |
| Implementation plan | `specs/NNN-feature/plan.md` | Created by `/speckit.plan` |
| Task list | `specs/NNN-feature/tasks.md` | Created by `/speckit.tasks` |
| Data model | `specs/NNN-feature/data-model.md` | Created during planning |
| API contracts | `specs/NNN-feature/contracts/` | Created during planning |
| Research | `specs/NNN-feature/research.md` | Optional research notes |
| Agent context | `CLAUDE.md`, `GEMINI.md`, etc. | Updated by `update-agent-context.sh` |
| Extension state | `.specify/extensions/*/extension.yml` | Extension manifests |

**Git integration:** Each feature gets its own Git branch (`NNN-feature-name`). The `SPECIFY_FEATURE` environment variable can override feature detection for non-Git repos.

**No progressive summarization, no memory compression, no decision archives.** The spec files grow without bounds. Context management is the user's responsibility.

### 2.5 Strengths

1. **Agent-agnostic.** Works with 23+ AI coding agents. Not locked into any single platform. The same workflow works whether you use Copilot, Claude Code, Cursor, or Gemini.

2. **Structured specification.** The five-phase pipeline (constitution → specify → plan → tasks → implement) produces high-quality, predictable output. Specs force you to think before coding.

3. **Template system.** Four-layer template resolution (overrides → presets → extensions → core) provides deep customization without modifying core files.

4. **Extension system.** Modular integration with external tools (Jira, Azure DevOps) via declarative `extension.yml` manifests. Extensions have hooks for workflow phases.

5. **Task decomposition.** The task template is genuinely well-designed: user story grouping, parallel markers `[P]`, dependency ordering, phased execution, checkpoint validation, MVP-first strategy.

6. **Cross-platform scripts.** Both Bash and PowerShell for every operation. Works on Linux, macOS, and Windows.

7. **Low complexity.** The conceptual model is simple: write spec → make plan → generate tasks → implement. No routing rules, no casting, no ceremonies, no background agents.

8. **Strong community traction.** ~71K GitHub stars, 6000+ forks. Significant adoption.

### 2.6 Weaknesses

1. **No multi-agent orchestration.** One agent at a time. No parallel execution across multiple agents. No coordinator routing work to specialists. If you want a "team," you orchestrate it yourself.

2. **No persistent agent memory.** Agents don't learn between sessions. Every invocation starts from scratch (unless you manually update context files). No `history.md`, no accumulated knowledge.

3. **No decision tracking.** No equivalent of Squad's `decisions.md`. Architectural decisions live in spec documents but aren't aggregated or searchable across features.

4. **Reliance on AI interpretation.** The quality of each phase depends entirely on the AI agent's ability to interpret templates and produce structured output. Bad model → bad specs → bad code.

5. **Manual phase progression.** User must manually invoke each slash command. No autonomous mode, no background workers, no continuous pipeline.

6. **Single-file CLI.** The main `__init__.py` is 189KB — a single file containing most of the CLI logic. Not ideal for maintainability.

7. **No real-time coordination.** No streaming, no progress indicators between agents, no mechanism for agents to ask questions or flag blockers during execution.

8. **Spec lifecycle gap.** Current design ties specs to individual features/branches. No support for long-lived specifications that evolve across multiple iterations.

### 2.7 Key Differentiators

- **Agent-agnostic** — 23+ agents supported via `AGENT_CONFIG`; the only framework with this breadth
- **Specification-first philosophy** — Forces structured thinking before implementation
- **Template resolution stack** — Four-layer override system (overrides → presets → extensions → core)
- **Extension system with hooks** — Lifecycle hooks (`before_tasks`, `after_implement`) for workflow integration
- **Python-based CLI** — No Node.js dependency; single `pip install` or `pipx install`
- **Cross-platform scripts** — Bash + PowerShell parity for all operations

---

## Part 3: Comparative Analysis

### Fundamental Design Difference

| Dimension | Squad | Spec Kit |
|-----------|-------|----------|
| **Metaphor** | A team of specialists | A specification pipeline |
| **Philosophy** | Agents are team members with memory | Agents are execution engines given specs |
| **Agent count** | Multiple agents running in parallel | One agent at a time |
| **Memory** | Persistent per-agent (history.md) | None (specs are the context) |
| **Coordination** | Coordinator routes + Scribe merges | User drives sequential phases |
| **State** | Rich (decisions, history, skills, logs) | Minimal (spec/plan/tasks files) |
| **Platform** | GitHub Copilot only | 23+ agents |
| **Language** | TypeScript (Node.js) | Python + Shell |
| **Maturity** | Alpha, experimental | Early, community-adopted |
| **Learning curve** | Steep (many concepts) | Gentle (simple pipeline) |
| **Autonomy** | High (Ralph, auto-triage, continuous) | Low (human-driven progression) |
| **Git usage** | State management layer | Feature branching |

### When to Use Each

**Use Squad when:**
- You want persistent, learning AI agents that get better over time
- You need parallel execution across multiple domain specialists
- You're committed to the GitHub Copilot ecosystem
- Your project is complex enough to justify the overhead of routing, ceremonies, and governance
- You want autonomous operation (Ralph monitoring, auto-triage)

**Use Spec Kit when:**
- You want structured specifications before any code is written
- You need to work across multiple AI agents (not just Copilot)
- You want a simpler conceptual model with lower overhead
- Your workflow is feature-driven with clear spec → plan → implement phases
- You need cross-platform support (Windows + Linux + macOS) without Node.js

### The Gap Between Them

Neither framework fully addresses the complete agentic development workflow:

- **Squad has orchestration but no specification discipline.** It doesn't enforce structured specs before implementation. Agents can "vibe code" just as easily as a human.
- **Spec Kit has specification discipline but no orchestration.** It produces excellent task breakdowns but then hands them to a single agent without parallel execution or persistent memory.

A hybrid approach — Spec Kit's specification pipeline feeding into Squad's multi-agent execution engine — would theoretically combine the best of both. Whether that's practical depends on the interoperability story, which is currently non-existent.

---

*Analysis complete. All findings based on repository source code, documentation, and DeepWiki analysis as of 2026-03-23.*
