# Decision: Spec 009 Issue Creation Strategy

**Date:** 2026-03-25
**Author:** Richard (Lead)
**Status:** Executed
**Spec:** `specs/009-knowledge-feedback-loop/`

## Context

Juanma requested creation of 17 GitHub issues from the spec 009 tasks.md, with full dependency wiring and squad label for triage routing.

## Decision

Created issues #349–#365 in sequential order (T001→T017) to enable correct dependency referencing. Each issue body contains:
- Full task description from tasks.md (what to implement + tests)
- Phase classification
- Upstream dependency links (issue numbers)
- Parallel execution notes
- Spec reference

## Routing Notes

- All issues labeled `squad` for Lead triage assignment
- Parallel-capable tasks additionally labeled `parallelizable` (T007/T008, T014/T015, T016/T017)
- No squad member assignments yet — Lead will assign during triage based on availability and expertise
- Recommended assignment pattern: entity/use-case tasks → one developer, adapter tasks → parallel developers

## Risk

- Phase 2 (T002–T004) is a hard blocker for all user stories — prioritize this first
- T007∥T008 and T014∥T015 are true parallel pairs but require T006 and T010 respectively to be done first
