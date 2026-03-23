# Technical Compatibility Analysis: Squad vs Spec Kit

**Author:** Dinesh (Integration Engineer)
**Date:** 2026-03-23
**Status:** Complete

---

## Executive Summary

Squad and Spec Kit are architecturally complementary rather than competitive. They occupy different layers of the development lifecycle: Spec Kit handles **specification → plan → tasks** (pre-implementation), while Squad handles **team orchestration → execution → delivery** (implementation and beyond). They can coexist in the same repository with one critical conflict point in `.github/agents/` that requires a straightforward merge strategy.

---

## 1. File System Layout Comparison

### Squad Directory Structure
```
.squad/                              # Team orchestration root
├── team.md                          # Roster (## Members header required)
├── routing.md                       # Work routing rules
├── decisions.md                     # Append-only shared decision log
├── ceremonies.md                    # Sprint ceremonies config
├── decisions/inbox/                 # Drop-box for parallel decision writes
├── casting/
│   ├── policy.json                  # Universe theme, agent count
│   ├── registry.json                # Persistent name→role mapping
│   └── history.json                 # Universe usage history
├── agents/{name}/
│   ├── charter.md                   # Agent identity, expertise, voice
│   └── history.md                   # Project-specific learnings
├── agents/scribe/charter.md         # Silent memory manager
├── skills/{name}/SKILL.md           # Compressed reusable learnings
├── identity/
│   ├── now.md                       # Current team focus
│   └── wisdom.md                    # Reusable patterns
├── orchestration-log/               # Per-spawn timestamped logs
├── log/                             # Session history archive
├── plugins/                         # Plugin configuration
└── sessions/                        # Crash recovery state
```

Additionally uses:
- `.github/agents/squad.agent.md` — Coordinator prompt (81KB)
- `.github/copilot-instructions.md` — @copilot coding agent context
- `.github/workflows/sync-squad-labels.yml`, `squad-triage.yml`, `squad-heartbeat.yml`, etc.
- `.gitattributes` entries for `merge=union` on decisions.md and history.md files
- `squad.config.ts` (optional SDK-first config)

### Spec Kit Directory Structure
```
.specify/                            # Spec Kit internal root
├── memory/constitution.md           # Project governing principles
├── scripts/
│   ├── check-prerequisites.sh       # Prerequisite checker
│   ├── common.sh                    # Shared utilities
│   ├── create-new-feature.sh        # Feature scaffolding
│   ├── setup-plan.sh                # Plan setup
│   └── update-claude-md.sh          # Agent context updater
├── templates/
│   ├── plan-template.md             # Plan template
│   ├── spec-template.md             # Spec template
│   └── tasks-template.md            # Tasks template
├── init-options.json                # CLI init options persistence
└── extensions/                      # Extension system
    ├── .registry                    # Installed extensions metadata
    ├── .cache/                      # Catalog cache
    └── {ext-name}/                  # Per-extension config

specs/                               # Feature specifications
└── NNN-feature-name/
    ├── spec.md                      # Feature specification
    ├── plan.md                      # Implementation plan
    ├── tasks.md                     # Actionable task list
    ├── data-model.md                # Data model
    ├── research.md                  # Research notes
    ├── quickstart.md                # Quick start guide
    └── contracts/                   # API specs, SignalR specs
```

Agent-specific directories (varies by agent choice):
- `.github/agents/` — For Copilot: `speckit.*.agent.md` files
- `.github/prompts/` — For Copilot: `speckit.*.prompt.md` files
- `.claude/commands/` — For Claude Code
- `.cursor/commands/` — For Cursor
- `.windsurf/workflows/` — For Windsurf
- Plus 20+ other agent directory patterns

### Overlap Analysis

| Path | Squad | Spec Kit | Conflict? |
|------|-------|----------|-----------|
| `.squad/` | ✅ Primary root | ❌ Not used | **No conflict** |
| `.specify/` | ❌ Not used | ✅ Primary root | **No conflict** |
| `specs/` | ❌ Not used | ✅ Feature specs | **No conflict** |
| `.github/agents/` | `squad.agent.md` | `speckit.*.agent.md` | **⚠️ Shared directory, different files** |
| `.github/copilot-instructions.md` | ✅ @copilot context | ❌ Not directly used | **No conflict** |
| `.github/prompts/` | ❌ Not used | `speckit.*.prompt.md` | **No conflict** |
| `.github/workflows/` | `squad-*.yml`, `sync-squad-labels.yml` | `release.yml`, `stale.yml`, etc. | **⚠️ Shared directory, different files** |
| `.gitattributes` | `merge=union` entries | ❌ Minimal | **No conflict** |
| `.vscode/settings.json` | ❌ Not typically | ✅ Copilot config | **No conflict** |

