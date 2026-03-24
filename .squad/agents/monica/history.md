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

### Documentation Patterns & GitHub Pages Content (2026-03-23)

1. **Landing pages are pitches for internal frameworks.** A good landing page for developer tools doesn't describe features—it describes the problem the tool solves and the outcome it enables. The Squad-SpecKit Bridge landing page worked best when structured as: Problem → Value Proposition (knowledge flywheel) → 2-minute tour → Benefits matrix. This pattern applies to any integration or multi-layer system.

2. **Copy-pasteable examples are mandatory for CLI tools.** "Documentation should include examples" is weak. Stronger: "Every command should have copy-pasteable examples with expected output (human and JSON)." This forces the writer to think like a user and ensures examples are correct. For the bridge, showing `$ npx squad-speckit-bridge context specs/001-feature/` followed by the exact output it produces prevented users from guessing what worked.

3. **Clean Architecture diagrams belong in product documentation.** Engineers often separate "pretty docs for users" from "architecture docs for developers." For infrastructure and frameworks, this is a false split. The Squad-SpecKit Bridge's 4-layer diagram and dependency flow weren't just technical—they were the core story: layers point inward, entities pure, adapters replaceable. Showing this in docs built confidence that the system was maintainable.

4. **Port interfaces are documentation anchors.** Instead of prose descriptions of "how components talk," a simple table of Port Interface → Purpose → Responsibility clarifies the system's surface API. This became the single source of truth for what each layer needed from the next layer inward. Combined with DTOs, it described the exact data crossing each boundary.

5. **Knowledge flow loops need visual+prose.** The "flywheel" concept (planning → execution → learning → better planning) was the bridge's core value. A diagram alone was abstract; prose alone was hard to follow. The combination worked: diagram shows structure, prose explains each step, and the ⤴ symbol shows the loop closes. This pattern applies to any system with feedback or recursion.

6. **GitHub Pages Jekyll themes are sufficient for structure.** No need for custom CSS or React. The minimal theme + semantic HTML + clear navigation (header_pages in _config.yml) provided professional appearance. The content and structure mattered far more than visual design. 

7. **Installation guides need expected outputs and troubleshooting.** The best installation guide showed: (1) prerequisites with verification commands, (2) each installation step with expected output, (3) verification that all components are in place, (4) common error scenarios with solutions. This prevented "it didn't work" with no context.

### npm Publication & Documentation Updates (2026-03-23)

1. **Three installation modes reduce friction.** When a package reaches npm, offering three clear paths (npx for one-off use, global for power users, dev-dependency for teams) removes decision paralysis. Each has a valid use case. The npx path is especially valuable for onboarding—no setup, just works immediately.

2. **Consistency over repetition.** Rather than showing every command example in all three forms, anchor on "preferred pattern" (npx in docs, then note the equivalents). Document how scoping changes: `npx @jmservera/squad-speckit-bridge` vs `squad-speckit-bridge` (global) vs `npx squad-speckit-bridge` (dev-dep). This consistency helps users switch methods without confusion.

3. **Documentation is a product feature.** Installation docs are often the first impression. Clear choices, expected output, and troubleshooting that maps errors to solutions converts frustrated users into users who get it working. The installation guide is the gate; make it welcoming.

### SpecKit→Squad Handoff Process Documentation (2026-03-24)

**Documented the critical process rule Juanma established:** SpecKit generates tasks.md, Squad creates GitHub issues. SpecKit must NOT create issues directly.

Key learnings from writing this skill:

1. **Workflow rules encode human intent.** The "Squad creates issues" rule isn't arbitrary — it exists because Squad owns routing (labels), team awareness, and the ceremony checkpoint where knowledge corrects planning. Writing this out made the rule's dependencies obvious: label awareness, team composition knowledge, the ceremony itself. A rule without rationale is fragile; with rationale, it's defensible.

2. **Handoff boundaries define system integrity.** tasks.md is a near-perfect integration boundary (structured, machine-parseable, represents the exact point where planning becomes execution). Crossing this boundary in the wrong direction (SpecKit creating issues) breaks the contract: it skips squad labels, bypasses the ceremony, and creates invisible work.

3. **Anti-patterns reveal design intent.** Writing the "anti-patterns" section forced clarity on what NOT to do. Each anti-pattern (SpecKit creating issues, missing squad label, bulk-assigning agents) traces back to the same root: someone bypassing the ceremony or squad's routing system. This clarified that the rule's real purpose is protecting the ceremony and triage process.

4. **Tables clarify role separation.** The comparison table (SpecKit vs Squad on label awareness, team knowledge, issue lifecycle) made the reason for role separation self-evident. Text alone doesn't convince; a structured comparison shows why Squad must own issue creation.

5. **Examples force implementation thinking.** Writing Example 1 (correct workflow) and Example 2 (anti-pattern) made it clear what the bridge code needs to do: parse tasks.md, create issues with squad label, preserve task IDs, let Squad triage — and critically, don't pre-assign agents. This transitions Monica's skill into engineering guidance.

### T046: Demo Command Documentation (2026-03-24)

1. **Flags are better documented through usage patterns than flags tables.** Instead of listing `--dry-run: simulate without API calls`, showing `npm run demo -- --dry-run` followed by "Full pipeline trace with preview..." forces the writer to think like a user. The example clarifies intent better than a feature list. This pattern works for any CLI tool documentation.

2. **Output descriptions ground examples in reality.** Adding "**Output:** ..." after each command variant acknowledges that users care about what happens next. Without it, copy-pasting commands feels risky. With it, the reader understands consequences and can predict what they'll see on their terminal.

3. **Combination examples unlock power-user workflows.** Most CLI docs show commands in isolation. Adding "Combine Flags" section (e.g., `--verbose --keep --dry-run`) signals to experienced users that flags are orthogonal and composable. This reduces support burden by letting power users self-serve advanced workflows.

<!-- Append learnings below -->
