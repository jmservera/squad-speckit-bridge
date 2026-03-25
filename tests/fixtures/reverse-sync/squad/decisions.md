# Squad Decisions

## Active Decisions

### Use TypeScript strict mode (2026-03-23)

**Status**: Adopted

The team chose TypeScript strict mode for all new code. This decision ensures type safety across the codebase. The trade-off is slightly more verbose code.

---

### Reject GraphQL in favor of REST (2026-03-23)

**Status**: Adopted

We rejected GraphQL for the bridge API. REST endpoints are simpler to implement and test. The decision was driven by the small surface area of the API.

---
