# Squad-SpecKit Bridge

**A hybrid integration package connecting Squad's persistent team memory with Spec Kit's structured planning pipeline.**

---

## One-Liner

Squad-SpecKit Bridge is a knowledge bridge that creates a bidirectional loop: Squad memory → Memory Bridge → Spec Kit planning → tasks.md → Design Review ceremony → issues → execution → learnings → back to Squad.

---

## The Problem

Two powerful agentic development frameworks, each incomplete alone:

- **Squad** excels at multi-agent orchestration and persistent team memory but lacks structured pre-implementation planning
- **Spec Kit** excels at specification-driven decomposition and disciplined planning but lacks runtime memory and team coordination

Together, they should amplify each other. Separately, they create a knowledge gap.

---

## The Solution

A lightweight, framework-agnostic bridge that:

1. **Reads Squad's memory** (decisions, skills, agent histories) before Spec Kit planning cycles
2. **Feeds that context** into Spec Kit as a prioritized context summary
3. **Validates Spec Kit's tasks** through a Design Review ceremony where Squad agents catch planning blind spots
4. **Captures execution learnings** back into Squad's knowledge base for the next planning cycle
5. **Closes the loop** so knowledge compounds over time instead of resetting each cycle

---

## Key Features

### Memory Bridge
Read Squad's `.squad/` artifacts and produce a `squad-context.md` that Spec Kit's planning can consume. Progressive summarization keeps context summaries under 8KB despite large decision histories.

### Design Review Ceremony  
Before issues are created from Spec Kit's task breakdown, the Squad team reviews them with full context of prior decisions and learnings. This is where accumulated team knowledge corrects planning blind spots.

### Squad Plugin (SKILL.md)
Teaches Squad agents about Spec Kit artifacts, methodology, and how to participate in Design Reviews. Makes the team "bilingual" across both frameworks.

### Spec Kit Extension (after_tasks Hook)
Auto-triggers Design Review notifications when Spec Kit generates tasks, eliminating the manual reminder step.

### Clean Architecture
All core logic layers separated by dependency inversion. Easy to test, extend, and maintain independently of both frameworks.

---

## Quick Start

> **Status:** 🚧 In Development — spec and plan complete, implementation pending

```bash
# Coming soon (placeholder)
npx squad-speckit-bridge init
```

For now, see [Installation & Usage](./docs/INSTALLATION.md) for manual setup.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ SQUAD: Runtime Orchestration & Team Memory          │
│                                                      │
│  ├─ decisions.md (recorded team decisions)          │
│  ├─ .squad/skills/*/SKILL.md (team expertise)       │
│  └─ .squad/agents/*/history.md (learnings)          │
└────────────┬────────────────────────────────────────┘
             │ Memory Bridge reads ↓
             │
┌────────────▼────────────────────────────────────────┐
│ MEMORY BRIDGE: Context Injection Layer               │
│                                                      │
│  Reads: Squad memory, filters by relevance           │
│  Produces: squad-context.md for planning             │
└────────────┬────────────────────────────────────────┘
             │ Context feeds into ↓
             │
┌────────────▼────────────────────────────────────────┐
│ SPEC KIT: Planning Pipeline                          │
│                                                      │
│  specify.md → plan.md → tasks.md                     │
└────────────┬────────────────────────────────────────┘
             │ Tasks ready for ↓
             │
┌────────────▼────────────────────────────────────────┐
│ DESIGN REVIEW: Team Validation Ceremony              │
│                                                      │
│  Squad agents review tasks with full context         │
│  Feedback informs issue creation                     │
└────────────┬────────────────────────────────────────┘
             │ Approved tasks become ↓
             │
┌────────────▼────────────────────────────────────────┐
│ GITHUB ISSUES → SQUAD EXECUTION                      │
│                                                      │
│  Coordinator assigns tasks, agents execute,          │
│  learnings flow to history.md                        │
└────────────┬────────────────────────────────────────┘
             │ Learnings feed back to memory bridge ↓
             │
             └──────────────────────────────────────→
                (Knowledge compounds over time)
```

---

## Project Status

**🚧 In Development**

- ✅ Research and validation complete
- ✅ Feature specification written
- ✅ Team decisions documented
- ✅ Architecture designed (Clean Architecture layers)
- ⏳ Implementation pending

See [Feature Spec](./specs/001-squad-speckit-bridge/spec.md) for detailed requirements.

---

## Links & References

- **Feature Specification:** [specs/001-squad-speckit-bridge/spec.md](./specs/001-squad-speckit-bridge/spec.md)
- **Research Report:** [docs/REPORT-squad-vs-speckit.md](./docs/REPORT-squad-vs-speckit.md)
- **Team Decisions:** [.squad/decisions.md](./.squad/decisions.md)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and workflow.

This repository follows the Squad framework for team coordination and Spec Kit for planning. All development uses Spec Kit's specification workflow and Squad's Design Review ceremony.

---

## License

MIT © 2026 jmservera
