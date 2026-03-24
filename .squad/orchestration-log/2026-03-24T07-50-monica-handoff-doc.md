# 2026-03-24T07:50 — SpecKit→Squad Handoff Skill Documentation (Monica)

**Agent:** Monica (Technical Writer)  
**Mode:** Background  
**Outcome:** ✅ Success

## Work Summary

Documented critical workflow rule for bridge implementation and agent onboarding: **SpecKit generates tasks.md, Squad creates issues.** SpecKit must NOT create issues directly.

## Skill Artifact

**Location:** `.squad/skills/speckit-squad-handoff/SKILL.md`

## Key Rule

The handoff pipeline is:
1. SpecKit runs autonomously: `specify` → `plan` → `tasks` → produces `tasks.md`
2. Squad ceremony: Design Review validates the task breakdown against team knowledge
3. Squad Coordinator: Creates GitHub issues with proper labels and routing from `tasks.md`
4. Ralph/Lead: Applies `squad:{member}` labels during triage
5. Agents: Pick up work via normal squad lifecycle

## Why This Rule Matters

- **Squad owns routing:** Only Squad knows the `squad:{member}` label scheme
- **The ceremony is the checkpoint:** Design Review catches planning blind spots
- **Handoff boundary is clean:** `tasks.md` is the integration point; crossing it in the wrong direction breaks data flow

## Audience & Impact

- Ralph (Coordinator): Issue creation rules, label scheme preservation
- Richard (Lead): Design Review ceremony placement in full workflow
- Bridge implementation: Clear boundaries for orchestrator roles
- Future agents: Anti-patterns to avoid

---

**References:**  
- `.squad/decisions/inbox/monica-handoff-doc.md` (original capture)
- `.squad/skills/speckit-squad-handoff/SKILL.md` (full skill documentation)
