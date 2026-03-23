# Data Model: Squad-SpecKit Knowledge Bridge

**Phase**: 1 — Design & Contracts
**Date**: 2025-07-24

## Entities

### 1. BridgeConfig

Configuration controlling bridge behavior. Persisted as `bridge.config.json` in the project root or inline in `package.json` under a `"squad-speckit-bridge"` key.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `contextMaxBytes` | number | 8192 | Maximum size of generated context summary |
| `sources.skills` | boolean | true | Include Squad skills in context |
| `sources.decisions` | boolean | true | Include Squad decisions in context |
| `sources.histories` | boolean | true | Include agent histories in context |
| `summarization.recencyBiasWeight` | number | 0.7 | Weight given to recent entries (0-1) |
| `summarization.maxDecisionAge` | number | 90 | Days after which decisions are deprioritized |
| `hooks.afterTasks` | boolean | true | Enable after_tasks hook notification |
| `squadDir` | string | ".squad" | Path to Squad directory (relative to repo root) |
| `specifyDir` | string | ".specify" | Path to Spec Kit directory (relative to repo root) |

**Validation Rules**:
- `contextMaxBytes` must be > 0 and ≤ 32768 (32KB hard cap)
- `recencyBiasWeight` must be between 0.0 and 1.0
- `maxDecisionAge` must be > 0

---

### 2. ContextSummary

The output document produced by the memory bridge. Written as markdown with YAML frontmatter to the active spec directory.

| Field | Type | Description |
|-------|------|-------------|
| `metadata.generated` | ISO 8601 timestamp | When the summary was produced |
| `metadata.sources.skills` | number | Count of skill files processed |
| `metadata.sources.decisions` | number | Count of decision entries processed |
| `metadata.sources.histories` | number | Count of agent history files processed |
| `metadata.sources.skipped` | string[] | Files that were skipped (malformed/unreadable) |
| `metadata.sizeBytes` | number | Actual size of the generated document |
| `metadata.maxBytes` | number | Configured maximum size |
| `content.skills` | SkillEntry[] | Processed skill content (highest priority) |
| `content.decisions` | DecisionEntry[] | Filtered and prioritized decisions |
| `content.learnings` | LearningEntry[] | Summarized agent learnings |
| `content.warnings` | string[] | Any contradictions or issues detected |

**State**: Stateless — generated fresh each time the bridge runs. Previous summaries are overwritten.

---

### 3. SkillEntry

A parsed Squad skill, extracted from `.squad/skills/*/SKILL.md`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Skill name (from directory name or frontmatter) |
| `context` | string | What the skill teaches (from SKILL.md content) |
| `patterns` | string[] | Recommended patterns (extracted from "Patterns" section) |
| `antiPatterns` | string[] | Things to avoid (extracted from "Anti-Patterns" section) |
| `rawSize` | number | Original file size in bytes |

**Relationships**: Included in ContextSummary at highest priority.

---

### 4. DecisionEntry

A parsed decision from Squad's `.squad/decisions.md`.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Decision title (H3 heading) |
| `date` | string | Decision date (extracted from heading or content) |
| `status` | string | Decision status (Active, Proposed, Superseded) |
| `summary` | string | First paragraph or key "Decision:" line |
| `relevanceScore` | number | Computed score based on recency and keyword match |
| `fullContent` | string | Complete decision text (used if budget allows) |

**Validation**: Entries without a parseable date are assigned relevance score 0.5 (neutral).

---

### 5. LearningEntry

A parsed learning from a Squad agent's `.squad/agents/*/history.md`.

| Field | Type | Description |
|-------|------|-------------|
| `agentName` | string | Agent name (from directory name) |
| `agentRole` | string | Agent role (if parseable from history header) |
| `entries` | LearningItem[] | Individual learning entries |
| `rawSize` | number | Original file size in bytes |

**LearningItem**:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Entry date |
| `title` | string | Entry heading |
| `summary` | string | First paragraph or bullet list |

**Relationships**: Included in ContextSummary at lowest priority (most aggressively summarized).

---

### 6. DesignReviewRecord

The structured output of a Design Review ceremony.

| Field | Type | Description |
|-------|------|-------------|
| `reviewedArtifact` | string | Path to the tasks.md that was reviewed |
| `timestamp` | ISO 8601 timestamp | When the review was conducted |
| `participants` | string[] | Agent names that participated |
| `findings` | ReviewFinding[] | Issues identified during review |
| `approvalStatus` | "approved" \| "changes_requested" \| "blocked" | Review outcome |
| `summary` | string | Human-readable review summary |

**ReviewFinding**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | "missing_task" \| "risk" \| "ordering" \| "decision_conflict" \| "scope" | Finding category |
| `severity` | "high" \| "medium" \| "low" | Impact level |
| `description` | string | What was found |
| `reference` | string | Link to relevant decision, history entry, or codebase location |
| `recommendation` | string | Suggested resolution |

---

### 7. InstallManifest

Tracks what the bridge has installed, enabling idempotent re-installation (FR-004).

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Bridge version that performed the install |
| `installedAt` | ISO 8601 timestamp | When installation occurred |
| `updatedAt` | ISO 8601 timestamp | When last re-installation occurred |
| `components.squadSkill` | boolean | Whether Squad skill was installed |
| `components.specKitExtension` | boolean | Whether Spec Kit extension was installed |
| `components.ceremonyDef` | boolean | Whether ceremony definition was installed |
| `files` | string[] | List of files created/updated by the bridge |

**Persisted at**: `.bridge-manifest.json` in the repo root.

---

## Entity Relationships

```text
BridgeConfig ──controls──▶ ContextSummary generation
                           │
SkillEntry[] ──────────────┤ (highest priority content)
DecisionEntry[] ───────────┤ (medium priority content)
LearningEntry[] ───────────┘ (lowest priority content)

DesignReviewRecord ◀──references── tasks.md (Spec Kit artifact)
                   ◀──uses──────── DecisionEntry[] (for conflict detection)
                   ◀──uses──────── LearningEntry[] (for risk identification)

InstallManifest ──tracks──▶ installed files (for idempotent updates)
```

## State Transitions

### Context Summary Lifecycle

```
[not exists] ──bridge context──▶ [generated]
[generated]  ──bridge context──▶ [regenerated] (overwrites previous)
[generated]  ──speckit specify──▶ [consumed] (read by planning phase)
```

### Design Review Lifecycle

```
[tasks.md generated] ──trigger review──▶ [in_progress]
[in_progress]        ──agents review───▶ [findings_produced]
[findings_produced]  ──lead approves───▶ [approved] ──▶ issue creation
[findings_produced]  ──changes needed──▶ [changes_requested] ──▶ update tasks.md ──▶ re-review
```

### Installation Lifecycle

```
[not installed] ──bridge install──▶ [installed] (manifest created)
[installed]     ──bridge install──▶ [updated]   (manifest updated, files refreshed)
[installed]     ──framework removed──▶ [degraded] (detected at runtime, warnings emitted)
```
