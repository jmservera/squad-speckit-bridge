# Monica — History

## Core Context

- **Role:** Technical Writer & Process Documentarian
- **Domain:** Framework documentation, installation guides, handoff process documentation
- **Key Insight:** Abstraction boundaries matter more than features; real-world data is strongest signal
- **Critical Documentation:**
  - SpecKit→Squad handoff process (with workflow rules and anti-patterns)
  - Demo command API reference (JSON schema + human output mapping)
  - Installation guides with expected outputs + troubleshooting
  - Framework comparison synthesis (4-agent research consolidated into decision matrices)
- **Key Patterns:**
  - **Landing pages are pitches**: Describe problem → value proposition → 2-minute tour → benefits matrix (not just features)
  - **Examples are mandatory**: Every command needs copy-pasteable examples with expected output (human + JSON)
  - **Clean Architecture diagrams in product docs**: 4-layer diagram + dependency flow is core story, not just technical
  - **Port interfaces as documentation anchors**: API surface clarity via simple tables (Interface → Purpose → Responsibility)
  - **Knowledge flow loops need visual+prose**: Diagram shows structure, prose explains steps, symbols show feedback
  - **Installation guides need verification**: Prerequisites with commands, step outputs, verification checklist, common errors with solutions
  - **Schema documentation bridges design+usage**: Show shape AND what each field means; human format → JSON output → schema flow
- **Status:** Documentation complete; handoff process documented; synthesis patterns established

## Learnings

### 2026-03-23: Synthesizing Framework Comparisons into Decision Matrices

**Key Insight:** Documentation is synthesis, not collection. Read all four research papers, extract core insight from each, rebuild narrative from first principles.

**Abstraction Boundaries > Features:**
- Squad and Spec Kit solve different layers (team orchestration vs planning), not same problem
- Shifted framing from "which is better?" to "where does each excel and how do they combine?"
- This framing makes them immediately complementary rather than competitive

**Real-World Data as Strongest Signal:**
- sofia-cli (Spec Kit greenfield) vs aithena (Squad brownfield) revealed project type drives framework fit more than quality
- Greenfield → Spec Kit; Brownfield → Squad; this pattern only obvious from actual usage, not frameworks alone

**State Accumulation as Silent Architectural Risk:**
- Both frameworks grow state without bounds (Spec Kit: specs, Squad: decisions.md + logs)
- 475KB decisions.md in aithena was clearest friction signal — not "bad," but creates context window + understanding burden
- State management should be first-class framework concern, not afterthought

**Handoff Seams as Integration Points:**
- tasks.md is nearly perfect integration boundary — structured, machine-parseable, represents exact point where Spec Kit planning → Squad execution
- This insight simplified integration story from "complex merge" to "thin bridge at well-defined API"

