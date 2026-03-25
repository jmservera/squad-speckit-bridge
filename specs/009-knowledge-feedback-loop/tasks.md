# Tasks: Knowledge Feedback Loop (Reverse Sync)

**Input**: Design documents from `/specs/009-knowledge-feedback-loop/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Task Sizing**: 17 total tasks. Each task groups related changes, affects 1–3 files, and is completable in one agent session.

**Tests**: REQUIRED — every task includes a Tests subsection describing how to verify completion.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description (X–Y files)`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **(X–Y files)**: Estimate of how many files this task affects
- **Tests subsection**: Immediately after task line, describe verification approach

---

## Phase 1: Setup (1 task — test fixtures and scaffolding)

**Purpose**: Create the test fixture directory structure with mock Squad data so all subsequent tasks have realistic test inputs.

- [ ] T001 Create reverse sync test fixture directory with mock Squad data in tests/fixtures/reverse-sync/ (1–3 files)
  - **What to create**:
    - `tests/fixtures/reverse-sync/squad/agents/gilfoyle/history.md` — mock agent history with `### YYYY-MM-DD: Title` sections under `## Learnings`, include entries with API keys (`api_key=sk_test_abc123...`), email addresses, and clean architectural insights
    - `tests/fixtures/reverse-sync/squad/agents/dinesh/history.md` — second agent history with implementation-detail learnings (e.g., "Use vi.doMock for testing") and one constitution-worthy entry (e.g., "All public APIs MUST have version negotiation")
    - `tests/fixtures/reverse-sync/squad/decisions.md` — mock decisions file with 3–5 dated decision entries in standard `### YYYY-MM-DD: Title` format, mixing architectural decisions and coding technique decisions
    - `tests/fixtures/reverse-sync/squad/skills/clean-architecture-bridge/SKILL.md` — mock skill extraction file
    - `tests/fixtures/reverse-sync/specs/001-test/tasks.md` — minimal spec directory target for output
    - Ensure fixtures include: entries that trigger privacy redaction, entries that should be classified constitution-worthy, entries that should be classified learnings-only, duplicate entries (same title+content) for dedup testing, entries with recent timestamps (for cooldown testing) and old timestamps
  - **Tests**: Verify all fixture files exist and are valid markdown by running `find tests/fixtures/reverse-sync -name "*.md" | wc -l` (expect ≥5 files). Confirm `npm test` still passes (no regressions from adding fixtures).

---

## Phase 2: Foundational (3 tasks — entity layer, blocks all user stories)

**Purpose**: Add all new entity types and pure functions to `src/types.ts`. These are the core business rules that all user stories depend on. No I/O, no external imports.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add 5 entity types, error code REVERSE_SYNC_FAILED, and config extension sync.reverse to src/types.ts (1 file)
  - **What to add** (all from `data-model.md`):
    - Type `ReverseSyncSourceType = 'histories' | 'decisions' | 'skills'`
    - Interface `ReverseSyncOptions` — config DTO with `specDir`, `squadDir`, `dryRun`, `cooldownMs`, `sources`, `skipConstitution`, `constitutionPath?`
    - Type `LearningClassification = 'constitution-worthy' | 'learnings-only'`
    - Type `LearningCategory` — union of 6 category strings
    - Interface `ExtractedReverseLearning` — learning entry with `title`, `content`, `sourceType`, `attribution`, `timestamp`, `fingerprint`, `classification`, `category`
    - Interface `ReverseSyncState` — with `lastReverseSyncTimestamp`, `syncedFingerprints`, `syncGeneration`, `syncHistory`
    - Interface `ReverseSyncRecord` — with `syncTimestamp`, `learningsWritten`, `learningsDeduplicated`, `constitutionEntriesAdded`, `sourcesProcessed`, `outputPath`
    - Interface `ReverseSyncResult` — full outcome DTO matching CLI JSON output schema in `contracts/cli-sync-reverse.md`
    - Interface `PrivacyFilterResult` — with `filtered`, `redactionCount`, `redactionTypes`
    - Interface `LearningsMetadata` — with `featureName`, `specId`, `executionPeriod`, `agents`
    - Add `REVERSE_SYNC_FAILED: 'REVERSE_SYNC_FAILED'` to `ErrorCodes` constant
    - Add `REVERSE_SYNC_FAILED` entry to `ErrorSuggestions` record
    - Extend `BridgeConfig.sync` with `reverse: { cooldownHours, sources, privacy: { maskSecrets, stripPII } }` per data-model.md Config Extension section
  - **Tests**: Run `npx tsc --noEmit` — zero type errors. Run `npm test` — no regressions. Manually verify new types are exported from `src/types.ts` with `grep "export" src/types.ts | grep -i reverse`.

