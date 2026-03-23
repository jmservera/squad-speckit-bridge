# Dinesh — History

## Core Context

- **Project:** Research and compare agentic development frameworks, evaluating their capabilities and interoperability
- **Role:** Integration Engineer
- **Joined:** 2026-03-23T08:50:38.331Z

## Learnings

<!-- Append learnings below -->

### 2026-03-23: T001 — Demo Feature Directory Structure

**Task:** Created directory structure for demo feature on branch `003-e2e-demo-script` (Issue #205).

**Directories Created:**
- `src/demo/` and `src/demo/adapters/` — demo feature source code
- `tests/demo/` and `tests/demo/adapters/` — demo unit/integration tests
- `tests/e2e/` — end-to-end test directory

**Pattern Applied:** Used `.gitkeep` files in all empty directories — consistent with Phase 1 scaffolding approach (T001 from Phase 1 Setup learnings).

### 2025-07-25: Phase 3 — US1 Installation Implementation (T011-T020)

**Use Case Implementation Patterns:**
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

### 2025-07-24: Clean Architecture Boundary Analysis for Squad-SpecKit Bridge

**Boundary Mapping Applied:**
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

### 2025-07-24: MCP Server Architecture & Integration Mechanism Feasibility

**MCP Server Technical Findings:**
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

### 2026-03-23: Squad vs Spec Kit Technical Compatibility Analysis

- **Squad directory:** `.squad/` with team.md, routing.md, decisions.md, agents/{name}/charter.md+history.md, casting/ (JSON configs), orchestration-log/, log/, skills/, sessions/. Also `.github/agents/squad.agent.md` (81KB coordinator prompt), `.github/copilot-instructions.md`, and multiple `squad-*.yml` workflows.
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

### 2026-03-23: Team Synthesis — Framework Research Complete

**Team findings (simultaneous background execution):**
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

### 2025-07-25: Phase 1 Setup — Project Scaffolding Patterns

**Clean Architecture Directory Structure (T001):**
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

### 2025-07-25: Phase 2 Foundational — Entity Design & Port Interface Patterns

**Entity Design Patterns Applied:**
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
