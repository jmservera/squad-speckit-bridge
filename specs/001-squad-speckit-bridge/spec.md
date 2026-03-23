# Feature Specification: Squad-SpecKit Knowledge Bridge

**Feature Branch**: `001-squad-speckit-bridge`  
**Created**: 2025-07-24  
**Status**: Draft  
**Input**: User description: "Build a hybrid integration package that connects Squad's persistent team memory with Spec Kit's structured planning, creating a bidirectional knowledge flow loop between both frameworks."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Bridge Installation and Setup (Priority: P1)

A developer who already uses both Squad and Spec Kit in their repository wants to connect the two frameworks. They install the bridge package once, and both frameworks immediately gain awareness of each other. Squad agents learn how to read Spec Kit artifacts, and Spec Kit gains a hook that notifies the team when tasks are ready for review. No changes are needed to either framework's core files.

**Why this priority**: Without installation, nothing else works. This is the foundation — a single setup step that deploys components to both sides. If this story alone ships, developers can manually use the bridge even without automation.

**Independent Test**: Can be fully tested by running the install process in a repository that has both `.squad/` and `.specify/` directories and verifying that the expected files appear in both framework directories without altering any existing files.

**Acceptance Scenarios**:

1. **Given** a repository with both Squad (`.squad/`) and Spec Kit (`.specify/`) initialized, **When** the developer runs the bridge installation, **Then** a Squad skill file is installed to `.squad/skills/`, a Spec Kit extension is registered in `.specify/extensions/`, and a shared bridge component is placed in a known location — all without modifying any pre-existing Squad or Spec Kit files.
2. **Given** a repository with only Squad initialized (no `.specify/`), **When** the developer runs the bridge installation, **Then** the installer reports that Spec Kit is not detected and installs only the Squad-side components with a message explaining how to complete setup after Spec Kit is initialized.
3. **Given** a repository with only Spec Kit initialized (no `.squad/`), **When** the developer runs the bridge installation, **Then** the installer reports that Squad is not detected and installs only the Spec Kit-side components with a message explaining how to complete setup after Squad is initialized.
4. **Given** a repository where the bridge is already installed, **When** the developer runs installation again, **Then** existing bridge files are updated in place (not duplicated) and a summary of what changed is displayed.

---

### User Story 2 — Memory Bridge: Squad Knowledge Flows Into Spec Kit Planning (Priority: P1)

A developer is about to start a new planning cycle with Spec Kit. Before running the specify command, they want Spec Kit's planning to benefit from everything their Squad team has learned — past decisions, skills the team has acquired, and lessons from previous work. They run a bridge command that reads Squad's memory and produces a context summary that Spec Kit can consume during planning.

**Why this priority**: This is the core value proposition — the knowledge flywheel starts here. Without this, Spec Kit plans in ignorance of everything the team has learned, and every planning cycle starts from zero. This story delivers immediate, measurable improvement to specification quality.

**Independent Test**: Can be tested by running the bridge command in a repository with Squad memory artifacts (decisions, skills, agent histories) and verifying that a context summary is produced in the spec directory with relevant, prioritized content from Squad's knowledge base.

**Acceptance Scenarios**:

1. **Given** a repository with Squad memory containing decisions, skills, and agent histories, **When** the developer runs the memory bridge command before a Spec Kit planning phase, **Then** a context summary is produced in the active spec directory that includes: relevant skills (highest priority), applicable team decisions, and summarized agent learnings — ordered by signal value.
2. **Given** a repository where Squad's decisions file is very large (100KB+), **When** the memory bridge runs, **Then** it produces a context summary that stays under a configurable size limit (default: 8KB), prioritizing recent and relevant entries over historical ones.
3. **Given** a repository with no Squad memory artifacts (empty `.squad/`), **When** the developer runs the memory bridge, **Then** it produces a minimal context summary noting that no prior team knowledge exists, and completes without errors.
4. **Given** the memory bridge has run and produced a context summary, **When** the developer subsequently runs Spec Kit's specify or plan commands, **Then** the planning phase has access to the Squad context and can reference team knowledge in its output.

