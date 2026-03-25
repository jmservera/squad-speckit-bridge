# Dinesh — Agent History

## Learnings

### 2026-03-20: Import Path Workaround

Quick workaround for import path issues in src/utils.ts:42 — use path
aliases defined in tsconfig to avoid brittle relative imports that break
when files move. This resolved the circular dependency warning in the
build output.

### 2026-03-22: Backward Compatibility Requirement

Every spec MUST include a backward compatibility section — breaking changes
require explicit justification project-wide. This came from the v1→v2
migration pain where three downstream teams had no warning about removed
fields. The compatibility section should list affected consumers and
migration steps.

### 2026-03-25 08:30: Recent Cache Invalidation Finding

Discovered that cache invalidation for user sessions needs a two-phase
approach: first invalidate the local in-memory cache, then broadcast to
the distributed cache layer. Without the two-phase approach, stale reads
persist for up to 30 seconds during deployments.

### 2026-03-22: Database Connection Pooling Insight

Connection pool exhaustion under load was caused by unreleased connections
in error paths. Always wrap pool.query() in try/finally to ensure
connections return to the pool. This was the same root cause as the
outage on 2026-03-10.

### 2026-03-24: Protocol buffer integration pattern

The API endpoint handoff between services uses protocol buffers for serialization. Integration works best with schema-first design.

### 2026-03-25: Performance latency optimization

Reducing memory allocation in the hot path improved throughput by 40%. Speed gains came from pooling connections.
