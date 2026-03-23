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

### 1. Install Once
```bash
npx squad-speckit-bridge install
```
Deploys components to both `.squad/` and `.specify/` — zero disruption to existing workflows.

### 2. Inject Squad Memory Into Planning
```bash
npx squad-speckit-bridge context specs/001-my-feature/
# Reads: decisions.md, agent histories, skills
# Outputs: squad-context.md (fed into Spec Kit planning)
```

### 3. Plan With Spec Kit (As Usual)
```bash
cd specs/001-my-feature/
/speckit.specify
/speckit.plan
/speckit.tasks
```
Tasks now reference team knowledge from Step 2.

### 4. Squad Team Reviews Tasks
```bash
npx squad-speckit-bridge review specs/001-my-feature/tasks.md
# Generates review template
# Team identifies risks, missing tasks, conflicts with prior decisions
```

### 5. Create Issues & Execute
Issues created from approved tasks. Squad executes with full context of planning history.

### 6. Learning Sync (After Execution)
```bash
npx squad-speckit-bridge sync
```
Execution learnings stored in Squad memory, ready for next planning cycle.

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
