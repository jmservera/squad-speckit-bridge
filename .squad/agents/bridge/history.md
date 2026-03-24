# bridge — History

## Core Context

## Learnings

<!-- Append learnings below -->

### 2026-03-24: Task T001: Verify baseline build and test suite pass before any changes (0 files)

Verify baseline build and test suite pass before any changes (0 files)

### 2026-03-24: Task T002: Add `autoCreateIssues` boolean to `BridgeConfig.hooks` in `src/types.ts` and update defaults and validation (1 file)

Add `autoCreateIssues` boolean to `BridgeConfig.hooks` in `src/types.ts` and update defaults and validation (1 file)

### 2026-03-24: Task T003: Set git executable bit on `before-specify.sh` and `after-implement.sh` via `git update-index --chmod=+x` (2 files)

Set git executable bit on `before-specify.sh` and `after-implement.sh` via `git update-index --chmod=+x` (2 files)

### 2026-03-24: Task T004: Add integration test verifying `deployExecutable()` applies `0o755` permissions in `tests/integration/file-deployer.test.ts` (1 file)

Add integration test verifying `deployExecutable()` applies `0o755` permissions in `tests/integration/file-deployer.test.ts` (1 file)

### 2026-03-24: Task T005: Rewrite `after-tasks.sh` to automate issue creation with config check and graceful failure in `src/install/templates/hooks/after-tasks.sh` (1 file)

Rewrite `after-tasks.sh` to automate issue creation with config check and graceful failure in `src/install/templates/hooks/after-tasks.sh` (1 file)

### 2026-03-24: Task T006: Add unit tests validating after-tasks hook content and automation behavior in `tests/unit/installer.test.ts` (1 file)

Add unit tests validating after-tasks hook content and automation behavior in `tests/unit/installer.test.ts` (1 file)

### 2026-03-24: Task T007: Replace `npx squad-speckit-bridge` with `npx squask` in `before-specify.sh` and `after-implement.sh` (2 files)

Replace `npx squad-speckit-bridge` with `npx squask` in `before-specify.sh` and `after-implement.sh` (2 files)

### 2026-03-24: Task T008: Add cross-hook CLI alias consistency test in `tests/unit/installer.test.ts` (1 file)

Add cross-hook CLI alias consistency test in `tests/unit/installer.test.ts` (1 file)

### 2026-03-24: Task T009: Complete demo command documentation in `docs/api-reference.md` with options, exit codes, schema, and examples (1 file)

Complete demo command documentation in `docs/api-reference.md` with options, exit codes, schema, and examples (1 file)

### 2026-03-24: Task T010: Verify all v0.3.1 changes comply with the five Clean Architecture constitutional principles (1–2 files)

Verify all v0.3.1 changes comply with the five Clean Architecture constitutional principles (1–2 files)

### 2026-03-24: Task T011: Run full build and test suite, verify hook permissions propagate to `dist/` (0 files)

Run full build and test suite, verify hook permissions propagate to `dist/` (0 files)

### 2026-03-24: Task T012: Update hook scripts contract documentation to reflect v0.3.1 changes in `specs/005-hook-fixes-cli-polish/contracts/hook-scripts.md` (1 file)

Update hook scripts contract documentation to reflect v0.3.1 changes in `specs/005-hook-fixes-cli-polish/contracts/hook-scripts.md` (1 file)

### 2026-03-24: Team Synthesis — Framework Research Complete

[richard] **Team update (simultaneous background execution):**
- Gilfoyle completed deep-dive: frameworks are complementary (runtime vs planning layers)
- Dinesh completed compatibility analysis: technically feasible, ~100-line bridge needed
- Jared completed usage patterns: state accumulation is #1 risk, framework weight matters

**Decision consolidated in decisions.md:**
Adopt pipeline integration model: Spec Kit (upstream planning) → Squad (downstream execution), handoff via tasks.md. Zero modification to either framework. Additive bridge approach recommended.

**Action items from team research:**
1. Build Squad skill to parse tasks.md
2. Wire Spec Kit hooks to trigger Squad ceremonies
3. Implement automatic state pruning (critical for long projects)
4. Lightweight Squad mode for small teams

