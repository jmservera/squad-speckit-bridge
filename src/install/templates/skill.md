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

**Purpose**: Teach Squad agents how to leverage Spec Kit's structured planning artifacts during execution and how to participate in the knowledge flywheel that compounds team learning across cycles.

## When to Apply

- Before starting work on a Spec Kit–generated task, check for a `squad-context.md` in the spec directory
- After completing a task cycle, note patterns that should feed back into the next planning round
- During Design Review ceremonies, cross-reference tasks against team decisions
- When reviewing tasks.md, flag any tasks that conflict with known architectural constraints
- When writing learnings to history.md, structure them to be machine-parseable (H3 headings with date prefix)

## Spec Kit Artifact Reference

### spec.md — Feature Specification

**Location**: `specs/NNN-feature/spec.md`
**Contains**: User stories with acceptance criteria, functional requirements (FR-NNN), non-functional requirements, constraints, and assumptions.
**Structure conventions**:
- User stories follow "As a [role], I want [capability], so that [benefit]" format
- Each FR has a unique ID (FR-001, FR-002, ...) used for traceability
- Acceptance criteria are testable boolean conditions
**Relationship to Squad**: Squad agents should reference FR IDs when discussing requirements. Use spec.md to validate that implementation matches intent.

### plan.md — Implementation Plan

**Location**: `specs/NNN-feature/plan.md`
**Contains**: Technology stack decisions, architecture overview, project structure, implementation phases, risk assessment.
**Structure conventions**:
- Architecture section defines the system's layer boundaries and module responsibilities
- Project structure maps directories to Clean Architecture layers
- Phases define the implementation order (setup → foundational → features → polish)
**Relationship to Squad**: Use plan.md to understand WHY tasks are ordered a certain way. Architecture decisions in plan.md should align with decisions.md entries.

### tasks.md — Task Breakdown

**Location**: `specs/NNN-feature/tasks.md`
**Contains**: Phased, dependency-ordered checklist of implementation tasks with [P] parallel markers and [USn] story labels.
**Structure conventions**:
- Tasks are grouped by phase (Phase 1: Setup, Phase 2: Foundational, etc.)
- Each task has a unique ID (T001, T002, ...) and maps to a GitHub issue
- [P] marker indicates tasks safe for parallel execution
- Dependencies documented in a separate section with ASCII dependency graph
- Clean Architecture order within each phase: Entities → Use Cases → Adapters → Drivers
**Relationship to Squad**: tasks.md is the handoff boundary. Squad's Coordinator routes tasks as issues. Ralph picks up labeled issues for agent assignment.

### constitution.md — Governance Rules

**Location**: `.specify/memory/constitution.md`
**Contains**: Project principles, quality gates, coding standards, review requirements, and governance rules.
**Structure conventions**:
- Principles are numbered and prioritized
- Quality gates define minimum criteria for task completion
- May include coding style, testing requirements, and documentation standards
**Relationship to Squad**: constitution.md is the project's "law" — it overrides individual agent preferences. Check it before making architectural decisions.

### research.md — Resolved Clarifications

**Location**: `specs/NNN-feature/research.md`
**Contains**: Answers to clarification questions raised during the specify phase, resolved decisions with rationale.
**Structure conventions**:
- Each clarification has an ID (RC-1, RC-2, ...) and maps to a specific spec gap
- Includes the question asked, the answer received, and impact on the specification
**Relationship to Squad**: research.md explains WHY certain spec decisions were made. Reference RC-IDs when a task seems unusual or counterintuitive.

### data-model.md — Entity Definitions

**Location**: `specs/NNN-feature/data-model.md`
**Contains**: Entity types, their attributes, relationships, and validation rules.
**Structure conventions**:
- Each entity has a clear type definition (TypeScript interfaces or similar)
- Relationships between entities are documented
- Validation constraints are specified per field
**Relationship to Squad**: Use data-model.md as the source of truth for type definitions. Entity tasks in tasks.md should match these definitions exactly.

### contracts/ — Interface Definitions

**Location**: `specs/NNN-feature/contracts/`
**Contains**: API contracts, CLI interface specifications, configuration schemas, and inter-module communication formats.
**Structure conventions**:
- CLI contracts define commands, flags, arguments, exit codes, and output formats
- API contracts define endpoints, request/response schemas, and error codes
- Config schemas define valid configuration keys, types, and defaults
**Relationship to Squad**: contracts/ defines the EXTERNAL behavior. Implementation details are flexible, but contract compliance is mandatory.

