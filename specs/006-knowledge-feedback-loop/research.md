# Research: Knowledge Feedback Loop — Reverse Sync Architecture

**Analysis Date**: 2026-03-24  
**Analyst**: Gilfoyle  
**Status**: Complete  
**Audience**: Architecture Review (Juanma, Squad team)

---

## Executive Summary

The bridge currently implements **forward sync only**: specifications → Squad context → team execution. But it lacks the **reverse path** for Squad learnings to enrich spec artifacts after implementation.

Juanma's directive captures the core gap: *"After execution, sync from spec learnings back to specs, preferably after a nap from the squad."*

This research identifies:
1. **Current State Limitations** — what `squask sync` does and where it falls short
2. **Knowledge Sources** — where implementer learnings live and how to safely extract them
3. **Target Enrichment Points** — which spec artifacts benefit most from feedback
4. **"Nap" Mechanics** — the cooldown pattern and its technical implications
5. **Bridge Control Strategy** — manual ceremony vs. time-gated automation
6. **Integration Architecture** — data flow with deduplication and privacy safeguards

---

## 1. Current State: Forward-Only Sync

### What `squask sync` Does

Located in `src/sync/sync-learnings.ts`, the current implementation:

```
Spec Results (tasks.md) + Agent Histories → Squad Memory (agent history.md)
```

**Implementation details:**
- Reads completed tasks from `specs/{id}/tasks.md` (lines 117–138 in adapter)
- Extracts tasks marked `[xX]` — completion checkmarks
- Writes learnings to `.squad/agents/bridge/history.md` via `writeLearning()` port
- **Idempotency:** Fingerprints (`computeLearningFingerprint()`) prevent duplicate syncs across runs
- **State tracking:** `.squad/.bridge-sync.json` holds last sync timestamp and synced fingerprints
- **Timestamp gating:** Only processes results newer than previous sync (`sinceDate`)

**What it leaves behind:**

- ❌ **No reverse enrichment:** Agent learnings (decisions, patterns, architectural insights) stay in Squad memory. Spec artifacts (`spec.md`, `learnings.md`) remain static post-implementation
- ❌ **One-way facts only:** Only task completion status syncs — no context about *how* tasks were solved or *why* the solution differs from spec
- ❌ **No cooldown mechanism:** Runs immediately on hook; no "nap" for agents to reflect before syncing
- ❌ **Limited sources:** Only reads spec completion status, not design decisions made during implementation, not architectural evolution, not integration discoveries
- ❌ **No spec artifact mutation:** Spec learnings file, if it exists, never gets updated with implementation experience

### Architectural Gap

The current flow is **asymmetric**:

```
Planning Phase (Spec Kit):
  spec.md → plan.md → tasks.md → agent assignments

Execution Phase (Squad):
  assignments → work → decisions/learnings → bridge memory only

Post-Execution (Forward Sync):
  completed tasks → bridge history (DEAD END)

What's Missing (Reverse Sync):
  ??? → specs/learnings.md ← agent discoveries
  ??? → spec.md updates ← architectural decisions
  ??? → squad-context.md refresh ← solved problems
```

---

## 2. Knowledge Sources: Where Squad Learnings Live

### 2.1 Primary Sources

**A. Agent History Files** (`.squad/agents/{name}/history.md`)

- **Contains:** Timestamped learning entries, decisions made, patterns discovered
- **Structure:** Markdown with `### YYYY-MM-DD: Title` sections under `## Learnings`
- **Accessibility:** Readable via existing `SquadStateReader` port
- **Example** (from gilfoyle/history.md):
  ```markdown
  ### 2026-03-23: Framework Deep-Dive — Squad vs Spec Kit
  
  **Squad:**
  - Multi-agent runtime with persistent memory
  - Agents have progressive summarization at ~12KB
  ```
- **Risk:** Large histories (12KB+ per agent) contain implementation details, debug transcripts, failed attempts
- **Privacy Note:** Agent histories may contain sensitive context (API keys in test logs, internal architecture details, customer data references)

**B. Decisions File** (`.squad/decisions.md`)

- **Contains:** Team decisions with date, status, rationale, impact statements
- **Structure:** Markdown sections per decision with "Active Decisions" heading
- **Scope:** Decisions that affect future work: framework choices, architectural patterns, convention changes
- **Example**:
  ```markdown
  ### Technical Compatibility: Coexistence Is Feasible (2026-03-23)
  
  **Decision:** Squad and Spec Kit can safely coexist in the same repository with minimal integration work.
  
  **Status:** Confirmed feasible; cleared for implementation
  ```
