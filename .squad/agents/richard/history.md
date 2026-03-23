# Richard — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Lead
- **Joined:** 2026-03-23T08:50:38.328Z

## Learnings

<!-- Append learnings below -->

### 2025-07-24 — Squad × Spec Kit Integration Analysis

- **Non-overlapping state:** Squad uses `.squad/`, Spec Kit uses `.specify/` + agent dirs. Zero filesystem collision. This is the foundation that makes integration viable.
- **Natural handoff seam:** `tasks.md` is the API boundary. Spec Kit produces it (structured, with dependency ordering and `[P]` parallelism markers). Squad's Coordinator can consume it for agent routing.
- **The real conflict is workflow ownership:** Both frameworks answer "what should I do next?" — Spec Kit via sequential commands, Squad via Coordinator routing. Running both simultaneously during execution creates conflicting work streams.
- **Skills as the integration mechanism:** Spec Kit's spec-driven methodology can be encoded as Squad SKILL.md files without needing Spec Kit's CLI. The value is in the methodology, not the tooling.
- **Knowledge flywheel opportunity:** The highest-leverage integration is a feedback loop — Squad agent histories informing Spec Kit's next planning cycle, creating compound improvement over time.
- **Don't merge, compose:** Full framework merge destroys each framework's strengths. The "pipeline" pattern (Spec Kit plans → Squad executes) keeps both intact and plays to each one's advantage.
- **Ceremonies as review gates:** Spec Kit's extension hooks (`after_tasks`, `after_implement`) can trigger Squad ceremonies. This is the lowest-risk, cleanest integration point.

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team update (simultaneous background execution):**
- Gilfoyle completed deep-dive: frameworks are complementary (runtime vs planning layers)
- Dinesh completed compatibility analysis: technically feasible, ~100-line bridge needed
- Jared completed usage patterns: state accumulation is #1 risk, framework weight matters

**Decision consolidated in decisions.md:**
Adopt pipeline integration model: Spec Kit (upstream planning) → Squad (downstream execution), handoff via tasks.md. Zero modification to either framework. Additive bridge approach recommended.

**Action items from team research:**
1. Build Squad skill to parse tasks.md
2. Wire Spec Kit hooks to trigger Squad ceremonies
3. Implement automatic state pruning (critical for long projects)
4. Lightweight Squad mode for small teams
