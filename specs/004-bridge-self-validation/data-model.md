# Data Model: Bridge Self-Validation & Knowledge Loop

**Feature**: 004-bridge-self-validation | **Date**: 2025-07-17

## Existing Entities (Unchanged)

These entities already exist in `src/types.ts` and require no modification.

### BridgeConfig
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `contextMaxBytes` | `number` | Max output size for context generation (1–32768) |
| `sources` | `{ skills: boolean; decisions: boolean; histories: boolean }` | Which Squad memory sources to include |
| `summarization` | `{ recencyBiasWeight: number; maxDecisionAgeDays: number }` | Scoring tuning parameters |
| `hooks` | `{ afterTasks: boolean; beforeSpecify: boolean; afterImplement: boolean }` | Hook enablement flags |
| `sync` | `{ autoSync: boolean; targetDir: string }` | Sync configuration |
| `issues` | `{ defaultLabels: string[]; repository: string }` | Issue creation defaults |
| `paths` | `{ squadDir: string; specifyDir: string }` | Directory paths |

**Validation**: `isValidConfig()` — contextMaxBytes ∈ (0, 32768], recencyBiasWeight ∈ [0, 1], maxDecisionAgeDays > 0.

### ContextSummary
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `metadata.generated` | `string` | ISO timestamp of generation |
| `metadata.cycleCount` | `number` | Incremental generation counter |
| `metadata.sources` | `{ skills: number; decisions: number; histories: number; skipped: string[] }` | Source counts |
| `metadata.sizeBytes` | `number` | Total output size |
| `metadata.maxBytes` | `number` | Budget limit used |
| `content.skills` | `SkillEntry[]` | Summarized skills |
| `content.decisions` | `DecisionEntry[]` | Scored decisions |
| `content.learnings` | `LearningEntry[]` | Agent learnings |
| `content.warnings` | `string[]` | Generation warnings |

**State Transitions**: Generated → Written (via ContextWriter port).

### SkillEntry
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Skill identifier (e.g., "clean-architecture-bridge") |
| `context` | `string` | Skill applicability context |
| `patterns` | `string[]` | Known good patterns |
| `antiPatterns` | `string[]` | Known bad patterns |
| `rawSize` | `number` | Byte size of source SKILL.md |

### DecisionEntry
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Decision title |
| `date` | `string` | ISO date string |
| `status` | `string` | Decision status (e.g., "active", "superseded") |
| `summary` | `string` | Brief summary |
| `relevanceScore` | `number` | Computed score ∈ [0, 1] via `computeRelevanceScore()` |
| `fullContent` | `string` | Complete decision text |

### LearningEntry
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `agentName` | `string` | Agent identifier |
| `agentRole` | `string` | Agent role description |
| `entries` | `LearningItem[]` | Individual learning items |
| `rawSize` | `number` | Byte size of source file |

### TaskEntry
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task identifier (e.g., "T001") |
| `title` | `string` | Task title |
| `description` | `string` | Full task description |
| `dependencies` | `string[]` | IDs of tasks this depends on |
| `status` | `string` | Task status ("pending", "done") |

### IssueRecord
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `issueNumber` | `number` | GitHub issue number (0 for dry-run) |
| `title` | `string` | Issue title |
| `body` | `string` | Issue body markdown |
| `labels` | `string[]` | Applied labels |
| `taskId` | `string` | Source task ID |
| `url` | `string` | GitHub issue URL |
| `createdAt` | `string` | ISO timestamp |

### SyncRecord / SyncState
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `SyncRecord.syncTimestamp` | `string` | ISO timestamp of sync |
| `SyncRecord.learningsUpdated` | `number` | Count of learnings written |
| `SyncRecord.filesWritten` | `string[]` | Paths of written files |
| `SyncRecord.summary` | `string` | Human-readable sync summary |
| `SyncState.lastSyncTimestamp` | `string` | Most recent sync time |
| `SyncState.syncHistory` | `SyncRecord[]` | Full sync history |
| `SyncState.totalSyncs` | `number` | Total sync count |