**Documentation as Synthesis Pattern:**
- Initial instinct: dump all research findings into report
- Cleaner approach: read sources, extract core insight from each, rebuild narrative from first principles
- This forces alignment and reveals where researchers disagreed (they didn't — looking at different angles)

**Tables as Precision Tools:**
- When comparing many dimensions, well-structured table (Head-to-Head, Risk Matrix) communicates more efficiently than prose
- Forces orthogonality — if columns have same entries, they're not distinct dimensions
- Cleaner communication than prose; harder to be sloppy with structure

**Recommendations Need Decision Matrices:**
- "Here's the best option" is weaker than "here are four options, each best for different contexts"
- Acknowledges best choice depends on unknowns only decision-maker can evaluate
- Builds decision confidence

### 2026-03-23: Documentation Patterns & GitHub Pages Content

**Landing Pages Are Pitches for Internal Frameworks:**
- Good landing page doesn't describe features — describes problem tool solves + outcome enabled
- Squad-SpecKit Bridge landing page worked best as: Problem → Value Proposition (knowledge flywheel) → 2-minute tour → Benefits matrix
- Pattern applies to any integration or multi-layer system

**Copy-Pasteable Examples Are Mandatory for CLI Tools:**
- "Documentation should include examples" is weak
- Stronger: "Every command should have copy-pasteable examples with expected output (human and JSON)"
- Forces writer to think like user; ensures examples are correct
- For bridge: showing `$ npx squad-speckit-bridge context specs/001-feature/` + exact output prevented user guessing

**Clean Architecture Diagrams Belong in Product Docs:**
- Don't separate "pretty docs for users" from "architecture docs for developers"
- For infrastructure/frameworks, this is false split
- Squad-SpecKit Bridge's 4-layer diagram + dependency flow weren't just technical — they were core story
- Showing layers point inward, entities pure, adapters replaceable built confidence in maintainability

**Port Interfaces as Documentation Anchors:**
- Instead of prose descriptions of "how components talk," simple table of Port Interface → Purpose → Responsibility clarifies system's API
- Became single source of truth for what each layer needed from next layer inward
- Combined with DTOs, described exact data crossing each boundary

**Knowledge Flow Loops Need Visual + Prose:**
- "Flywheel" concept (planning → execution → learning → better planning) was bridge's core value
- Diagram alone too abstract; prose alone hard to follow
- Combination worked: diagram shows structure, prose explains each step, ⤴ symbol shows loop closes
- Pattern applies to any system with feedback or recursion

**GitHub Pages Jekyll Themes Sufficient for Structure:**
- No need for custom CSS or React
- Minimal theme + semantic HTML + clear navigation (header_pages in _config.yml) provided professional appearance
- Content + structure mattered far more than visual design

**Installation Guides Need Expected Outputs + Troubleshooting:**
- Best guides show: (1) prerequisites with verification commands, (2) each step with expected output, (3) verification checklist, (4) common errors with solutions
- Prevents "it didn't work" with no context; cuts support load

### 2026-03-23: npm Publication & Documentation Updates

**Three Installation Modes Reduce Friction:**
- Offering clear paths (npx for one-off, global for power users, dev-dependency for teams) removes decision paralysis
- Each has valid use case; npx especially valuable for onboarding (no setup, just works)

**Consistency Over Repetition:**
- Rather than showing every command in all three forms, anchor on "preferred pattern"
- Document how scoping changes: `npx @jmservera/squad-speckit-bridge` vs `squad-speckit-bridge` (global) vs `npx squad-speckit-bridge` (dev-dep)
- Consistency helps users switch methods without confusion

**Documentation Is a Product Feature:**
- Installation docs are often first impression
- Clear choices, expected output, troubleshooting mapping errors to solutions converts frustrated users into working users
- Installation guide is the gate; make it welcoming

### 2026-03-24: SpecKit→Squad Handoff Process Documentation

**Workflow Rule Encoded:** SpecKit generates tasks.md, Squad creates GitHub issues. SpecKit must NOT create issues directly.

**Why the Rule Matters:**
- Squad owns routing (labels), team awareness, issue lifecycle
- Ceremony checkpoint where knowledge corrects planning
- Rule isn't arbitrary — it exists because Squad has dependencies: label awareness, team composition knowledge, the ceremony itself

**Key Learnings from Documenting This Skill:**
- **Workflow rules encode human intent.** Writing this out made the rule's dependencies obvious; without rationale, rules are fragile; with rationale, defensible
- **Handoff boundaries define system integrity.** tasks.md is near-perfect integration boundary (structured, machine-parseable, represents exact point planning → execution); crossing in wrong direction breaks contract
- **Anti-patterns reveal design intent.** Writing anti-patterns (SpecKit creating issues, missing labels, bulk-assigning) revealed root cause: someone bypassing ceremony or Squad's routing system
- **Tables clarify role separation.** Comparison table (SpecKit vs Squad on label awareness, team knowledge, issue lifecycle) made reason for separation self-evident
- **Examples force implementation thinking.** Correct workflow + anti-pattern examples made clear what bridge code needs to do: parse tasks.md, create issues with squad label, preserve task IDs, let Squad triage (don't pre-assign agents)

### 2026-03-24: Demo Command API Reference Documentation

**Schema Documents Bridge Design + Usage:**
- demo command's JSON output schema (ExecutionReport with success/failure variants, ErrorEntry/WarningEntry arrays, stage metadata) needed documentation showing both **shape** and **what each field means**
- Human output → JSON output → JSON schema flow made relationship clear: human format is rendering of structured data
- Pattern scales to any complex output type

**Failure Cases Are First-Class Documentation:**
- API reference included "Failure Output (JSON Format)" showing what happens when stage fails (stages → pending, errorSummary populated, cleanupPerformed = false)
- Without this, users debugging failures would reverse-engineer schema from errors
- Explicit failure documentation cuts support load

**Artifact Cleanup Logic Deserves Explicit Documentation:**
- Cleanup behavior subtle: default cleanup on success, preserve on failure, override with --keep
- "Artifact Cleanup" section with three clear cases prevents accidental deletion or user confusion about file location
- Edge cases in behavior → explicit documentation items

### 2026-03-23: Real-World Framework Insights — Synthesis from Team Research

**Jared's Key Findings (incorporated in synthesis):**
- Framework weight must match team size (coordination tax for solo dev vs overhead efficiency for teams)
- State accumulation is the silent killer (475KB decisions.md creates context window poison)
- Project type drives framework fit more than framework quality (Greenfield vs Brownfield)
- Spec-per-feature + issue-per-task complementary (new features vs maintenance work)
- Constitutional governance scales better (one 15KB constitution vs 475KB distributed)

**Gilfoyle's Meta-Analysis Findings (incorporated in synthesis):**
- Diverge (parallel research) + Converge (sequential pipeline) = optimal knowledge outcomes
- Workflow friction points: constitution templates, uncustomized gates, setup-plan.sh data loss, pre-pipeline research phase
- Reverse sync gap: forward-only flow with no reverse enrichment

**Monica's Documentation Insight:**
- Abstraction boundaries matter more than features
- Real-world data stronger signal than framework comparison tables
- Synthesis requires reading sources, extracting core insights, rebuilding narrative

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team's Simultaneous Execution:**
- **Gilfoyle:** Complementary architectural layers (runtime vs planning)
- **Richard:** Pipeline integration strategy validated
- **Dinesh:** Technical feasibility confirmed
- **Jared:** State accumulation risks identified
- **Monica:** Documentation patterns synthesized

**Consolidated Team Decisions (in decisions.md):**
1. Framework Classification: Complementary, not competitive
2. Integration Strategy: Pipeline model
3. Technical Approach: Additive bridge
4. Critical Risk: State pruning required
5. Governance: Constitutional governance layer

**Generic Patterns Extracted for Personal Squad:**
- State pruning as framework feature
- Constitutional governance at scale
- Progressive GitHub integration
- Team-size-driven framework configuration