- **Relevance:** Only subset apply to specific spec features — others are project-wide
- **Risk:** Accumulation: decisions.md can reach 475KB+ over time (seen in aithena project)

**C. Orchestration & Session Logs** (`.squad/orchestration-log.md`)

- **Contains:** Timestamped execution trace: agents spawned, tasks assigned, completion status
- **Scope:** Who did what, when, and completion status
- **Limitation:** Not rich narratives — just event records
- **Utility:** Metadata for filtering which agents touched a specific feature

**D. Skills** (`.squad/skills/`)

- **Contains:** Reusable techniques, code patterns, testing approaches learned and documented
- **Structure:** Separate Markdown files per skill
- **Relevance:** Direct value if skill is relevant to the spec being enriched
- **Discovery:** Requires name/keyword matching to spec topic

### 2.2 Secondary Sources

**E. Agent Charter & Constitution** (`.squad/agents/{name}/charter.md`, `.squad/constitution.md`)

- **Value:** Defines roles, constraints, principles
- **Use:** For understanding *context* of learnings, not primary enrichment material
- **Risk:** Rarely changes — not a good feedback source

**F. Implementation Results**

- **Currently read:** Task completion status from `specs/{id}/tasks.md`
- **Missing:** Why tasks were completed differently than planned, blockers encountered, trade-offs made
- **Where to find:** Could be added to spec directory by agents during execution (`specs/{id}/implementation-notes.md`)

---

## 3. Target Artifacts: What Enrichment Looks Like

### 3.1 Spec Artifact Structure

Existing spec directory layout:
```
specs/001-feature-name/
  ├── spec.md              ← Feature specification (immutable design doc)
  ├── plan.md              ← Implementation plan
  ├── tasks.md             ← Task breakdown (COMPLETED after implementation)
  ├── research.md          ← Research notes (immutable — same as planning phase)
  ├── data-model.md        ← Entities and types
  ├── squad-context.md     ← Generated Squad memory summary (GENERATED)
  └── checklists/
  └── contracts/
```

**Missing File (post-implementation artifact):**
```
  └── learnings.md         ← NEW: Implementation feedback & discoveries
```

### 3.2 Enrichment Targets

**A. `specs/{id}/learnings.md` (NEW)**

**Purpose:** Archive implementation experience for future specs and team reference.

**What flows in:**
- Agent discoveries (what they learned while working on this spec)
- Design decisions made during implementation (differ from spec.md?)
- Integration surprises / workarounds found
- Performance or security discoveries
- Architectural evolution notes
- Reusable techniques (candidates for `.squad/skills/`)

**Structure proposal:**
```markdown
# Implementation Learnings — {Feature}

**Execution Period:** YYYY-MM-DD to YYYY-MM-DD  
**Agents:** Agent1, Agent2, Agent3  
**Status:** Implementation Complete

## Key Discoveries

### Architectural Insights
- [Filtered from agent histories]

### Integration Patterns
- [Extracted from implementation notes]

### Performance Notes
- [Extracted from agent observations]

## Decisions Made During Implementation
- [Team decisions that evolved from spec.md]

## Reusable Techniques
- [Candidates for `.squad/skills/`]

## Risks Encountered
- [Problems solved, their solutions, applicability to future work]

## Recommended Spec Updates
- [Ideas for improving spec.md based on implementation experience]
```

**Responsible Granularity:**
- Summaries, not raw transcripts
- Aligned to feature scope (not project-wide)
- Actionable items only (discoverable by future planners)

**Privacy Filtering:**
- Strip debug logs, API keys, customer data references
- Keep architectural insights, patterns, trade-offs

---

**B. `specs/{id}/spec.md` (Optional Update)**

**Extent:** Light updates only — spec.md should remain the "frozen specification"

**What could be updated:**
- Add "## Implementation Notes" section at end referencing `learnings.md`
- Update "Risks" or "Acceptance Criteria" if implementation revealed gaps

**What should NOT change:**
- Core specification logic (this is the baseline)
- User scenarios (these should be stable)

**Approach:** Link to `learnings.md`, don't duplicate

---

**C. Squad Context Updates**

**Current:** `specs/{id}/squad-context.md` generated from `.squad/` at *planning time* (read-only snapshot)

**Opportunity:** Refresh after implementation to capture evolved team state

**Pattern:**
```
Planning phase:    [Generate squad-context.md from current state]
         ↓
Implementation:    [Team learns, decisions made, patterns discovered]
         ↓
Post-implementation: [Regenerate squad-context.md for future features]
```