---

### User Story 3 — Design Review Ceremony: Squad Team Vets Spec Kit Tasks (Priority: P1)

After Spec Kit generates a task breakdown (`tasks.md`), the developer wants their Squad team to review it before any GitHub issues are created. The Squad Lead convenes the team in a Design Review ceremony where agents with domain expertise evaluate the tasks for completeness, risk, and alignment with prior decisions. Issues are only created after the team approves the task list.

**Why this priority**: This is the quality gate that prevents "technically correct but strategically naive" task breakdowns. Spec Kit plans from specifications alone — it doesn't know about fragile modules, tricky integrations, or decisions made in previous work. The ceremony is where compound team knowledge corrects planning blind spots. Without it, you lose the feedback loop.

**Independent Test**: Can be tested by generating a `tasks.md` via Spec Kit, triggering the review ceremony, and verifying that Squad agents produce review feedback that references their accumulated knowledge (decisions, history) and that no issues are created until the review is complete.

**Acceptance Scenarios**:

1. **Given** Spec Kit has generated a `tasks.md` file in a feature spec directory, **When** the developer triggers the Design Review ceremony (or it auto-triggers via hook), **Then** Squad agents with relevant expertise review the task breakdown and produce feedback — identifying risks, missing tasks, ordering issues, or alignment conflicts with prior team decisions.
2. **Given** the Design Review ceremony is in progress, **When** a Squad agent identifies a task that conflicts with a recorded team decision, **Then** the conflict is flagged with a reference to the specific decision entry, and a recommendation is provided.
3. **Given** the Design Review ceremony completes with approval, **When** the developer proceeds to create issues, **Then** the task-to-issue creation process incorporates any modifications or notes from the review.
4. **Given** the Design Review ceremony completes with requested changes, **When** the developer reviews the feedback, **Then** they can update `tasks.md` and re-trigger the review without starting the entire Spec Kit pipeline over.

---

### User Story 4 — Feedback Loop: Execution Learnings Flow Back to Squad Memory (Priority: P2)

After Squad agents execute tasks from a Spec Kit plan and complete their work, the learnings they accumulate during execution (written to their `history.md` files and to `decisions.md`) are automatically available for the next planning cycle. The developer doesn't need to manually transfer knowledge — the bridge ensures that execution experience compounds over time.

**Why this priority**: This completes the knowledge flywheel. Without it, the bridge is one-directional (Squad→SpecKit) and the system doesn't improve over time. With it, each planning cycle benefits from all prior execution experience, creating compound improvement.

**Independent Test**: Can be tested by running two full cycles (plan→execute→plan) and verifying that the second cycle's context summary includes learnings from the first cycle's execution.

**Acceptance Scenarios**:

1. **Given** Squad agents have completed tasks and written new entries to their `history.md` files and to `decisions.md`, **When** the memory bridge runs for the next planning cycle, **Then** the new learnings appear in the context summary produced for Spec Kit, demonstrating that execution knowledge flows back into planning.
2. **Given** multiple planning-execution cycles have occurred, **When** the memory bridge runs, **Then** it applies progressive summarization — recent learnings are presented with more detail than older ones, preventing context summary bloat.

---

### User Story 5 — Automated Hook Trigger on Task Generation (Priority: P2)

When Spec Kit generates tasks (the `after_tasks` lifecycle event), the bridge automatically notifies the developer that a Design Review is available. The developer doesn't need to remember to trigger the review manually — the Spec Kit extension handles the notification.

**Why this priority**: Automation reduces friction and prevents the review step from being skipped accidentally. However, the core workflow functions without it (manual trigger works), so it's P2.

**Independent Test**: Can be tested by running Spec Kit's task generation and verifying that the bridge's `after_tasks` hook fires and produces the expected notification or auto-trigger behavior.

