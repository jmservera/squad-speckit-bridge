# Feature Specification: Knowledge Feedback Loop (Reverse Sync)

**Feature Branch**: `009-knowledge-feedback-loop`  
**Created**: 2026-03-25  
**Status**: Draft  
**Input**: User description: "Implement a reverse sync mechanism that closes the knowledge feedback loop in the Squad-SpecKit bridge. Currently, squask sync only flows forward (spec results → Squad memory). The reverse path is missing: implementation learnings from Squad agents should flow back to spec artifacts (learnings.md, constitution.md) after execution."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manual Reverse Sync After Implementation (Priority: P1)

A bridge operator has completed a Squad implementation cycle for a feature. The agents have finished their work, written decisions, and captured learnings in their history files. The operator wants to harvest those implementation learnings and archive them into the corresponding spec directory so the knowledge is preserved for future planning cycles.

The operator runs a single CLI command targeting the spec directory. The system reads Squad agent histories and team decisions, filters them for relevance to the feature, removes any secrets or personally identifiable information, deduplicates against previously synced content, and generates a structured `learnings.md` file in the spec directory.

**Why this priority**: This is the core value proposition — closing the feedback loop. Without this, implementation knowledge stays trapped in Squad memory and never enriches the planning layer. Every other story depends on this foundational capability.

**Independent Test**: Can be fully tested by running the CLI command against a spec directory with existing Squad state files and verifying that `learnings.md` is created with correctly filtered, deduplicated content.

**Acceptance Scenarios**:

1. **Given** a completed implementation cycle with agent history entries and team decisions in the Squad directory, **When** the operator runs the reverse sync command targeting a spec directory, **Then** a `learnings.md` file is created in that spec directory containing categorized, privacy-filtered insights extracted from agent histories and decisions.
2. **Given** a spec directory that already has a `learnings.md` from a previous reverse sync, **When** the operator runs reverse sync again with new agent learnings available, **Then** only new (non-duplicate) learnings are appended and no existing content is lost or duplicated.
3. **Given** agent history entries that contain API keys, tokens, or email addresses, **When** reverse sync processes those entries, **Then** the generated `learnings.md` contains redacted placeholders instead of sensitive values.
4. **Given** an empty Squad state (no agent histories, no decisions), **When** the operator runs reverse sync, **Then** the system reports that no learnings were found and does not create an empty `learnings.md`.

---

### User Story 2 — Dry Run Preview Before Writing (Priority: P1)

A bridge operator wants to preview what reverse sync would produce before committing any changes to the spec directory. This lets them verify the content, check for privacy leaks, and confirm the scope of extracted learnings without side effects.

**Why this priority**: Equal to P1 because operators need confidence that the system will not write inappropriate content. Dry run is the safety mechanism that enables adoption of the manual ceremony.

**Independent Test**: Can be fully tested by running the reverse sync command with a dry-run flag and verifying that output is displayed but no files are written to disk.

**Acceptance Scenarios**:

1. **Given** Squad state with agent histories and decisions, **When** the operator runs reverse sync with the dry-run option, **Then** the system displays the learnings that would be written (including counts and categories) but does not create or modify any files in the spec directory.
2. **Given** a dry-run that surfaces potential privacy concerns, **When** the operator reviews the preview output, **Then** they can see exactly what content would be written, including any redaction markers, before deciding to proceed with a real sync.

---

### User Story 3 — Constitution Enrichment from Cross-Feature Learnings (Priority: P2)

Over multiple implementation cycles, certain learnings emerge that are **non-negotiable constraints for writing specifications and creating plans** — not implementation details, but principles that must hold across all future features. The bridge operator wants only these high-level, spec/plan-relevant non-negotiables to enrich the project constitution.

**Critical constraint**: The constitution is consumed as LLM context during `speckit.specify` and `speckit.plan` execution. Every token matters. Coding patterns, implementation techniques, operational experiences, and agent-specific knowledge belong in **team charters and skills** (`.squad/agents/*/history.md`, `.squad/skills/`), NOT in the constitution. The constitution must remain succinct — only principles that a spec writer or planner needs to know.

**Why this priority**: Builds on the per-feature reverse sync (P1) by adding a second write target. The constitution is the project's long-term planning memory; bloating it with implementation details degrades spec/plan quality by wasting context.

**Independent Test**: Can be fully tested by running reverse sync and verifying that only spec/plan-level non-negotiables appear in the constitution file — no coding patterns, no implementation details.

**Acceptance Scenarios**:

1. **Given** agent history entries that contain project-wide architectural non-negotiables (e.g., "all public APIs must have version negotiation"), **When** reverse sync runs, **Then** those non-negotiables are appended to the constitution with proper attribution.
2. **Given** agent history entries that contain coding patterns or implementation techniques (e.g., "use vi.doMock for testing"), **When** reverse sync runs, **Then** those entries are written to `learnings.md` but NOT to the constitution.
3. **Given** a constitution that already contains a particular principle, **When** reverse sync encounters the same principle again, **Then** it is deduplicated and not written a second time.
4. **Given** that the operator wants to skip constitution updates, **When** they run reverse sync with a flag to disable constitution writing, **Then** only the feature-specific `learnings.md` is generated.

---

### User Story 4 — Source Selection for Targeted Sync (Priority: P3)

A bridge operator wants to control which Squad knowledge sources feed into the reverse sync. For example, they may want to sync only team decisions (not full agent histories) or only skill extractions (not decisions). This gives operators granular control over what gets harvested.

**Why this priority**: Power-user capability that adds flexibility. The default behavior (all sources) covers most cases, but targeted sync is valuable for large teams with noisy histories.

**Independent Test**: Can be fully tested by running reverse sync with explicit source filters and verifying that only the specified source types appear in the output.

**Acceptance Scenarios**:

1. **Given** available sources including agent histories, decisions, and skills, **When** the operator specifies only "decisions" as the source, **Then** the generated `learnings.md` contains only insights from the decisions file and no agent history content.
2. **Given** an invalid or unrecognized source name, **When** the operator specifies it, **Then** the system reports a clear error identifying the invalid source and lists valid options.

---

### User Story 5 — Time-Gated Cooldown for Automated Sync (Priority: P3)

In a future automated workflow, the bridge should respect a cooldown period ("nap") before harvesting learnings. This ensures agents have finished documenting their work before the system collects it. The operator can configure the cooldown duration or override it for immediate sync.

**Why this priority**: Automation enabler for Phase 2. The manual ceremony (P1) works without cooldown since the human decides when to run. Cooldown becomes critical only when reverse sync is triggered automatically.

**Independent Test**: Can be fully tested by running reverse sync with a cooldown setting and verifying that only learnings older than the cooldown threshold are included.

**Acceptance Scenarios**:

1. **Given** a configured cooldown of 24 hours and agent history entries from 2 hours ago, **When** reverse sync runs, **Then** those recent entries are excluded from the output.
2. **Given** a configured cooldown of 24 hours and agent history entries from 48 hours ago, **When** reverse sync runs, **Then** those entries are included in the output.
3. **Given** the operator wants immediate sync regardless of cooldown, **When** they run with a cooldown override of zero, **Then** all qualifying learnings are included regardless of age.

---

### Edge Cases

- What happens when agent history files are malformed or contain unexpected markdown structures? The system should skip unparsable entries and report them as warnings without failing the entire sync.
- What happens when the spec directory does not exist or the path is invalid? The system should report a clear error and exit without side effects.
- What happens when the Squad directory has no `.squad/` folder? The system should report that no Squad installation was detected.
- What happens when all extracted learnings are duplicates of previously synced content? The system should report "no new learnings" and not modify any files.
- What happens when the learnings content exceeds a reasonable size? The system should summarize and cap output to prevent `learnings.md` from becoming unwieldy (guideline: 5–10 key insights per category).
- What happens when reverse sync is run concurrently (two processes at the same time)? The system should use the sync state file for coordination and prevent conflicting writes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a CLI subcommand that reads Squad implementation state and writes a structured `learnings.md` to a specified spec directory.
- **FR-002**: System MUST read from three knowledge source types: agent history files, team decisions, and skill extractions.
- **FR-003**: System MUST write extracted learnings to `specs/{id}/learnings.md` as the primary target artifact, using a structured markdown format with categorized sections (architectural insights, integration patterns, performance notes, decisions, reusable techniques, risks).
- **FR-004**: System MUST also write project-wide learnings to `.specify/memory/constitution.md` as a secondary target, unless explicitly disabled by the operator. Constitution entries MUST be limited to **non-negotiable principles relevant to spec writing and plan creation** (e.g., architectural constraints, API contracts, compatibility requirements). Coding patterns, implementation techniques, and operational knowledge MUST NOT be written to the constitution — they belong in team charters and skills.
- **FR-004a**: System MUST classify each extracted learning as either "constitution-worthy" (spec/plan-level non-negotiable) or "learnings-only" (implementation detail). Only constitution-worthy entries are written to the constitution file. All entries are written to `learnings.md`.
- **FR-005**: System MUST NOT modify `spec.md`, `plan.md`, or `tasks.md` in the spec directory under any circumstances. These are read-only artifacts after implementation.
- **FR-006**: System MUST deduplicate learnings using fingerprint hashing consistent with the existing forward sync deduplication pattern, and persist fingerprints in a sync state file to prevent duplicate entries across multiple runs.
- **FR-007**: System MUST apply privacy filtering before writing any content, masking secrets (API keys, tokens, passwords, connection strings) and stripping personally identifiable information (emails, phone numbers).
- **FR-008**: System MUST support a dry-run mode that displays what would be written without creating or modifying any files.
- **FR-009**: System MUST support source selection, allowing the operator to specify which source types to include via a CLI option.
- **FR-010**: System MUST support a configurable cooldown period that excludes learnings newer than the specified threshold, with a default that can be overridden via CLI flag.
- **FR-011**: System MUST be idempotent — running reverse sync multiple times with the same Squad state produces the same result without growing `learnings.md` unboundedly.
- **FR-012**: System MUST report a summary after execution: number of learnings extracted, number deduplicated, sources processed, and output file path.
- **FR-013**: System MUST gracefully handle missing or malformed source files by logging warnings and continuing with available sources rather than failing entirely.
- **FR-014**: System MUST track reverse sync state separately from forward sync state, using a dedicated state file to record the last reverse sync timestamp and synced fingerprints.

