# Real-World Framework Comparison: sofia-cli (Spec Kit) vs aithena (Squad)

**Analyst:** Jared (Data Analyst)
**Date:** 2026-03-23
**Subject:** Same developer (jmservera), two frameworks, two project types

---

## 1. Project Comparison Table

| Dimension | sofia-cli (Spec Kit) | aithena (Squad) |
|-----------|---------------------|-----------------|
| **Project type** | CLI tool — AI Discovery Workshop agent | Multi-service app — Book library search engine |
| **Tech stack** | Node.js/TypeScript, single-process CLI | Python + React + Docker Compose, 11+ services |
| **Greenfield/Brownfield** | Greenfield (built from scratch) | Brownfield (existing project, Squad added later) |
| **Development timeline** | ~3 days (March 4–6, 2026) | Months of history (v0.10 → v1.13.0+, Squad added March 13) |
| **Framework config dir** | `.specify/` (3 subdirs: memory, scripts, templates) | `.squad/` (17+ subdirs: agents, casting, decisions, identity, log, orchestration-log, scripts, sessions, skills, templates, etc.) |
| **Agent/role definitions** | None — single Copilot agent, no named roles | 12 named roles (Ripley Lead, Parker Backend, Dallas Frontend, Ash Search, Lambert Tester, Brett Infra, Kane Security, Newt PM, Scribe, Ralph, @copilot, Juanma PO) |
| **State/memory artifacts** | `constitution.md` (15KB, versioned 1.1.2) | `decisions.md` (475KB!), `decisions-archive.md`, `wisdom.md`, `milestone-plans.md`, `security-triage-report.md`, 78 log files, 161 orchestration logs, 33 skill directories |
| **Work decomposition style** | Numbered specs (001–006), each with: spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/, checklists/ | GitHub Issues (412 total), Milestones (17+), per-agent routing table, issue labels (`squad:parker`, `squad:brett`, etc.) |
| **GitHub integration depth** | Minimal — PRs for Copilot work, no Issues used, no milestones | Deep — Issues with squad labels, Milestones, squad branch naming (`squad/{issue}-{slug}`), automated issue creation, release workflows |
| **Commit patterns** | 50 commits; 12 by copilot-swe-agent (24%), 38 by human | 50 recent commits; 38 co-authored by Copilot (76%), 7 by dependabot |
| **PR patterns** | 26 PRs total; Copilot created standalone PRs (e.g., #17, #20) | 30 recent PRs; human-authored with Copilot co-authoring, dependabot PRs |

---

## 2. Framework Artifact Inventory

### sofia-cli — Spec Kit Artifacts

```
.specify/
├── memory/
│   └── constitution.md          # 15KB — project governance, versioned (1.1.2)
├── scripts/
│   └── bash/                    # Helper scripts
└── templates/
    ├── agent-file-template.md   # Template for agent files
    ├── checklist-template.md    # Implementation checklist
    ├── constitution-template.md # Constitution template
    ├── plan-template.md         # Plan template
    ├── spec-template.md         # Spec template
    └── tasks-template.md        # Task breakdown template

specs/
├── 001-cli-workshop-rebuild/    # spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, contracts/, checklists/
├── 002-poc-generation/          # spec.md, plan.md, tasks.md, tasks-fix.md, research.md, data-model.md, quickstart.md, contracts/
├── 003-mcp-transport-integration/
├── 003-next-spec-gaps.md        # ← Gap analysis (friction artifact)
├── 004-dev-resume-hardening/
├── 005-ai-search-deploy/
└── 006-workshop-extraction-fixes/

.github/
├── copilot-instructions.md      # 13KB — detailed Copilot instructions
├── agents/                      # Agent definitions
├── prompts/                     # Prompt files
└── workflows/                   # CI/CD
```

**Total framework files:** ~30 files across `.specify/` and `specs/`
**Key artifact:** Constitution (single source of truth for all decisions)

### aithena — Squad Artifacts

```
.squad/
├── team.md                      # 12 named team members
├── routing.md                   # Work routing table
├── ceremonies.md                # 4 ceremonies (Design Review, Milestone Kickoff, Release Gate, Retro)
├── decisions.md                 # 475KB (!!!) — bloated decision log
├── decisions-archive.md         # 8.5KB archived decisions
├── decisions/
│   ├── decisions.md             # 8.5KB — recent decisions
│   ├── inbox/                   # Pending decisions
│   └── archive/                 # Archived decisions
├── milestone-plans.md           # 12KB — 3 milestones planned
├── created-issues-summary.md    # 30 issues tracked
├── security-triage-report.md    # 16KB security audit
├── config.json                  # Version + teamRoot
├── .ralph-state.json            # Work monitor state
├── agents/                      # 10 agent directories (ash, brett, copilot, dallas, kane, lambert, newt, parker, ripley, scribe)
├── casting/                     # Agent casting (history.json, policy.json, registry.json)
├── identity/
│   ├── now.md                   # Current state
│   └── wisdom.md                # 7 learned patterns
├── log/                         # 78 session log files
├── orchestration-log/           # 161 orchestration entries
├── sessions/                    # 1 session file
├── skills/                      # 33 learned skill directories
├── scripts/                     # Operational scripts
└── templates/                   # Templates

.github/
├── copilot-instructions.md      # 1.8KB — brief Copilot config
├── agents/                      # GitHub Copilot agents
├── ISSUE_TEMPLATE/              # Issue templates
├── actions/                     # Custom actions
├── hooks/                       # Git hooks
├── dependabot.yml               # Dependency updates
└── workflows/                   # CI/CD workflows
```

**Total framework files:** 350+ files across `.squad/`
**Key artifacts:** team.md, routing.md, decisions, agent charters, skills, logs

---

## 3. Developer Experience Analysis

### Setup Cost

| Metric | sofia-cli (Spec Kit) | aithena (Squad) |
|--------|---------------------|-----------------|
| Config files created | ~10 (constitution + templates) | ~50+ initial (team, routing, ceremonies, agents, casting, config) |
| Time to first productive work | Minutes — write a spec, start coding | Significant — define team, charters, routing rules, ceremonies |
| Ongoing maintenance | Low — specs are write-once artifacts | High — decisions.md grew to 475KB, 161 orchestration logs accumulated |

### Workflow Naturalness

**Spec Kit (sofia-cli):**
- **Natural flow:** Think → write spec → break into tasks → implement → done.
- Single human + Copilot agent. No routing overhead.
- Copilot agent created PRs directly (e.g., PR #17: "Azure AI Foundry deployment", PR #20: "workshop phase extraction").
- Constitution provided consistent guardrails without per-task ceremony.
- TDD workflow was enforced through the constitution, not through agent routing.

**Squad (aithena):**
- **Team simulation flow:** Plan → create issues → route to agents → agents execute → review → merge.
- 12 named agents with defined boundaries, routing table, and ceremonies.
- Rich coordination: milestone kickoffs, release gates, retrospectives, security triage.
- Issues auto-created and labeled (`squad:parker`, `squad:brett`, etc.).
- Branch naming convention: `squad/{issue}-{slug}`.

### What Got Captured (Valuable)

**Spec Kit:** Each spec is a self-contained planning document — spec.md, plan.md, tasks.md, research.md, data-model.md. These are high-signal, low-noise artifacts. The constitution captures project-wide conventions once.

**Squad:** Team wisdom (`wisdom.md`) captures 7 operational patterns learned through mistakes. Skill directories (33 of them) accumulate domain knowledge. The security triage report is a thorough, professional-grade audit. Decisions capture rationale for architectural choices.

### What Was Noise

**Spec Kit:** Relatively little noise. The `tasks-fix.md` in spec 002 and `003-next-spec-gaps.md` suggest mid-course corrections, but these are lightweight.

**Squad:**
- **decisions.md at 475KB** — This file grew uncontrollably. It's the clearest friction signal in the dataset.
- **161 orchestration log files** — Process overhead visible as accumulated log volume.
- **78 session log files** — Recording every session creates storage and context burden.
- **Duplicate decision structures** — Root-level `decisions.md` (475KB) + `decisions/decisions.md` (8.5KB) + `decisions-archive.md` (8.5KB). Three places to track the same thing.

### Evidence of Friction

| Signal | sofia-cli | aithena |
|--------|-----------|---------|
| Correction files | `tasks-fix.md` (plan correction), `003-next-spec-gaps.md` (gap analysis) | — |
| State bloat | None observed | decisions.md: 475KB, 161 orchestration logs, 78 session logs |
| Duplicate structures | None | 3 decision tracking locations |
| Wisdom from mistakes | Encoded in constitution updates (version 1.1.2 = 2 amendments) | `wisdom.md`: "Don't rush PR merges with --admin bypass"; "Accumulated 3 unreleased milestones before retro caught it" |
| Abandoned/stale state | None | `.ralph-state.json`: empty agents/observations (monitor not active) |
| Process vs. progress | — | 12-agent routing + 4 ceremonies for a single-developer project |

---

## 4. Patterns & Insights

### Pattern 1: Framework Weight Should Match Team Size

sofia-cli is one developer with one AI agent. Spec Kit's lightweight spec-per-feature approach fits perfectly — no routing overhead, no ceremonies, no agent boundaries to maintain.

aithena is one developer simulating a 12-person team. The framework's full feature set (routing, ceremonies, casting, skills) creates organizational overhead that a single developer must maintain alone. The wisdom.md entries about "accumulated 3 unreleased milestones" suggest the process itself was harder to manage than the code.

**Verdict:** Squad's team model adds significant value when multiple humans (or truly independent agents) collaborate. For a solo developer, the coordination tax exceeds the benefit.

### Pattern 2: State Accumulation Is the Silent Tax

The decisions.md file growing to 475KB in aithena is the clearest data point. Squad's design captures every decision, but without aggressive pruning, state files become unwieldy. Compare:

- Spec Kit: Constitution is 15KB after 2 amendments. Specs are write-once, ~20KB each. Total framework state: ~150KB.
- Squad: decisions.md alone is 475KB. Total `.squad/` state: easily 1MB+. That's context window tax for every agent invocation.

**Verdict:** Both frameworks need a state management story. Squad needs it more urgently because its multi-agent model multiplies the accumulation rate.

### Pattern 3: Spec-Per-Feature vs. Issue-Per-Task Decomposition

Spec Kit decomposes work as **features** (001-cli-workshop-rebuild, 002-poc-generation). Each feature is a self-contained planning unit with its own research, contracts, and tasks.

Squad decomposes work as **issues** (412 of them in aithena), grouped into milestones. Issues are routed to agents by label.

**Tradeoff:** Specs are better for upfront planning and new feature design. Issues are better for ongoing maintenance, bug tracking, and incremental work. Brownfield projects naturally have more issues; greenfield projects naturally have more specs.

### Pattern 4: Greenfield Favors Spec Kit, Brownfield Favors Squad

sofia-cli (greenfield) benefited from Spec Kit's structured planning — each numbered spec drove a coherent chunk of functionality from research through implementation.

aithena (brownfield) benefited from Squad's issue routing and milestone planning — existing services needed security fixes, dependency upgrades, UI improvements, and infrastructure hardening across multiple subsystems simultaneously.

**Verdict:** The project type drove framework fit more than any intrinsic quality of either framework.

### Pattern 5: Constitutional Governance vs. Distributed Decisions

Spec Kit's constitution (single document, versioned, amended via PRs) provides centralized governance. One source of truth.

Squad's decisions are distributed across multiple files (decisions.md, decisions/decisions.md, decisions-archive.md, wisdom.md, agent histories). This distributes knowledge but makes it harder to find the canonical answer.

**Verdict:** Centralized governance scales better for consistency. Distributed capture scales better for volume. Both have failure modes — the constitution can become stale; distributed decisions can become noise.

### Pattern 6: GitHub Integration Depth Correlates with Project Maturity

sofia-cli used 0 GitHub Issues and minimal PR workflow — appropriate for a rapid greenfield build.

aithena used 412 Issues, 17+ Milestones, squad labels, branch naming conventions, automated issue creation, and release workflows — appropriate for a multi-version production system.

**Verdict:** Deep GitHub integration is valuable for projects that will live long enough to need it. For rapid prototyping, it's overhead.

---

## 5. What Would Have Helped If Both Were Available

1. **A lightweight Squad mode** for solo developers — team.md with 1-2 agents, no ceremonies, no routing table. Let the framework scale up as the team grows.

2. **Spec Kit's spec-per-feature model inside Squad** — When a Squad project needs a new feature (not just bug fixes), the developer should be able to create a Spec Kit-style planning unit without switching frameworks.

3. **Automatic state pruning** — Both frameworks would benefit from a "garbage collection" pass that archives old decisions, prunes completed specs, and compresses log files.

4. **A shared "constitution + decisions" model** — Constitution for stable principles (Spec Kit's strength) + lightweight decisions log for tactical choices (Squad's strength), with automatic archiving when the log exceeds a threshold.

---

## 6. Quantitative Summary

| Metric | sofia-cli (Spec Kit) | aithena (Squad) |
|--------|---------------------|-----------------|
| Framework config files | ~30 | 350+ |
| Named agent roles | 0 (single Copilot) | 12 |
| Spec/planning documents | 6 specs, ~120KB total | 0 specs; 412 issues, milestone plans |
| State file size | ~150KB total | 475KB decisions.md alone; ~1MB+ total |
| Session/orchestration logs | 0 | 78 session + 161 orchestration = 239 logs |
| Learned skills captured | 0 (encoded in constitution) | 33 skill directories |
| GitHub Issues | 0 | 412 |
| GitHub Milestones | 0 | 17+ |
| PRs (total visible) | 26 | 30 (recent batch; more historically) |
| Copilot co-authored commits | 24% (12/50) | 76% (38/50 recent) |
| Development velocity | 6 features in ~3 days | ~20 releases over weeks/months |
| Constitution/governance docs | 1 file, 15KB, v1.1.2 | Distributed across 5+ files |
| Release versions | 0.1.4 → 0.2.5 (5 releases) | v0.10 → v1.13.0 (17+ releases) |
| Ceremonies defined | 0 | 4 (Design Review, Milestone Kickoff, Release Gate, Retro) |

---

## 7. Conclusion

**Spec Kit excels at:** Greenfield projects, rapid prototyping, solo developers, upfront feature planning, constitutional governance, low-overhead workflows.

**Squad excels at:** Brownfield projects, multi-service architectures, ongoing maintenance, team coordination, issue tracking, security audits, release management, knowledge accumulation.

**The core tradeoff:** Spec Kit trades coordination capability for speed. Squad trades speed for coordination capability. The developer's experience suggests that matching framework weight to project complexity is more important than which framework is "better."

The most telling data point: sofia-cli shipped 6 features in 3 days with Spec Kit. aithena shipped 17+ releases over weeks with Squad. Both projects succeeded at their goals, but the overhead profiles are dramatically different.
