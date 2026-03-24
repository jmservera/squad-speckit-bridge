# SpecKit Integration Tooling — Deep Usage Analysis

**Author:** Richard (Lead)  
**Date:** 2025-07-25  
**Requested by:** Juan Manuel (Product Owner)  
**Scope:** Forensic analysis of SpecKit integration tooling: what exists, what was used, what's dead, what's missing

---

## Executive Summary

We built a sophisticated bridge between Squad and SpecKit — 7 CLI commands, 3 lifecycle hooks, 3 skills, a ceremony definition, and a Spec Kit extension. **The architecture is sound but adoption is low.** Of the 7 bridge commands, only `install` was used via CLI. Issue creation bypassed our own `sqsk issues` command in favor of a hand-written shell script. No `squad-context.md` was ever generated. No Design Review was ever executed through the bridge. The knowledge flow is almost entirely one-way (SpecKit→Squad via tasks.md), with the reverse flow (Squad→SpecKit via context injection) designed but never activated.

---

## 1. Integration Tooling Inventory

### 1.1 Bridge CLI Commands (7 total)

| Command | Purpose | Status |
|---------|---------|--------|
| `sqsk install` | Deploy bridge to both frameworks | ✅ **Used** (manifest dated 2026-03-23) |
| `sqsk context` | Generate squad-context.md for planning | ❌ **Never run** (zero squad-context.md files exist) |
| `sqsk status` | Show installation status | ⚠️ Unknown (no evidence either way) |
| `sqsk review` | Design Review cross-referencing | ❌ **Never run** (zero review.md files exist) |
| `sqsk issues` | Create GitHub issues from tasks.md | ❌ **Never run** (shell script used instead) |
| `sqsk sync` | Sync learnings back to Squad | ❌ **Never run** (no sync artifacts found) |
| `sqsk demo` | Run E2E pipeline demo | ❌ **Never run** (code written but command not invoked) |

**Usage rate: 1 of 7 commands (14%)**

### 1.2 Skills (.squad/skills/)

| Skill | Created | Content Status | Referenced in Orchestration |
|-------|---------|---------------|---------------------------|
| `speckit-bridge/SKILL.md` | 2026-03-23 | Complete (186 lines) | ❌ Not passed to agent prompts |
| `speckit-bridge/ceremony.md` | 2026-03-23 | Complete (51 lines) | ❌ Ceremony never executed |
| `clean-architecture-bridge/SKILL.md` | 2026-03-23 | Complete (244 lines) | ✅ Created during orchestration |
| `project-conventions/SKILL.md` | 2026-03-23 | **Template only** — never customized | ❌ Placeholder content |

### 1.3 SpecKit Custom Agents (10 total in .github/agents/)

| Agent | Purpose | Used This Session |
|-------|---------|-------------------|
| `speckit.specify` | Create specs from NL descriptions | ✅ Used for specs 001, 002, 003 |
| `speckit.plan` | Generate implementation plans | ✅ Used (plan.md exists in all specs) |
| `speckit.tasks` | Generate dependency-ordered tasks | ✅ Used (tasks.md exists in all specs) |
| `speckit.clarify` | Identify ambiguities via Q&A | ✅ Used (clarifications in spec.md) |
| `speckit.analyze` | Cross-artifact consistency checks | ⚠️ Unknown |
| `speckit.checklist` | Generate quality checklists | ⚠️ Unknown |
| `speckit.taskstoissues` | Convert tasks to GitHub issues | ❌ **Not used** (shell script used instead) |
| `speckit.constitution` | Define project principles | ✅ Used (constitution ratified) |
| `speckit.implement` | Execute implementation | ✅ Used for feature 003 |
| `squad` | Squad team context | ✅ Used throughout |

### 1.4 Lifecycle Hooks (3 deployed, 0 triggered)

All hooks are deployed, executable (`chmod +x`), and properly configured in `extension.yml`:

| Hook | Script | Triggered |
|------|--------|-----------|
| `before_specify` | `before-specify.sh` | ❌ No evidence of execution |
| `after_tasks` | `after-tasks.sh` | ❌ No Design Review notification found |
| `after_implement` | `after-implement.sh` | ❌ No learning sync artifacts found |

**Root cause:** Hooks depend on Spec Kit's extension system executing them. If SpecKit agents were invoked directly (via `/speckit.specify` in Copilot) rather than through Spec Kit CLI, the hooks wouldn't fire. The agents don't call the extension hooks — they're for the CLI pipeline.

---

## 2. What Was Actually Used

### Used SpecKit Agents
- `/speckit.specify` — Created all 3 feature specs (001, 002, 003)
- `/speckit.plan` — Generated plans with research, data models, contracts
- `/speckit.tasks` — Generated 46-50 tasks per feature
- `/speckit.clarify` — Ran post-tasks to catch ambiguity
- `/speckit.constitution` — Ratified 5 principles
- `/speckit.implement` — Executed feature 003 (17 commits in 25 minutes)

### Used Squad Components
- Agent orchestration (parallel research fan-out with 4 agents)
- Skills creation (clean-architecture-bridge, speckit-bridge)
- Orchestration logging (13 session logs)
- Decision tracking (decisions.md, decisions/inbox/)

### What Connected Them (manually)
- **tasks.md** served as the handoff artifact (SpecKit → Squad)
- **Agent histories** accumulated learnings from both sides
- **Skills** encoded integration knowledge
- **But:** the automated bridge was bypassed in every case

---

## 3. Knowledge Flow Analysis

### Direction: SpecKit → Squad ✅ (Working, manual)
- `tasks.md` → parsed by humans/agents for implementation routing
- `plan.md` → `update-agent-context.sh` updated copilot-instructions.md
- Spec artifacts informed Squad agent decisions

### Direction: Squad → SpecKit ❌ (Designed, not activated)
- `squad-context.md` was **never generated** — the bridge's primary value prop
- No agent history was ever injected into planning context
- No decisions.md content fed back into specs
- The "knowledge flywheel" exists on paper but has zero rotations

### Feedback Loop Status: **Broken**
The loop is designed as: Squad executes → writes learnings → bridge summarizes → SpecKit plans better. In practice: Squad executes → writes learnings → learnings sit in history.md → next planning cycle starts from zero knowledge. The bridge exists to close this loop but was never invoked.

---

## 4. Custom Agent Integration Analysis

### How SpecKit Agents Relate to Squad
The SpecKit custom agents (speckit.*) operate **independently** from Squad orchestration. They are Copilot Chat agents defined in `.github/agents/` — invoked directly via `/speckit.specify`, `/speckit.plan`, etc. Squad's coordinator never calls them. They don't read Squad state. They're parallel systems, not integrated ones.

### What's Missing
1. **No automatic skill injection.** When `/speckit.plan` runs, it doesn't receive `.squad/skills/speckit-bridge/SKILL.md` content. The skill exists but isn't consumed.
2. **No ceremony trigger.** `/speckit.tasks` completing doesn't trigger the Design Review ceremony — even though `after-tasks.sh` is deployed.
3. **No result feedback.** `/speckit.implement` completing doesn't sync learnings — even though `after-implement.sh` is deployed.
4. **speckit.taskstoissues exists but wasn't used.** A shell script was generated instead. The agent and the CLI command both went unused.

---

## 5. Dead Code Inventory

### Confirmed Dead (exists, never used)

| Component | LOC | Evidence |
|-----------|-----|----------|
| `sqsk context` command | ~200 | Zero squad-context.md files |
| `sqsk review` command | ~200 | Zero review.md files |
| `sqsk issues` command | ~200 | Shell script used instead |
| `sqsk sync` command | ~150 | No sync artifacts |
| `sqsk demo` command | ~400 | Registered but never invoked |
| `project-conventions/SKILL.md` | 57 | Template placeholder |
| `before-specify.sh` hook | 44 | Never triggered |
| `after-tasks.sh` hook | 47 | Never triggered |
| `after-implement.sh` hook | 45 | Never triggered |
| `speckit.taskstoissues` agent | ~150 | Shell script used instead |

