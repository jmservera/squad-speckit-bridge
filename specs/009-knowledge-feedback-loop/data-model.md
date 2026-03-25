# Data Model: Knowledge Feedback Loop (Reverse Sync)

**Spec**: 009-knowledge-feedback-loop  
**Layer**: Entity (src/types.ts) — zero external imports

---

## New Entity Types

### 1. ReverseSyncOptions

Configuration DTO passed from CLI/composition root into the use case.

```typescript
/** Source types that can feed into reverse sync. */
export type ReverseSyncSourceType = 'histories' | 'decisions' | 'skills';

/** Options DTO for reverse sync use case. */
export interface ReverseSyncOptions {
  /** Absolute path to spec directory (e.g., specs/009-knowledge-feedback-loop). */
  specDir: string;
  /** Absolute path to Squad root directory (e.g., .squad/). */
  squadDir: string;
  /** If true, display output but write nothing to disk. */
  dryRun: boolean;
  /** Minimum age in milliseconds — learnings newer than this are excluded. 0 = no cooldown. */
  cooldownMs: number;
  /** Which source types to include. Default: all three. */
  sources: ReverseSyncSourceType[];
  /** If true, skip constitution enrichment even for constitution-worthy entries. */
  skipConstitution: boolean;
  /** Absolute path to constitution file. Required if skipConstitution is false. */
  constitutionPath?: string;
}
```

**Validation Rules**:
- `specDir` must be a non-empty string
- `squadDir` must be a non-empty string
- `cooldownMs` must be >= 0
- `sources` must be non-empty and contain only valid `ReverseSyncSourceType` values
- If `skipConstitution` is false, `constitutionPath` must be provided

---

### 2. ExtractedReverseLearning

A single knowledge item extracted from a Squad source before classification.

```typescript
/** Classification of a learning for routing to the correct target. */
export type LearningClassification = 'constitution-worthy' | 'learnings-only';

/** Category bucket for organizing learnings in the output document. */
export type LearningCategory =
  | 'architectural-insights'
  | 'integration-patterns'
  | 'performance-notes'
  | 'decisions'
  | 'reusable-techniques'
  | 'risks';

/** A single extracted learning entry with metadata. */
export interface ExtractedReverseLearning {
  /** Short descriptive title. */
  title: string;
  /** Full content body (markdown). */
  content: string;
  /** Which Squad source this came from. */
  sourceType: ReverseSyncSourceType;
  /** Agent name if from history, 'team' if from decisions, skill name if from skills. */
  attribution: string;
  /** ISO 8601 timestamp of the original entry. */
  timestamp: string;
  /** Computed fingerprint (DJB2 hash) for deduplication. */
  fingerprint: string;
  /** Classification: constitution-worthy or learnings-only (FR-004a). */
  classification: LearningClassification;
  /** Content category for output document grouping. */
  category: LearningCategory;
}
```

**Relationships**:
- Fingerprint computed via existing `computeLearningFingerprint(title, content)` from `sync-learnings.ts` (reuse, not duplicate)
- Classification determined by pure function `classifyLearning()` (FR-004a gate)
- Category determined by pure function `categorizeLearning()`

---

### 3. ReverseSyncState

Persistent state entity for idempotency across runs. Stored as `.bridge-sync-reverse.json`.

```typescript
/** Persistent state for reverse sync idempotency. */
export interface ReverseSyncState {
  /** ISO 8601 timestamp of last successful reverse sync. */
  lastReverseSyncTimestamp: string;
  /** Set of fingerprints already synced — prevents duplicate writes. */
  syncedFingerprints: string[];
  /** Tracks sync generation to prevent circular feedback loops. */
  syncGeneration: number;
  /** History of reverse sync runs for audit trail. */
  syncHistory: ReverseSyncRecord[];
}

/** Record of a single reverse sync execution. */
export interface ReverseSyncRecord {
  /** ISO 8601 timestamp of this sync run. */
  syncTimestamp: string;
  /** Number of new learnings written. */
  learningsWritten: number;
  /** Number of entries deduplicated (skipped). */
  learningsDeduplicated: number;
  /** Number of entries added to constitution. */
  constitutionEntriesAdded: number;
  /** Source types processed. */
  sourcesProcessed: ReverseSyncSourceType[];
  /** Output file path (or null if dry-run). */
  outputPath: string | null;
}
```

