# Contributing to Squad-SpecKit Bridge

Thank you for your interest in contributing! This guide covers how to set up the development environment, run tests, and submit pull requests.

---

## Development Setup

### Prerequisites

- **Node.js** 18.0 or later
- **npm** 9.0 or later
- **Git** (for managing branches and commits)

### Clone & Install

```bash
git clone https://github.com/jmservera/squadvsspeckit.git
cd squadvsspeckit
npm install
```

### Verify Setup

```bash
npm run test
npm run build
```

If both commands succeed, you're ready to develop.

---

## How We Work

### The Spec Kit Workflow

This repository uses **Spec Kit's specification-driven workflow** for all work:

1. **Specify** — Create or update a specification in `specs/NNN-feature/spec.md`
2. **Plan** — Generate a technical plan in `specs/NNN-feature/plan.md`
3. **Tasks** — Break down the plan into concrete tasks in `specs/NNN-feature/tasks.md`
4. **Clarify** — Submit the spec to the Squad team for Design Review (see below)
5. **Implement** — Execute tasks, guided by the spec and plan
6. **Integrate** — Submit a pull request with full context from the spec

### The Design Review Ceremony

Before creating a pull request, large features go through a **Design Review ceremony**:

1. A Squad team member convenes the team
2. Team members review the spec, plan, and proposed tasks
3. Feedback is collected (risks, missing steps, alignment issues)
4. You address feedback or discuss trade-offs
5. Once approved, proceed with implementation

This ensures that accumulated team knowledge (from decisions.md and agent histories) catches planning blind spots before work begins.

---

## Running Tests

### Unit Tests (Entities & Use Cases)

```bash
npm run test:unit
```

Tests for pure business logic (no I/O, no dependencies).

### Integration Tests (Adapters)

```bash
npm run test:integration
```

Tests for file system adapters, config parsing, and framework detection.

### End-to-End Tests

```bash
npm run test:e2e
```

Full pipeline tests with temporary directories and real adapters.

### All Tests

```bash
npm run test
```

Runs full test suite with coverage report.

---

## Code Style

### TypeScript & Linting

This project uses **TypeScript** strictly for type safety.

```bash
npm run lint
```

### Clean Architecture Layers

All code follows **Clean Architecture** principles:

- **Layer 0 (Entities):** Pure business logic — no I/O, no dependencies
- **Layer 1 (Use Cases):** Application logic — defines ports, coordinates entities
- **Layer 2 (Adapters):** Format conversion — implements ports, talks to external systems
- **Layer 3 (Frameworks):** External libraries — never referenced by inner layers

**Dependency Rule:** All arrows point inward. Entities depend on nothing. Use Cases depend on Entities and Ports only. Adapters implement Ports. Outer layers can depend on inner layers; never the reverse.

### Anti-Patterns (Strictly Avoid)

1. ❌ gray-matter or format parsing in use cases → belongs in adapters
2. ❌ `.squad/` or `.specify/` path references in use cases → belongs in adapters (abstracted via ports)
3. ❌ `node:fs` imports in use cases → all I/O goes through ports
4. ❌ `commander` (CLI framework) outside CLI adapter layer
5. ❌ Adapter-to-adapter calls → only composition root wires adapters
6. ❌ Business logic in adapters → adapters do format conversion only
7. ❌ Format-specific output from use cases → use cases return DTOs only
8. ❌ `process.env` in use cases → wrap in ConfigPort

---

## Submitting a Pull Request

### Branch Naming

Use feature branch names tied to the spec:

```bash
git checkout -b 001-squad-speckit-bridge-memory-bridge
```

### Commit Messages

Include a clear description and reference the spec/feature:

```
Implement memory bridge context injection

- Reads Squad's decisions.md and skills/ for relevance scoring
- Produces squad-context.md under configurable size limit
- Respects ContextBudget allocation strategy

Closes #42 (Design Review feedback incorporated)
```

### PR Template

1. **What does this PR do?** — Clear summary of changes
2. **Which spec does it implement?** — Link to `specs/NNN-feature/spec.md`
3. **Testing** — Which tests pass? Any new tests added?
4. **Breaking changes?** — Any API changes or migration steps?
5. **Deployment notes** — Any setup steps after merge?

### Code Review Process

- Assign the PR to the appropriate team member (see team roles in `.squad/agents/`)
- Design Review feedback from ceremonies is incorporated as review comments
- Tests must pass before merge
- All feedback must be addressed (can be resolved or explicitly deferred)

---

## Useful Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode (rebuild on file changes)
npm run test           # Run all tests
npm run test:watch    # Watch mode for tests
npm run lint          # Run linter
npm run format        # Auto-format code
npm run bridge:generate-context  # Manual memory bridge run (for testing)
```

---

## Project Structure

```
squad-speckit-bridge/
├── src/
│   ├── entities/              (pure business logic)
│   ├── use-cases/             (application orchestration)
│   │   └── ports/             (port interfaces)
│   ├── adapters/              (format conversion)
│   ├── dto/                   (boundary data)
│   ├── cli.ts                 (command-line interface)
│   └── main.ts                (composition root)
│
├── tests/
│   ├── entities/              (entity unit tests)
│   ├── use-cases/             (use case tests with mocked ports)
│   ├── adapters/              (adapter integration tests)
│   ├── cli/                   (CLI snapshot tests)
│   ├── e2e/                   (full pipeline tests)
│   └── fixtures/              (test data)
│
├── specs/
│   └── 001-squad-speckit-bridge/
│       ├── spec.md            (feature specification)
│       ├── plan.md            (technical approach)
│       └── tasks.md           (task breakdown)
│
├── docs/
│   ├── README.md              (overview)
│   ├── REPORT-squad-vs-speckit.md (research synthesis)
│   └── INSTALLATION.md        (setup guide)
│
├── .squad/                    (Squad framework)
├── .specify/                  (Spec Kit framework)
├── package.json
├── tsconfig.json
├── jest.config.js
└── LICENSE
```

---

## Getting Help

- **Squad team:** See `.squad/agents/` for team members and their specialties
- **Questions?** Open an issue with the `question` label
- **Found a bug?** Open an issue with the `bug` label and steps to reproduce

---

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.

---

## Code of Conduct

Be respectful, assume good intent, and help others learn. We're building this together.
