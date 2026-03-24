# Decision Proposal: Knowledge Feedback Loop Architecture

**Proposed by:** Gilfoyle  
**Date:** 2026-03-24  
**Status:** Proposed (awaiting team alignment)  
**Audience:** Juanma, Architecture Review

---

## Context

Juanma's directive identified a critical gap: The bridge currently syncs **forward only** (specs → squad context → implementation). After implementation, learnings stay trapped in Squad memory. Spec artifacts never benefit from team experience.

**Directive:** *"After execution, sync from spec learnings back to specs, preferably after a nap from the squad."*

**Full research:** `specs/006-knowledge-feedback-loop/research.md`

---

## Proposal

Implement a **reverse sync** feature that captures implementation learnings and enriches spec artifacts post-execution.

### Phase 1: MVP (v0.1) — Manual Ceremony

**Command:**
```bash
squask sync-reverse <spec-dir> [--dry-run] [--cooldown 0]
```

**Behavior:**
- Reads recent learnings from `.squad/agents/*/history.md` and `.squad/decisions.md`
- Applies privacy filtering (regex masks secrets, strips PII)
- Deduplicates via fingerprints (existing pattern)
- Writes to `specs/{id}/learnings.md` (new artifact)
- Teams manually trigger after implementation is stable

**Output:** `specs/{id}/learnings.md` with sections:
- Architectural Insights
- Integration Patterns
- Performance Notes
- Decisions Made During Implementation
- Reusable Techniques
- Risks & Workarounds

**Cooldown:** 24 hours default (only processes learnings >24h old), but ceremony can override with `--cooldown 0` for immediate execution.

### Phase 2: Enhanced (v0.2+)

- Time-gated automation (Spec Kit `after_implement` hook integration)
- Feature scope detection (heuristic matching)
- Skill candidate extraction

### Phase 3: Mature (v1.0+)

- Event-driven (listen for Squad harvest events)
- Squad context regeneration for future planning cycles

---

## Key Decisions

### 1. Start with Manual, Not Automatic

**Rationale:**
- Proven pattern in existing bridge (forward sync is manual too)
- Human judgment needed: what learnings matter for future planners?
- Lower risk of data quality issues
- Team can validate value before automation investment

**Alternative Rejected:** Start with time-gated automatic (higher risk, harder to debug)

---

### 2. Cooldown Is Configurable, Not Mandatory

**Rationale:**
- "Nap" concept validates time gap (agents still processing, decisions in flux)
- Default 24h respects agent reflection time
- Ceremony can override for immediate execution
- Config allows team to customize based on their workflow

**Default:** `sync.reverse.cooldownHours: 24`  
**Override:** `--cooldown 0` flag or ceremony milestone

---

### 3. Privacy Filtering Required from Day 1

**Rationale:**
- Agent histories contain debug logs, API keys, sensitive architecture
- Once written to `specs/learnings.md` (git-tracked), cannot be unwritten
- Privacy breach becomes code integrity issue

**Mitigations:**
- Regex masking: `(?:key|token|password|secret).*?(?=\n)` → `[REDACTED]`
- PII stripping: Remove email, phone, SSN patterns
- Explicit opt-in for sensitive learnings (future enhancement)

---

### 4. Learnings.md Is Separate Artifact, Not Mutation of Spec.md

**Rationale:**
- `spec.md` is frozen specification (baseline for implementation)
- Implementation experience is different (feedback, discoveries, alternative approaches)
- Separate file allows future planning to reference both original spec AND implementation context
- Prevents spec.md from becoming a living document (loses stability)

**Spec.md Treatment:** Link to learnings.md at end of spec, but don't duplicate content

---

### 5. Feature-Level Scope Is Explicit, Not Heuristic (MVP)

**Rationale:**
- Hard problem: How to know which team decision applies to *this* feature vs. project-wide?
- MVP solution: Manual filtering by analyzer (Gilfoyle, human judgment)
- Phase 2: Heuristic matching + explicit feature ID tagging during capture

**Risk:** Over-enrichment if scope too broad  
**Mitigation:** Limit to 5-10 key insights per category

---

## Architectural Alignment

**Clean Architecture:** No layer violations. New entities (ReverseSyncOptions, ReverseSyncResult) → Use case (syncReverse) → Ports (SpecWriter) → Adapters → CLI → Composition root.

**No Framework Changes:** Bridge remains additive. Spec Kit and Squad core untouched.

**Backward Compatible:** Existing `squask sync` (forward) continues unchanged.

---

## Open Questions for Team Alignment

1. **Cooldown Default:** 24 hours right for your workflow? (Config changeable, but asking for your preference)
2. **Privacy Checklist:** What content criteria deem learnings "safe for learnings.md"?
3. **Ceremony Integration:** Do you have a "Harvest Phase" milestone in Squad workflows? If not, should this feature drive its creation?
4. **Audience:** Is learnings.md for next planning cycle only, or also team retrospectives?
5. **Spec.md Updates:** Should implementation reveal gaps in original spec? If yes, what process (manual annotation → separate file, or light updates to spec.md)?

---

## Success Criteria

✅ Learnings.md captures implementation discoveries  
✅ No secrets/PII leak into git-tracked artifact  
✅ Manual ceremony workflow proven before automation  
✅ Future planning cycles benefit from prior learnings  
✅ Team confidence in reverse sync accuracy before Phase 2  

---

## Timeline

- **v0.1 (immediate):** Manual ceremony, basic filtering
- **v0.2 (2-3 weeks):** Time-gated + Spec Kit hook integration
- **v1.0 (ongoing):** Event-driven, smart scope detection, skill discovery

---

## Recommendation

**Approve Phase 1 (MVP)** for immediate implementation:
- Low risk (manual trigger, human review)
- Closes core feedback gap identified by Juanma
- Enables validation before Phase 2 automation
- Patterns established in existing forward sync, just reversed direction

**Questions to resolve before Phase 2:**
- Does 24h cooldown match your team's cycle?
- How to identify feature-level scope relevance?
- Should squad-context.md be regenerated for next planning?

---

**Prepared by:** Gilfoyle  
**Reference:** `specs/006-knowledge-feedback-loop/research.md` (full technical analysis)