**State Transitions**:
- Initial state: `null` (no `.bridge-sync-reverse.json` file exists)
- After first sync: `{ lastReverseSyncTimestamp: now, syncedFingerprints: [...], syncGeneration: 1, syncHistory: [record] }`
- After subsequent syncs: fingerprints accumulate, syncHistory grows, syncGeneration stays 1 (circular loop detection not implemented in Phase 1 but field reserved)

---

### 4. ReverseSyncResult

Outcome DTO returned from the use case. Used by CLI formatters.

```typescript
/** Outcome of a reverse sync execution. */
export interface ReverseSyncResult {
  /** Total learnings extracted from all sources. */
  totalExtracted: number;
  /** Learnings skipped due to deduplication. */
  deduplicated: number;
  /** Learnings skipped due to cooldown (too recent). */
  cooledDown: number;
  /** Learnings skipped due to privacy redaction removing all content. */
  fullyRedacted: number;
  /** New learnings written to learnings.md. */
  learningsWritten: number;
  /** Entries added to constitution (0 if skipConstitution). */
  constitutionEntriesAdded: number;
  /** Sources processed with counts. */
  sourcesProcessed: { type: ReverseSyncSourceType; count: number }[];
  /** Absolute path to generated learnings.md (null if dry-run or no learnings). */
  outputPath: string | null;
  /** Whether this was a dry run. */
  dryRun: boolean;
  /** Privacy redaction summary. */
  redactionSummary: { totalRedactions: number; types: string[] };
  /** Human-readable summary string. */
  summary: string;
}
```

---

### 5. PrivacyFilterResult

Result DTO from privacy filtering pure function.

```typescript
/** Result of applying privacy filters to content. */
export interface PrivacyFilterResult {
  /** Content with secrets and PII replaced by redaction markers. */
  filtered: string;
  /** Total number of redactions applied. */
  redactionCount: number;
  /** Types of redactions found (e.g., 'api-key', 'email', 'token'). */
  redactionTypes: string[];
}
```

---

## New Pure Functions (Entity Layer)

### applyPrivacyFilter(content: string): PrivacyFilterResult

Applies regex-based masking for secrets and PII. No I/O.

**Secret patterns** (FR-007):
- API keys: `/(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}['"]?/gi` → `[REDACTED:API_KEY]`
- Tokens: `/(?:token|bearer|jwt)\s*[:=]\s*['"]?[A-Za-z0-9_\-\.]{20,}['"]?/gi` → `[REDACTED:TOKEN]`
- Passwords: `/(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/gi` → `[REDACTED:PASSWORD]`
- Connection strings: `/(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi` → `[REDACTED:CONNECTION_STRING]`
- AWS keys: `/(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g` → `[REDACTED:AWS_KEY]`
- Generic secrets: `/(?:secret|private[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/gi` → `[REDACTED:SECRET]`