### 2026-03-24: Real-World Framework Comparison (sofia-cli vs aithena)

[jared] Analyzed two projects by the same developer using Spec Kit (sofia-cli) and Squad (aithena).

**Key findings:**
- **Framework weight must match team size.** Squad's 12-agent model created coordination tax for a solo developer. Spec Kit's zero-agent approach was right-sized for solo + Copilot.
- **State accumulation is the silent killer.** aithena's decisions.md hit 475KB — context window poison. Both frameworks need automatic pruning. This is the #1 practical friction point.
- **Project type drives framework fit more than framework quality.** Greenfield → Spec Kit (spec-per-feature planning). Brownfield → Squad (issue routing, milestone management). The comparison must account for this.
- **Spec-per-feature and issue-per-task are complementary, not competing.** Specs work for new features; issues work for maintenance. A combined model would serve both.
- **Constitutional governance (Spec Kit) scales better for consistency than distributed decisions (Squad).** One 15KB constitution vs 475KB+ across 5 files.
- **GitHub integration depth should be progressive.** 0 issues (sofia-cli) vs 412 issues (aithena) — both valid for their context.
- **Quantitative signals matter:** 350+ Squad config files vs ~30 Spec Kit files. 239 log files vs 0. The overhead ratio is roughly 10:1.

**Deliverables:** `research-jared-example-analysis.md` (main report), `.squad/decisions/inbox/jared-example-patterns.md` (comparison insights).

### 2026-03-24: Team Synthesis — Framework Research Complete

[jared] **Team research results (simultaneous background execution):**
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

[jared] Wrote 60 unit tests for demo entity layer in `tests/demo/entities.test.ts`:
- **StageStatus**: enum values, transition paths (pending → running → success/failed)
- **DemoConfiguration**: defaults, flag behavior (dryRun affects issues command), timeout fallback
- **PipelineStage**: structure, timing fields, stage ordering (5 stages: specify → plan → tasks → review → issues)
- **DemoArtifact**: validation states, error arrays, existence checks
- **ExecutionReport**: derived properties (completed + failed = total), cleanup logic, artifact preservation on failure
- **Utility functions**: generateTimestamp, formatFileSize, formatElapsedTime, createDemoDirectory

All 243 tests pass (183 existing + 60 new). Pushed to `squad/241-entity-tests`, closes #241.

**Pattern:** Test factories (makeConfig, makeStage, makeReport) with Partial<T> overrides — consistent with existing types.test.ts pattern.

### 2026-03-24: Framework Deep-Dive — Squad vs Spec Kit

[gilfoyle] **Squad (bradygaster/squad):**
- Multi-agent runtime for GitHub Copilot. TypeScript monorepo (squad-sdk + squad-cli). Alpha maturity.
- Coordinator agent (82KB `.github/agents/squad.agent.md`) routes all work. Four response tiers: Direct, Lightweight, Standard, Full.
- Agents have persistent memory via `.squad/agents/{name}/history.md`. Progressive summarization at ~12KB.
- Drop-box pattern: agents write to `decisions/inbox/`, Scribe merges to `decisions.md`. Eliminates parallel write conflicts.
- Casting system assigns names from 31 fictional universes. Persistent via `casting/registry.json`.
- Ralph = autonomous work monitor. Watches GitHub issues, spawns agents. Can run via cron in GitHub Actions.
- Key files: `team.md`, `routing.md`, `decisions.md`, `ceremonies.md`, agent `charter.md`/`history.md`.
- Locked to GitHub Copilot. Node.js 20+ required. ~7-10% silent success bug rate on agent spawns.

**Spec Kit (github/spec-kit):**
- Specification-driven development toolkit. Python CLI (`specify`). Agent-agnostic (23+ agents).
- Five-phase pipeline: Constitution → Specify → Plan → Tasks → Implement. Each phase produces markdown artifacts.
- No multi-agent orchestration. Single agent at a time. Human drives phase transitions.
- No persistent agent memory. Specs serve as context. No decision tracking aggregation.
- Strong template system: 4-layer resolution (overrides → presets → extensions → core).
- Extension system with lifecycle hooks (`before_tasks`, `after_implement`). Modular via `extension.yml` manifests.
- Key files: `specs/NNN-feature/spec.md`, `plan.md`, `tasks.md`, `.specify/memory/constitution.md`.
- ~71K stars. Cross-platform (Bash + PowerShell). Main CLI is a single 189KB Python file.