- [ ] T003 Implement applyPrivacyFilter() pure function in src/types.ts and tests/unit/privacy-filter.test.ts (2 files)
  - **What to implement** (per `data-model.md` § applyPrivacyFilter):
    - Add `applyPrivacyFilter(content: string): PrivacyFilterResult` as an exported pure function in `src/types.ts`
    - Implement all 6 secret patterns: API keys, tokens, passwords, connection strings, AWS keys, generic secrets — using exact regex patterns from data-model.md
    - Implement 2 PII patterns: emails, phone numbers — using exact regex patterns from data-model.md
    - Return `{ filtered, redactionCount, redactionTypes }` where `redactionTypes` lists unique types found (e.g., `['api-key', 'email']`)
    - When `redactionCount === 0`, `filtered` must be identical to input (no mutation)
  - **Tests** in `tests/unit/privacy-filter.test.ts`:
    - API key: `"api_key=sk_test_abc123def456ghi789"` → contains `[REDACTED:API_KEY]`, redactionCount ≥ 1
    - Token: `"Bearer eyJhbGciOiJIUzI1NiIsInR5..."` → contains `[REDACTED:TOKEN]`
    - Password: `"password=hunter2"` → contains `[REDACTED:PASSWORD]`
    - Connection string: `"mongodb://admin:pass@host:27017/db"` → contains `[REDACTED:CONNECTION_STRING]`
    - AWS key: `"AKIAIOSFODNN7EXAMPLE"` → contains `[REDACTED:AWS_KEY]`
    - Email: `"Contact alice@example.com for details"` → contains `[REDACTED:EMAIL]`
    - Phone: `"Call (555) 123-4567"` → contains `[REDACTED:PHONE]`
    - Clean content: `"Architecture should use clean layers"` → `filtered === input`, `redactionCount === 0`
    - Multiple redactions: content with 2 API keys + 1 email → `redactionCount === 3`, `redactionTypes` has `['api-key', 'email']`
    - Run `npx vitest run tests/unit/privacy-filter` — all pass

- [ ] T004 Implement classifyLearning(), categorizeLearning(), and isValidReverseSyncOptions() in src/types.ts and tests/unit/learning-classifier.test.ts (2 files)
  - **What to implement** (per `data-model.md` § classifyLearning, categorizeLearning, isValidReverseSyncOptions):
    - `classifyLearning(title: string, content: string): LearningClassification` — keyword heuristic gate (FR-004a):
      - Constitution-worthy signals: "non-negotiable", "MUST", "all features", "every spec", "project-wide", "architectural constraint", "API contract", "compatibility requirement", "version negotiation", "breaking change" — AND content does NOT contain implementation-detail signals
      - Learnings-only signals: "code pattern", "testing technique", "debug", "workaround", "vi.doMock", "implementation detail", "config tweak", "hot fix", "refactor", "import path" — OR references specific files/line numbers/function names
      - Default: `'learnings-only'` (conservative — never bloat constitution)
    - `categorizeLearning(title: string, content: string): LearningCategory` — keyword mapping to 6 categories per data-model.md
      - Default: `'architectural-insights'` (catch-all)
    - `isValidReverseSyncOptions(options: ReverseSyncOptions): boolean` — validates all fields per data-model.md validation rules
  - **Tests** in `tests/unit/learning-classifier.test.ts`:
    - classifyLearning: "All public APIs MUST have version negotiation" → `'constitution-worthy'`
    - classifyLearning: "Use vi.doMock for testing ESM modules" → `'learnings-only'`
    - classifyLearning: "This is a non-negotiable architectural constraint for all features" → `'constitution-worthy'`
    - classifyLearning: "Quick workaround for import path issues in src/utils.ts:42" → `'learnings-only'`
    - classifyLearning: ambiguous content with no strong signals → `'learnings-only'` (conservative default)
    - categorizeLearning: "clean architecture layer dependency" → `'architectural-insights'`
    - categorizeLearning: "API endpoint integration" → `'integration-patterns'`
    - categorizeLearning: "latency improvement" → `'performance-notes'`
    - categorizeLearning: "team chose Commander over yargs" → `'decisions'`
    - categorizeLearning: "reusable utility pattern" → `'reusable-techniques'`
    - categorizeLearning: "edge case regression risk" → `'risks'`
    - isValidReverseSyncOptions: valid options → `true`; empty specDir → `false`; negative cooldownMs → `false`; empty sources → `false`; skipConstitution false without constitutionPath → `false`
    - Run `npx vitest run tests/unit/learning-classifier` — all pass

---

## Phase 3: User Story 1 — Manual Reverse Sync After Implementation (Priority: P1) 🎯 MVP

**Goal**: An operator runs `squask sync-reverse <spec-dir>` and gets a structured `learnings.md` in the spec directory with categorized, privacy-filtered, deduplicated insights from Squad agent histories, decisions, and skills.

**Independent Test**: Run the CLI command against a spec directory with existing Squad state files. Verify `learnings.md` is created with correctly filtered, deduplicated content matching the `contracts/learnings-format.md` format.

