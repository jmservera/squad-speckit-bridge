# Clean Architecture Bridge

## Context

A reusable technique for bridging two framework-independent systems using ports and adapters. This skill captures the utility of dependency inversion at system boundaries.

## Patterns

- Define port interfaces in the use case layer
- Implement adapters in the adapter layer
- Wire everything in the composition root

## Anti-Patterns

- Importing framework types in use case functions
- Leaking adapter concerns into entity types
