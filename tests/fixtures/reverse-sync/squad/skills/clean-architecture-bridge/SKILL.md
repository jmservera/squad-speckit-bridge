# Skill: Clean Architecture Bridge

## Pattern Name

Hexagonal Adapter Bridge

## Description

A reusable adapter pattern that bridges Squad's internal data structures
with SpecKit's specification format. The bridge translates domain events
into spec-compatible updates without leaking implementation details
across boundaries.

## Technique

1. Define a port interface for each data flow direction (inbound/outbound)
2. Implement adapters that translate between Squad and SpecKit schemas
3. Use dependency injection to wire adapters at composition root
4. Keep the domain logic free of framework-specific imports

## Example

```ts
interface SquadDataPort {
  readHistory(agentId: string): Promise<HistoryEntry[]>;
  readDecisions(): Promise<Decision[]>;
}

class SpecKitAdapter implements SpecUpdatePort {
  async applyLearning(entry: HistoryEntry): Promise<void> {
    const specUpdate = this.transform(entry);
    await this.writer.append(specUpdate);
  }
}
```

## When to Use

- Syncing data between two systems with different schemas
- Need to test each side independently with mocks
- Want to swap out either system without changing business logic
