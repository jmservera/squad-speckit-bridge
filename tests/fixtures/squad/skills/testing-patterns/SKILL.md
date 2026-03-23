---
name: testing-patterns
version: "1.0"
---

# Skill: Testing Patterns

## Overview

Testing strategy for the project. Unit tests use mocked ports, integration tests use real fixtures.

## What to Do — Patterns

- Test entities with pure unit tests, no mocks
- Test use cases with in-memory fakes
- Test adapters with real fixture files
- Use factory helpers with spread overrides

## What NOT to Do — Anti-Patterns

- Don't mock entities — they're already pure
- Don't use real I/O in use case tests
