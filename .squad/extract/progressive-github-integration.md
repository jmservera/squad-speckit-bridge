# Pattern: Progressive GitHub Integration

**Context:** Framework feature adoption  
**Date:** 2026-03-23  
**Source:** Real-world usage analysis (sofia-cli vs aithena)

## Pattern

AI frameworks should support multiple adoption levels of GitHub integration rather than enforcing all-or-nothing GitHub involvement.

## Problem

- sofia-cli: 0 Issues (too sparse — lost visibility into work)
- aithena: 412 Issues (too dense — noise in signal)
- Frameworks force teams to choose between "no GitHub integration" and "everything on GitHub"
- No middle ground for "use GitHub for specific work types only"

## Solution

Implement progressive adoption levels:

**Level 0:** Framework operates entirely locally  
**Level 1:** Create Issues only for architectural decisions  
**Level 2:** Create Issues for features + bugs, close manually  
**Level 3:** Full bi-directional sync (Issues ↔ plans)  
**Level 4:** Deep integration (milestones, project boards, automations)  

Teams start at Level 0 and progress only as the project matures and benefits justify the overhead.

## Configuration Example

```yaml
github_integration:
  level: 1  # Architecture decisions only
  artifact_types:
    - architecture_decisions
  sync_direction: one-way  # Squad → GitHub only
```

## Advantages

- Rapid prototyping (Level 0–1)
- Progressive overhead as project matures
- Clear decision points ("we're ready for Level 2")
- Doesn't force unnecessary ceremony early on

## When to Use

- Any framework used across project lifecycle (early → mature)
- Teams that vary in size and maturity
- Organizations with GitHub as standard but not all projects use it equally

## Related

- State Pruning as Framework Feature
- Team-Size-Driven Framework Configuration
