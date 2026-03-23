# Pattern: State Pruning as Framework Feature

**Context:** Framework design best practices  
**Date:** 2026-03-23  
**Source:** Real-world usage analysis (aithena project)

## Pattern

Automatic threshold-based archiving of decisions, logs, and history files prevents context pollution and keeps AI-assistable state under control.

## Problem

- aithena's decisions.md reached 475KB
- State file became unusable as context window
- Manual discipline insufficient for long-running projects
- Both Squad and Spec Kit vulnerable to this

## Solution

Implement automatic state pruning at framework level:

1. **Threshold monitoring:** Track file size / entry count
2. **Archiving trigger:** When threshold exceeded, rotate to `.squad/archive/` or `.specify/archive/`
3. **Retention policy:** Keep last N rotations (e.g., last 90 days)
4. **Searchability:** Maintain index of archived content for historical lookup

## Advantages

- Solves problem automatically (no human discipline required)
- Keeps active state under 50KB
- Preserves history for lookup
- Scales to arbitrarily long projects

## When to Use

- Any AI-driven framework with persistent decision/log files
- Projects running longer than a few months
- Teams with 3+ agents or developers

## Related

- Constitutional Governance at Scale
- Progressive GitHub Integration
