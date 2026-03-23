# Research: Bridge Self-Validation & Knowledge Loop

**Feature**: 004-bridge-self-validation | **Date**: 2025-07-17

## R1: Context Generation Architecture — How to Summarize Squad Memory Within Budget

### Decision
Use the existing progressive summarization pipeline (`summarizer.ts`) with cycle-aware incremental reads. The current `buildSquadContext` use case already supports reading skills, decisions, and learnings from Squad memory, detecting previous generation cycles, and applying recency-biased scoring. The primary work is ensuring the **output format** (`squad-context.md`) is structured for SpecKit agent consumption and that the end-to-end path through `sqsk context <spec-dir>` works reliably against real `.squad/` directories.

### Rationale
- The use case (`bridge/context.ts`), ports (`bridge/ports.ts`), and adapters (`bridge/adapters/squad-file-reader.ts`, `bridge/adapters/speckit-writer.ts`) already exist with the correct Clean Architecture layering.
- The `SquadStateReader` port already defines `readSkills()`, `readDecisions()`, and `readLearnings(since?: Date)` methods.
- The `ContextWriter` port already defines `write(summary)` and `readPreviousMetadata()` for cycle detection.
- Missing: validation against real `.squad/` structures (7 agents with charters/histories, 2 skills, 366-line decisions.md, 12 orchestration logs). Need integration tests with realistic fixtures.
- Missing: graceful handling of partial `.squad/` structures (e.g., no `agents/` dir, empty `skills/`).

### Alternatives Considered
1. **LLM-based summarization** — Rejected: adds non-deterministic dependency, violates offline constraint, and makes testing unreliable.
2. **Simple concatenation with truncation** — Rejected: loses recency signal, no prioritization. Already surpassed by existing `computeRelevanceScore()` approach.
3. **External summarization service** — Rejected: unnecessary complexity for file-based knowledge base of this size (~20 KB total).

---

## R2: Issue Creation Hardening — Batch, Deduplication, Rate Limiting

### Decision
Extend the existing `createIssuesFromTasks` use case with three capabilities: (1) batch creation with configurable concurrency to avoid GitHub rate limits, (2) deduplication by querying existing issues before creation, and (3) hierarchical label taxonomy support (`area/*`, `type/*`, `agent/*`). The `GitHubIssueAdapter` currently shells out to `gh` CLI — this remains the right approach (avoids adding `@octokit/rest` as a direct dependency).

### Rationale
- The existing `IssueCreator` port defines `create(task, labels, repo)` and `createBatch(tasks, labels, repo)`. The `createBatch` method is already in the port but the adapter implementation is minimal.
- `gh issue create` and `gh issue list` are the safest GitHub API abstraction — no OAuth token management, leverages user's existing `gh auth`.
- Rate limiting: `gh` CLI handles basic rate limiting internally, but for 20+ issues, we need sequential creation with configurable delay (100-500ms between calls).
- Deduplication: query `gh issue list --label squad,speckit --state open --json title` before creating, match on task title.
- Hierarchical labels: the `create` call already accepts `labels: string[]`. The enrichment logic (mapping task metadata → label prefixes) belongs in the use case, not the adapter.

### Alternatives Considered
1. **@octokit/rest direct integration** — Rejected: adds a large dependency for a feature achievable with `gh` CLI. Would require token management in the adapter. Constitution says frameworks stay in outermost layer — `gh` is already at that boundary.
2. **GitHub Actions for issue creation** — Rejected: requires CI infrastructure, not available for local development workflows.
3. **Parallel batch creation** — Rejected for v0.2: sequential with delay is simpler and sufficient for 20–30 issues. Can optimize to parallel later if needed.

---

## R3: Learning Sync — Extracting Structured Learnings from Agent History

### Decision
The `syncLearnings` use case reads execution results from a spec directory and writes them to Squad memory via the `SquadMemoryWriter` port. For this feature, we need to extend the extraction to also parse agent history files (`.squad/agents/*/history.md`) for implementation-phase entries, detect new entries since last sync using the `SyncState` timestamp, and write structured learning entries with categorized metadata (pattern, decision, problem, insight).