**Risk:** If regenerated every time, squad-context.md becomes unreliable baseline for spec interpretation

**Safer Approach:** Keep original, generate `squad-context-evolved.md` as separate artifact

---

## 4. The "Nap" Concept: Cooldown Mechanics

### 4.1 Why a Cooldown?

Juanma's directive: *"preferably to do it after a nap from the squad"*

**Rationale:**
- Squad agents may still be processing or documenting
- Agent histories contain raw session transcripts (messy)
- Decisions may still be in flux (inbox → merged by Scribe)
- Time gap allows for summary/reflection before feedback reaches planning layer

**Analogy:** Waterfall handoff gates in traditional software — don't capture implementation learnings while work is still hot.

### 4.2 Technically: What Is a "Nap"?

**Option A: Time-Gated Cooldown** ✅ Recommended

```
squask sync-reverse <spec-dir> --cooldown 24h
```

- **Behavior:** Only processes learnings from >24h ago
- **Implementation:** Compare learning timestamp to `NOW() - cooldown` in adapter
- **Config:** `config.sync.cooldownHours` (default: 24)
- **Advantage:** Automatic, simple, respects agent processing time
- **Limitation:** Arbitrary; may miss timely insights or delay feedback unnecessarily

**Option B: Manual Trigger** ✅ Also Valid

```
squask sync-reverse <spec-dir> --manual
```

- **Behavior:** Operator decides when to run
- **Ceremony:** Human milestone — "Implementation is stable, let's harvest learnings"
- **Implementation:** New flag in CLI, no auto-execution
- **Advantage:** Human judgment, intentional
- **Limitation:** Another manual step, easy to forget

**Option C: Hybrid** ✅ Best

- Default: Time-gated (24h cooldown)
- Override: `--no-cooldown` for manual acceleration (ceremony-driven)
- Config: Cooldown hours configurable in `bridge.config.json`

```typescript
// In bridge.config.json
{
  "sync": {
    "autoSync": true,
    "targetDir": ".squad/agents/bridge",
    "reverseSync": {
      "enabled": true,
      "cooldownHours": 24,       // Default: 24 hours
      "sources": ["decisions", "histories", "skills"]
    }
  }
}
```

### 4.3 Implementation in Code

**Where to apply cooldown:**

In `sync-learnings.ts`, the `extractLearnings()` call already filters by timestamp (line 105–107):

```typescript
const sinceDate = prevState?.lastSyncTimestamp
  ? new Date(prevState.lastSyncTimestamp)
  : undefined;
```

**Enhancement for reverse sync:**

Add a `cooldown` parameter to `SyncOptions`:

```typescript
export interface SyncOptions {
  specDir: string;
  squadDir: string;
  dryRun: boolean;
  direction: 'forward' | 'reverse';
  cooldownMs?: number;  // NEW: min age of learnings to sync
  agentDir?: string;
}

// In syncLearnings():
const cooloffTime = options.cooldownMs ?? 0;
const earliestValidDate = new Date(Date.now() - cooloffTime);

const newLearnings = allLearnings.filter((l) => {
  const fp = computeLearningFingerprint(l.title, l.content);
  const isNew = !existingFingerprints.has(fp);
  const isOldEnough = learning.timestamp <= earliestValidDate;  // NEW
  return isNew && isOldEnough;
});
```

---

## 5. Bridge Control: Commands and Hooks

### 5.1 CLI Command: `squask sync-reverse`

**Current command:**
```bash
squask sync <spec-dir>
```

**What it does:** Forward sync (tasks → bridge memory)

**Proposed new command:**
```bash
squask sync-reverse <spec-dir> [options]
```

**Options:**
- `--dry-run`: Preview without writing
- `--cooldown <hours>`: Override default cooldown (0 = immediate)
- `--sources <list>`: `decisions,histories,skills` (comma-separated)
- `--target-path <path>`: Where to write learnings.md (default: `specs/{id}/learnings.md`)

**Example usage:**
```bash
# 24h cooldown, automatic enrichment
squask sync-reverse specs/001-feature

# Immediate (ceremony-driven)
squask sync-reverse specs/001-feature --cooldown 0

# Preview
squask sync-reverse specs/001-feature --dry-run

# Select sources
squask sync-reverse specs/001-feature --sources decisions,skills
```

### 5.2 Hooks: Where to Wire Reverse Sync

**A. Spec Kit Extension Hook** (Preferred Automation Point)

