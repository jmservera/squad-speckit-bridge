# Squad Decisions

## Active Decisions

### Framework Classification: Squad + Spec Kit Are Complementary (2026-03-23)

**Decision:** Treat Squad and Spec Kit as complementary layers, not competitors.

- **Squad** = multi-agent orchestration with persistent memory (runtime layer)
- **Spec Kit** = structured specification pipeline (planning layer)

Neither alone covers full workflow. Squad lacks specification discipline. Spec Kit lacks parallel orchestration and agent memory.

**Impact:** Foundational for all subsequent framework selection and integration decisions.

---

### Integration Strategy: Pipeline Model with tasks.md Boundary (2026-03-23)

**Decision:** Adopt a pipeline integration model where Spec Kit serves as the upstream planning engine and Squad serves as the downstream execution engine.

- **Upstream:** Spec Kit (`spec.md` → `plan.md` → `tasks.md`)
- **Handoff:** `tasks.md` (machine-parseable API boundary)
- **Downstream:** Squad (assign → execute → coordinate → review)

**Recommended Actions:**
1. Build a Squad skill that parses Spec Kit's `tasks.md` and generates Coordinator-compatible work routing
2. Wire Spec Kit extension hooks (`after_tasks`, `after_implement`) to trigger Squad ceremonies
3. Do NOT run `/speckit.implement` and Squad's Coordinator simultaneously — choose one per cycle
4. Do NOT attempt full framework merge — destroys each framework's strengths

**Rationale:**
- Non-overlapping state directories (`.squad/` vs `.specify/`)
- Complementary strengths and weaknesses
- Zero modification needed to either framework
- Additive bridge approach

**Risks:**
- Workflow ownership conflict if both orchestrate execution simultaneously
- Agent prompt conflicts if same AI host configured by both frameworks

**Status:** Adopted; awaiting implementation

---

### Technical Compatibility: Coexistence Is Feasible (2026-03-23)

**Decision:** Squad and Spec Kit can safely coexist in the same repository with minimal integration work.

**Technical Facts:**
- **Zero directory conflicts:** `.squad/` and `.specify/` are independent
- **One manageable conflict:** `.github/copilot-instructions.md` (both tools write to it; solvable with section markers)
- **Natural data flow:** `tasks.md` output can feed Squad's workflow via ~100-line bridge script
- **Runtime compatibility:** Spec Kit (Python CLI) and Squad (Node.js/Copilot SDK) operate at different layers — no conflicts
- **Agent layer compatibility:** Spec Kit targets 25+ external AI tools; Squad defines virtual team members. Different layers entirely.

**Bridge Requirements:** ~100-line integration script to parse `tasks.md`, generate Squad work items, and handle merged instructions with section markers.

**Status:** Confirmed feasible; cleared for implementation

---

### Framework Weight and State Management Constraints (2026-03-23)

**Decision:** Framework selection and configuration must account for team size and state management risk.

**Patterns from Real Projects:**
1. **Framework Weight Must Match Team Size**
   - Squad's 12-agent model created coordination overhead for solo developer
   - Spec Kit's zero-agent model ideal for solo + Copilot
   - Need lightweight Squad mode (1-2 agents, no ceremonies) for small teams

2. **State Accumulation Is Critical Friction Point**
   - aithena's decisions.md reached 475KB — unusable as context
   - Both frameworks need automatic state pruning
   - Threshold-based archiving should be framework feature, not manual discipline

3. **Project Type Drives Framework Fit**
   - Greenfield → Spec Kit (spec-per-feature planning is fast)
   - Brownfield → Squad (issue routing, milestone management, team coordination)
   - Comparison should acknowledge this as primary driver

4. **Complementary Planning Models**
   - Spec Kit: structured planning (spec.md + plan.md + tasks.md)
   - Squad: issue-based routing
   - Combined model: specs for new features, issues for maintenance within same project

5. **Constitutional Governance Scales**
   - Spec Kit: single 15KB constitution (versioned)
   - Squad: distributed decisions across 5+ files
   - Squad needs a constitutional governance layer

6. **Progressive GitHub Integration**
   - sofia-cli: 0 Issues (too sparse for visibility)
   - aithena: 412 Issues (too dense for signal-to-noise)
   - Framework should support progressive adoption levels

**Status:** Confirmed patterns; design criteria established

---

## Generic Decisions for Extract

The following decisions apply broadly and are candidates for personal squad extraction:

1. **State Pruning as Framework Feature** — Automatic threshold-based archiving of decisions/logs prevents context pollution. Both frameworks should implement this.
2. **Constitutional Governance at Scale** — A centralized constitution (15KB, versioned) provides clearer governance than distributed decision files.
3. **Progressive GitHub Integration** — AI frameworks should support multiple adoption levels rather than forcing all-or-nothing GitHub integration.
4. **Team-Size-Driven Framework Configuration** — Agent count and ceremony overhead should scale with team size, not be fixed.

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
