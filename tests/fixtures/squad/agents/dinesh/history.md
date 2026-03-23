# Dinesh — History

## Core Context

- **Project:** Squad-SpecKit Bridge
- **Role:** Integration Engineer
- **Joined:** 2025-07-20

## Learnings

### 2025-07-22: Clean Architecture Boundary Analysis

Identified 4 layers: Entities, Use Cases, Adapters, Frameworks.
Ports defined for SquadStateReader, ContextWriter, TasksReader.
All arrows point inward — adapters implement ports.

- Port names describe capability, not implementation
- DTOs cross boundaries, not raw markdown
- Constructor injection for dependency wiring

### 2025-07-20: Project Setup Patterns

ESM module configuration requires `"type": "module"` in package.json.
TypeScript with `module: "Node16"` and `moduleResolution: "Node16"`.

- Use `.js` extensions in imports for ESM compatibility
- Vitest provides zero-config TypeScript test support
