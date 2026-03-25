<<<<<<< HEAD
# Gilfoyle — Agent History

## Learnings

### 2026-03-15: API Authentication Flow Discovery

While integrating the payment gateway, found that the service requires
a specific key format. Tested with `api_key=sk_test_abc123def456ghi789jkl`
and confirmed the auth handshake completes in under 200ms. Contact
alice@example.com for production key rotation schedule.

### 2026-03-18: Version Negotiation Architecture Rule

All public APIs MUST have version negotiation — this is a non-negotiable
architectural constraint for all features. Discovered this after a breaking
change in v2 responses caused cascading failures in downstream consumers.
The version negotiation layer should sit between the router and handlers.

### 2026-03-20: ESM Module Testing Pattern

Use vi.doMock for testing ESM modules with dynamic imports. Standard
vi.mock hoisting doesn't work reliably with dynamic import() calls.
The pattern is:

```ts
vi.doMock('./module', () => ({ default: mockFn }));
const mod = await import('./module');
```

This ensures the mock is registered before the dynamic import resolves.

### 2026-03-22: Database Connection Pooling Insight

Connection pool exhaustion under load was caused by unreleased connections
in error paths. Always wrap pool.query() in try/finally to ensure
connections return to the pool. This was the same root cause as the
outage on 2026-03-10.
=======
# gilfoyle — History

## Core Context

Gilfoyle is the research and architecture agent.

## Learnings

### 2026-03-23: Clean architecture layer separation

All features MUST respect the dependency rule: inner layers never import from outer layers. This is a project-wide architectural constraint.

### 2026-03-24: Integration test fixture pattern

When testing adapters, use mkdtemp for isolated temp directories. This reusable technique avoids test pollution.

### 2026-03-25: API versioning risk

There is a regression risk when API endpoints change without version negotiation. Edge case: clients on older versions may silently fail.
>>>>>>> squad/009-dinesh-src