### squad-context.md — Bridge Context Summary

**Location**: `specs/NNN-feature/squad-context.md`
**Contains**: Compressed team knowledge injected by the bridge — skills, decisions, and agent learnings prioritized by relevance and recency.
**Structure conventions**:
- YAML frontmatter with generation timestamp, cycle count, and source counts
- Three sections: Team Skills (highest signal), Relevant Decisions, Agent Learnings
- Size-bounded by contextMaxBytes configuration (default 8KB)
- Each subsequent cycle compounds knowledge from prior execution
**Relationship to Squad**: This file IS the bridge output. It brings Squad's accumulated memory into Spec Kit's stateless planning. Always check it before starting a new spec cycle.

## Bridge Workflow — The Knowledge Flywheel

The bridge creates a compounding knowledge loop:

```
1. CONTEXT    → squad-speckit-bridge context <spec-dir>
                Reads .squad/ memory → produces squad-context.md

2. SPECIFY    → /speckit.specify (references squad-context.md)
                Planning phase now has team knowledge

3. PLAN       → /speckit.plan
                Architecture decisions informed by prior learnings

4. TASKS      → /speckit.tasks
                Task breakdown reflects team experience

5. REVIEW     → squad-speckit-bridge review <tasks.md>
                Design Review cross-references against decisions + learnings

6. EXECUTE    → Squad agents work on tasks
                Implementation guided by bridge context

7. LEARN      → Agents write to history.md
                New learnings accumulate in .squad/

8. LOOP       → Next cycle starts at step 1
                Context summary includes new learnings (cycle-aware)
```

### Cycle-Aware Summarization

Each bridge cycle builds on the previous one:
- **Cycle 1**: Full context generation from all Squad memory
- **Cycle 2+**: New learnings (since last generation) receive higher weight via recencyBiasWeight
- The context stays size-bounded — older content is compressed more aggressively as new learnings arrive
- `cycle_count` in frontmatter tracks how many times the bridge has run

### Design Review Participation

During a Design Review ceremony, agents should:
1. Read the review document (review.md) for pre-populated findings
2. Cross-reference each task against relevant decisions in decisions.md
3. Flag tasks that touch modules with known fragility (from learnings)
4. Identify missing tasks based on prior implementation experience
5. Verify task ordering respects known architectural constraints
6. Note any scope concerns — tasks that seem too broad or too narrow

### Contributing Learnings

When writing to history.md after task completion:
- Use H3 headings with date prefix: `### YYYY-MM-DD: Title`
- Keep summaries focused on patterns, not play-by-play narratives
- Include both what worked and what didn't
- Reference relevant decision IDs or task IDs for traceability
- The bridge will parse these entries and include them in future context summaries

## Patterns

- Always check `squad-context.md` before starting a new spec cycle — it contains compressed team knowledge
- Cross-reference task dependencies against known architectural constraints from decisions
- Flag tasks that conflict with existing team decisions for ceremony review
- Use progressive summarization: skills > decisions > learnings (priority order)
- Reference FR-IDs and RC-IDs when discussing requirements or clarifications
- Structure learnings with parseable date headings for automatic bridge extraction
- After completing work, verify your learnings were written to history.md so they flow into the next cycle
- ⚠️ Always commit artifacts before re-running Spec Kit pipeline phases — setup-plan.sh can overwrite plan.md

## Anti-Patterns

- Do NOT skip the Design Review ceremony — it's where accumulated knowledge corrects planning blind spots
- Do NOT create GitHub issues before team review of `tasks.md`
- Do NOT modify `.squad/` files from Spec Kit hooks — the bridge is read-only from Squad's side
- Do NOT dump raw history files into planning context — use the bridge's summarization
- Do NOT treat squad-context.md as permanent — it is regenerated each cycle and should not be manually edited
- Do NOT ignore the cycle_count in frontmatter — if it's high, the context has been through many refinement cycles and is highly curated
- Do NOT confuse spec.md requirements (WHAT) with plan.md decisions (HOW) — spec defines behavior, plan defines implementation
- Do NOT run `/speckit.implement` and Squad's Coordinator simultaneously — choose one execution model per cycle