**Verdict: They CAN coexist.** The primary directories (`.squad/` vs `.specify/`) are completely separate. The only shared namespace is `.github/agents/` where both write different `.agent.md` files — Squad writes `squad.agent.md` and Spec Kit writes `speckit.*.agent.md`. These filenames don't collide.

---

## 2. Agent Identity & Configuration

### Squad: Charter-Based Identity
- **Format:** Markdown (`charter.md`) per agent in `.squad/agents/{name}/`
- **Content:** Name, role, expertise, voice/personality, boundaries, authorized files
- **Naming:** Casting system assigns themed names from a "universe" (e.g., Apollo 13 callsigns)
- **Config:** `casting/policy.json` (JSON), `casting/registry.json` (JSON), `squad.config.ts` (TypeScript)
- **Identity persistence:** Registry ensures consistent names across sessions

### Spec Kit: AGENT_CONFIG Dictionary
- **Format:** Python dictionary in `src/specify_cli/__init__.py` (internal, not user-facing files)
- **Content:** Agent metadata (name, folder, commands_subdir, install_url, requires_cli)
- **Naming:** Uses actual CLI executable names as canonical identifiers
- **Config:** `init-options.json` (JSON) persists init choices
- **Identity is implicit:** No per-agent personality or expertise definition — the agent IS the external tool (Claude, Copilot, Cursor, etc.)

### Technical Conflicts

**None.** These are fundamentally different identity models:
- Squad defines **virtual team members** with personas, run within a single AI platform (Copilot)
- Spec Kit defines **which external AI tool to target** for command file generation

They don't compete. A Squad agent could read Spec Kit specifications as input context. A Spec Kit command could invoke Squad's coordinator.

---

## 3. State & Memory Systems

### Squad State Architecture
| Artifact | Scope | Format | Persistence | Merge Strategy |
|----------|-------|--------|-------------|----------------|
| `decisions.md` | Team-wide shared brain | Markdown (append-only) | Git-committed | `merge=union` |
| `agents/{name}/history.md` | Per-agent learnings | Markdown (append-only) | Git-committed | `merge=union` |
| `decisions/inbox/` | Parallel write buffer | Markdown files | Ephemeral (Scribe merges) | N/A |
| `orchestration-log/` | Per-spawn execution log | Markdown (timestamped) | `.gitignore`d (ephemeral) | N/A |
| `identity/now.md` | Current focus | Markdown | Git-committed | Manual |
| `identity/wisdom.md` | Reusable patterns | Markdown | Git-committed | Manual |
| `sessions/` | Crash recovery | Serialized state | Auto-cleanup (30 days) | N/A |
| `skills/*/SKILL.md` | Reusable knowledge | Markdown | Git-committed | Manual |

### Spec Kit State Architecture
| Artifact | Scope | Format | Persistence | Merge Strategy |
|----------|-------|--------|-------------|----------------|
| `.specify/memory/constitution.md` | Project-wide principles | Markdown | Git-committed | Manual |
| `specs/NNN/spec.md` | Per-feature spec | Markdown | Git-committed | Manual |
| `specs/NNN/plan.md` | Per-feature plan | Markdown | Git-committed | Manual |
| `specs/NNN/tasks.md` | Per-feature tasks | Markdown | Git-committed | Manual |
| `specs/NNN/data-model.md` | Per-feature data model | Markdown | Git-committed | Manual |
| `.specify/init-options.json` | Init configuration | JSON | Git-committed | Manual |

### Coexistence Assessment

**They coexist cleanly.** Different directories, different purposes:
- Squad's state is about **team coordination** — who decided what, what each agent learned, orchestration history
- Spec Kit's state is about **feature specification** — what to build, how to build it, what tasks remain

### Integration Opportunity: Feed Chain
Spec Kit's output (`specs/NNN/tasks.md`) could be consumed as input by Squad's coordinator to create GitHub issues or route work to agents. The data flows naturally:

```
Spec Kit: constitution → specify → plan → tasks
                                              ↓
Squad:                              issues → triage → assign → implement → PR
```

A bridge script could parse `tasks.md` and create Squad-compatible GitHub issues with `squad` labels.

---

## 4. Workflow Execution

### Squad Runtime Model
- **Platform:** GitHub Copilot (CLI or VS Code extension)
- **Entry point:** `.github/agents/squad.agent.md` (Coordinator prompt, ~81KB)
- **Execution flow:** User → Coordinator → `task` tool spawns → agent runs in sub-context
- **Modes:** `background` (parallel, independent work) or `sync` (sequential, dependent work)
- **Orchestration:** Prompt-based, with planned migration to TypeScript SDK runtime
- **Logging:** Scribe agent runs in background, writes to `orchestration-log/`
- **Tools:** `grep`, `glob`, `view`, `edit`, `create`, `bash`, `task` (sub-agent spawn), GitHub MCP tools

