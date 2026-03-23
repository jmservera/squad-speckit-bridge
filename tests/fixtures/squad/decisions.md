# Squad Decisions

## Active Decisions

### Use Clean Architecture (2025-07-20)

**Decision:** Apply Uncle Bob's Clean Architecture to the bridge.

**Status:** Adopted

All source code dependencies point inward. Entities have zero external imports. Use cases define ports. Adapters implement them.

**Rationale:** Maximizes testability and framework independence.

---

### Pipeline Integration Model (2025-07-18)

**Decision:** Adopt pipeline model with tasks.md as boundary.

**Status:** Adopted

Spec Kit plans upstream, Squad executes downstream. The handoff point is tasks.md.

---

### Ancient Decision (2024-01-01)

**Decision:** Use tabs instead of spaces.

**Status:** Superseded

This is an ancient decision that should be filtered out by recency.
