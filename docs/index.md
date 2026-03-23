---
layout: default
---

# Squad-SpecKit Bridge Documentation

![Status Badge](https://img.shields.io/badge/status-planning-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

## What is the Squad-SpecKit Bridge?

The Squad-SpecKit Bridge connects two complementary agentic development frameworks:

- **Squad** — Multi-agent orchestration with persistent team memory (runtime layer)
- **Spec Kit** — Structured specification and planning pipeline (planning layer)

Together, they create a complete workflow: structured planning from Spec Kit feeds into Squad's multi-agent execution, and learnings from Squad execution flow back into the next planning cycle.

## Key Sections

### [Installation](installation.md)
Get started with the bridge in your project. Includes prerequisites, installation steps, and verification.

### [Usage Guide](usage.md)
Learn how to use the bridge in your workflow. Covers the memory bridge, design review ceremony, issue creation, and learning sync.

### [Architecture Overview](architecture.md)
Understand the design principles, knowledge flow, and extension points of the bridge.

### [API Reference](api-reference.md)
Complete reference for CLI commands and programmatic interfaces.

## Quick Start

```bash
# Initialize the bridge in your project
npx squad-speckit-bridge init

# Inject Squad memory before planning
npx squad-speckit-bridge context

# Review generated tasks with your team
npx squad-speckit-bridge review

# Sync learnings back to Squad after execution
npx squad-speckit-bridge sync
```

## Why This Bridge?

| Challenge | Solution |
|-----------|----------|
| Spec Kit plans without project history | Memory bridge injects Squad's team learnings |
| Squad lacks specification discipline | Uses Spec Kit's structured planning output |
| No feedback loop | Learning sync closes the loop |
| Manual task → issue conversion | Automated design review + issue creation |

## Framework Compatibility

- ✅ Squad and Spec Kit coexist safely in the same repository
- ✅ Non-overlapping state directories (`.squad/` vs `.specify/`)
- ✅ Clean integration via `tasks.md` handoff
- ✅ Zero modifications needed to either framework

---

**Project Status:** 🚧 Documentation describes the planned integration experience. Implementation is in progress.

**Questions?** See [Architecture Overview](architecture.md) for design details or refer to individual framework documentation.