### Spec Kit Runtime Model
- **Platform:** Agent-agnostic (supports 25+ AI agents)
- **Entry point:** `specify` CLI (Python, pip-installable)
- **Execution flow:** User → `specify init` → generates agent-specific command files → user invokes slash commands in their AI tool
- **Modes:** Sequential phases only (constitution → specify → plan → tasks → implement)
- **Orchestration:** Shell scripts (`.specify/scripts/`) invoked by AI agent slash commands
- **Logging:** No built-in orchestration logging
- **Tools:** Shell scripts (bash/PowerShell), AI agent's native tools

### Technical Compatibility

| Dimension | Squad | Spec Kit | Compatible? |
|-----------|-------|----------|-------------|
| Runtime | Node.js/Copilot SDK | Python CLI + shell scripts | ✅ Independent |
| Execution | Real-time multi-agent | Sequential single-agent phases | ✅ Complementary |
| Parallelism | Multi-agent fan-out | None (sequential phases) | ✅ Different scope |
| Agent platform | Copilot only (currently) | 25+ agents | ⚠️ Squad is Copilot-locked |
| State persistence | Git + ephemeral logs | Git only | ✅ Compatible |

**Key insight:** Squad's runtime is a **live multi-agent orchestrator**. Spec Kit's runtime is a **project scaffolder and template engine** — it doesn't orchestrate AI agents at runtime, it generates the command files they use. These are completely different runtime models with no conflicts.

---

## 5. GitHub Integration

### Squad GitHub Integration
| Feature | Mechanism | Files |
|---------|-----------|-------|
| Issue triage | `squad-triage.yml` workflow, Ralph heartbeat | `.github/workflows/squad-triage.yml` |
| Label management | `sync-squad-labels.yml` parses `team.md` | `.github/workflows/sync-squad-labels.yml` |
| Label taxonomy | `squad`, `squad:{member}`, `squad:copilot` | Created dynamically |
| @copilot assignment | Auto-assign via Ralph when `copilot-auto-assign: true` | `team.md` comment |
| PR lifecycle | Branch → PR → review → merge | `squad/{issue}-{slug}` branches |
| CI/CD | `squad-ci.yml`, `squad-release.yml`, `squad-publish.yml` | `.github/workflows/` |
| Heartbeat monitoring | `squad-heartbeat.yml` (scheduled) | Every 30 minutes |
| Label enforcement | `squad-label-enforce.yml` | On PR events |

### Spec Kit GitHub Integration
| Feature | Mechanism | Files |
|---------|-----------|-------|
| Feature branches | `create-new-feature.sh` creates `NNN-short-name` branches | `.specify/scripts/` |
| PR creation | AI agent can create PRs via `gh` CLI if installed | Not automated |
| CI/CD | `release.yml` for Spec Kit's own releases (not user projects) | `.github/workflows/release.yml` |
| Stale issues | `stale.yml` for project maintenance | `.github/workflows/stale.yml` |
| Issue tracking | `/speckit.taskstoissues` command can create issues from tasks | `templates/commands/taskstoissues.md` |

### Conflicts & Complementary Patterns

**No workflow conflicts.** Squad's workflows are all prefixed `squad-*` or `sync-squad-*`. Spec Kit's workflows are `release.yml`, `stale.yml`, `test.yml`, `lint.yml` — different names entirely.

**Complementary patterns:**
- Spec Kit's `/speckit.taskstoissues` could create issues → Squad's Ralph triages them
- Squad's `squad:{member}` labels don't conflict with any Spec Kit labels
- Branch naming: Squad uses `squad/{issue}-{slug}`, Spec Kit uses `NNN-short-name` — different conventions but no technical conflict

**One consideration:** If both tools' feature branches exist simultaneously, developers need to know which convention to use. A team convention document would resolve this.

---

## 6. Concrete Integration Points

### What Would "Just Work" (No Changes Needed)

1. **File coexistence:** `.squad/` and `.specify/` directories are completely independent. Both tools can be `init`'d in the same repo.

2. **`.github/agents/` sharing:** Squad creates `squad.agent.md`, Spec Kit creates `speckit.*.agent.md`. Different filenames, same directory. Both are valid Copilot agent definitions.

3. **`.github/workflows/` sharing:** All workflow files have different names. No collisions.

