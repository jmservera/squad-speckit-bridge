# Monica — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Technical Writer
- **Joined:** 2026-03-23T08:50:38.333Z

## Learnings

### Synthesizing Framework Comparisons (2026-03-23)

1. **Abstraction boundaries matter more than features.** Squad and Spec Kit solve different layers (team orchestration vs. planning), not the same problem. The synthesis forced a shift from "which is better?" to "where does each excel and how do they combine?" This framing makes them immediately complementary rather than competitive.

2. **Real-world data is the strongest signal.** The comparison of sofia-cli (Spec Kit greenfield) vs aithena (Squad brownfield) revealed that **project type drives framework fit more than framework quality**. Greenfield → Spec Kit. Brownfield → Squad. This pattern wasn't obvious from the frameworks themselves until we examined actual usage.

3. **State accumulation is a silent architectural risk.** Both frameworks grow state without bounds (Spec Kit: specs, Squad: decisions.md + logs). The 475KB decisions.md in aithena was the clearest friction signal — not because it's "bad," but because it creates context window and understanding burden. State management should be a first-class concern in framework design, not an afterthought.

4. **Handoff seams are where integration lives.** `tasks.md` is a nearly perfect integration boundary — it's structured, machine-parseable, and represents exactly the point where Spec Kit's planning work becomes Squad's execution input. This insight simplified the entire integration story from "complex merge" to "thin bridge at a well-defined API."

5. **Documentation is synthesis, not collection.** The initial instinct was to dump all research findings into the report. The cleaner approach was to read all four research papers, extract the core insight from each, and rebuild the narrative from first principles. This forced alignment and revealed where the researchers disagreed (they didn't, much — they were just looking at different angles).

6. **Tables are precision tools for synthesis.** When comparing frameworks across many dimensions, a well-structured table (Head-to-Head Comparison, Risk Matrix, etc.) communicates more efficiently than prose. A table also forces orthogonality — if two columns have the same entries, they're not distinct dimensions.

7. **Recommendations need decision matrices.** Telling a team "here's the best option" is weaker than "here are four options, each best for different contexts." The second approach acknowledges that the best choice depends on unknowns (team size, project type, platform lock-in tolerance) that only the decision-maker can evaluate.

<!-- Append learnings below -->
