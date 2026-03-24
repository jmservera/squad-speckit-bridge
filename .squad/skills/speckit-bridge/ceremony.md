# Ceremony: Design Review (Spec Kit Tasks)

**Trigger**: After Spec Kit generates `tasks.md` for a feature
**Frequency**: Once per feature planning cycle
**Duration**: One review pass

## Purpose

Review Spec Kit's auto-generated task breakdown against Squad's accumulated team knowledge. Catch planning blind spots, dependency errors, and decision conflicts before creating GitHub issues.

## Participants

- **Lead** (Richard): Facilitates review, makes final approval decision
- **Integration Engineer** (Dinesh): Checks architectural boundaries and integration points
- **All assigned agents**: Review tasks relevant to their domain expertise

## Pre-Conditions

1. `tasks.md` exists in the feature spec directory
2. `squad-context.md` has been generated (run `squad-speckit-bridge context` first)
3. No unresolved blockers from previous ceremonies

## Review Checklist

- [ ] **Completeness**: Are all requirements from `spec.md` covered by tasks?
- [ ] **Ordering**: Do task dependencies match architectural constraints?
- [ ] **Decision alignment**: Do tasks respect active decisions in `decisions.md`?
- [ ] **Scope boundaries**: Are tasks appropriately scoped (not too large, not too granular)?
- [ ] **Risk identification**: Are high-risk tasks flagged and sequenced early?
- [ ] **Knowledge gaps**: Do any tasks require expertise not currently on the team?

## Approval Criteria

- **Approved**: All checklist items pass, no high-severity findings
- **Changes Requested**: Medium/high findings exist — revise tasks and re-review
- **Blocked**: Critical decision conflict or missing prerequisite — escalate to Product Owner

## Output

A `review.md` file in the spec directory containing:
- Review timestamp and participants
- Findings (categorized by type and severity)
- Approval status
- Action items for revision (if changes requested)

## Post-Ceremony

1. If approved: Lead or Coordinator creates GitHub issues from approved tasks
2. If changes requested: Update `tasks.md`, re-run ceremony
3. Record ceremony outcome in orchestration log