**Acceptance Scenarios**:

1. **Given** the bridge's Spec Kit extension is installed with an `after_tasks` hook, **When** Spec Kit completes task generation, **Then** the hook fires and notifies the developer that a Design Review ceremony is available, including the path to the generated `tasks.md`.
2. **Given** the bridge extension is installed but the developer has disabled the hook, **When** Spec Kit completes task generation, **Then** no notification is produced and the workflow proceeds normally.

---

### User Story 6 — Squad Agents Learn Spec Kit Methodology (Priority: P3)

Squad agents who have the bridge skill installed understand Spec Kit's artifacts and methodology. When asked about planning or specifications, they can reference Spec Kit concepts (specs, plans, tasks, constitution) and know how to read and interpret these documents. This makes the team "bilingual" across both frameworks.

**Why this priority**: This is valuable for team coherence but not blocking. Agents can work without understanding Spec Kit's methodology — the bridge handles translation. This skill improves the quality of agent contributions during reviews and discussions.

**Independent Test**: Can be tested by asking a Squad agent a question about Spec Kit artifacts (e.g., "What does the spec say about X?") and verifying it can locate and interpret the relevant document.

**Acceptance Scenarios**:

1. **Given** a Squad agent has the bridge skill installed, **When** the agent is asked to review a Spec Kit artifact (spec.md, plan.md, or tasks.md), **Then** it demonstrates understanding of the document's structure, purpose, and how it relates to the Squad workflow.
2. **Given** a Squad agent has the bridge skill installed, **When** the agent participates in a Design Review ceremony, **Then** it can reference both the Spec Kit task breakdown and its own accumulated knowledge to provide informed feedback.

---

### Edge Cases

- What happens when Squad's `decisions.md` contains entries that contradict Spec Kit's `constitution.md`? The bridge should surface the contradiction in the context summary with references to both documents, but not attempt to resolve it automatically — governance conflicts require human judgment.
- What happens when the memory bridge runs but the target spec directory doesn't exist yet? The bridge should fail gracefully with a clear error message indicating which directory is expected.
- What happens when Squad's memory artifacts are in an unexpected format (e.g., corrupted markdown, missing required sections)? The bridge should skip malformed files with a warning, process whatever it can, and include a note about skipped files in the context summary.
- What happens when the developer runs the bridge in a repository where both frameworks are initialized but have never been used (all files are empty/template)? The bridge should produce a valid but minimal context summary, not fail.
- What happens when `tasks.md` references file paths or modules that don't exist in the repository? The Design Review ceremony should flag these as potential issues, leveraging Squad agents' knowledge of the actual codebase.
- What happens when the bridge is installed but one framework is later removed (e.g., `rm -rf .squad/`)? The bridge components on the remaining side should detect the missing framework and operate in degraded mode with appropriate warnings.

## Requirements *(mandatory)*

### Functional Requirements

**Installation & Configuration**

- **FR-001**: The bridge MUST install into both framework directories (`.squad/skills/` and `.specify/extensions/`) from a single installation step, without requiring manual file copying.
- **FR-002**: The bridge MUST detect which frameworks are present in the repository and install only the applicable components, with clear messaging about partial installations.
- **FR-003**: The bridge MUST NOT modify any pre-existing Squad or Spec Kit files during installation or operation. All bridge artifacts are additive.
- **FR-004**: The bridge MUST support re-installation (update) without duplicating files or losing configuration. Re-installation unconditionally overwrites bridge-owned files with the current version (bridge artifacts are generated, not user-edited). The `InstallManifest` records version and timestamp for change tracking.

**Memory Bridge (Squad → Spec Kit)**

