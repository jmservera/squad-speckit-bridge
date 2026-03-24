---
name: "SpecKit → Squad Issue Handoff"
description: "Workflow for SpecKit task generation → Squad issue creation; defines who creates issues and why Squad is the right owner"
domain: "integration, workflows, GitHub automation"
confidence: "high"
source: "manual (Juanma's workflow rule: SpecKit generates tasks.md, Squad creates issues)"
tools: []
---

## Context

SpecKit and Squad operate at different layers: **SpecKit plans**, **Squad executes and coordinates**.

The handoff happens at a critical boundary: `tasks.md` output from SpecKit's planning pipeline becomes Squad's execution input. Juanma has established a non-negotiable rule: **SpecKit generates the task list, Squad creates the GitHub issues from that list. SpecKit must NOT create issues directly.**

This rule exists for three reasons:
1. **Squad owns issue routing.** Squad's triage system adds the `squad` label and routing metadata that Ralph (coordinator) needs to distribute work.
2. **SpecKit is stateless.** Spec Kit knows specs, not squad team composition, agent assignments, or routing rules.
3. **The ceremony matters.** Squad lead reviews tasks.md with the team before issues are created, allowing accumulated knowledge to correct planning blind spots.

## Patterns

### The Full Pipeline

```
1. SpecKit runs:
   specify → plan → tasks → produces tasks.md
   
2. Squad reviews (Design Review ceremony):
   Lead + team examine tasks.md
   Add context SpecKit missed (fragile integrations, prior decisions)
   
3. Squad creates issues:
   Coordinator parses tasks.md
   Creates GitHub issues with:
     - squad label (enables Ralph's triage)
     - Original task ID preserved (traceability)
     - Reference to source tasks.md (audit trail)
   
4. Ralph distributes:
   Issues picked up via squad label
   Assigned squad:{member} labels per routing rules
   
5. Agents execute:
   Work against issues, write learnings to history.md
   
6. Memory bridge feeds back:
   Learnings → context for next SpecKit cycle
```

### Why Squad Creates Issues (Not SpecKit)

| Aspect | SpecKit | Squad |
|--------|---------|-------|
| **Label awareness** | Unaware of squad routing labels | Knows exact squad:{member} scheme |
| **Team composition** | No agent knowledge | Knows available agents, skills, capacity |
| **Issue lifecycle** | Stateless, fire-and-forget | Owns full assign→execute→review→merge flow |
| **Triage routing** | No coordination capability | Dedicated Coordinator + Lead |
| **Prior decisions** | Only reads specs | Has full .squad/decisions.md history |

**Result:** SpecKit creating issues would:
- Bypass squad labels → Ralph can't see them
- Create issues without context → team must immediately revise
- Break the ceremony checkpoint → lose the knowledge correction step

Squad creating issues enables:
- Proper label assignment at creation time
- Team review before commitment
- Feedback loop closure (learnings → context → better planning)

### Bridge Integration Points

The bridge orchestrates this handoff in code:

```javascript
// Phase 1: SpecKit planning (autonomous)
await speckit.specify(featureDesc);
await speckit.plan();
await speckit.tasks();
// Output: tasks.md

// Phase 2: Squad review (human ceremony)
// [Design Review ceremony — human review step]

// Phase 3: Squad issue creation (bridge-assisted)
const taskList = parseTasksMarkdown(readFile('tasks.md'));
for (const task of taskList) {
  await github.createIssue({
    title: `${task.id}: ${task.title}`,
    body: `Original task:\n${task.description}\n\n[Source: tasks.md](...)`,
    labels: ['squad'] // Required for Ralph's routing
  });
}
```

**Key responsibility:** The bridge controls this boundary. It's the orchestrator of orchestrators. It:
- Calls SpecKit agents for planning
- Parses the resulting `tasks.md` (machine-readable API)
- Hands off to Squad coordinator for issue creation
- Does NOT create issues itself (bridge is a router, not an executor)

### Issue Creation Rules (for Squad Coordinator)

When converting `tasks.md` to GitHub issues:

1. **Every issue gets the `squad` label** — this is not optional. Without it, Ralph cannot discover the issue for triage and distribution.

2. **Preserve the original task ID in the title** — e.g., `T001: Build authentication service`. Maintains traceability from task → issue → branch → PR → merge.

3. **Include SpecKit phase/layer labels if present** — SpecKit may tag tasks with `phase:design` or `layer:api`. Include these in the issue labels so issues can be filtered by feature phase.

4. **Do NOT pre-assign `squad:{member}` labels** — let the Lead (Richard) triage. Bulk-assigning all issues to one agent defeats the point of having a coordinator. The Lead's job is to review, match task complexity to agent skill, and assign appropriately.

5. **Reference the source `tasks.md` in the issue body** — allows agents and reviewers to see the full original task document. Example:
   ```markdown
   Original task from tasks.md:
   
   ## T001: Build Authentication Service
   - Implement JWT auth in src/auth/
   - Use bcrypt for password hashing
   - Support token refresh
   
   [View full tasks.md](link-to-tasks.md-commit)
   ```

6. **One issue per task** — SpecKit produces granular, actionable tasks. Each gets its own issue. No bulk tasks.

## Examples

### Example 1: Correct Handoff Workflow

**tasks.md output from SpecKit:**
```markdown
## T001: Implement User Authentication
Phase: backend
Layer: auth
- Design JWT token schema
- Implement login endpoint
- Add password hashing with bcrypt
```

**Squad Coordinator creates issue:**
```
Title: T001: Implement User Authentication
Labels: squad, phase:backend, layer:auth
Body:
  Original task from tasks.md:
  
  ## T001: Implement User Authentication
  Phase: backend
  Layer: auth
  - Design JWT token schema
  - Implement login endpoint
  - Add password hashing with bcrypt
  
  Reference: tasks.md commit abc123
```

**Ralph's triage:**
- Sees `squad` label → picks it up
- Reviews phase/layer labels → understands feature context
- Assigns `squad:ralph` to distribute based on team capacity
- Agent picks up and executes

### Example 2: Anti-Pattern Scenario

**What SpecKit should NOT do:**
```
SpecKit calls GitHub API directly:
  POST /repos/.../issues
  {
    title: "T001: Implement User Authentication",
    labels: [] ← Missing squad label!
  }
```

**Result:** 
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

**CRITICAL: The pipeline is circular, not linear.**

After Squad agents complete work, knowledge must flow back into SpecKit:

### Full Pipeline
```
SpecKit: specify → plan → tasks (produces tasks.md)
    ↓
Squad: create issues → triage → agents work → PRs merged
    ↓
SpecKit: knowledge/learnings loop back into specs
    ↑____________________________________________________↓
```

### What Flows Back
1. **Architecture decisions** from `.squad/decisions.md` → inform spec updates
2. **Implementation patterns** from `.squad/skills/` → enrich spec context
3. **Agent learnings** from `.squad/agents/*/history.md` → update technical assumptions
4. **Edge cases discovered** during implementation → refine acceptance criteria
5. **Dependency discoveries** → update plan constraints

### How to Transfer
After a batch of agent work completes and PRs are merged:
1. Collect relevant learnings from decisions.md and agent history files
2. Run SpecKit's knowledge sync: feed learnings back into the spec
3. Update the spec with implementation reality
4. This keeps specs as living documents, not stale requirements

### Bridge Responsibility
The bridge code must automate this transfer:
- After Squad work completes → trigger SpecKit knowledge ingestion
- Parse decisions.md and skills/ for spec-relevant insights
- Call SpecKit agents to update specs with new knowledge