- [ ] T005 [US1] Implement generateLearningsMarkdown() in src/types.ts and tests/unit/learnings-markdown.test.ts (2 files)
  - **What to implement** (per `data-model.md` § generateLearningsMarkdown and `contracts/learnings-format.md`):
    - `generateLearningsMarkdown(entries: ExtractedReverseLearning[], metadata: LearningsMetadata): string`
    - Generate YAML frontmatter with `generated`, `spec_id`, `sync_generation`, `sources` counts, `total_learnings`, `constitution_entries`, `redactions`
    - Render `# Implementation Learnings — {featureName}` title + metadata block (spec, execution period, agents, sync timestamp)
    - Group entries by `category` into 6 H2 sections: "Architectural Insights", "Integration Patterns", "Performance Notes", "Decisions Made During Implementation", "Reusable Techniques", "Risks Encountered"
    - Omit empty category sections (only render sections with content)
    - Each entry as H3: `### {title}\n_Source: {attribution} ({sourceType}) | {date}_\n\n{content}`
    - Maximum 10 entries per category (most recent first). Truncate content at 500 characters with `[...]`
    - Footer: `_Generated by \`squask sync-reverse\` — [fingerprints tracked in .bridge-sync-reverse.json]_`
  - **Tests** in `tests/unit/learnings-markdown.test.ts`:
    - Given 3 entries across 2 categories → output has 2 H2 sections, 3 H3 entries, YAML frontmatter
    - Given empty entries array → output is empty string (no document generated)
    - Given 12 entries in one category → only 10 rendered (most recent by timestamp)
    - Given entry with 600-char content → truncated at 500 chars with `[...]` appended
    - YAML frontmatter contains correct `spec_id`, `total_learnings` count
    - Attribution line format matches: `_Source: gilfoyle (history) | 2026-03-24_`
    - Empty categories are omitted from output (no empty `## Performance Notes` sections)
    - Run `npx vitest run tests/unit/learnings-markdown` — all pass

- [ ] T006 [US1] Create reverse sync use case with port interfaces in src/sync/sync-reverse.ts and tests/unit/sync-reverse.test.ts (2 files)
  - **What to implement** (mirrors `sync-learnings.ts` pattern):
    - Define 3 port interfaces in `src/sync/sync-reverse.ts`:
      - `LearningExtractorPort` — `extractLearnings(squadDir: string, sources: ReverseSyncSourceType[], since?: Date): Promise<ExtractedReverseLearning[]>`
      - `ReverseSyncStatePort` — `readState(stateDir: string): Promise<ReverseSyncState | null>`, `writeState(stateDir: string, state: ReverseSyncState): Promise<void>`
      - `SpecLearningsWriterPort` — `writeLearnings(specDir: string, content: string): Promise<string>`, `readExistingFingerprints(specDir: string): Promise<string[]>`
    - Implement `syncReverse(extractor: LearningExtractorPort, statePort: ReverseSyncStatePort, writerPort: SpecLearningsWriterPort, options: ReverseSyncOptions, constitutionWriter?: ConstitutionWriter): Promise<ReverseSyncResult>`
    - Orchestration logic (following forward sync pattern):
      1. Validate options via `isValidReverseSyncOptions()`
      2. Read previous state via `statePort.readState()` — get synced fingerprints
      3. Extract learnings via `extractor.extractLearnings()` — filtered by `options.sources`
      4. Apply privacy filter to each entry via `applyPrivacyFilter()`
      5. Compute fingerprints via `computeLearningFingerprint()` (imported from `sync-learnings.ts`)
      6. Classify each entry via `classifyLearning()`
      7. Categorize each entry via `categorizeLearning()`
      8. Deduplicate against existing fingerprints
      9. Apply cooldown filter (exclude entries newer than `cooldownMs`)
      10. If `!dryRun`: generate markdown via `generateLearningsMarkdown()`, write via `writerPort.writeLearnings()`
      11. If `!dryRun && !skipConstitution`: append constitution-worthy entries via `constitutionWriter`
      12. If `!dryRun`: persist updated state via `statePort.writeState()`
      13. Return `ReverseSyncResult` DTO
    - If no new learnings after dedup+cooldown+privacy → return result with `learningsWritten: 0`, `outputPath: null`
    - Import `computeLearningFingerprint` from `./sync-learnings.js` (same layer, per D1 decision)
  - **Tests** in `tests/unit/sync-reverse.test.ts` (all ports mocked):
    - Given 5 extracted learnings, 2 already synced (fingerprint match) → `learningsWritten === 3`, `deduplicated === 2`
    - Given `dryRun: true` → writer port `writeLearnings` never called, state port `writeState` never called, `result.dryRun === true`
    - Given all learnings are duplicates → `learningsWritten === 0`, `outputPath === null`
    - Given empty Squad state (extractor returns []) → result reports "no learnings", zero writes
    - Given `skipConstitution: true` → constitutionWriter never called, `constitutionEntriesAdded === 0`
    - Given entries with secrets → privacy filter applied before fingerprinting (verify mock calls)
    - Given cooldown of 24h and entry from 2h ago → entry excluded, `cooledDown >= 1`
    - Run `npx vitest run tests/unit/sync-reverse` — all pass