- **FR-005**: The bridge MUST read Squad's `.squad/skills/*/SKILL.md` files and include their content (or summaries) in the context output, treating skills as the highest-signal knowledge source.
- **FR-006**: The bridge MUST read Squad's `.squad/decisions.md` and include relevant decisions in the context output, filtering for recency and relevance.
- **FR-007**: The bridge MUST read Squad's `.squad/agents/*/history.md` files and include summarized agent learnings in the context output, applying progressive summarization to keep the output concise.
- **FR-008**: The bridge MUST produce a context summary (`squad-context.md`) in the active spec directory that is consumable by Spec Kit's planning phases.
- **FR-009**: The bridge MUST enforce a configurable maximum size for the context summary (default: 8KB) to prevent context pollution.
- **FR-010**: The bridge MUST be read-only with respect to Squad's `.squad/` directory — it reads Squad state but never writes to it.

**Design Review Ceremony**

- **FR-011**: The bridge MUST define a Design Review ceremony that Squad can execute, where agents review a Spec Kit-generated `tasks.md` for completeness, risk, and alignment with team knowledge.
- **FR-012**: The ceremony MUST produce structured feedback that identifies: missing tasks, risk areas, ordering issues, and conflicts with recorded team decisions.
- **FR-013**: The ceremony MUST NOT create GitHub issues — issue creation happens only after the review is complete and approved.

**Spec Kit Extension**

- **FR-014**: The bridge MUST register a Spec Kit extension with an `after_tasks` hook that notifies the developer when a Design Review is available.
- **FR-015**: The `after_tasks` hook MUST be disablable by the developer without uninstalling the bridge.

**Knowledge Feedback Loop**

- **FR-016**: The bridge MUST support the full knowledge loop: Squad memory → context summary → Spec Kit planning → tasks → Design Review → issues → execution → agent learnings → Squad memory (available for next cycle).
- **FR-017**: The bridge MUST apply progressive summarization to prevent the context summary from growing unboundedly across cycles.

**Squad Skill**

- **FR-018**: The bridge MUST provide a Squad skill that teaches agents about Spec Kit's artifact structure (spec.md, plan.md, tasks.md, constitution.md) and their purpose in the development workflow.

**Resilience**

- **FR-019**: The bridge MUST handle missing or malformed input files gracefully — skipping what it cannot parse and reporting warnings without failing the entire operation.
- **FR-020**: The bridge MUST detect when one framework is absent and operate in degraded mode: silently skip unavailable operations and emit a warning to stderr indicating which framework is missing and how to complete the setup. No interactive confirmation is required — degraded mode is non-blocking.
- **FR-021**: The bridge CLI MUST support a `--verbose` flag that emits diagnostic output to stderr: files being processed, files skipped (with reason), byte counts during summarization, and timing information. This flag is orthogonal to `--json` (which controls stdout format).

### Key Entities

- **Context Summary**: A document (placed in the spec directory) containing prioritized knowledge extracted from Squad's memory. Attributes: source files read, timestamp, size, priority-ordered content sections (skills, decisions, learnings).
- **Design Review Record**: The structured output of a Design Review ceremony. Attributes: reviewed artifact path, participating agents, findings (risks, gaps, conflicts), approval status (one of: `pending`, `approved`, `changes_requested`), recommended changes. Lifecycle: created as `pending` when review is triggered → transitions to `approved` or `changes_requested` when agents complete evaluation.
- **Bridge Configuration**: Settings controlling bridge behavior. Attributes: context size limit, hook enabled/disabled flags, which Squad memory sources to include, summarization preferences.
- **Bridge Skill**: A Squad SKILL.md file encoding knowledge about Spec Kit artifacts and methodology. Attributes: context (what Spec Kit is), patterns (how to read its artifacts), anti-patterns (common mistakes when interpreting Spec Kit output).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can install the bridge in under 5 minutes and have both frameworks aware of each other, verified by the presence of bridge components in both `.squad/` and `.specify/` directories.
- **SC-002**: The memory bridge produces a context summary in under 30 seconds, even when processing repositories with large Squad memory (100KB+ decisions, 10+ agent histories).
- **SC-003**: The context summary stays within the configured size limit (default 8KB) regardless of input size, while preserving the highest-signal content (skills first, then decisions, then learnings).
- **SC-004**: After a Design Review ceremony, at least 80% of identified task issues (missing tasks, risk areas, decision conflicts) are substantive — not false positives or generic feedback.
- **SC-005**: The bridge operates without modifying any pre-existing framework files — verified by comparing checksums of all `.squad/` and `.specify/` files before and after bridge operations.
- **SC-006**: The full knowledge loop (plan → execute → learn → re-plan) demonstrates measurable improvement: the context summary for cycle N+1 contains learnings from cycle N, and those learnings are referenced in the subsequent specification or plan output.
- **SC-007**: The bridge adds zero overhead to developers who don't use it — both frameworks function identically with or without the bridge installed, verified by running each framework's standard workflow independently.
- **SC-008**: Installation succeeds on repositories using any combination of Squad and Spec Kit, including partial setups (only one framework present), and provides clear next-step guidance for completing the integration.

