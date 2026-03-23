# Pattern: Team-Size-Driven Framework Configuration

**Context:** Framework design and agent orchestration  
**Date:** 2026-03-23  
**Source:** Real-world usage analysis (Squad in solo vs team settings)

## Pattern

Agent count and ceremony overhead should scale with team size, not be fixed. A framework should have lightweight configurations for individuals and progressively heavier ceremony for larger teams.

## Problem

- Squad's default 12-agent model creates coordination overhead for solo developers
- Ceremonies designed for teams of 5+ slow down individual work
- No way to use Squad's orchestration layer with a minimal agent roster
- Spec Kit's zero-agent model is ideal for solo work but misses team coordination benefits

## Solution

Provide multiple team-size configurations:

**Solo (1 developer + AI)**  
- 1–2 agents (e.g., "Executor" + "Reviewer")
- Minimal ceremonies (design review as optional, no retrospective)
- Fast feedback loops

**Small Team (2–4 developers)**  
- 3–5 agents (core roles only)
- Weekly ceremonies
- Simplified decision-making

**Medium Team (5–10 developers)**  
- 6–10 agents
- Multi-touch ceremonies
- Constitutional governance layer

**Large Team (10+ developers)**  
- 10+ agents with specialization
- Full ceremony suite
- Distributed decision-making with escalation

## Configuration Example

```yaml
team_size: solo
agents:
  - name: executor
    role: implements_work
  - name: reviewer
    role: quality_gate
ceremonies:
  design_review: optional
  retrospective: disabled
```

## Advantages

- Each team size gets appropriate overhead
- Can start lightweight and grow
- Solo developers can use orchestration without burden
- Clear upgrade path as team scales

## When to Use

- Any multi-agent framework
- Projects that start solo and may grow
- Consulting/agency work (variable team size)

## Related

- Constitutional Governance at Scale
- Progressive GitHub Integration