### Rationale
- The `SyncStateReader` interface already defines `readSyncState()`, `writeSyncState()`, and `readSpecResults()`.
- The `SquadMemoryWriter` port defines `writeLearning(agentName, title, content)` and `writeDecision(title, content)`.
- Agent history files in `.squad/agents/*/history.md` contain timestamped entries from agent execution. The sync logic needs to parse these and filter by recency.
- The idempotency requirement (FR-011) is satisfied by tracking `lastSyncTimestamp` in `SyncState` and only processing newer entries.
- Currently `readSpecResults` reads from spec dir — needs extension to also read from `.squad/agents/` for the full learning capture path.

### Alternatives Considered
1. **Event-driven sync** (file watchers) — Rejected: adds runtime complexity, doesn't fit the CLI invocation model.
2. **Git-based diffing** (sync based on commits since last sync) — Rejected: tightly couples sync to git workflow, won't work if agents write directly to files without commits.
3. **Database-backed sync state** — Rejected: overkill for tracking a single timestamp + history array. File-based JSON state is sufficient.

---

## R4: Design Review — Spec-vs-Implementation Comparison

### Decision
Extend the existing `prepareReview` use case (which currently cross-references tasks against decisions/learnings) to also support a **spec-vs-implementation** comparison mode. This new mode reads `spec.md` functional requirements (FR-XXX entries), scans the implementation source tree for matching code/test coverage, and produces a coverage matrix. The existing keyword-matching approach in `ceremony.ts` is extended with requirement extraction from spec markdown.

### Rationale
- The existing `prepareReview` does task-vs-squad-state review. The spec asks for `sqsk review` to also compare spec against implementation (FR-013, FR-014, FR-015).
- Two review modes: (1) pre-implementation design review (existing — task ordering, decision conflicts), (2) post-implementation fidelity review (new — spec requirement coverage).
- Requirement extraction: parse `spec.md` for lines matching `- **FR-XXX**:` pattern. For each, search implementation files for matching functionality markers.
- Implementation coverage: use keyword matching + test file presence as heuristics. Not full semantic analysis — that would require LLM.
- The `TasksReader` port needs extension to also read spec files, or a new `SpecReader` port.

### Alternatives Considered
1. **LLM-based semantic comparison** — Rejected: non-deterministic, violates offline constraint, expensive for a CLI tool.
2. **AST-based analysis** — Rejected: over-engineered for the current scope. Keyword heuristics are sufficient for identifying coverage gaps.
3. **Manual checklist generation only** — Rejected: doesn't satisfy FR-013/FR-014's requirement for structured, automated comparison.

---

## R5: Agent Prompt Integration — Closing the Hook Gap

### Decision
Modify SpecKit agent prompt files (`.github/agents/*.agent.md` and `.github/prompts/*.prompt.md`) to include explicit bridge command invocations at appropriate workflow points. Specifically:
- `speckit.specify` → run `sqsk context` before generating spec
- `speckit.plan` → run `sqsk context` before generating plan (already partially done via `update-agent-context.sh`)
- `speckit.tasks` → offer `sqsk issues` after task generation
- `speckit.implement` → run `sqsk sync` after implementation completes

Include graceful detection: check if `sqsk` command exists before invoking; warn if missing.

### Rationale
- Hooks (`before_specify`, `after_tasks`, `after_implement`) are defined in `.specify/extensions/squad-bridge/extension.yml` but SpecKit agents run through Copilot's agent framework, which never triggers filesystem hooks.
- Agent prompt files are the correct integration point — they're read by Copilot before each agent execution.
- The modification is purely additive: insert bridge invocation instructions without removing existing functionality.
- Detection via `command -v sqsk` or `which sqsk` in a bash step, with fallback warning.

### Alternatives Considered
1. **MCP server integration** — Rejected for v0.2: MCP is deferred to v1.0 (Phase 3 in delivery roadmap). Agent prompts are the immediate solution.
2. **Copilot extension hooks** — Not available: Copilot agent framework doesn't support lifecycle hooks the way a CLI does.
3. **Pre-flight script wrapper** — Rejected: would require users to change their invocation pattern. Embedding in prompts is transparent.

---

## R6: Task Generation Calibration — Achieving 15–20 Tasks

### Decision
This is primarily a **template/prompt engineering** concern, not a code change. The task generation template (`.specify/templates/tasks-template.md`) and the `speckit.tasks` agent prompt need calibration to produce coarser-grained tasks that bundle related changes (entity + tests + registration) into single work items. The code change is minimal: update the tasks template to include explicit guidance on task granularity, grouping rules, and mandatory "Tests" subsection format.