- [ ] T007 [P] [US1] Implement learning-extractor adapter in src/sync/adapters/learning-extractor.ts and tests/integration/learning-extractor.test.ts (2 files)
  - **What to implement**:
    - Class `LearningExtractorAdapter implements LearningExtractorPort` (from `sync-reverse.ts`)
    - Method `extractLearnings(squadDir, sources, since?)`:
      - If `sources` includes `'histories'`: Read all `{squadDir}/agents/*/history.md` files using `glob`. Parse each with `### YYYY-MM-DD: Title` pattern (same as existing `AgentHistoryReaderAdapter` parsing). Extract agent name from directory path. Set `sourceType: 'histories'`, `attribution: agentName`.
      - If `sources` includes `'decisions'`: Read `{squadDir}/decisions.md`. Parse decision entries with dated headers. Set `sourceType: 'decisions'`, `attribution: 'team'`.
      - If `sources` includes `'skills'`: Read `{squadDir}/skills/*/SKILL.md` files using `glob`. Extract skill name from directory path. Set `sourceType: 'skills'`, `attribution: skillName`.
      - For each entry: set `timestamp` from parsed date, leave `fingerprint`, `classification`, `category` as empty strings (computed by use case layer)
      - If `since` is provided, filter entries with timestamp < since
      - Graceful degradation (FR-013): if a file is missing or malformed, log a warning (`console.warn`) and continue — do not throw
    - Dependencies: `node:fs/promises`, `glob`, `node:path`
  - **Tests** in `tests/integration/learning-extractor.test.ts` (uses fixtures from T001):
    - Given fixture Squad directory with 2 agent histories → extracts entries from both agents, correct attribution
    - Given fixture decisions.md → extracts decision entries with `sourceType: 'decisions'`, `attribution: 'team'`
    - Given fixture skills directory → extracts skill entries with correct skill name attribution
    - Given `sources: ['decisions']` only → no history entries extracted
    - Given `since` date after some entries → only newer entries returned
    - Given malformed markdown in one agent file → warning logged, other entries still extracted (graceful degradation)
    - Given missing agents/ directory → returns empty array, no crash
    - Run `npx vitest run tests/integration/learning-extractor` — all pass

- [ ] T008 [P] [US1] Implement reverse-sync-state-adapter and spec-learnings-writer in src/sync/adapters/ and tests/integration/ (3 files)
  - **reverse-sync-state-adapter.ts**:
    - Class `ReverseSyncStateAdapter implements ReverseSyncStatePort` (from `sync-reverse.ts`)
    - `readState(stateDir)`: Read `.bridge-sync-reverse.json` from stateDir. If file doesn't exist, return `null`. Parse as `ReverseSyncState`. Handle JSON parse errors gracefully.
    - `writeState(stateDir, state)`: Serialize `ReverseSyncState` to JSON with 2-space indent. Write to `.bridge-sync-reverse.json` in stateDir. Create directory if needed.
    - File path: `{stateDir}/.bridge-sync-reverse.json` (per D2 design decision — separate from forward sync state)
    - Dependencies: `node:fs/promises`, `node:path`
  - **spec-learnings-writer.ts**:
    - Class `SpecLearningsWriterAdapter implements SpecLearningsWriterPort` (from `sync-reverse.ts`)
    - `writeLearnings(specDir, content)`: Write `content` string to `{specDir}/learnings.md`. If file already exists, handle append semantics per `contracts/learnings-format.md` § Append Semantics: parse existing content, merge new entries into existing sections, update frontmatter. Return absolute output path.
    - `readExistingFingerprints(specDir)`: If `{specDir}/learnings.md` exists, parse it and extract fingerprints from entries (match H3 entries, recompute fingerprints from title+content). If file doesn't exist, return empty array.
    - Dependencies: `node:fs/promises`, `node:path`
  - **Tests** in `tests/integration/reverse-sync-state.test.ts`:
    - Write state → read state → values match (round-trip)
    - Read from non-existent file → returns `null`
    - Write updates fingerprints array, read reflects additions
    - Corrupt JSON file → returns `null` or throws meaningful error
  - **Tests** in `tests/integration/spec-learnings-writer.test.ts`:
    - Write learnings to new spec dir → file created with correct content, returns path
    - Write learnings to dir with existing learnings.md → content appended, existing entries preserved
    - readExistingFingerprints from non-existent file → empty array
    - readExistingFingerprints from file with 3 entries → 3 fingerprints returned
    - Run `npx vitest run tests/integration/reverse-sync-state tests/integration/spec-learnings-writer` — all pass