## Assumptions

- Both Squad and Spec Kit are installed and initialized in the target repository before bridge installation (or the developer accepts a partial install for the framework that is present).
- Squad's memory artifacts (decisions.md, history.md, SKILL.md) follow the standard markdown formats documented in each framework's specification. Non-standard formats are handled gracefully but may produce reduced-quality summaries.
- The developer has sufficient filesystem permissions to write to both `.squad/` and `.specify/` directories.
- Spec Kit's `after_tasks` hook mechanism is available and functional as documented. The bridge does not require hooks that don't yet exist (notably, `before_specify` and `before_plan` are not required — the memory bridge is triggered manually or via a separate command).
- Squad's ceremony system supports custom ceremony definitions that can be added via skill/plugin installation.
- The bridge is designed for the current state of both frameworks and may need updates if either framework introduces breaking changes to its file formats or extension systems.
- Context summary size limits are advisory for planning quality, not hard security boundaries.

## Clarifications

### Session 2025-07-25

- Q: Should degraded mode (FR-020) silently skip operations, require explicit confirmation, or fail with guidance? → A: **Silent skip with stderr warning.** Degraded mode proceeds non-blocking, emitting a warning to stderr with the missing framework name and setup instructions. Rationale: CLI tools in automated workflows must not prompt. Partial installs are explicitly supported by US1 acceptance scenarios 2–3. Aligns with Unix convention and SC-007 (zero overhead).

- Q: What approval states can a Design Review Record have? → A: **Three-state lifecycle: `pending` → `approved` | `changes_requested`.** Created as `pending` when review is triggered; transitions to `approved` (US3 scenario 3) or `changes_requested` (US3 scenario 4) when agents complete evaluation. A fourth state (`in_progress`) was rejected as unnecessary — the review is a one-shot evaluation, not an iterative process.

- Q: The spec uses "context summary", "context document", and "context summary document" interchangeably — which is canonical? → A: **"context summary"** is the canonical term (matches the `ContextSummary` entity name). All instances of "context document" and "context summary document" normalized to "context summary" throughout the spec.

- Q: What observability should the CLI provide for diagnosing issues during context generation or review? → A: **Single `--verbose` flag** emitting diagnostic output to stderr (files processed, files skipped with reason, byte counts, timing). Added as FR-021. Two debug levels (verbose + debug) rejected as over-engineering for a ~300 LOC tool. The `--verbose` flag is orthogonal to `--json` (which controls stdout format).

- Q: How should the bridge handle version compatibility when re-installing artifacts (FR-004)? → A: **Unconditional overwrite.** Bridge-owned artifacts (SKILL.md, extension.yml, ceremony.md) are generated templates, not user-edited. Re-installation always overwrites with the current version. The `InstallManifest` tracks version and timestamps for diagnostics. SemVer checking rejected as premature for v0.1. FR-004 updated to reflect this.