### DesignReviewRecord / ReviewFinding
**Layer**: Entity (Layer 0) | **File**: `src/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| `DesignReviewRecord.reviewedArtifact` | `string` | Path to reviewed file |
| `DesignReviewRecord.timestamp` | `string` | ISO timestamp |
| `DesignReviewRecord.participants` | `string[]` | Review participants |
| `DesignReviewRecord.findings` | `ReviewFinding[]` | Detected issues |
| `DesignReviewRecord.approvalStatus` | `ApprovalStatus` | "approved" \| "changes_requested" \| "blocked" |
| `DesignReviewRecord.summary` | `string` | Human-readable summary |
| `ReviewFinding.type` | `ReviewFindingType` | "missing_task" \| "risk" \| "ordering" \| "decision_conflict" \| "scope" |
| `ReviewFinding.severity` | `ReviewSeverity` | "high" \| "medium" \| "low" |

---

## New Entities

### DistributionAnalysis
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-7

| Field | Type | Description |
|-------|------|-------------|
| `agentCounts` | `Record<string, number>` | Issue count per agent |
| `totalIssues` | `number` | Total issues analyzed |
| `imbalanced` | `boolean` | True if any agent exceeds threshold |
| `threshold` | `number` | Imbalance threshold (default 0.5) |
| `warnings` | `DistributionWarning[]` | Imbalance warnings |
| `suggestions` | `RebalanceSuggestion[]` | Rebalancing recommendations |

**Validation**: `totalIssues >= 0`, `threshold ∈ (0, 1]`.

**Pure function**: `analyzeDistribution(assignments: AgentAssignment[], threshold?: number): DistributionAnalysis`

### AgentAssignment
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-7

| Field | Type | Description |
|-------|------|-------------|
| `issueNumber` | `number` | GitHub issue number |
| `agentName` | `string` | Assigned agent name |
| `labels` | `string[]` | Issue labels |

### DistributionWarning
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-7

| Field | Type | Description |
|-------|------|-------------|
| `agentName` | `string` | Over-assigned agent |
| `assignedCount` | `number` | Number of issues assigned |
| `percentage` | `number` | Percentage of total |
| `message` | `string` | Human-readable warning |

### RebalanceSuggestion
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-7

| Field | Type | Description |
|-------|------|-------------|
| `fromAgent` | `string` | Over-assigned agent |
| `toAgent` | `string` | Suggested target agent |
| `issueNumbers` | `number[]` | Issues to move |
| `rationale` | `string` | Why this agent is suited |

### SkillMatch
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-8

| Field | Type | Description |
|-------|------|-------------|
| `skillName` | `string` | Matched skill identifier |
| `relevanceScore` | `number` | Match score ∈ [0, 1] |
| `matchedKeywords` | `string[]` | Keywords that matched |
| `contentSize` | `number` | Byte size of skill content |

**Pure function**: `matchSkillsToTask(task: TaskEntry, skills: SkillEntry[]): SkillMatch[]`

### SkillInjection
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-8

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Target task ID |
| `injectedSkills` | `SkillMatch[]` | Skills selected for injection |
| `totalContentSize` | `number` | Combined skill content size |
| `truncated` | `boolean` | Whether content was truncated to fit budget |
| `budgetBytes` | `number` | Context window budget |

### DeadCodeEntry
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-9

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | Source file path |
| `exportName` | `string` | Name of unused export |
| `lineRange` | `[number, number]` | Start and end line numbers |
| `category` | `"untested" \| "unreachable" \| "unused_export"` | Dead code category |
| `associatedCommand` | `string \| null` | CLI command this code belongs to (null = orphan) |

### DeadCodeReport
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-9

| Field | Type | Description |
|-------|------|-------------|
| `entries` | `DeadCodeEntry[]` | All dead code entries |
| `totalLines` | `number` | Total dead code lines |
| `exercisedLines` | `number` | Lines exercised by new tests |
| `removedLines` | `number` | Lines removed in cleanup |
| `baselineCoverage` | `number` | Pre-cleanup coverage percentage |
| `finalCoverage` | `number` | Post-cleanup coverage percentage |

### SpecRequirement (New — for FR-013/FR-014)
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-5

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Requirement ID (e.g., "FR-001") |
| `text` | `string` | Full requirement text |
| `category` | `string` | Requirement category (e.g., "Context Generation") |

### RequirementCoverage (New — for FR-013/FR-014)
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-5

| Field | Type | Description |
|-------|------|-------------|
| `requirement` | `SpecRequirement` | The requirement being checked |
| `covered` | `boolean` | Whether implementation evidence was found |
| `evidence` | `string[]` | File paths / test names providing coverage |
| `gaps` | `string[]` | Missing coverage areas |

### ImplementationReview (New — for FR-013/FR-014)
**Layer**: Entity (Layer 0) | **File**: `src/types.ts` | **User Story**: US-5

| Field | Type | Description |
|-------|------|-------------|
| `specPath` | `string` | Path to spec.md |
| `implementationDir` | `string` | Path to implementation source |
| `requirements` | `RequirementCoverage[]` | Per-requirement coverage |
| `coveragePercent` | `number` | Percentage of requirements with evidence |
| `timestamp` | `string` | ISO timestamp |
| `summary` | `string` | Human-readable assessment |

---

## Entity Relationships

```text
BridgeConfig ─────────────> ContextSummary
  (configures)                 (produced by buildSquadContext)
                                    │
                                    ├── SkillEntry[]
                                    ├── DecisionEntry[]
                                    └── LearningEntry[]
                                            │