**Estimated dead LOC:** ~1,500 lines of code/config that has never been exercised in production use.

### Not Dead But Undertested
- `sqsk install` — used once, but the installed hooks never fired
- `speckit-bridge/SKILL.md` — complete content but no evidence it was passed to agent prompts
- `ceremony.md` — well-designed but no Design Review was ever conducted through it

---

## 6. Prioritized Recommendations

### P0 — Dogfood the Bridge (immediate)

1. **Run `sqsk context` before the next planning cycle.** Generate squad-context.md and verify it improves spec quality. This is the bridge's primary value prop — if it doesn't work here, it doesn't work.

2. **Use `sqsk issues` instead of shell scripts.** The next feature's issues MUST be created through the bridge. If the UX is bad, fix it. If the command is broken, fix it. Either way, we need the feedback.

3. **Run `sqsk review` on existing tasks.md.** Execute a Design Review ceremony on specs/003. Even retroactively, this validates the review pipeline.

### P1 — Close the Knowledge Loop (next sprint)

4. **Wire SpecKit agents to read squad-context.md.** The `speckit.specify` and `speckit.plan` agents should check for and consume `squad-context.md` if present. Add to their agent.md prompt: "Before planning, check if `squad-context.md` exists in the spec directory and incorporate its context."

5. **Auto-generate context before planning.** Since hooks don't fire when using Copilot Chat agents (only CLI), add a step to the speckit.specify agent prompt: "Run `npx sqsk context <spec-dir>` first."

6. **Run `sqsk sync` after implementation.** After feature 003 closes, run sync to prove the learning loop works.

### P2 — Reduce Dead Code (next cycle)

7. **Fill project-conventions/SKILL.md.** Extract actual conventions from the codebase (TypeScript, Vitest, Clean Architecture, ESM modules) and write them down. This is 30 minutes of work with high payoff.

8. **Merge `speckit.taskstoissues` agent with `sqsk issues`.** Having two mechanisms for the same job guarantees one gets ignored. Pick one and deprecate the other.

9. **Add integration tests that exercise the full loop.** The 183 passing tests cover bridge internals but zero tests verify the end-to-end flow (context → plan → tasks → review → issues → sync).

### P3 — Architectural Improvements (future)

10. **Bridge as MCP server.** The hook gap (agents don't trigger hooks) is architectural. An MCP server would expose bridge tools directly to Copilot agents, eliminating the "agents bypass hooks" problem.

11. **Reduce task granularity.** 50 tasks per feature creates 50 issues. Target 15-20. This also reduces the issue creation pain that drove the team to shell scripts.

---

## 7. Root Cause: Why Was the Bridge Bypassed?

Three factors:

1. **Agent vs CLI gap.** SpecKit agents run in Copilot Chat. Spec Kit hooks run via CLI. Since we used agents (not CLI), hooks never fired. The bridge was designed for a CLI workflow but deployed in an agent workflow.

2. **Friction.** Running `sqsk context specs/003/` before `/speckit.specify` is an extra manual step. Humans skip extra steps. The bridge needs to be automatic or invisible.

3. **Shell scripts are faster for one-off jobs.** Generating `create-issues.sh` with 50 hardcoded `gh issue create` commands was faster than debugging `sqsk issues` for the first time. The bridge CLI pays off on repeat use, but there's been no repeat use yet.

---

## Decision Proposal

**Proposed Decision:** Before the next feature spec, the team MUST use the bridge tools (`sqsk context`, `sqsk review`, `sqsk issues`, `sqsk sync`) instead of manual workarounds. Document any UX friction as bugs. This is the only way to validate whether the bridge we built actually works.

**Status:** Proposed — awaiting Lead review
