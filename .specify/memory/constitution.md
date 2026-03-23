<!--
SYNC IMPACT REPORT — Constitution v1.0.0

Checked artifacts:
  - .specify/templates/plan-template.md        ✅ ALIGNED
    → "Constitution Check" gate references this file; now has concrete principles to verify against.
    → No changes required — the gate placeholder "[Gates determined based on constitution file]"
      is designed to be filled dynamically by /speckit.plan using these principles.

  - .specify/templates/spec-template.md         ✅ ALIGNED
    → Spec template is principle-agnostic by design (captures WHAT, not HOW).
    → No architecture-specific content to conflict.

  - .specify/templates/tasks-template.md        ⚠️ ADVISORY
    → Template uses generic "Models → Services → Endpoints" ordering.
    → Clean Architecture requires "Entities → Use Cases → Adapters → Drivers" ordering.
    → No change needed: template is illustrative; concrete tasks.md instances override
      ordering per Principle II. See .squad/skills/clean-architecture-bridge/SKILL.md
      for the canonical layer mapping.

  - README.md                                   ✅ ALIGNED
    → References "Clean Architecture" in Key Features and Architecture Overview.
    → Dependency flow diagram matches Principle I (inward-only dependencies).

  - docs/architecture.md                        ✅ ALIGNED
    → Full Clean Architecture documentation with identical 4-layer model.
    → Dependency rule, port interfaces, DTO discipline, and test pyramid
      all consistent with Principles I–V.
    → Anti-patterns list (8 violations) consistent with Principle V.

  - .squad/decisions.md                         ✅ ALIGNED
    → "Clean Architecture — Bridge Design" decision matches all five principles.
    → Port interface strategy and DTO types consistent.

  - .squad/skills/clean-architecture-bridge/SKILL.md  ✅ ALIGNED
    → Layer mapping, anti-patterns, and test strategies match principles exactly.

No breaking inconsistencies found. Zero artifacts require modification.
-->
# Squad-SpecKit Bridge Constitution

## Core Principles

### Principle I: The Dependency Rule (NON-NEGOTIABLE)

Source code dependencies MUST only point inwards. Inner layers (entities, use cases) MUST NOT import, reference, or know about outer layers (adapters, frameworks). Boundary crossing uses Dependency Inversion — use cases define interfaces (ports), outer layers implement them.

**Verification:** Any import statement in an entity or use case file that references an adapter, framework library (`fs`, `commander`, `gray-matter`, `@octokit/rest`, `glob`), or outer-layer module is a violation. Static analysis or import-graph tooling MUST confirm zero outward dependencies.

### Principle II: Clean Architecture Layers

Code MUST be organized into four concentric layers:

1. **Entities** — Core business rules with no dependencies. Pure types, validation, and domain algorithms.
2. **Use Cases** — Application logic that orchestrates entities. Defines port interfaces. Depends only on entities and ports.
3. **Interface Adapters** — Converts between internal entity format and external formats. Implements port interfaces.
4. **Frameworks & Drivers** — External libraries (`fs`, GitHub API, CLI parsers, markdown parsers). Confined to the outermost layer.

Each layer has a dedicated directory under `src/`. No file may belong to more than one layer.

**Verification:** The directory structure MUST reflect four distinct layers. No source file may contain imports from a layer further outward than its own.

### Principle III: Test-First by Layer

Each layer MUST be independently testable:

- **Entities:** Pure unit tests with no mocks. Test validation rules, scoring algorithms, budget allocation.
- **Use Cases:** Mock ports, test orchestration logic. No file system, no network, no framework calls.
- **Adapters:** Integration tests against real fixture files. Test format conversion fidelity.
- **End-to-End:** Full pipeline tests with temporary directories, real adapters, complete flow verification.

Tests MUST exist before implementation is considered complete. A layer without corresponding tests is unshippable.

**Verification:** Each `src/` layer directory MUST have a parallel `tests/` directory with at least one test file per source file.

### Principle IV: Simple Data Crosses Boundaries

Data crossing layer boundaries MUST be simple DTOs (Data Transfer Objects) or plain objects. Never pass entities, framework types, `GrayMatterFile` results, or file system constructs (`Buffer`, `ReadStream`) across boundaries. Each boundary defines its own data transfer format.

**Verification:** Port interface method signatures MUST accept and return only DTOs, primitives, or entity types. No framework-specific types in port signatures.

### Principle V: Framework Independence

The architecture MUST NOT depend on any specific framework. Node.js `fs`, `commander`, `gray-matter`, `@octokit/rest` are implementation details confined to the outermost layer. Swapping any framework MUST NOT require changes to entities or use cases.

**Verification:** Removing or replacing any single framework dependency (e.g., replacing `commander` with `yargs`, or `gray-matter` with `remark-frontmatter`) MUST require changes ONLY in adapter files. Zero entity or use case files may be modified.

## Development Workflow

### Spec Kit Pipeline

All features follow the Spec Kit structured planning pipeline:

1. **Specify** (`/speckit.specify`) — Define WHAT the feature does. User stories, functional requirements, acceptance scenarios. No implementation details.
2. **Plan** (`/speckit.plan`) — Define HOW to build it. Technology choices, data models, contracts, project structure. Constitution Check gate verifies compliance with these principles.
3. **Tasks** (`/speckit.tasks`) — Decompose into ordered, dependency-aware tasks. Clean Architecture demands Entities → Use Cases → Adapters → Drivers ordering (innermost first).
4. **Clarify** (`/speckit.clarify`) — Resolve ambiguities, normalize terminology, fill gaps. Run after tasks to catch spec/task misalignment.
5. **Implement** (`/speckit.implement` or Squad execution) — Build per the task breakdown.

### Squad Orchestration

Squad coordinates execution with persistent team memory:

- **Memory Bridge:** Before each planning cycle, Squad's accumulated knowledge (decisions, skills, agent histories) feeds into Spec Kit via `squad-context.md`.
- **Design Review Ceremony:** Before issues are created from `tasks.md`, the Squad team reviews with full project context. This is where accumulated knowledge corrects planning blind spots.
- **Knowledge Flywheel:** Execution learnings flow back to agent histories, compounding knowledge across planning cycles.

### Task Ordering Rule

Within each user story, tasks MUST follow Clean Architecture layer ordering:

1. Entity types and validation (Layer 0)
2. Port interfaces (Layer 1)
3. Use case orchestration (Layer 1)
4. Adapter implementations (Layer 2)
5. Composition root wiring (crosses all layers)

This ordering maximizes parallelism (inner layers have no outward dependencies) and prevents adapter-first development.

## Governance

1. **Supremacy.** This constitution supersedes all other development practices, conventions, and ad-hoc decisions. In case of conflict, the constitution wins.
2. **Amendment Process.** Amendments require: (a) documented rationale in `.squad/decisions.md`, (b) version bump in this file, (c) updated `Last Amended` date, and (d) Product Owner (Juanma) approval for non-trivial changes.
3. **PR Compliance.** All pull requests MUST verify Clean Architecture compliance. Reviewers MUST check: no outward dependencies (Principle I), correct layer placement (Principle II), test coverage per layer (Principle III), DTO-only boundary crossing (Principle IV), and no framework leakage into inner layers (Principle V).
4. **Complexity Justification.** Any deviation from these principles MUST be justified in the plan's Complexity Tracking table with the specific violation, rationale, and simpler alternative rejected.
5. **Living Document.** This constitution evolves with the project. It is not aspirational — it describes enforceable rules that every commit must satisfy.

**Version**: 1.0.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