- [ ] T009 [US1] Wire createReverseSyncer() factory in src/main.ts with human and JSON output formatters (1–2 files)
  - **What to implement** (mirrors `createSyncer()` pattern in src/main.ts):
    - Add `createReverseSyncer(options: { configPath?; baseDir?; squadDir?; noConstitution? })` factory function
    - Factory wires adapters: `new LearningExtractorAdapter()`, `new ReverseSyncStateAdapter()`, `new SpecLearningsWriterAdapter()`, optionally `new ConstitutionAdapter()` (if `!noConstitution`)
    - Return object with `async syncReverse(specDir: string, opts: { dryRun?; cooldown?; sources?; json? }): Promise<ReverseSyncOutput>`
    - `ReverseSyncOutput` interface: `{ humanOutput: string; jsonOutput: ReverseSyncResult }` (matches existing Output interface pattern)
    - Implement `formatReverseSyncHuman(result: ReverseSyncResult): string` — matches CLI contract human output format from `contracts/cli-sync-reverse.md`
    - Implement `formatReverseSyncJson(result: ReverseSyncResult): object` — passes through ReverseSyncResult fields
    - Import all new adapters from `./sync/adapters/*.js`
    - Import `syncReverse` from `./sync/sync-reverse.js`
  - **Tests**: Run `npx tsc --noEmit` — zero type errors. Run `npm test` — no regressions. Verify `createReverseSyncer` is exported: `grep "createReverseSyncer" src/main.ts`. Verify human output includes "Reverse Sync" header, source counts, filtering summary, results summary per CLI contract.

**Checkpoint**: At this point, the core reverse sync pipeline is wired end-to-end. It can be invoked programmatically via `createReverseSyncer()`. US1 acceptance scenarios 1–4 are testable through the factory API.

---

## Phase 4: User Story 2 — Dry Run Preview Before Writing (Priority: P1)

**Goal**: An operator can preview what reverse sync would produce before committing changes to disk. The dry-run displays learnings, counts, categories, and privacy redaction summaries without any file writes.

**Independent Test**: Run the CLI with `--dry-run` flag and verify output is displayed but no files are written. Verify spec directory remains untouched.

- [ ] T010 [US2] Add sync-reverse subcommand to src/cli/index.ts with all CLI options (1–2 files)
  - **What to implement** (per `contracts/cli-sync-reverse.md`):
    - Add new Commander subcommand: `program.command('sync-reverse <spec-dir>')`
    - Argument: `spec-dir` (required) — path to spec directory, resolved relative to CWD
    - Options:
      - `--dry-run` (boolean, default false) — preview output, write nothing
      - `--cooldown <hours>` (number, default 24) — minimum age in hours for learnings
      - `--sources <list>` (string, default `'histories,decisions,skills'`) — comma-separated source types
      - `--no-constitution` (boolean, default false) — skip constitution enrichment
      - `--squad-dir <path>` (string, default `.squad`) — override Squad directory path
    - Inherit global options: `--config`, `--json`, `--quiet`, `--verbose`
    - Action handler:
      1. Resolve `specDir` relative to CWD, validate directory exists (error code `SPEC_DIR_NOT_FOUND`)
      2. Resolve `squadDir`, validate `.squad/` exists (error code `SQUAD_NOT_FOUND`)
      3. Parse `--sources` string into `ReverseSyncSourceType[]`, validate each (error if invalid source name)
      4. Convert `--cooldown` hours to milliseconds
      5. Call `createReverseSyncer(...)` → `syncer.syncReverse(specDir, { dryRun, cooldown, sources, json })`
      6. Output `humanOutput` or `jsonOutput` based on `--json` flag
      7. Set `process.exitCode` to 0 on success, 1 on error
    - Error handling: use `emitError()` pattern from existing CLI commands with structured error codes
    - Add `classifyError` mappings for reverse sync errors
  - **Tests**: Run `npx tsc --noEmit` — zero type errors. Run `npm test` — no regressions. Verify command is registered: `node dist/cli/index.js sync-reverse --help` outputs usage information with all documented options.

- [ ] T011 [US2] E2E test for dry-run and real write pipeline in tests/e2e/sync-reverse.test.ts (1–2 files)
  - **What to test** (covers US1 acceptance scenarios 1–4 and US2 scenarios 1–2):
    - **Dry-run test**: Set up temp directory with Squad fixtures + empty spec dir. Run `syncReverse` with `dryRun: true`. Verify: result contains expected learnings counts, `outputPath === null`, NO `learnings.md` created on disk, NO `.bridge-sync-reverse.json` created, spec directory untouched.
    - **Real write test**: Same setup, `dryRun: false`. Verify: `learnings.md` created in spec dir, content matches `contracts/learnings-format.md` format (YAML frontmatter, categorized sections, attribution lines), `.bridge-sync-reverse.json` created with fingerprints.
    - **Idempotency test**: Run `syncReverse` twice with same state. Second run: `learningsWritten === 0`, `learnings.md` unchanged (file mtime or content comparison), state file fingerprints unchanged.
    - **Privacy test**: Include fixture with API key in agent history. After sync, verify `learnings.md` contains `[REDACTED:API_KEY]`, NOT the original key value.
    - **Empty state test**: Empty Squad directory (no histories, no decisions). Verify: result reports "no learnings", `learnings.md` NOT created.
    - **Spec protection test** (FR-005): Verify `spec.md`, `plan.md`, and `tasks.md` are never modified (compare before/after checksums).
    - Use programmatic API (`createReverseSyncer()`) for E2E tests, not CLI subprocess — matches existing `tests/e2e/` pattern.
  - **Tests**: Run `npx vitest run tests/e2e/sync-reverse` — all scenarios pass. Run `npm test` — no regressions.

