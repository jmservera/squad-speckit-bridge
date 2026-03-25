# gilfoyle — History

## Core Context

Gilfoyle is the research and architecture agent.

## Learnings

### 2026-03-23: Clean architecture layer separation

All features MUST respect the dependency rule: inner layers never import from outer layers. This is a project-wide architectural constraint.

### 2026-03-24: Integration test fixture pattern

When testing adapters, use mkdtemp for isolated temp directories. This reusable technique avoids test pollution.

### 2026-03-25: API versioning risk

There is a regression risk when API endpoints change without version negotiation. Edge case: clients on older versions may silently fail.
