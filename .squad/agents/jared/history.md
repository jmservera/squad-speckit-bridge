# Jared — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Data Analyst
- **Joined:** 2026-03-23T08:50:38.333Z

## Learnings

<!-- Append learnings below -->

### 2026-03-23: Real-World Framework Comparison (sofia-cli vs aithena)

Analyzed two projects by the same developer using Spec Kit (sofia-cli) and Squad (aithena).

**Key findings:**
- **Framework weight must match team size.** Squad's 12-agent model created coordination tax for a solo developer. Spec Kit's zero-agent approach was right-sized for solo + Copilot.
- **State accumulation is the silent killer.** aithena's decisions.md hit 475KB — context window poison. Both frameworks need automatic pruning. This is the #1 practical friction point.
- **Project type drives framework fit more than framework quality.** Greenfield → Spec Kit (spec-per-feature planning). Brownfield → Squad (issue routing, milestone management). The comparison must account for this.
- **Spec-per-feature and issue-per-task are complementary, not competing.** Specs work for new features; issues work for maintenance. A combined model would serve both.
- **Constitutional governance (Spec Kit) scales better for consistency than distributed decisions (Squad).** One 15KB constitution vs 475KB+ across 5 files.
- **GitHub integration depth should be progressive.** 0 issues (sofia-cli) vs 412 issues (aithena) — both valid for their context.
- **Quantitative signals matter:** 350+ Squad config files vs ~30 Spec Kit files. 239 log files vs 0. The overhead ratio is roughly 10:1.

**Deliverables:** `research-jared-example-analysis.md` (main report), `.squad/decisions/inbox/jared-example-patterns.md` (comparison insights).

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team research results (simultaneous background execution):**
- Gilfoyle: architectural analysis shows complementary layers
- Richard: proposes pipeline integration (planning → execution)
- Dinesh: confirms technical feasibility with minimal bridge

**Cross-team decision impact:**
All findings merged into decisions.md with governance guidance:
- Framework weight must scale with team size
- State accumulation is critical risk → automatic pruning required
- Progressive GitHub integration levels recommended
- Constitutional governance layer should complement Squad's decision model

**Generic patterns extracted for personal squad:**
Four reusable patterns documented in `.squad/extract/` for future projects:
1. State pruning as framework feature
2. Constitutional governance at scale
3. Progressive GitHub integration
4. Team-size-driven framework configuration

### 2026-03-24: T037 — Entity Validation Tests (#241)

Wrote 60 unit tests for demo entity layer in `tests/demo/entities.test.ts`:
- **StageStatus**: enum values, transition paths (pending → running → success/failed)
- **DemoConfiguration**: defaults, flag behavior (dryRun affects issues command), timeout fallback
- **PipelineStage**: structure, timing fields, stage ordering (5 stages: specify → plan → tasks → review → issues)
- **DemoArtifact**: validation states, error arrays, existence checks
- **ExecutionReport**: derived properties (completed + failed = total), cleanup logic, artifact preservation on failure
- **Utility functions**: generateTimestamp, formatFileSize, formatElapsedTime, createDemoDirectory

All 243 tests pass (183 existing + 60 new). Pushed to `squad/241-entity-tests`, closes #241.

**Pattern:** Test factories (makeConfig, makeStage, makeReport) with Partial<T> overrides — consistent with existing types.test.ts pattern.