**Checkpoint**: User Stories 1 and 2 are fully functional. Operator can preview (dry-run) and execute reverse sync via CLI. Core value proposition — closing the feedback loop — is delivered.

---

## Phase 5: User Story 3 — Constitution Enrichment from Cross-Feature Learnings (Priority: P2)

**Goal**: Constitution-worthy learnings (spec/plan-level non-negotiables) are automatically routed to `.specify/memory/constitution.md` alongside `learnings.md`. Operators can disable this with `--no-constitution`. Coding patterns, implementation details, and agent-specific knowledge never appear in the constitution.

**Independent Test**: Run reverse sync with fixtures containing both constitution-worthy and implementation-detail entries. Verify constitution file receives only non-negotiables. Verify `--no-constitution` suppresses constitution writes entirely.

- [ ] T012 [US3] Add constitution routing logic to sync-reverse use case and wire ConstitutionAdapter in src/main.ts (2 files)
  - **What to implement**:
    - In `src/sync/sync-reverse.ts`: after dedup+cooldown filtering, partition entries by `classification`:
      - All entries → `learnings.md` (as already implemented)
      - Entries where `classification === 'constitution-worthy'` AND `!options.skipConstitution` → append to constitution via `constitutionWriter.appendLearnings(constitutionPath, specId, constitutionEntries)`
    - Constitution entries format per `contracts/learnings-format.md` § Constitution Enrichment Format: `## Learnings from Spec {spec-id}\n\n_Synced: {ISO timestamp}_\n\n- **{title}**: {content}`
    - Constitution deduplication: before appending, read existing constitution content, compute fingerprints of existing constitution learnings sections, skip duplicates
    - Update `ReverseSyncResult.constitutionEntriesAdded` with actual count written
    - In `src/main.ts` `createReverseSyncer()`: wire `new ConstitutionAdapter()` when `!options.noConstitution`, pass as optional `constitutionWriter` parameter to `syncReverse()`
    - Resolve `constitutionPath` to `.specify/memory/constitution.md` from baseDir
  - **Tests**: Run `npx tsc --noEmit` — zero type errors. Run `npm test` — no regressions. In `tests/unit/sync-reverse.test.ts` add: given 5 entries (2 constitution-worthy, 3 learnings-only) → `constitutionEntriesAdded === 2`, constitutionWriter called with exactly 2 entries.

- [ ] T013 [US3] Integration test for constitution enrichment and --no-constitution in tests/integration/sync-constitution-reverse.test.ts (1–2 files)
  - **What to test**:
    - **Constitution write test**: Set up temp dir with Squad fixtures containing constitution-worthy entries (e.g., "All public APIs MUST have version negotiation") and implementation-detail entries (e.g., "Use vi.doMock for testing"). Run syncReverse. Verify: constitution file contains the non-negotiable, does NOT contain the implementation detail.
    - **Constitution dedup test**: Run syncReverse twice with same entries. Verify: second run adds zero new constitution entries, `constitutionEntriesAdded === 0`.
    - **No-constitution flag test**: Run syncReverse with `skipConstitution: true`. Verify: constitution file untouched (not modified), `constitutionEntriesAdded === 0`, learnings.md still written normally.
    - **Size guard test**: Verify constitution stays succinct — after sync, constitution content is under 4KB (SC-009 guideline).
    - **Correct classification routing**: Verify entries classified `'learnings-only'` appear in learnings.md but NOT in constitution. Entries classified `'constitution-worthy'` appear in BOTH learnings.md AND constitution.
  - **Tests**: Run `npx vitest run tests/integration/sync-constitution-reverse` — all pass.

**Checkpoint**: User Stories 1, 2, and 3 are functional. Constitution is enriched with only spec/plan-level non-negotiables. The knowledge feedback loop is fully closed for both per-feature learnings and project-wide principles.

---

## Phase 6: User Stories 4 & 5 — Source Selection and Cooldown (Priority: P3)

**Goal**: Power-user controls for filtering which sources feed into reverse sync and time-gating learnings by age.

**Independent Test**: Run reverse sync with explicit source filters and verify only specified source types appear. Run with cooldown settings and verify only age-appropriate learnings are included.

- [ ] T014 [P] [US4] Implement --sources flag parsing in src/cli/index.ts and source type filtering in src/sync/adapters/learning-extractor.ts (2 files)
  - **What to implement**:
    - In `src/cli/index.ts` sync-reverse action handler: parse `--sources` comma-separated string into `ReverseSyncSourceType[]`. Validate each source name against valid values (`'histories'`, `'decisions'`, `'skills'`). On invalid source, emit structured error listing valid options (per CLI contract error format).
    - In `src/sync/adapters/learning-extractor.ts`: ensure `extractLearnings()` respects the `sources` parameter — only read/parse files for source types in the array. Skip entire file I/O for excluded sources.
    - Verify end-to-end: `--sources decisions` → only decision entries in output, no history or skill entries
  - **Tests**: Add to existing test files:
    - In `tests/integration/learning-extractor.test.ts`: given `sources: ['decisions']` → no history files read, no skill files read, only decision entries returned
    - In `tests/integration/learning-extractor.test.ts`: given `sources: ['histories', 'skills']` → decisions file not read, history + skill entries returned
    - Verify CLI rejects invalid source: `--sources foobar` → error message lists valid options
    - Run `npx vitest run tests/integration/learning-extractor` — all pass

