---
name: speckit-bridge
version: 0.1.0
tags:
  - planning
  - spec-kit
  - integration
tools:
  - squad-speckit-bridge
---

# Skill: Spec Kit Integration Bridge

**Purpose**: Teach Squad agents how to leverage Spec Kit's structured planning artifacts during execution.

## When to Apply

- Before starting work on a Spec Kit–generated task, check for a `squad-context.md` in the spec directory
- After completing a task cycle, note patterns that should feed back into the next planning round
- During Design Review ceremonies, cross-reference tasks against team decisions

## Spec Kit Artifact Overview

| Artifact | Location | Contains |
|----------|----------|----------|
| `spec.md` | `specs/NNN-feature/` | Feature specification (requirements, constraints) |
| `plan.md` | `specs/NNN-feature/` | Implementation plan (architecture, phases) |
| `tasks.md` | `specs/NNN-feature/` | Actionable task breakdown (dependency-ordered) |
| `squad-context.md` | `specs/NNN-feature/` | Squad memory summary injected by bridge |

## Bridge Workflow

1. **Before planning**: Run `squad-speckit-bridge context <spec-dir>` to inject team memory
2. **After task generation**: Review `tasks.md` in a Design Review ceremony
3. **During execution**: Reference `squad-context.md` for prior decisions and learnings
4. **After execution**: Learnings auto-accumulate in agent `history.md` files

## Patterns

- Always check `squad-context.md` before starting a new spec cycle — it contains compressed team knowledge
- Cross-reference task dependencies against known architectural constraints from decisions
- Flag tasks that conflict with existing team decisions for ceremony review
- Use progressive summarization: skills > decisions > learnings (priority order)

## Anti-Patterns

- Do NOT skip the Design Review ceremony — it's where accumulated knowledge corrects planning blind spots
- Do NOT create GitHub issues before team review of `tasks.md`
- Do NOT modify `.squad/` files from Spec Kit hooks — the bridge is read-only from Squad's side
- Do NOT dump raw history files into planning context — use the bridge's summarization