TaskEntry[] ──────────────> IssueRecord[]   │
  (parsed from tasks.md)    (created in GitHub) │
       │                                    │
       │                                    ▼
       │                         SyncRecord / SyncState
       │                         (captures post-impl learnings)
       │
       ├── DesignReviewRecord
       │     └── ReviewFinding[]
       │
       ├── ImplementationReview      (NEW: spec-vs-impl comparison)
       │     └── RequirementCoverage[]
       │           └── SpecRequirement
       │
       └── AgentAssignment[]
             └── DistributionAnalysis  (NEW: imbalance detection)
                   ├── DistributionWarning[]
                   └── RebalanceSuggestion[]

SkillEntry[] ──> SkillMatch[]          (NEW: relevance matching)
                   └── SkillInjection  (NEW: context-aware injection)

DeadCodeEntry[] ──> DeadCodeReport     (NEW: audit report)
```

---

## Port Interfaces (Existing + Extensions)

### Existing Ports (in `src/bridge/ports.ts`)

| Port | Direction | Methods | Implementing Adapter |
|------|-----------|---------|---------------------|
| `SquadStateReader` | Input | `readSkills()`, `readDecisions()`, `readLearnings(since?)`, `readConstitution?()` | `SquadFileReader` |
| `ContextWriter` | Output | `write(summary)`, `readPreviousMetadata()` | `SpecKitContextWriter` |
| `TasksReader` | Input | `readTasks(path)` | `TasksParser` |
| `FrameworkDetector` | Input | `detectSquad(dir)`, `detectSpecKit(dir)` | `FileSystemFrameworkDetector` |
| `FileDeployer` | Output | `deploy(files)`, `deployExecutable(files)`, `listDeployed()` | `FileSystemDeployer` |
| `ConfigLoader` | Input | `load()` | `ConfigFileLoader` |
| `IssueCreator` | Output | `create(task, labels, repo)`, `createBatch(tasks, labels, repo)` | `GitHubIssueAdapter` |
| `SquadMemoryWriter` | Output | `writeLearning(agent, title, content)`, `writeDecision(title, content)` | (in `SyncStateAdapter`) |
| `TasksMarkdownReader` | Input | `readAndParse(path)` | `TasksMarkdownParser` |

### New/Extended Port Methods

| Port | New Method | Purpose |
|------|-----------|---------|
| `IssueCreator` | `listExisting(repo, labels): Promise<IssueRecord[]>` | Query existing issues for deduplication (US-2) |
| `SquadStateReader` | `readAgentCharters(): Promise<AgentCharter[]>` | Read agent skills for distribution suggestions (US-7) |
| `SquadStateReader` | `readSkillFiles(): Promise<SkillFileContent[]>` | Read raw skill content for injection (US-8) |
| New: `SpecReader` | `readRequirements(specPath): Promise<SpecRequirement[]>` | Parse FR-XXX entries from spec.md (US-5) |
| New: `ImplementationScanner` | `scanForEvidence(srcDir, requirement): Promise<string[]>` | Find implementation evidence for requirements (US-5) |

---

## Test Strategy per Entity

| Entity | Test Layer | Test File | Strategy |
|--------|-----------|-----------|----------|
| `BridgeConfig` + validation | Unit | `tests/unit/types.test.ts` | Existing — pure function tests |
| `ContextSummary` | Unit | `tests/unit/context.test.ts` | Existing — mock SquadStateReader/ContextWriter |
| `computeRelevanceScore()` | Unit | `tests/unit/types.test.ts` | Existing — deterministic date-based tests |
| `DistributionAnalysis` | Unit | `tests/unit/distribution.test.ts` | **New** — pure function, test threshold detection |
| `SkillMatch` | Unit | `tests/unit/skill-matching.test.ts` | **New** — pure keyword matching tests |
| `DeadCodeReport` | Unit | `tests/unit/dead-code.test.ts` | **New** — pure aggregation tests |
| `SpecRequirement` + coverage | Unit | `tests/unit/requirement-coverage.test.ts` | **New** — requirement parsing + matching |
| `ImplementationReview` | Unit | `tests/unit/implementation-review.test.ts` | **New** — mock SpecReader/ImplementationScanner |
| `IssueCreator.listExisting` | Integration | `tests/integration/github-issue-adapter.test.ts` | **New** — mock `gh` CLI responses |
| `SyncStateAdapter` extensions | Integration | `tests/integration/sync-state-adapter.test.ts` | **New** — fixture files for agent history parsing |