Spec Kit has lifecycle hooks (documented in spec.md research):

```yaml
# .specify/extensions/squad-bridge.yml
extension:
  name: squad-bridge
  hooks:
    after_implement:
      - type: cooldown
        delay: 24h
        command: squask sync-reverse $SPECKIT_SPEC_DIR
```

**Advantage:** Automatic, intentional boundary (waits for `speckit.implement` completion)  
**Limitation:** Requires extension hook support in Spec Kit (currently in use for Squad skills)

**B. Ceremony-Driven Manual Execution**

Team ceremony milestone: "Harvest Phase" (between Implement and next Planning)

```bash
# In squad orchestration ceremony
squad harvest <spec-dir>
```

Calls:
```bash
squask sync-reverse <spec-dir> --cooldown 0
```

**Advantage:** Intentional, captures reflective moment  
**Limitation:** Manual step (but ceremonies are intentional by design)

---

## 6. Data Flow: Source → Transform → Target

### 6.1 Full Architecture

```
┌─────────────────────────────────────────┐
│ Post-Implementation State (Squad Memory) │
├─────────────────────────────────────────┤
│ .squad/agents/*/history.md              │  ← Raw agent learnings
│ .squad/decisions.md                     │  ← Team decisions (some new)
│ .squad/skills/                          │  ← Reusable techniques
│ .squad/orchestration-log.md             │  ← Metadata
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Filtering Layer   │
        ├────────────────────┤
        │ • Filter by date   │  (cooldown)
        │ • Filter by scope  │  (related to feature?)
        │ • Deduplicate      │  (fingerprints)
        │ • Privacy mask     │  (strip secrets)
        └────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────┐
        │  Summarization & Enrichment        │
        ├────────────────────────────────────┤
        │ • Extract key insights             │
        │ • Group by category (architecture, │
        │   performance, risks, patterns)    │
        │ • Score relevance to spec feature  │
        │ • Suggest skill candidates         │
        └────────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────┐
    │  Target Artifacts (Spec Directory)   │
    ├──────────────────────────────────────┤
    │ specs/{id}/learnings.md      (NEW)   │
    │ specs/{id}/squad-context.md (REGEN?) │
    │ specs/{id}/spec.md (LINK only)       │
    └──────────────────────────────────────┘
```

### 6.2 Pseudocode for Reverse Sync

```typescript
/**
 * NEW: Reverse Sync Use Case
 * 
 * Reads post-implementation Squad state and enriches spec artifacts.
 * Respects cooldown, deduplicates, applies privacy filtering.
 */
async function syncReverse(
  reader: SquadStateReader,     // Reads .squad/
  specWriter: SpecWriter,       // Writes specs/{id}/
  options: ReverseSyncOptions,
): Promise<ReverseSyncResult> {
  
  // Phase 1: Source Collection
  const decisions = await reader.readDecisions();
  const learnings = await reader.readLearnings(options.cooldownMs);
  const skills = await reader.readSkills();
  const logs = await reader.readOrchestrationLog();
  
  // Phase 2: Filtering
  const scopedDecisions = filterByFeatureScope(decisions, options.featureName);
  const scopedLearnings = filterByFeatureScope(learnings, options.featureName);
  const relevantSkills = matchSkillsToFeature(skills, options.featureName);
  
  // Phase 3: Privacy Masking
  const maskedLearnings = applyPrivacyFilters(scopedLearnings);
  
  // Phase 4: Deduplication
  const newEntries = filterNewFingerprints(maskedLearnings, options.previousFingerprints);
  
  // Phase 5: Enrichment Document Generation
  const learningsDoc = generateLearningsMarkdown({
    decisions: scopedDecisions,
    learnings: newEntries,
    skills: relevantSkills,
    period: { start: options.startDate, end: new Date() },
  });
  
  // Phase 6: Write & Update Metadata
  if (!options.dryRun) {
    await specWriter.writeLearnings(options.specDir, learningsDoc);
    await specWriter.updateSyncMetadata(options.specDir, {
      lastReverseSyncTime: new Date().toISOString(),
      sourceCount: newEntries.length,
    });
  }
  
  return {
    learningsCount: newEntries.length,
    decisionsIncluded: scopedDecisions.length,
    skillsIncluded: relevantSkills.length,
    outputPath: `${options.specDir}/learnings.md`,
    dryRun: options.dryRun,
  };
}
```

---

## 7. Risks and Mitigations

