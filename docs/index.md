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

Once installed, your Spec Kit workflow is **automatically enhanced**. Most of the heavy lifting happens in the background.

### One-Time Setup
```bash
npx squad-speckit-bridge install
# That's it — deploy once, then forget about it
```

### Then Just Use Spec Kit Normally

```bash
cd specs/001-my-feature/

# Spec Kit planning proceeds as usual:
/speckit.specify
/speckit.plan
/speckit.tasks
```

**What happens automatically during planning:**
- 🧠 **Memory Injection** — Your team's prior decisions and learnings are automatically injected as context before planning starts
- 📋 **Better Plans** — Task generation is informed by execution history (not planning from scratch)

**What happens automatically after `/speckit.tasks`:**
- 🔍 **Design Review Generated** — The bridge auto-generates a review template pre-populated with potential decision conflicts and risk flags
- 📢 **Team Notification** — You're notified that review is ready
- 📁 **Context Saved** — `squad-context.md` is created in your spec directory for reference during review

### Then the Human Part (Design Review)

```bash
# Your team reviews tasks against real-world experience:
# Open: specs/001-my-feature/review.md
# Discuss: Do these tasks match what we've learned?
# Approve: When satisfied, mark review as complete
```

The Design Review is a **ceremony**, not a command. It's where your team's knowledge corrects planning blind spots.

### Create Issues (When Ready)

```bash
npx squad-speckit-bridge issues specs/001-my-feature/tasks.md
# Convert approved tasks into GitHub issues
# Issues are labeled and ready for Squad execution
```

### Squad Executes (Ralph Picks Up Issues)
Your agents work as usual. The bridge stays out of the way.

### Learnings Auto-Sync Back
After execution, learnings are synced to `.squad/` memory — ready to inform the next planning cycle. The flywheel continues.

## Key Benefits

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
npx squad-speckit-bridge context specs/001-feature/
npx squad-speckit-bridge review specs/001-feature/tasks.md
npx squad-speckit-bridge install --check  # Verify all components are in place
```

For more details, see the [Usage Guide](usage.md).

---

**For First-Time Visitors:** Start with "Why This Bridge?" above, then jump to [Installation](installation.md).

**For Experienced Squad/Spec Kit Users:** Skip to [Usage Guide](usage.md) for command reference.

**For Architects:** See [Architecture](architecture.md) for Clean Architecture layers and design decisions.