### Rationale
- In v0, task generation produced ~50 tasks because the template encouraged fine-grained decomposition.
- The fix is in the template/prompt layer, not in bridge source code.
- The bridge code only needs to handle the output (issues from tasks.md) — it's agnostic to task count.
- Constitution Task Ordering Rule already specifies correct ordering (Entities → Use Cases → Adapters → Drivers); the template just needs to enforce grouping at each layer.

### Alternatives Considered
1. **Programmatic task merging** — Rejected: over-engineered. Template guidance is simpler and more maintainable.
2. **Hard task count limits in bridge code** — Rejected: violates separation of concerns (bridge shouldn't enforce SpecKit's task generation policy).
3. **Post-processing coalescing** — Rejected: better to generate correctly than to fix after generation.

---

## R7: Agent Distribution Analysis — Imbalance Detection

### Decision
Add a new pure entity function `analyzeDistribution(assignments: AgentAssignment[])` that computes distribution metrics and flags when any agent exceeds 50% of total tasks. This is a pure computation with no I/O — fits cleanly in the entity layer. The coordinator can invoke this after issue assignment and display warnings in CLI output.

### Rationale
- The computation is simple: count issues per agent, compute percentages, flag threshold violations.
- Pure function in entity layer — no adapter needed, just input/output types.
- The coordinator's assignment data comes from GitHub issue labels (`agent/*`), which is already available via `gh issue list`.
- Rebalancing suggestions need agent skill data from `.squad/skills/` and `.squad/agents/*/charter.md` — already readable via `SquadStateReader`.

### Alternatives Considered
1. **Real-time monitoring service** — Rejected: overkill for a CLI tool. Point-in-time analysis is sufficient.
2. **GitHub Actions-based monitoring** — Rejected: adds CI dependency for an advisory feature.

---

## R8: Skills-Aware Routing — Matching Skills to Tasks

### Decision
Add a `matchSkillsToTask(task: TaskEntry, skills: SkillEntry[])` entity function that scores relevance using keyword overlap between task description and skill patterns/context. The coordinator adapter reads skill files, the entity scores matches, and the top-N skills are injected into spawn prompts with size-aware truncation respecting context window limits.

### Rationale
- Skills are documented in `.squad/skills/*/SKILL.md` with structured sections (patterns, anti-patterns, context).
- The `SkillEntry` type already exists in `types.ts` with `name`, `context`, `patterns[]`, `antiPatterns[]`, `rawSize`.
- Keyword-based matching aligns with the spec assumption: "Skills are matched to tasks by keyword and topic relevance rather than a formal taxonomy."
- Context window limits: sum `rawSize` of matched skills, truncate/summarize if total exceeds configurable threshold.

### Alternatives Considered
1. **Embedding-based semantic matching** — Rejected: requires vector DB or LLM API, violates offline constraint.
2. **Manual skill-to-agent mapping** — Rejected: doesn't scale and doesn't capture task-level relevance.

---

## R9: Dead Code Audit — Identification and Cleanup Strategy

### Decision
Use Vitest coverage reports (V8 provider) to identify uncovered code paths. Cross-reference with CLI command usage analysis: of 7 commands (`install`, `status`, `context`, `review`, `issues`, `sync`, `demo`), assess which code paths are tested vs. untested. For commands being fixed in this feature (`context`, `issues`, `sync`, `review`), exercise dead code via new tests. For code not associated with any active command, remove it. Track changes in CHANGELOG.md.

### Rationale
- Vitest + V8 coverage is already configured in `vitest.config.ts`.
- The 20 existing test files provide baseline coverage. After running tests, uncovered lines map directly to dead code candidates.
- Dead code categories: (a) adapter methods never called by use cases, (b) entity functions never called by any layer, (c) entire modules for unused features.
- The `demo/` module (7 files, ~600 LOC) needs evaluation: if the demo command is actively maintained, it stays; otherwise it's a dead code candidate.

### Alternatives Considered
1. **Static analysis tools** (e.g., `ts-prune`, `knip`) — Complementary approach. Can be used alongside coverage for export-level dead code detection. Worth adding as a devDependency.
2. **Manual audit only** — Rejected: too error-prone for ~5,600 LOC. Coverage-based approach is systematic.