### 7.1 Data Integrity Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Duplicate Learning Entries** | Learnings.md grows unboundedly; noise increases | Fingerprint-based deduplication (existing pattern from forward sync) |
| **Stale/Conflicting Info** | Old learnings contradict new implementation | Timestamp filtering + version numbering + explicit date ranges in learnings.md |
| **Circular Learning Loops** | Learnings sync back to squad → enriches next planning → feeds forward again | Add `sync_generation` field to track loop depth, abort if >1 |

### 7.2 Privacy Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Exposed Secrets** | API keys, passwords in debug logs get written to repo | Regex-based masking: `(?:key\|token\|password\|secret).*?(?=\n)` → `[REDACTED]` |
| **Sensitive Architecture** | Internal system details, database schemas | Require explicit opt-in for sensitive learnings; document policy in charter |
| **Customer Data References** | PII or customer details in learning entries | Strip PII patterns (emails, phone numbers, SSNs) before sync |

### 7.3 State Management Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Timestamp Drift** | Different timezones/clocks cause learnings to be filtered wrong | Store all timestamps as UTC ISO strings; validate during read |
| **Cooldown Too Strict** | Important insights are delayed by 24h | Make cooldown configurable; default 24h but ceremony can override with `--no-cooldown` |
| **State File Corruption** | `.bridge-sync-reverse.json` becomes unreadable | Use same defensive parsing as forward sync; graceful fallback to empty state on error |

### 7.4 Scope Boundary Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Feature-Level Learning is Hard** | How to know which decisions/learnings apply to *this* feature vs. project-wide? | Use explicit feature ID matching in learning entries; require annotation by team during capture |
| **Over-Enrichment** | Learnings.md becomes too large; loses signal | Limit to 5-10 key insights per category; summarize ruthlessly |
| **Wrong Audience** | Learnings written for one role (DevOps) irrelevant to another (Product) | Tag learnings by role (`@architect`, `@security`, `@performance`); filter by audience if needed |

---

## 8. Comparative Approaches

### Option A: Manual Ceremony-Driven (Lower Risk)

**Flow:**
```
Implementation Complete
    ↓
[Harvest Ceremony] ← Human milestone
    ↓
squask sync-reverse <spec-dir> --no-cooldown
    ↓
Team reviews learnings.md
    ↓
Approval → Ready for next planning cycle
```

**Pros:** Intentional, human-controlled, low automation risk  
**Cons:** Another manual step, easy to skip, requires discipline  
**Recommendation:** Start here for v0.1

---

### Option B: Time-Gated Automatic (Higher Automation)

**Flow:**
```
Implementation Complete
    ↓
[24h elapsed]
    ↓
squask sync-reverse triggered by:
  • Spec Kit after_implement hook, OR
  • Scheduled CI job (daily), OR
  • Next `squask context` invocation
    ↓
Learnings.md auto-written
    ↓
Team reviews during next planning phase
```

**Pros:** Fully automatic, no human intervention  
**Cons:** Less control, cooldown may be too strict or too lenient, hidden timing issues  
**Recommendation:** v0.2+ once manual flow is proven

---

### Option C: Event-Driven (Most Flexible)

**Flow:**
```
Implementation Complete
    ↓
Agent writes to .squad/decisions/inbox/feature-harvest.md
    ↓
Bridge detects new entry
    ↓
If cooldown elapsed: auto-sync
Else: queue for next automatic run
```

**Pros:** Responsive, respects team events  
**Cons:** Requires new Squad extension; adds complexity  
**Recommendation:** v1.0+ if there's clear value

---

## 9. Recommended Implementation Approach

### Phase 1: MVP (v0.1) — Manual Ceremony

**Scope:**
1. ✅ New CLI command: `squask sync-reverse <spec-dir> [--dry-run]`
2. ✅ New use case: `syncReverse()` in `src/sync/sync-learnings-reverse.ts`
3. ✅ Adapter: `ReverseSyncAdapter` extending `SyncStateAdapter`
4. ✅ Target: `specs/{id}/learnings.md` generated per-execution
5. ✅ Privacy: Regex-based secret masking
6. ✅ Deduplication: Fingerprints in state file

**Data sources:**
- `.squad/agents/{agent}/history.md` (only recent learnings)
- `.squad/decisions.md` (active decisions only)
- Skip skills, logs (complexity deferred)

**Flow:**
```bash
# After implementation is stable
squask sync-reverse specs/001-my-feature

# Preview before writing
squask sync-reverse specs/001-my-feature --dry-run
```

