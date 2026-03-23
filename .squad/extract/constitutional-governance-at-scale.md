# Pattern: Constitutional Governance at Scale

**Context:** Team decision-making and governance  
**Date:** 2026-03-23  
**Source:** Framework comparison (Spec Kit vs Squad)

## Pattern

A centralized, versioned constitution (15–20KB) provides clearer governance than distributed decision files scattered across the codebase.

## Problem

- Squad distributes decisions across `decisions.md`, agent histories, and config files
- Difficult to understand overall governance model
- Hard for new team members to learn "how we decide"
- Decisions drift over time without clear precedent

## Solution

Create a single constitution file that covers:

1. **Decision-making process** — How are decisions made? Who decides what?
2. **Governance layers** — Agent autonomy, team consensus, architectural decisions
3. **Boundaries** — What decisions belong to whom? (Coordinator? Individual agents?)
4. **Values and principles** — Framework philosophy, why we chose this approach
5. **Escalation paths** — When disagreements occur, how are they resolved?

## Example Structure

```
constitution.md (15KB)
├── Identity & Purpose
├── Decision-Making Model
├── Governance Layers
├── Agent Autonomy Boundaries
├── Escalation Procedures
├── Versioning & Change Process
└── Current Version: 2026-Q1
```

## Advantages

- Single source of truth for governance
- Easy for new team members to understand
- Decisions recorded as *instance* of constitutional principle
- Versioning tracks how governance evolves
- Scales better than distributed decisions.md files

## When to Use

- Any multi-agent team framework
- Projects running 6+ months
- Teams with 3+ agents or developers

## Related

- State Pruning as Framework Feature
- Progressive GitHub Integration
