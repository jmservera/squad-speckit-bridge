---
name: project-conventions
version: "1.0"
---

# Skill: Project Conventions

## Overview

Coding conventions for the squad-speckit-bridge project.

## What to Do — Patterns

- Use ESM imports with `.js` extensions for TypeScript
- Apply Clean Architecture: entities → use cases → adapters
- Keep entity layer free of I/O imports
- Use `fs/promises` for all file operations

## What NOT to Do — Anti-Patterns

- Don't import `fs` in entity or use case code
- Don't reference `.squad/` paths in use cases
- Don't put business logic in adapters