4. **Git attributes:** Squad's `merge=union` entries in `.gitattributes` won't affect Spec Kit files and vice versa.

5. **Constitution as context:** Squad agents could read `.specify/memory/constitution.md` as project context. No adapter needed — it's just a markdown file.

### What Would Need Adapter/Bridge Work

1. **Spec Kit tasks → Squad issues pipeline:**
   - Parse `specs/NNN/tasks.md` to extract task items
   - Create GitHub issues with `squad` label for each task
   - Bridge script (shell or TypeScript): ~50-100 lines
   - Could be implemented as a Spec Kit extension or Squad plugin

2. **Squad decisions → Spec Kit constitution sync:**
   - Parse `.squad/decisions.md` for architectural decisions
   - Append relevant entries to `.specify/memory/constitution.md`
   - Bridge script: ~30-50 lines

3. **Unified `.github/copilot-instructions.md`:**
   - Squad generates this file for @copilot context
   - Spec Kit's `update-agent-context.sh` may want to write here too
   - Resolution: Merge both tools' instructions into a single file with clear sections
   - Could use `<!-- squad-section -->` and `<!-- speckit-section -->` markers

4. **Branch naming convention bridge:**
   - Squad: `squad/{issue-number}-{slug}`
   - Spec Kit: `NNN-short-name`
   - A shared convention or mapping script would be needed if both tools create branches

### What Would Break

1. **If Spec Kit overwrites `.github/copilot-instructions.md`:** Squad's `squad upgrade` also writes this file. If both tools blindly overwrite, the last writer wins. **Fix:** Both tools should append/merge, not overwrite.

2. **If a user runs `specify init --ai copilot` in a Squad repo:** Spec Kit would create `speckit.*.agent.md` files in `.github/agents/` alongside `squad.agent.md`. This is fine — Copilot can have multiple agents. But Spec Kit's VS Code settings file could conflict with Squad's MCP config if both try to manage `.vscode/settings.json`.

3. **Simultaneous agent context updates:** If Squad's Scribe and Spec Kit's `update-agent-context.sh` both try to update agent context files at the same moment, the last writer wins. Low probability but possible during automated workflows.

### Integration Architecture Recommendation

```
┌─────────────────────┐     ┌────────────────────────┐
│      Spec Kit       │     │        Squad           │
│                     │     │                        │
│ .specify/           │     │ .squad/                │
│   constitution.md ──┼──┐  │   decisions.md    ◄──┐ │
│   specs/NNN/        │  │  │   agents/{name}/     │ │
│     spec.md         │  │  │     charter.md       │ │
│     plan.md         │  │  │     history.md       │ │
│     tasks.md ───────┼──┼──┼→ GitHub Issues       │ │
│                     │  │  │   (squad label)      │ │
│ .github/agents/     │  │  │                      │ │
│   speckit.*.agent.md│  │  │ .github/agents/      │ │
│                     │  │  │   squad.agent.md     │ │
│ .github/prompts/    │  └──┼→ .github/copilot-    │ │
│   speckit.*.prompt.md    │   instructions.md    │ │
│                     │     │                      │ │
└─────────────────────┘     │ .github/workflows/   │ │
                            │   squad-triage.yml   │ │
                            │   squad-heartbeat.yml│ │
                            │   sync-squad-labels  │ │
                            └──────────────────────┘
                            
Bridge Layer (to build):
  1. tasks-to-issues.sh: specs/NNN/tasks.md → GitHub Issues w/ squad label
  2. decisions-sync.sh: decisions.md → constitution.md updates
  3. copilot-instructions-merge.sh: merge both tools' context
```

---

## 7. Technical Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| `.github/copilot-instructions.md` overwrite | Medium | High | Section markers, merge script |
| `.vscode/settings.json` conflict | Low | Medium | Manual merge, one-time setup |
| Branch naming confusion | Low | Medium | Team convention document |
| Simultaneous agent context updates | Low | Low | File locking or sequential runs |
| Label namespace collision | None | None | `squad:*` prefix is unique |
| Workflow name collision | None | None | All workflow names are distinct |
| Directory structure conflict | None | None | `.squad/` vs `.specify/` — completely separate |

---

## 8. Conclusion

**Feasibility: HIGH.** Squad and Spec Kit can coexist in the same repository with minimal friction. The single real conflict (`.github/copilot-instructions.md` ownership) is solvable with a merge script. The frameworks are naturally complementary — Spec Kit defines *what* to build, Squad orchestrates *who* builds it and *how*. A thin bridge layer (~150 lines of shell script) would connect Spec Kit's task output to Squad's issue-driven workflow, creating a complete specification-to-delivery pipeline.