- [ ] T015 [P] [US5] Implement --cooldown flag in src/cli/index.ts and timestamp-gated filtering in src/sync/sync-reverse.ts (2 files)
  - **What to implement**:
    - In `src/cli/index.ts` sync-reverse action handler: parse `--cooldown <hours>` as number, convert to milliseconds (`hours * 3600000`), pass as `cooldownMs` in `ReverseSyncOptions`. Default: 24 hours. `--cooldown 0` means include all.
    - In `src/sync/sync-reverse.ts` `syncReverse()`: after extraction and before dedup, filter out entries where `Date.now() - Date.parse(entry.timestamp) < options.cooldownMs`. Track excluded count in `result.cooledDown`.
    - Cooldown of 0 → no entries excluded (all qualifying learnings included regardless of age)
  - **Tests**: Add to existing test files:
    - In `tests/unit/sync-reverse.test.ts`: given cooldown of 24h and entries from 2h ago and 48h ago → 2h-ago entry excluded (`cooledDown >= 1`), 48h-ago entry included
    - In `tests/unit/sync-reverse.test.ts`: given cooldown of 0 → all entries included regardless of age
    - In `tests/unit/sync-reverse.test.ts`: given cooldown of 24h and all entries older than 24h → zero cooled down, all included
    - Verify CLI parses `--cooldown 0` correctly → passes `cooldownMs: 0`
    - Run `npx vitest run tests/unit/sync-reverse` — all pass

**Checkpoint**: All 5 user stories are now functional. The full CLI surface matches `contracts/cli-sync-reverse.md`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening, error handling robustness, documentation updates.

- [ ] T016 [P] Harden edge cases in src/sync/adapters/learning-extractor.ts, src/sync/adapters/reverse-sync-state-adapter.ts, and src/cli/index.ts (2–3 files)
  - **What to implement**:
    - **Malformed markdown** (FR-013): In `learning-extractor.ts`, wrap each file parse in try/catch. On parse failure, `console.warn('Warning: Skipping malformed file {path}: {error.message}')` and continue. Collect warnings in result.
    - **Missing directories**: In CLI action handler, verify `specDir` exists (or create it?). Verify `squadDir` exists with `.squad/` structure. Return structured errors `SPEC_DIR_NOT_FOUND` and `SQUAD_NOT_FOUND` with suggestions per error code table.
    - **Empty state**: When `.bridge-sync-reverse.json` doesn't exist (first run), initialize with empty state — `{ lastReverseSyncTimestamp: '', syncedFingerprints: [], syncGeneration: 0, syncHistory: [] }`.
    - **Size caps** (edge case from spec): In `generateLearningsMarkdown()`, enforce max 10 entries per category (already specified in T005), and max 500 chars per entry content with `[...]` truncation.
    - **Concurrent access**: In `reverse-sync-state-adapter.ts`, use atomic write pattern — write to `{path}.tmp` then `rename()` to prevent corruption from concurrent runs.
    - **All entries duplicate**: When every extracted learning is a duplicate, report "no new learnings" and do NOT create an empty `learnings.md` (return `outputPath: null`).
  - **Tests**: Add edge-case tests to existing integration test files:
    - Malformed history.md → warning logged, other sources still processed
    - Non-existent spec dir → `SPEC_DIR_NOT_FOUND` error with suggestion
    - Non-existent squad dir → `SQUAD_NOT_FOUND` error with suggestion
    - First run (no state file) → state initialized, learnings written normally
    - All duplicates → "no new learnings" result, no file written
    - Run `npm test` — all tests pass including new edge cases