**Key architectural insight:** Squad optimizes for persistent parallel execution with memory; Spec Kit optimizes for structured specification before implementation. They address different parts of the agentic development workflow and are theoretically complementary.

### 2026-03-24: Team Synthesis — Framework Research Complete

[gilfoyle] **Simultaneous completion (background mode):**
- Richard proposed pipeline integration with tasks.md handoff
- Dinesh confirmed technical feasibility (~100-line bridge)
- Jared identified state accumulation as #1 risk factor

**Key team decisions recorded in decisions.md:**
1. Framework classification: complementary, not competitive
2. Integration strategy: pipeline model with zero framework modification
3. Technical approach: additive bridge (no merge)
4. Critical risk: automatic state pruning needed

**Generic patterns extracted to .squad/extract/ for personal squad:**
- State pruning as framework feature
- Constitutional governance at scale
- Progressive GitHub integration
- Team-size-driven framework configuration

### 2026-03-24: Meta-Analysis — Using Spec Kit to Design the Bridge

[gilfoyle] **Session workflow reconstruction:**
- Actual flow deviated significantly from ideal Spec Kit pipeline. Constitution was never customized. Clarify phase was initially skipped (added post-tasks after Juanma's directive). Clean Architecture was inserted between plan and tasks as an unscripted design session. Pipeline was re-run incrementally for US7 addition.
- The pattern **diverge (Squad parallel research) → converge (Spec Kit sequential pipeline)** emerged as the core value proposition. Four agents doing simultaneous research produced dramatically better spec quality than cold-start specification.

**Key friction points identified:**
1. `setup-plan.sh` overwrites plan.md on re-run — data loss risk mitigated only by git.
2. Clarify phase timing matters: post-tasks catches spec/task misalignment, pre-plan catches ambiguity. Both have value.
3. Uncustomized constitution creates fragile quality gates — Richard had to reverse-engineer principles from decisions.md.
4. Squad agents can't invoke Spec Kit VS Code chat commands — the core impedance mismatch the bridge must solve.
5. Human-in-the-loop directive changed governance model mid-session but wasn't captured in constitution.
6. Pre-pipeline research phase has no Spec Kit equivalent.

**Learnings that should shape the bridge:**
- L-1: `after_tasks` hook should trigger clarify + review (not just review).
- L-2: Bridge should detect template-only constitution and warn.
- L-3: Bridge must handle incremental pipeline re-runs safely (pre-phase artifact checks).
- L-4: Context summary should include workflow history, not just state.
- L-5: Research artifacts (`research-*.md`) should be discoverable by context command.
- L-6: Session retrospective (auto-capture workflow learnings) is a viable future feature (US8).
- L-7: `before_specify` hook gap in Spec Kit is the critical blocker for full automation.
- L-8: Governance decisions need boosted visibility in context summaries.

**Proposals written:**
- 3 actionable for v0.1 (clarify after tasks, constitution detection, setup-plan.sh warning)
- 3 deferred to v0.2 (workflow notes section, governance boosting, research scanning)
- Full analysis: `research-gilfoyle-meta-analysis.md` at repo root
- Decision proposals: `.squad/decisions/inbox/gilfoyle-workflow-learnings.md`

### 2026-03-24: T001 — Entity Types and Pure Functions (#256)

[gilfoyle] **Delivered:** 11 new entity types + 2 pure functions + 28 new unit tests (68 total in types.test.ts, 211 full suite).

**New types added to `src/types.ts`:**
- US-7 (Distribution): `AgentAssignment`, `DistributionWarning`, `RebalanceSuggestion`, `DistributionAnalysis`
- US-8 (Skill Matching): `SkillMatch`, `SkillInjection`
- US-9 (Dead Code): `DeadCodeEntry`, `DeadCodeReport`, `DeadCodeCategory` (union type)
- US-5 (Spec Requirements): `SpecRequirement`, `RequirementCoverage`, `ImplementationReview`

**Pure functions:**
- `analyzeDistribution(assignments, threshold?)` — counts per-agent issues, detects imbalance via configurable threshold (default 0.5), generates rebalance suggestions pointing to least-loaded agent.
- `matchSkillsToTask(task, skills)` — tokenizes task title+description and skill content, matches on >2-char keywords, returns sorted by relevance score.

**Design decisions:**
- Kept all new types and functions in Layer 0 (entities) — zero I/O, zero external imports. Matches existing pattern.
- `DeadCodeCategory` extracted as a named union type for reuse.
- `matchSkillsToTask` uses word-level tokenization (split on `\W+`, filter <=2 chars) — simple but effective for keyword matching without external NLP deps.
- `analyzeDistribution` suggests moves to the single least-loaded agent. Future improvement could distribute across multiple targets.

### 2026-03-24: Knowledge Feedback Gap Analysis — Reverse Sync Architecture

[gilfoyle] **Analyzed:** Juanma's directive to close the knowledge feedback loop: *"sync from spec learnings back to specs, preferably after a nap from the squad."*

**Key findings:**

1. **Current State Gap:** `squask sync` implements forward-only flow (tasks.md → bridge memory). No reverse enrichment of spec artifacts post-implementation. One-way fact transfer; no architectural learnings, decisions made during work, or integration discoveries fed back.

2. **Knowledge Sources Located:**
   - Primary: Agent histories (`.squad/agents/*/history.md` — timestamped, 12KB+), Decisions file (`.squad/decisions.md`), Orchestration logs
   - Secondary: Skills, constitution, implementation results in spec directory
   - Risk: Agent histories contain raw transcripts, debug logs, sensitive context (APIs, customer data)

3. **"Nap" Concept Interpreted:** Cooldown between work completion and feedback harvest. Rationale: agents still processing, histories messy, decisions in flux (inbox → merged). Three flavors: time-gated (24h default), manual ceremony override, event-driven (deferred).

4. **Target Enrichment:** New `specs/{id}/learnings.md` captures implementation experience (discoveries, decisions made, integration patterns, risks, techniques). Proposed structure: Architectural Insights, Integration Patterns, Performance Notes, Decisions, Reusable Techniques, Risks & Workarounds.

5. **Bridge Control Options:**
   - Recommended MVP: Manual ceremony (`squask sync-reverse <spec-dir>` with `--cooldown 0` override)
   - Phase 2: Time-gated automatic (default 24h, config override)
   - Phase 3: Event-driven (queue on agent inbox entries)

6. **Data Flow Architecture:** Source (histories/decisions) → Filter (cooldown, scope, dedup) → Transform (summarize, group by category) → Target (learnings.md). Deduplication via fingerprints (existing pattern). Privacy masking: regex strip secrets, PII patterns.

7. **Critical Risks Identified:**
   - Data integrity: duplicate entries, stale info, circular loops (mitigate with fingerprints, version numbering, loop-depth tracking)
   - Privacy: exposed secrets, sensitive architecture, customer data (mitigate with regex masking, opt-in policy, PII stripping)
   - State: timestamp drift, cooldown strictness, file corruption (mitigate with UTC validation, configurable cooldown, defensive parsing)
   - Scope: hard to detect feature-level relevance (mitigate with explicit tagging, heuristic matching)

8. **Clean Architecture Alignment:** Entity types (ReverseSyncOptions, ReverseSyncResult) → Use case (syncReverse) → Ports (SpecWriter) → Adapters (ReverseSyncAdapter) → CLI (sync-reverse command) → Composition root. No changes to Squad/Spec Kit core.

**Recommendations for team alignment:**
- Start with manual ceremony (lower risk) → time-gated automation (proven) → event-driven (if valuable)
- Privacy filtering required from day 1 (no secrets in artifacts)
- Cooldown flexible (24h default, override allowed)
- Human-in-the-loop initially (manual trigger + team review)

**Document:** Full research written to `specs/006-knowledge-feedback-loop/research.md` — ready for spec & planning phases.

### 2026-03-24: T002 — Demo Entity Types Definition

[dinesh] **Task:** Defined all entity types in `src/demo/entities.ts` for the E2E demo script (Issue #206).

**Entities Created:**
- **Enums:** `StageStatus` (pending/running/success/failed), `ArtifactType` (spec/plan/tasks/review)
- **Interfaces:** `DemoFlags`, `DemoConfiguration`, `PipelineStage`, `DemoArtifact`, `ArtifactSummary`, `ExecutionReport`

**Pattern Applied:** Pure domain types with no dependencies — follows Clean Architecture entity layer principles. All fields documented with JSDoc comments matching the spec at `specs/003-e2e-demo-script/data-model.md`.

### 2026-03-24: T001 — Demo Feature Directory Structure

[dinesh] **Task:** Created directory structure for demo feature on branch `003-e2e-demo-script` (Issue #205).

**Directories Created:**
- `src/demo/` and `src/demo/adapters/` — demo feature source code
- `tests/demo/` and `tests/demo/adapters/` — demo unit/integration tests
- `tests/e2e/` — end-to-end test directory

**Pattern Applied:** Used `.gitkeep` files in all empty directories — consistent with Phase 1 scaffolding approach (T001 from Phase 1 Setup learnings).

### 2026-03-24: Phase 3 — US1 Installation Implementation (T011-T020)

[dinesh] **Use Case Implementation Patterns:**
- Use cases (`installBridge`, `checkStatus`) take port interfaces as function parameters — not class constructors. This keeps them as pure async functions, easier to test than class-based orchestrators.
- The `installBridge` use case returns a result object (`{ manifest, warnings }`) rather than throwing on partial success. Degraded mode (one framework missing) produces warnings but still succeeds — aligns with CLI exit code 0 for partial installs.
- Use cases define their own request/result types (`InstallOptions`, `InstallResult`, `StatusReport`) co-located in the same file. These are boundary DTOs — not entities, not adapter concerns.

**Adapter Design Patterns:**
- `FileSystemFrameworkDetector`: Simplest adapter pattern — wraps a single `fs.stat()` call behind a port interface. The `directoryExists` private method handles the try/catch once; both port methods delegate to it.
- `FileSystemDeployer`: Manages both file deployment AND manifest tracking. The manifest is the adapter's concern (persistence format), not the use case's. Re-deploy preserves `installedAt` timestamp while updating `updatedAt` — tested explicitly.
- `ConfigFileLoader`: Resolution chain (explicit path → bridge.config.json → package.json → defaults) implemented as sequential fallthrough. `mergeAndValidate` does shallow merge per config section, then validates the merged result — catches invalid overrides early.

**CLI Wiring Patterns:**
- Composition root (`main.ts`) exports factory functions (`createInstaller`, `createStatusChecker`) — not raw instances. CLI calls factories, which wire adapters internally. This keeps the CLI file (~100 LOC) focused on commander setup only.
- Output formatting (human-readable vs JSON) lives in the composition root as private functions, not in use cases. Use cases return structured data; formatters convert to strings. This respects the Clean Architecture boundary — format is an adapter concern.
- Template loading uses `import.meta.url` for ESM-compatible path resolution — `__dirname` doesn't exist in ESM modules. Templates are loaded at runtime from the `dist/install/templates/` directory after compilation.

**Testing Insights:**
- Use case tests use `vi.fn().mockResolvedValue()` for port mocks — all ports are async by design. Factory helpers (`makeDetector`, `makeDeployer`, `makeConfigLoader`) with spread overrides keep tests concise.
- Adapter integration tests create temp directories via `os.tmpdir()` with random suffixes, clean up in `afterEach`. Tests against real filesystem catch issues that mocks would hide (directory creation, file encoding, JSON serialization).
- 36 new tests (8 installer, 7 status, 6 detector, 7 deployer, 8 config-loader) bring total to 77. Zero flaky tests — temp dir isolation prevents race conditions.

### 2026-03-24: Clean Architecture Boundary Analysis for Squad-SpecKit Bridge

[dinesh] **Boundary Mapping Applied:**
- Identified 4 precise layers: Entities (ContextBudget, RelevanceScorer, ReviewFinding, BridgeConfig validation), Use Cases (GenerateContext, PrepareReview, InstallBridge, CheckStatus), Adapters (SquadFS, SpecKitFS, ConfigFile, CLI, Manifest, GitHub), Frameworks (commander, gray-matter, glob, node:fs, Octokit).
- Current plan.md organizes by domain concern (bridge/, install/, review/) — this violates Clean Architecture because it mixes I/O with business logic. Reorganized into layer-based structure (entities/, use-cases/, adapters/, dto/).

**Critical Port Interfaces Defined:**
- Output ports owned by use cases: `SquadStatePort` (team knowledge), `SpecKitStatePort` (tasks + context writing), `ConfigPort` (config resolution), `FrameworkDetectorPort`, `FileWriterPort`, `IssueTrackerPort`.
- Input ports: one per use case (GenerateContextPort, PrepareReviewPort, InstallBridgePort, CheckStatusPort).
- Ports injected via constructor — composition root (main.ts) is the ONLY file that knows all concrete types.

**Key Insight — DTOs vs Entities:**
- data-model.md conflates data structures (SkillEntry, DecisionEntry, LearningEntry) with entities. In Clean Architecture, these are DTOs — they carry data across boundaries but own no business rules. Real entities are ContextBudget (allocation algorithm), RelevanceScorer (prioritization logic), ReviewFinding (classification rules).
- No raw markdown should cross the adapter → use case boundary. Adapters parse markdown into typed DTOs. If a use case sees `### Heading`, we've violated the dependency rule.

**Anti-Patterns Catalogued:**
- 8 specific violations documented: importing gray-matter/fs/commander/process.env in wrong layers, adapters calling adapters, business logic in adapters, format-specific returns from use cases, hardcoded .squad/.specify/ paths in inner layers.

**Task Structuring Impact:**
- Entity tasks are independent (parallel, test-first, no mocks needed). Use case tasks depend on entity + port interfaces only. Adapter tasks are parallelizable (Squad, SpecKit, CLI adapters are independent). Composition root is last. This ordering maximizes parallel work.

### 2026-03-24: MCP Server Architecture & Integration Mechanism Feasibility

[dinesh] **MCP Server Technical Findings:**
- MCP servers communicate via JSON-RPC 2.0 over stdio (subprocess model) or Streamable HTTP. For Copilot integration, stdio is the correct transport — spawned per session, no daemon.
- TypeScript SDK: `@modelcontextprotocol/sdk` + `zod` for schema validation. Tools registered via `server.registerTool(name, { description, inputSchema }, handler)`.
- Configuration: `~/.copilot/mcp-config.json` (user-level) or `.vscode/mcp.json` (project-level). JSON with `mcpServers.{name}.{type, command, args, tools}`.
- GitHub MCP server (Go) uses toolset-based organization with middleware stack. Our bridge would be simpler: 5 tools, ~500 LOC TypeScript.
- MCP tools are **passive** — available for agents to call, but nothing auto-triggers them at lifecycle boundaries. Still need SKILL.md or hook scripts to teach agents *when* to call.
- Tool surface designed: `bridge_squad_context`, `read_speckit_tasks`, `create_issues_from_tasks`, `sync_learnings`, `check_integration_status`.

**Squad Plugin System Limits (Verified):**
- Skills (SKILL.md) are **pure markdown** — no executable code, no scripts, no binaries. Agents read and apply patterns described in natural language.
- Skills can reference MCP tools in YAML frontmatter `tools:` field (metadata only, doesn't install/enable them).
- Plugin marketplace bundles: SKILL.md files, agent charter fragments, ceremony definitions, sample prompts. All markdown/JSON.
- Plugins **cannot**: run scripts, add lifecycle hooks, watch files, trigger on events, modify routing programmatically. Knowledge injection only, not behavior injection.
- New ceremonies CAN be added by editing `.squad/ceremonies.md` — plugins can include ceremony definitions.

**Spec Kit Extension Hooks (Verified):**
- Available hooks: `after_tasks` ✅, `after_implement` ✅, `before_commit` ✅, `after_commit` ✅, `before_tasks` ✅.
- Missing hooks: `before_specify` ❌, `before_plan` ❌ — critical gap for memory bridge auto-trigger.
- Hooks invoke shell scripts (bash/PowerShell) — can call any external tool, API, or executable.
- Extension manifest: `extension.yml` with schema_version, hooks, commands, config.
- Extension loading: `.specify/extensions/{ext-id}/` directory, registered in `.specify/extensions/.registry`.

**Key Technical Insight:**
MCP + Plugin + Extension are **complementary layers**, not competing approaches:
- MCP = reliable structured tool access (programmatic parsing > LLM markdown interpretation)
- Plugin = agent knowledge injection (when/why to use tools)
- Extension = lifecycle automation (auto-trigger at workflow boundaries)
The full integration needs all three, phased: Plugin+Extension first (v1), MCP server added later (v2).

### 2026-03-24: Squad vs Spec Kit Technical Compatibility Analysis

[dinesh] - **Squad directory:** `.squad/` with team.md, routing.md, decisions.md, agents/{name}/charter.md+history.md, casting/ (JSON configs), orchestration-log/, log/, skills/, sessions/. Also `.github/agents/squad.agent.md` (81KB coordinator prompt), `.github/copilot-instructions.md`, and multiple `squad-*.yml` workflows.
- **Spec Kit directory:** `.specify/` with memory/constitution.md, scripts/, templates/, init-options.json, extensions/. Also `specs/NNN-feature/` for feature specs. Agent-specific command files in `.github/agents/speckit.*.agent.md` (for Copilot), `.claude/commands/`, `.cursor/commands/`, etc. Supports 25+ AI agents via AGENT_CONFIG dictionary.
- **No directory conflicts:** `.squad/` and `.specify/` are completely independent namespaces.
- **`.github/agents/` shared safely:** Squad writes `squad.agent.md`, Spec Kit writes `speckit.*.agent.md` — different filenames, same directory.
- **One real conflict:** `.github/copilot-instructions.md` is written by both tools. Needs section markers or merge script.
- **Squad state:** decisions.md (merge=union), per-agent history.md (merge=union), drop-box/inbox pattern for parallel writes, orchestration-log (ephemeral).
- **Spec Kit state:** constitution.md (project principles), specs/NNN/spec.md+plan.md+tasks.md (per-feature). No parallel write handling needed (single-agent model).
- **Runtime models are independent:** Squad = live multi-agent orchestrator on Copilot. Spec Kit = CLI scaffolder + shell scripts, agent-agnostic.
- **Natural integration point:** Spec Kit tasks.md → GitHub Issues with `squad` label → Squad's Ralph triage pipeline. Bridge script estimated at ~100-150 lines.
- **GitHub workflows don't conflict:** Squad prefixes all workflows `squad-*`. Spec Kit uses `release.yml`, `stale.yml`, etc. No name collisions.
- **Branch naming differs:** Squad uses `squad/{issue}-{slug}`, Spec Kit uses `NNN-short-name`. Non-conflicting but teams need a convention.

### 2026-03-24: Team Synthesis — Framework Research Complete

[dinesh] **Team findings (simultaneous background execution):**
- Gilfoyle: complementary architectural layers (runtime vs planning)
- Richard: pipeline integration strategy with tasks.md handoff
- Jared: real-world patterns show state accumulation and team-size fit as critical factors

**Technical recommendation confirmed:**
Squad and Spec Kit can coexist safely with:
- Section markers in `.github/copilot-instructions.md`
- ~100-line bridge script (tasks.md → issues → Ralph triage)
- No framework modifications needed (additive approach)

**Implementation roadmap:**
1. Bridge script for tasks.md → Squad workflow
2. Handle copilot-instructions.md merge via markers
3. Define branch naming convention
4. Test with realistic multi-phase workflow

### 2026-03-24: Phase 1 Setup — Project Scaffolding Patterns

[dinesh] **Clean Architecture Directory Structure (T001):**
- Domain-based top-level dirs: `src/bridge/`, `src/install/`, `src/review/`, `src/cli/` — each domain gets its own `adapters/` subdirectory for Clean Architecture boundary separation.
- Test dirs mirror Clean Architecture layers: `tests/unit/`, `tests/integration/`, `tests/fixtures/` with `squad/` and `specify/` subdirectories for adapter integration tests.
- Used `.gitkeep` files to track empty directories in git — necessary since git doesn't track empty dirs.

**npm Project Setup (T002):**
- `"type": "module"` is essential for ESM — without it, Node16 module resolution won't work correctly with `.ts` → `.js` compilation.
- `"bin"` entry points to `dist/cli/index.js` (compiled output), not `src/cli/index.ts` (source). The CLI is the outermost Clean Architecture layer.
- Production deps (commander, gray-matter, glob) are framework/driver layer only — they must never be imported in entities or use cases.

**TypeScript + Vitest Config (T003–T004):**
- `module: "Node16"` + `moduleResolution: "Node16"` pair is required for ESM in Node.js — using one without the other causes resolution failures.
- `rootDir: "src"` + `outDir: "dist"` preserves directory structure in compiled output, which is needed for the `bin` entry to resolve correctly.
- Vitest's `include: ['tests/**/*.test.ts']` keeps tests outside `src/` — clean separation between production code and test code.
- v8 coverage provider is zero-config with Vitest (no additional install needed), unlike istanbul.

**PR Workflow (batch commits):**
- Sequential setup tasks (T001→T004) work well on a single branch with individual commits referencing issues.
- PR body references all closed issues: `Closes #2, closes #3, closes #4, closes #5` — GitHub auto-closes all four on merge.

### 2026-03-24: Phase 2 Foundational — Entity Design & Port Interface Patterns

[dinesh] **Entity Design Patterns Applied:**
- All 10 entity types (BridgeConfig, ContextSummary, SkillEntry, DecisionEntry, LearningEntry, DesignReviewRecord, ReviewFinding, InstallManifest, TaskEntry, DeploymentFile) are plain TypeScript interfaces — no classes, no constructors, no inheritance. This keeps the entity layer maximally composable and serializable.
- Union literal types (`ReviewSeverity`, `ReviewFindingType`, `ApprovalStatus`) enforce domain constraints at the type level — invalid values are compile-time errors, not runtime surprises.
- Nested sub-objects in BridgeConfig (`sources`, `summarization`, `hooks`, `paths`) match the config-schema.md JSON structure exactly. This means config file ↔ entity mapping is structural, not transformational — adapters can deserialize directly.

**Pure Function Design:**
- `isValidConfig()` validates BridgeConfig with boundary checks: contextMaxBytes (1–32768), recencyBiasWeight (0.0–1.0), maxDecisionAgeDays (>0). Returns boolean — callers decide error handling.
- `computeRelevanceScore()` uses exponential decay with 90-day half-life: `e^(-ageDays * ln2 / 90)`. Produces ~0.5 at 90 days, ~0.25 at 180 days. Unparseable dates return 0.5 (neutral) rather than failing — graceful degradation pattern.
- Severity helpers (`compareSeverity`, `isHighSeverity`, `categorizeFindings`) use a numeric order map instead of switch/if chains — cleaner, extensible, and the comparator works directly with `Array.sort()`.

**Port Interface Design:**
- 6 port interfaces (SquadStateReader, ContextWriter, TasksReader, FrameworkDetector, FileDeployer, ConfigLoader) import ONLY from `../types.ts`. Zero external dependencies.
- All port methods return `Promise<T>` — even though entity layer is sync, ports are async because adapters will do I/O. Designing async-first avoids breaking changes when adapters are implemented.
- Port names describe capability, not implementation: `SquadStateReader` not `SquadFileReader`, `FileDeployer` not `FsFileWriter`. This keeps the contract independent of the adapter technology.
- `FileDeployer.deploy()` takes `DeploymentFile[]` and returns `string[]` (deployed paths) — the port defines the data shape, not the file system details.

**Testing Insight:**
- 41 tests across 6 describe blocks, zero mocks. Pure functions are the easiest code to test — factory helpers (`makeConfig`, `makeDecision`, `makeFinding`) with spread overrides make each test self-documenting.
- `createDefaultConfig()` returning a fresh object each call (verified by mutation test) prevents shared-state bugs in production code.

**Git Worktree Pattern:**
- When multiple agents work on different branches in the same repo simultaneously, git worktrees prevent branch conflicts. Used `git worktree add /path squad/phase2-foundational` to isolate from concurrent documentation work on `squad/us7-documentation`.