**Config addition:**
```json
{
  "sync": {
    "autoSync": true,
    "targetDir": ".squad/agents/bridge",
    "reverse": {
      "enabled": true,
      "privacy": {
        "maskSecrets": true,
        "stripPII": true
      }
    }
  }
}
```

### Phase 2: Enhanced (v0.2+) — Time-Gated

1. Add `cooldown` option to CLI and config
2. Wire Spec Kit `after_implement` hook with default 24h cooldown
3. Intelligent feature scope detection (heuristic matching on learning text)
4. Skill candidate extraction (code patterns detected as reusable)

### Phase 3: Mature (v1.0+) — Event-Driven

1. Listen for Squad harvest events
2. Regenerate squad-context.md for future cycles
3. Integration with issue lifecycle (link learnings to closed issues)

---

## 10. Open Questions for Team Alignment

1. **Cooldown Default:** Is 24 hours right, or should it be configurable from day 1?
2. **Privacy Policy:** What criteria determine "safe to include in learnings.md"? Explicit checklist or heuristic?
3. **Feature Scope Detection:** Should team manually tag learnings with feature IDs, or use text matching heuristics?
4. **Ceremony Integration:** Does "Harvest Phase" ceremony exist in Squad workflows? Should this bridge feature drive its creation?
5. **Learnings Audience:** Is learnings.md for next planning cycle only, or also for team retrospectives and knowledge base?
6. **Spec.md Mutation:** Should implementation experience update original spec.md, or is learnings.md as separate artifact the right model?

---

## 11. Summary: Data Flow Map

**Source** → **Filter** → **Transform** → **Target**

```
.squad/agents/*/history.md (recent only)
        ↓
   [Cooldown filter]
   [Scope match] ← Feature ID or heuristic?
   [Privacy mask] ← Strip secrets, PII
   [Deduplicate] ← Fingerprints
        ↓
  [Summarize & Group]
   • Architectural insights
   • Performance discoveries
   • Integration patterns
   • Risks & workarounds
   • Skill candidates
        ↓
   specs/{id}/learnings.md

.squad/decisions.md (active only)
        ↓
   [Scope filter] ← Related to feature?
   [Dedup] ← Already in learnings?
        ↓
   [Include as "Decisions Made During Implementation"]
        ↓
   specs/{id}/learnings.md
```

---

## 12. Architectural Constraints

**From existing bridge design** (Clean Architecture, Ports & Adapters):

1. ✅ **Entity Layer (types.ts):** Add `ReverseSyncOptions`, `ReverseSyncResult` types
2. ✅ **Use Case Layer (src/sync/):** New `syncReverse()` function, mirrors `syncLearnings()` structure
3. ✅ **Port Layer (bridge/ports.ts):** New `SpecWriter` port (write to spec directory)
4. ✅ **Adapter Layer (sync/adapters/):** Extend `SyncStateAdapter` for reverse flow
5. ✅ **CLI Layer (cli/index.ts):** New `sync-reverse` command
6. ✅ **Composition Root (main.ts):** Wire `createReverseSyncer()` factory
7. ✅ **Config Layer:** Add `.sync.reverse` section to bridge.config.json

**No changes needed to:**
- Spec Kit or Squad core (bridge remains additive)
- Existing forward sync (backward compatible)

---

## 13. Testing Strategy

**Unit Tests:**
- Fingerprint deduplication (existing pattern, extend for reverse)
- Privacy filtering (regex mask correctness)
- Timestamp filtering (cooldown applied)
- JSON state persistence

**Integration Tests:**
- Write learnings.md to spec directory
- Verify formatting matches expected markdown
- Check that existing spec files not altered

**E2E Tests:**
- Full cycle: implement feature → wait cooldown → sync-reverse → verify learnings.md appears

---

## Conclusion

The **reverse sync** feature closes the knowledge feedback loop. By capturing implementation learnings and enriching spec artifacts, the bridge enables compound team growth across planning cycles.

**Recommended path:**
1. Start with **manual ceremony** (Phase 1) — proven pattern, low risk
2. Add **time-gated automation** once team validates the concept (Phase 2)
3. Graduate to **event-driven** if workflows justify the complexity (Phase 3)

**Critical success factors:**
- Privacy filtering from day 1 (no secrets in learnings.md)
- Clear scope boundaries (feature-level, not project-wide noise)
- Cooldown flexibility (default 24h, but ceremony can override)
- Human-in-the-loop initially (manual triggering, team review)

This foundation enables future features: skill discovery, automated spec updates, continuous knowledge base enrichment.

---

**End of Research Document**