### Key Entities

- **Learning Entry**: A single knowledge item extracted from a Squad source. Contains a title, content body, source type (history, decision, or skill), timestamp, agent attribution, and a computed fingerprint for deduplication.
- **Reverse Sync State**: Persistent state tracking the last reverse sync timestamp, the set of previously synced fingerprints, and source metadata. Used to ensure idempotency across runs.
- **Privacy Filter**: A set of pattern-based rules applied to learning content before writing. Responsible for masking secrets and stripping PII from all output.
- **Learnings Document**: The structured markdown output written to `specs/{id}/learnings.md`. Contains categorized sections with attributed, timestamped insights organized for consumption by future planners.

## Scope & Constraints *(mandatory)*

### In Scope

- **Phase 1 (this specification)**: Manual ceremony — operator explicitly runs the reverse sync command after implementation is stable. No automatic triggering.
- Reading from agent history files, decisions file, and skills directory.
- Writing to `specs/{id}/learnings.md` (new file) and `.specify/memory/constitution.md` (append).
- Fingerprint-based deduplication using the existing hash pattern.
- Pattern-based privacy filtering for secrets and PII.
- Dry-run preview mode.
- Source selection via CLI option.
- Configurable cooldown duration.
- Sync state persistence in a dedicated state file.

### Out of Scope

- **Phase 2 (future)**: Time-gated automation via lifecycle hooks or scheduled jobs.
- **Phase 3 (future)**: Event-driven sync triggered by Squad harvest events.
- Regenerating `squad-context.md` after implementation (separate feature).
- Modifying `spec.md` with implementation notes links (spec remains frozen).
- Intelligent feature-scope detection using text-matching heuristics (Phase 1 relies on the spec directory as the implicit scope boundary).
- Skill candidate extraction and promotion to `.squad/skills/` (deferred).
- Integration with issue lifecycle (linking learnings to closed GitHub issues).

### Assumptions

- The Squad directory (`.squad/`) exists and follows the standard structure with `agents/`, `decisions.md`, and `skills/` subdirectories.
- Agent history files use the standard markdown format with dated title sections under a Learnings heading.
- The decisions file uses the standard markdown format with dated decision entries.
- The project constitution at `.specify/memory/constitution.md` exists and supports append-style updates.
- The existing fingerprint hashing function is sufficient for reverse sync deduplication.
- Operators will run reverse sync manually as part of a post-implementation ceremony in Phase 1.
- Pattern-based privacy filtering provides adequate protection for Phase 1; more sophisticated filtering can be added in later phases.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can complete a full reverse sync (from command invocation to `learnings.md` creation) in under 30 seconds for a typical project with 5 agents and 50 learning entries.
- **SC-002**: Running reverse sync twice on the same Squad state produces identical output — zero duplicate entries in `learnings.md` across runs.
- **SC-003**: 100% of secrets matching common patterns (API keys, tokens, passwords, connection strings) are redacted before any content is written to disk.
- **SC-004**: 100% of PII matching common patterns (email addresses, phone numbers) are stripped before any content is written to disk.
- **SC-005**: Dry-run mode produces zero file system side effects — no files created, modified, or deleted.
- **SC-006**: The `spec.md`, `plan.md`, and `tasks.md` files in the spec directory are never modified by reverse sync under any circumstances.
- **SC-007**: Operators can preview, execute, and verify a reverse sync within a single terminal session without consulting external documentation.
- **SC-008**: The generated `learnings.md` is organized into clear categories that allow a planner to find relevant insights within 60 seconds of opening the file.
- **SC-009**: Constitution enrichment adds only spec/plan-level non-negotiables to the constitution file. Zero coding patterns, implementation techniques, or operational knowledge appears in the constitution after reverse sync. The constitution remains succinct enough to serve as effective LLM context (guideline: under 4KB total).
- **SC-010**: The system handles gracefully when Squad sources are missing, malformed, or empty — no crashes, clear diagnostic messages.