- [ ] T017 [P] Update README.md with reverse sync documentation and add inline JSDoc to all new exports (1–3 files)
  - **What to implement**:
    - In `README.md`: add "Reverse Sync" section under Commands documentation:
      - Command signature: `squask sync-reverse <spec-dir> [options]`
      - Description: closes knowledge feedback loop by harvesting implementation learnings
      - All options with defaults (from CLI contract)
      - Example workflow: dry-run → review → execute → verify
      - Link to `specs/009-knowledge-feedback-loop/quickstart.md` for detailed walkthrough
    - In `src/types.ts`: add JSDoc comments to all new exported types and pure functions (one-line summary + `@param` / `@returns` for functions)
    - In `src/sync/sync-reverse.ts`: add JSDoc to `syncReverse()` and all port interfaces
    - In `src/main.ts`: add JSDoc to `createReverseSyncer()`
  - **Tests**: Run `npx tsc --noEmit` — zero type errors (JSDoc doesn't break compilation). Verify README contains "sync-reverse" section: `grep -c "sync-reverse" README.md` ≥ 3. Run `npm test` — no regressions.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 for test fixtures. T002 first (types), then T003 and T004 can run in sequence (same file `src/types.ts`). **BLOCKS all user stories.**
- **US1 (Phase 3)**: Depends on Phase 2 completion. T005 (markdown generator) first, then T006 (use case). T007 and T008 in parallel (different adapter files). T009 last (wires everything).
- **US2 (Phase 4)**: Depends on T009 (factory must exist). T010 (CLI) then T011 (E2E).
- **US3 (Phase 5)**: Depends on T006 (use case must exist). T012 then T013. Can start after Phase 3.
- **US4 & US5 (Phase 6)**: Depends on T010 (CLI must exist). T014 and T015 are independent and parallel.
- **Polish (Phase 7)**: Depends on all user stories complete. T016 and T017 are independent and parallel.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational phase — no other story deps
- **User Story 2 (P1)**: Depends on US1 completion (needs factory + use case to wire CLI)
- **User Story 3 (P2)**: Depends on US1 (use case exists). Can run in parallel with US2 if adapters are ready.
- **User Story 4 (P3)**: Depends on US2 (CLI subcommand exists to add flag)
- **User Story 5 (P3)**: Depends on US2 (CLI subcommand exists to add flag). Parallel with US4.

### Within Each User Story

- Types → pure functions → use case → adapters → factory → CLI → E2E
- All adapters implementing ports can be parallel (different files)
- Integration tests run alongside their adapters

### Parallel Opportunities

- T003 and T004: Sequential (same file src/types.ts) but could be combined if preferred
- T007 and T008: Parallel (different adapter files, independent ports)
- T014 and T015: Parallel (different features — source selection vs cooldown)
- T016 and T017: Parallel (edge-case code vs documentation)
- US3 and US2: Can overlap if Phase 3 is done (US3 modifies use case, US2 adds CLI)

---

## Parallel Example: User Story 1

```bash
# After T005 + T006 are done (use case + ports defined), launch adapters in parallel:
Task T007: "Implement learning-extractor adapter in src/sync/adapters/learning-extractor.ts"
Task T008: "Implement reverse-sync-state-adapter + spec-learnings-writer in src/sync/adapters/"

# These are independent — different files, different port implementations, different test fixtures.
# Both can be tested independently with integration tests against fixtures.
# Then T009 (factory wiring) connects everything.
```

---

## Parallel Example: Phase 6

```bash
# After T010 (CLI exists), launch US4 and US5 in parallel:
Task T014: "Implement --sources flag in learning-extractor + CLI"
Task T015: "Implement --cooldown flag in sync-reverse use case + CLI"

# Independent features — source filtering is adapter-level, cooldown is use-case-level.
# Different files modified, no conflict.
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002 → T003 → T004) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T005 → T006 → T007 ∥ T008 → T009)
4. Complete Phase 4: User Story 2 (T010 → T011)
5. **STOP and VALIDATE**: Run E2E tests. Operator can do `squask sync-reverse <dir> --dry-run` and `squask sync-reverse <dir>`. `learnings.md` is generated correctly.
6. Deploy/demo if ready — the core feedback loop is closed.

### Incremental Delivery

1. Setup + Foundational → Entity layer ready (all types + pure functions tested)
2. Add US1 → Core reverse sync works programmatically → Test independently
3. Add US2 → Full CLI surface for manual ceremony → Deploy/Demo (**MVP!**)
4. Add US3 → Constitution enrichment closes project-wide loop → Deploy/Demo
5. Add US4 + US5 → Power-user controls for targeted sync → Deploy/Demo
6. Polish → Edge cases hardened, documentation complete → Production ready

### Parallel Team Strategy

With multiple developers after Phase 2 completion:

1. Team completes Setup + Foundational together (sequential, same file)
2. Once Foundational is done:
   - Developer A: US1 entity functions (T005) + use case (T006)
   - Developer B: US1 adapters (T007, T008) — starts once T006 port interfaces are defined
   - Developer A: US2 CLI (T010) + E2E (T011) — after T009
   - Developer B: US3 constitution routing (T012, T013) — after T006
3. US4 and US5 can be assigned to either developer in parallel

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in current phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after its phase
- All pure functions in `src/types.ts` have zero external imports (entity layer rule)
- Adapters in `src/sync/adapters/` implement ports defined in `src/sync/sync-reverse.ts`
- The `computeLearningFingerprint()` function is imported from `sync-learnings.ts` (not duplicated — per D1)
- State file `.bridge-sync-reverse.json` is separate from forward sync `.bridge-sync.json` (per D2)
- Privacy filter runs before ANY content reaches disk, including in dry-run display
- Constitution enrichment is append-only with dedup — never overwrites existing content
- Commit after each task or logical group of tasks
- Stop at any checkpoint to validate story independently
