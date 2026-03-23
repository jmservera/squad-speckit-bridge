---
layout: default
---

# Squad-SpecKit Bridge: Knowledge Flywheel for Hybrid Planning & Execution

![Status Badge](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## The Problem

Modern software development requires two things that traditional frameworks separate:

1. **Structured Planning** — Break complex features into actionable tasks with clarity on what, why, and how
2. **Coordinated Execution** — Orchestrate multiple agents or team members with persistent learning that compounds over time

Neither Spec Kit (planner) nor Squad (executor) alone solves both. Worse, they don't talk to each other. Your team's hard-won learnings from execution stay buried in agent histories instead of improving your next plan.

## The Solution: Knowledge Flywheel

The Squad-SpecKit Bridge creates a **bidirectional knowledge loop**:

```
Spec Kit Planning
     ↓ (tasks)
Design Review (team vets against experience)
     ↓ (issues)
Squad Execution (team learns)
     ↓ (learnings)
Memory Bridge (team knowledge → planning context)
     ↓
Next Planning Cycle (improved by prior execution)
```

### What You Get

| Feature | Benefit |
|---------|---------|
| **Memory Bridge** | Before planning, Spec Kit context is enriched with your team's decisions and learnings — no more planning from scratch |
| **Design Review Ceremony** | Squad team reviews generated tasks against real-world experience, catching blindspots before execution |
| **Automated Issue Creation** | Tasks become GitHub issues with zero manual mapping — less friction, better traceability |
| **Learning Sync** | Execution insights automatically feed back to Squad memory, compounding knowledge over time |

## How It Works (2-Minute Tour)

Once installed, **the bridge disappears into the background.** You use Spec Kit normally; it handles the integration automatically.

### Step 1: Install (One Time)
```bash
$ npx @jmservera/squad-speckit-bridge install
# That's it — done. Deployment complete.
```

### Step 2: Use Spec Kit Normally
```bash
$ cd specs/001-my-feature/
$ /speckit.specify
$ /speckit.plan
$ /speckit.tasks
```

**What happens automatically:**
- 🧠 **Memory Injection** — Before planning, your team's prior decisions and learnings are silently injected as context
- 📋 **Better Plans** — Task generation is informed by real-world experience, not starting from scratch
- 🔍 **Review Auto-Generated** — After tasks.md, a Design Review template is created with pre-populated conflict flags
- 📁 **Context Saved** — Both `squad-context.md` and `review.md` appear in your spec directory

**No manual steps. This all happens automatically.**

### Step 3: Team Validates (Design Review)
```bash
# Your team reviews (a 15-minute discussion, not a command):
#   Open: specs/001-my-feature/review.md
#   Discuss: Do these tasks match what we've learned?
#   Approve: Mark ready in the review file when satisfied
```

The Design Review is a **ceremony**, not a command. It's where human judgment corrects planning blind spots using accumulated team knowledge.

### Step 4: Create Issues (When Review Approves)
```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-my-feature/tasks.md
# One command: tasks become GitHub issues (labeled, ready to assign)
```

### Step 5: Squad Executes
Your agents work as usual. The bridge stays completely out of the way.

### Step 6: Learnings Auto-Sync Back
After execution completes, agent learnings are synced back to `.squad/` memory — ready to inform the next planning cycle. The knowledge loop closes. ⤴

## Key Benefits

### Generated Files (Commit Them)

The bridge creates files that document your planning history. Commit them with your code:

**Created by `install`:**
- `.bridge-manifest.json` — Tracks bridge version and components
- `.squad/skills/speckit-bridge/SKILL.md` — Agent knowledge about bridge workflow
- `.squad/ceremonies/design-review.md` — Design Review ceremony definition
- `.specify/extensions/squad-bridge/extension.yml` — Automation hooks
- `bridge.config.json` — Configuration (customizable)

**Created during planning:**
- `squad-context.md` — Your team's memory injected into planning (for reference)
- `review.md` — Design Review findings and approval checklist

These files are part of your feature's planning record — future cycles and team members benefit from this history.

---

### For Product/Design
- **Better Planning** — Decisions informed by actual execution experience
- **Fewer Surprises** — Team review catches blind spots before work starts
- **Faster Iteration** — Knowledge compounds; subsequent cycles are faster

### For Engineering
- **Clear Execution** — Tasks come from structured planning, not ad-hoc conversations
- **Institutional Memory** — Learnings persist; don't re-solve the same problems
- **Less Context Switching** — Bridge handles translation between frameworks

### For Teams
- **Single Source of Truth** — Plans and execution live in the same workflow
- **Asynch-Friendly** — Design Review is a documented ceremony, not a Slack thread
- **Audit Trail** — Full traceability from spec → task → issue → execution → learning

## Framework Compatibility

| Aspect | Status |
|--------|--------|
| Squad & Spec Kit coexistence | ✅ Safe (non-overlapping `.squad/` & `.specify/`) |
| File conflicts | ✅ None (isolated directories) |
| State management | ✅ Read-only from bridge (no side effects) |
| Framework modifications | ✅ Zero required (additive only) |

## Get Started

1. **[Installation](installation.md)** — Prerequisites, step-by-step setup, troubleshooting
2. **[Usage Guide](usage.md)** — Copy-paste commands with expected output for each workflow step
3. **[Architecture](architecture.md)** — Design principles, knowledge flow, extension points

## Quick Reference

```bash
# Full workflow in one go (after bridge is installed)
npx @jmservera/squad-speckit-bridge context specs/001-feature/
npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
npx @jmservera/squad-speckit-bridge install --check  # Verify all components are in place
```

For more details, see the [Usage Guide](usage.md).

---

**For First-Time Visitors:** Start with "Why This Bridge?" above, then jump to [Installation](installation.md).

**For Experienced Squad/Spec Kit Users:** Skip to [Usage Guide](usage.md) for command reference.

**For Architects:** See [Architecture](architecture.md) for Clean Architecture layers and design decisions.