**PII patterns** (FR-007):
- Emails: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` → `[REDACTED:EMAIL]`
- Phone numbers: `/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g` → `[REDACTED:PHONE]`

**Contract**: Returns `{ filtered, redactionCount, redactionTypes }`. When `redactionCount === 0`, `filtered` is identical to input.

---

### classifyLearning(title: string, content: string): LearningClassification

FR-004a classification gate. Determines whether a learning is a spec/plan-level non-negotiable (constitution-worthy) or an implementation detail (learnings-only).

**Constitution-worthy signals** (positive match → `'constitution-worthy'`):
- Contains phrases: "non-negotiable", "MUST", "all features", "every spec", "project-wide", "architectural constraint", "API contract", "compatibility requirement", "version negotiation", "breaking change"
- AND the content does NOT contain implementation-detail signals

**Learnings-only signals** (positive match → `'learnings-only'`):
- Contains phrases: "code pattern", "testing technique", "debug", "workaround", "vi.doMock", "implementation detail", "config tweak", "hot fix", "refactor", "import path"
- OR references specific files, line numbers, function names
- OR references specific agent tooling or runtime behavior

**Default**: When neither signal set triggers clearly, defaults to `'learnings-only'` (conservative — never bloat constitution with ambiguous content).

**Contract**: Pure function, deterministic. Same input → same output.

---

### categorizeLearning(title: string, content: string): LearningCategory

Groups a learning into one of six output categories for the `learnings.md` document structure.

**Heuristic mapping**:
- "architecture", "layer", "dependency", "structure", "clean architecture" → `'architectural-insights'`
- "integration", "API", "endpoint", "protocol", "handoff" → `'integration-patterns'`
- "performance", "latency", "throughput", "memory", "speed" → `'performance-notes'`
- "decision", "chose", "adopted", "rejected", "trade-off" → `'decisions'`
- "pattern", "technique", "reusable", "skill", "utility" → `'reusable-techniques'`
- "risk", "vulnerability", "failure", "edge case", "regression" → `'risks'`

**Default**: `'architectural-insights'` (catch-all for unclassified content).

---

### generateLearningsMarkdown(entries: ExtractedReverseLearning[], metadata: LearningsMetadata): string

Renders the structured `learnings.md` from categorized entries.

```typescript
interface LearningsMetadata {
  featureName: string;
  specId: string;
  executionPeriod: { start: string; end: string };
  agents: string[];
}
```

**Output format**: See `contracts/learnings-format.md`.

---

### isValidReverseSyncOptions(options: ReverseSyncOptions): boolean

Validates the options DTO. Pure function, mirrors `isValidConfig()` pattern.

---

## Existing Types (Reused, Not Modified)

| Type | Location | Usage in Reverse Sync |
|------|----------|----------------------|
| `SyncState` | `src/types.ts:296` | Pattern reference; reverse sync uses its own `ReverseSyncState` |
| `SyncRecord` | `src/types.ts:288` | Pattern reference; reverse sync uses `ReverseSyncRecord` |
| `computeLearningFingerprint()` | `src/sync/sync-learnings.ts:86` | **Reused directly** — import and call for fingerprint computation |
| `LearningEntry` | `src/types.ts:85` | Read by `LearningExtractor` adapter from Squad histories |
| `DecisionEntry` | `src/types.ts:70` | Read by `LearningExtractor` adapter from Squad decisions |
| `SkillEntry` | `src/types.ts:62` | Read by `LearningExtractor` adapter from Squad skills |
| `ErrorCodes` | `src/types.ts:226` | Add `REVERSE_SYNC_FAILED` constant |
| `BridgeConfig` | `src/types.ts:10` | Config extension for `sync.reverse` section |

---

## Config Extension

Add to `BridgeConfig.sync`:

```typescript
sync: {
  autoSync: boolean;
  targetDir: string;
  reverse: {                    // NEW
    cooldownHours: number;      // Default: 24
    sources: ReverseSyncSourceType[];  // Default: ['histories', 'decisions', 'skills']
    privacy: {
      maskSecrets: boolean;     // Default: true
      stripPII: boolean;        // Default: true
    };
  };
};
```

---

## Entity Relationship Diagram

```
                  ┌─────────────────────┐
                  │  ReverseSyncOptions  │  (input DTO)
                  └──────────┬──────────┘
                             │ drives
                             ▼
┌──────────────┐    ┌─────────────────────┐    ┌───────────────────┐
│ Squad Sources │──→│  syncReverse()      │──→│  ReverseSyncResult │
│ (via ports)   │    │  (use case)         │    │  (output DTO)     │
└──────────────┘    └─────────┬───────────┘    └───────────────────┘
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
           ┌──────────┐ ┌────────┐ ┌──────────────────┐
           │ Classify  │ │ Filter │ │ Deduplicate      │
           │ (FR-004a) │ │ (PII)  │ │ (fingerprints)   │
           └──────┬───┘ └───┬────┘ └────────┬─────────┘
                  │         │               │
                  ▼         ▼               ▼
           ┌──────────────────────────────────────┐
           │  ExtractedReverseLearning[]           │
           │  (classified, filtered, deduplicated) │
           └──────────────┬───────────────────────┘
                          │ routes to
              ┌───────────┴────────────┐
              ▼                        ▼
    ┌──────────────────┐    ┌────────────────────┐
    │ learnings.md     │    │ constitution.md    │
    │ (all entries)    │    │ (constitution-     │
    │                  │    │  worthy only)      │
    └──────────────────┘    └────────────────────┘
                                    │
                          ┌─────────┴───────────┐
                          │ ReverseSyncState     │
                          │ (.bridge-sync-       │
                          │  reverse.json)       │
                          └─────────────────────┘
```
