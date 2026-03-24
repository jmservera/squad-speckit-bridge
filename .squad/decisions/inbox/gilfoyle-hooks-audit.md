### 2026-03-24: Bridge Hooks & Harness Audit

**By:** Gilfoyle (Research Analyst)

---

## 1. CLI Commands Inventory

| Command | Pipeline Step | What It Does |
|---------|--------------|--------------|
| `install` | Setup | Deploys bridge components (skill, hooks, extension) to `.squad/` and `.specify/` |
| `context` | Pre-specify | Reads `.squad/` memory → produces `squad-context.md` in a spec directory |
| `status` | Diagnostics | Shows current bridge installation and integration health |
| `review` | Post-tasks | Generates a Design Review document from `tasks.md`; `--notify` mode for lightweight alerts |
| `issues` | Post-tasks | Parses `tasks.md` → creates GitHub issues with `squad` label. Supports `--dry-run` |
| `sync` | Post-implement | Syncs implementation learnings back to Squad memory |
| `demo` | E2E validation | Runs a full pipeline demo with all stages |

**Binary aliases:** `squask`, `sqsk`, and `squad-speckit-bridge` all point to the same entry point.

**Version discrepancy:** `program.version('0.2.0')` in `src/cli/index.ts` but `package.json` says `0.3.0`. The CLI reports a stale version.

---

## 2. SpecKit Hooks Analysis

Three hook scripts exist in `src/install/templates/hooks/`:

### before-specify.sh
- **Trigger:** Before `speckit.specify` runs
- **Action:** Calls `npx squad-speckit-bridge context "$SPEC_DIR"` to inject Squad context
- **Correct:** Yes — generates `squad-context.md` so specification benefits from team knowledge
- **Executable (template):** ❌ No (`-rw-rw-r--`, 644)
- **Executable (installed):** ✅ Yes (`-rwxrwxr-x`, 755)

### after-tasks.sh
- **Trigger:** After `speckit.tasks` generates `tasks.md`
- **Action:** Generates context if missing, then calls `review --notify` to alert about Design Review
- **Does it trigger issue creation?** ❌ **No.** It only notifies. Issue creation is a separate manual step via `squask issues`
- **Executable (template):** ✅ Yes (`-rwxrwxr-x`, 755)
- **Executable (installed):** ✅ Yes

### after-implement.sh
- **Trigger:** After `speckit.implement` completes
- **Action:** Calls `npx squad-speckit-bridge sync "$SPEC_DIR"` to write learnings back
- **Does it trigger knowledge sync?** ✅ **Yes.** Correctly invokes `sync` command
- **Executable (template):** ❌ No (`-rw-rw-r--`, 644)
- **Executable (installed):** ✅ Yes

### Command Name Inconsistency in Templates

| Hook File | Package Reference Used |
|-----------|----------------------|
| `before-specify.sh` | `npx squad-speckit-bridge` (unscoped) |
| `after-tasks.sh` | `npx @jmservera/squad-speckit-bridge` (scoped) |
| `after-implement.sh` | `npx squad-speckit-bridge` (unscoped) |

The `after-tasks.sh` template uses the scoped npm name (`@jmservera/squad-speckit-bridge`) while the other two use the unscoped binary name (`squad-speckit-bridge`). The installed copies in `.specify/extensions/` have been patched to use `squad-speckit-bridge` consistently, but the source templates still diverge. **Neither uses the `squask` or `sqsk` aliases.**

---

## 3. Squad-Side Integration

### SKILL.md (`.squad/skills/speckit-squad-handoff/`)
- ✅ Correctly documents the full pipeline: specify → plan → tasks → review → issues → triage → execute → sync
- ✅ Explicitly states "SpecKit generates tasks, Squad creates issues" — the cardinal rule
- ✅ Describes issue creation rules (squad label, task ID preservation, no pre-assignment)
- ✅ Documents the feedback loop (learnings → context → better planning)

### Installed Bridge Skill (`.squad/skills/speckit-bridge/`)
- ✅ Comprehensive SpecKit artifact reference (spec.md, plan.md, tasks.md, etc.)
- ✅ Documents the full knowledge flywheel (8 steps)
- ✅ Includes anti-patterns and Design Review participation guidance

### Agent Charters
- ❌ **No agent charter mentions the bridge.** `grep` across all `charter.md` files returned zero hits for "bridge", "speckit", or "squask". Agents don't know the bridge exists from their charter definitions — they only know through skills.

### GitHub Actions Workflows

| Workflow | Trigger | Pipeline Role |
|----------|---------|---------------|
| `squad-triage.yml` | Issue labeled `squad` | Lead triages → assigns `squad:{member}` label |
| `squad-issue-assign.yml` | Issue labeled `squad:*` | Posts assignment acknowledgment; assigns @copilot if applicable |
| `squad-heartbeat.yml` | Issue close/label, PR close, manual | Ralph monitors board, auto-triages strays |
| `sync-squad-labels.yml` | Push to `team.md`, manual | Creates/updates all squad/go/release/type/priority labels |
| `ci.yml` | Push/PR to main | Build + test (Node 18/20/22) |
| `release.yml` | Tag push or release | Publish to npm |

