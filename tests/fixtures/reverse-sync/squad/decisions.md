# Squad Decisions Log

### 2026-03-12: Adopt Monorepo Structure

Decided to consolidate all packages into a single monorepo using npm
workspaces. This simplifies dependency management and enables atomic
cross-package changes. Turborepo handles build orchestration.

### 2026-03-15: Versioned API Response Contract

All API endpoints MUST support versioned responses. Clients send an
`Accept-Version` header and the server negotiates the highest compatible
version. Unversioned requests default to the latest stable version.

### 2026-03-18: CLI Framework Selection

Team chose Commander over yargs for CLI parsing. Commander has a smaller
dependency footprint and its fluent API aligns better with our existing
code style. Migration from yargs took about 2 hours.

### 2026-03-20: Event-Driven Architecture for Sync

Reverse sync will use an event-driven architecture with an event bus
that decouples producers (Squad data watchers) from consumers (spec
updaters). This allows independent scaling and easier testing of each
component.

### 2026-03-23: Error Boundary Strategy

All async operations must be wrapped in domain-specific error boundaries
that translate low-level errors into user-facing messages. Raw stack
traces should never reach the CLI output.
