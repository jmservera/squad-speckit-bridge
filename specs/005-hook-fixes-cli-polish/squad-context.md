---
generated: 2026-03-24T17:51:38.842Z
cycle_count: 1
sources:
  skills: 2
  decisions: 2
  histories: 1
size_bytes: 8192
max_bytes: 8192
---

# Squad Context for Spec Kit Planning

## Team Skills (Highest Signal)

### speckit-squad-handoff

## Context

1. **Squad owns issue routing.** Squad's triage system adds the `squad` label and routing metadata that Ralph (coordinator) needs to distribute work.
2. **SpecKit is stateless.** Spec Kit knows specs, not squad team composition, agent assignments, or routing rules.
3. **The ceremony matters.** Squad lead reviews tasks.md with the team before issues are created, allowing accumulated knowledge to correct planning blind spots.
## Patterns
### The Full Pipeline
1. SpecKit runs:
2. Squad reviews (Design Review ceremony):
3. Squad creates issues:
     - squad label (enables Ralph's triage)
     - Original task ID preserved (traceability)
     - Reference to source tasks.md (audit trail)
4. Ralph distributes:
5. Agents execute:
6. Memory bridge feeds back:
### Why Squad Creates Issues (Not SpecKit)
- Bypass squad labels → Ralph can't see them
- Create issues without context → team must immediately revise
- Break the ceremony checkpoint → lose the knowledge correction step
- Proper label assignment at creation time
- Team review before commitment
- Feedback loop closure (learnings → context → better planning)
### Bridge Integration Points
- Calls SpecKit agents for planning
- Parses the resulting `tasks.md` (machine-readable API)
- Hands off to Squad coordinator for issue creation
- Does NOT create issues itself (bridge is a router, not an executor)
### Issue Creation Rules (for Squad Coordinator)
1. **Every issue gets the `squad` label** — this is not optional. Without it, Ralph cannot discover the issue for triage and distribution.
2. **Preserve the original task ID in the title** — e.g., `T001: Build authentication service`. Maintains traceability from task → issue → branch → PR → merge.
3. **Include SpecKit phase/layer labels if present** — SpecKit may tag tasks with `phase:design` or `layer:api`. Include these in the issue labels so issues can be filtered by feature phase.
4. **Do NOT pre-assign `squad:{member}` labels** — let the Lead (Richard) triage. Bulk-assigning all issues to one agent defeats the point of having a coordinator. The Lead's job is to review, match task complexity to agent skill, and assign appropriately.
5. **Reference the source `tasks.md` in the issue body** — allows agents and reviewers to see the full original task document. Example:
   ## T001: Build Authentication Service
   - Implement JWT auth in src/auth/
   - Use bcrypt for password hashing
   - Support token refresh
6. **One issue per task** — SpecKit produces granular, actionable tasks. Each gets its own issue. No bulk tasks.
## Examples
### Example 1: Correct Handoff Workflow
## T001: Implement User Authentication
- Design JWT token schema
- Implement login endpoint
- Add password hashing with bcrypt
  ## T001: Implement User Authentication
  - Design JWT token schema
  - Implement login endpoint
  - Add password hashing with bcrypt
- Sees `squad` label → picks it up
- Reviews phase/layer labels → understands feature context
- Assigns `squad:ralph` to distribute based on team capacity
- Agent picks up and executes
### Example 2: Anti-Pattern Scenario
- Issue created without `squad` label
- Ralph's automation skips it (no label match)
- Issue invisible to team routing
- Team discovers it manually, has to re-triage and re-label manually
- Ceremony never happens; SpecKit's blind spots (bad task breakdown) go uncorrected
## Anti-Patterns
1. **SpecKit creating issues directly** — Bypasses squad triage, adds labels, and routes work. SpecKit is not aware of team composition or routing rules. The bridge or Coordinator must do this.
2. **Creating issues without the `squad` label** — Invisible to Ralph's coordinator workflow. Issues must have this label to be picked up by the routing system.
3. **Bulk-assigning all issues to one agent** — `squad:{alice}` on every issue at creation time prevents Lead triage. The Lead's job is to review tasks and match to appropriate agents. Let the Lead do that.
4. **Calling `/speckit.implement` while Squad coordinates** — Both frameworks try to execute work simultaneously, creating ambiguity about which system is orchestrating. Pick one per cycle: either SpecKit implementation phase OR Squad orchestration phase, not both in parallel. This is enforced in decisions.md.
5. **Creating issues from SpecKit without team review** — Skips the Design Review ceremony where accumulated knowledge corrects planning blind spots. Always allow Lead and team to review tasks.md before issues are created.
6. **Pre-populating issue body with only task title** — Tasks.md contains detailed context, acceptance criteria, and reasoning. Include the full task description in the issue body so agents have full context without hunting through markdown.
## Feedback Loop — Closing the Circle
### Full Pipeline
### What Flows Back
1. **Architecture decisions** from `.squad/decisions.md` → inform spec updates
2. **Implementation patterns** from `.squad/skills/` → enrich spec context
3. **Agent learnings** from `.squad/agents/*/history.md` → update technical assumptions
4. **Edge cases discovered** during implementation → refine acceptance criteria
5. **Dependency discoveries** → update plan constraints
### How to Transfer
1. Collect relevant learnings from decisions.md and agent history files
2. Run SpecKit's knowledge sync: feed learnings back into the spec
3. Update the spec with implementation reality
4. This keeps specs as living documents, not stale requirements
### Bridge Responsibility
- After Squad work completes → trigger SpecKit knowledge ingestion
- Parse decisions.md and skills/ for spec-relevant insights
- Call SpecKit agents to update specs with new knowledge

**Anti-Patterns:**
- Issue created without `squad` label
- Ralph's automation skips it (no label match)
- Issue invisible to team routing
- Team discovers it manually, has to re-triage and re-label manually
- Ceremony never happens; SpecKit's blind spots (bad task breakdown) go uncorrected

### project-conventions

## Context

> **This is a starter template.** Replace the placeholder patterns below with your actual project conventions. Skills train agents on codebase-specific practices — accurate documentation here improves agent output quality.

## Patterns

### [Pattern Name]

Describe a key convention or practice used in this codebase. Be specific about what to do and why.

### Error Handling

<!-- Example: How does your project handle errors? -->
<!-- - Use try/catch with specific error types? -->
<!-- - Log to a specific service? -->
<!-- - Return error objects vs throwing? -->

### Testing

<!-- Example: What test framework? Where do tests live? How to run them? -->
<!-- - Test framework: Jest/Vitest/node:test/etc. -->
<!-- - Test location: test/, __tests__/, *.test.ts, etc. -->
<!-- - Run command: npm test, etc. -->

### Code Style

<!-- Example: Linting, formatting, naming conventions -->
<!-- - Linter: ESLint config? -->
<!-- - Formatter: Prettier? -->
<!-- - Naming: camelCase, snake_case, etc.? -->

### File Structure

<!-- Example: How is the project organized? -->
<!-- - src/ — Source code -->
<!-- - test/ — Tests -->
<!-- - docs/ — Documentation -->

## Examples

```
// Add code examples that demonstrate your conventions
```

## Anti-Patterns

<!-- List things to avoid in this codebase -->
- **[Anti-pattern]** — Explanation of what not to do and why.

**Anti-Patterns:**
- **[Anti-pattern]** — Explanation of what not to do and why.

## Relevant Decisions

### Pipeline Architecture Is Sound But Adoption Is Low (2026-03-24)

**Status:** Proposed for team action; Richard's full retrospective in `.squad/decisions/inbox/richard-pipeline-retrospective.md` (merging to this file)

### Recommended Automation Priority (P0-P3) (2026-03-24)

**Status:** Ranked by dependency and urgency; ready for implementation planning

## Agent Learnings (Summarized)

### ralph (Work Monitor)

---

*Warnings during context generation:*
- Skipped skill "speckit-bridge" — exceeds budget
- Skipped skill "clean-architecture-bridge" — exceeds budget