All four squad workflows are functional and correctly wired.

### GitHub Copilot Agents (`.github/agents/`)
- ✅ Multiple agents (`speckit.tasks`, `speckit.implement`, `speckit.analyze`, etc.) reference `sqsk issues` and `sqsk sync` correctly
- ✅ Richard's history notes that `speckit.taskstoissues` and `sqsk issues` are duplicate mechanisms, flagging consolidation needed

---

## 4. Hook Coverage Matrix

| Pipeline Step | SpecKit Hook | Squad Action | CLI Command | Status |
|---|---|---|---|---|
| **Context injection** | `before-specify.sh` | — | `squask context <dir>` | ✅ Working |
| **Specify** | (hook fires before) | — | — | ✅ Covered by hook |
| **Plan** | — | — | — | ⚪ No hook (acceptable — plan is SpecKit-internal) |
| **Tasks** | `after-tasks.sh` | Design Review notification | `squask review --notify` | ⚠️ Notifies only; does NOT create issues |
| **Issue creation** | — | Coordinator creates issues | `squask issues <tasks.md>` | ⚠️ Manual step — no hook triggers this |
| **Triage** | — | Lead triages via `squad-triage.yml` | — | ✅ Automated via GH Actions |
| **Assignment** | — | `squad-issue-assign.yml` | — | ✅ Automated via GH Actions |
| **Agents work** | — | Squad spawns per `squad:{member}` | — | ✅ Automated via GH Actions |
| **Review/merge** | — | PR review process | — | ⚪ Standard GH flow |
| **Knowledge sync** | `after-implement.sh` | — | `squask sync <dir>` | ✅ Working |

---

## 5. Gaps & Issues

### Critical

1. **Template permission bug:** `before-specify.sh` and `after-implement.sh` templates are not executable (644). If a fresh `squask install` copies without fixing permissions, these hooks will fail with `Permission denied`. The installed copies are fine (755), so the installer must be adding `+x` — but the templates themselves are wrong.

2. **Command name inconsistency in templates:** `after-tasks.sh` uses `@jmservera/squad-speckit-bridge` while the others use `squad-speckit-bridge`. Both resolve via `npx`, but this is fragile — if the package is installed locally rather than via npx, the scoped name won't resolve to a binary. All templates should use the same reference.

3. **CLI version stale:** `src/cli/index.ts` reports version `0.2.0` but `package.json` is `0.3.0`.

### Significant

4. **after-tasks.sh does NOT trigger issue creation.** The SKILL.md and handoff docs describe a flow where tasks.md → issues, but the hook only sends a notification. The actual issue creation requires a manual `squask issues` call. This is arguably by design (the Design Review ceremony is a human checkpoint), but it means the hook name is slightly misleading and there's a gap between what the docs imply and what automation does.

5. **No `after-plan` hook exists.** The extension.yml only declares three hooks. There's no way to trigger a Design Review or context refresh after the plan phase. If someone runs `speckit.plan` and makes architecture changes, Squad has no notification.

6. **No `after-review` hook.** After the Design Review ceremony approves tasks, there's no automated trigger to create issues. The gap between "review approved" and "issues created" is entirely manual.

7. **`squask`/`sqsk` aliases unused in hooks and skills.** The package.json registers both aliases, the `.github/agents/` use `sqsk`, but hooks and skill docs use the long-form names. Not broken, but inconsistent for users.

### Minor

8. **Agent charters have zero bridge awareness.** No agent's `charter.md` mentions the bridge, SpecKit, or integration workflow. Agents only learn about the bridge through skills. If a skill isn't loaded, agents are blind to the pipeline.

9. **Installed hooks drift from templates.** The `after-tasks.sh` in `.specify/extensions/` has been manually patched to use unscoped names while the template still uses scoped names. A re-install would revert this fix.

10. **Bridge manifest version (0.2.0) doesn't match package.json (0.3.0).** The `.bridge-manifest.json` was generated before the version bump.

---

## Summary Verdict

The bridge hooks are **structurally sound** — the three-hook model (before-specify, after-tasks, after-implement) covers the key boundaries between SpecKit planning and Squad execution. The Squad-side GitHub Actions workflows are well-built and correctly handle triage, assignment, and monitoring.

The main risks are operational: stale versions, inconsistent command references, and a gap between what the documentation promises (automated issue creation after tasks) and what actually happens (manual `squask issues` call required). The permission bug on two template files is the most likely to cause a real failure during fresh installs.

**Recommendation:** Fix the three critical items (permissions, naming consistency, version sync), then decide whether `after-tasks.sh` should auto-create issues or whether the manual ceremony checkpoint is intentional and should be documented more clearly.
