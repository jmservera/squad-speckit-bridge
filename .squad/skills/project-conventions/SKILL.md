---
name: "project-conventions"
description: "Core conventions and patterns for squad-speckit-bridge codebase"
domain: "project-conventions"
confidence: "medium"
source: "earned (extracted from v0.1-v0.3 implementation cycles)"
---

## Context

This project follows Clean Architecture principles with TypeScript + Node.js + Vitest. All conventions enforce the dependency rule: source code dependencies point inward only.

## Patterns

### Task ID Convention

All tasks use the format `TNNN` (e.g., T001, T023, T042) for traceability from spec → issue → commit → code.

**Task detection regex:**
```typescript
// From src/issues/analyze-distribution.ts
// Rejects task IDs like "T001:" or "Task 1:" when parsing agent names
if (/^T\d+$/i.test(candidate) || /^Task\s+\d+$/i.test(candidate)) {
  return 'unassigned';
}
```

**In commit messages:**
```
feat(cli): add --verbose flag with detailed pipeline output [T027-T030] (#304)
fix(sync): wire history reader + constitution output + CLI options [T001+T003+T004]
```

**In file headers:**
```typescript
/**
 * T023: TasksMarkdownParser Adapter
 *
 * Implements TasksMarkdownReader port. Reads and parses tasks.md
 * for issue creation. Reuses parseTasks from review adapter.
 */
```

### Constitution Amendment Protocol

When updating `.specify/memory/constitution.md` (via ConstitutionAdapter or manual edits):

1. **Bump minor version** — 1.0.0 → 1.1.0 for amendments
2. **Update Last Amended date** — YYYY-MM-DD format
3. **Append learnings section** — preserve existing content, add new learnings at end

```typescript
// From src/sync/adapters/constitution-adapter.ts

// 1. Bump minor version
existing = existing.replace(
  /\*\*Version\*\*:\s*(\d+)\.(\d+)\.(\d+)/,
  (_match, major, minor) => `**Version**: ${major}.${parseInt(minor, 10) + 1}.0`
);

// 2. Update Last Amended date
const today = new Date().toISOString().split('T')[0];
existing = existing.replace(
  /\*\*Last Amended\*\*:\s*\S+/,
  `**Last Amended**: ${today}`
);

// 3. Append learnings section with spec ID
const section = `\n## Learnings from ${specId}\n\n${learnings.map(l => `### ${l.title}\n\n${l.content}`).join('\n\n')}`;
```

### Error Handling

**Graceful degradation in adapters:**
```typescript
// From src/sync/adapters/agent-history-reader.ts
async extractLearnings(agentDir: string, since?: Date): Promise<ExtractedLearning[]> {
  try {
    files = await glob(pattern);
  } catch {
    return [];  // Silent failure with empty array — no throw
  }
  
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      // ... parse ...
    } catch {
      // Skip unreadable files — continue processing others
    }
  }
}
```

**Throw on contract violations:**
```typescript
// From src/issues/task-parser.ts
async readAndParse(path: string): Promise<TaskEntry[]> {
  try {
    content = await readFile(path, 'utf-8');
  } catch {
    throw new Error(`Cannot read tasks file: ${path}`);  // Explicit error — required file
  }
}
```

**Rule:** Adapters return empty arrays/null for optional data. Throw errors only for required resources that prevent the use case from proceeding.

### Testing

**Framework:** Vitest (node:test compatible)  
**Location:** `tests/` directory, mirroring `src/` structure  
**Run command:** `npm test` (run all), `npm run test:watch` (watch mode)

**Test file naming:**
- Unit tests: `tests/unit/{layer}/{file}.test.ts`
- Integration tests: `tests/integration/{feature}.test.ts`
- E2E tests: `tests/e2e/{command}.test.ts`

**Test coverage from v0.3.0:**
- 843 tests passing
- Entity validation (T037)
- Port interface tests (T038)
- Adapter integration tests (T042-T044)
- E2E pipeline tests (T045)

**Pattern:** Co-locate test task IDs with implementation task IDs in same PR when possible (avoids test-last anti-pattern).

### Code Style

**Linter:** ESLint (standard TypeScript config)  
**Formatter:** Prettier (2-space indent, single quotes, no semicolons in TS)  
**Naming:**
- Files: kebab-case (`agent-history-reader.ts`, `sync-learnings.ts`)
- Classes: PascalCase (`AgentHistoryReaderAdapter`, `ConstitutionAdapter`)
- Interfaces (ports): PascalCase (`AgentHistoryReader`, `ConstitutionWriter`)
- Functions: camelCase (`syncLearnings`, `extractLearnings`)
- Constants: UPPER_SNAKE_CASE (`TEMPLATES_DIR`)

**Import order:**
```typescript
// 1. Node.js built-ins
import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

// 2. External dependencies
import { glob } from 'glob';

// 3. Internal types (relative imports, explicit .js extension)
import type { AgentHistoryReader, ExtractedLearning } from '../sync-learnings.js';
```

### File Structure

```
src/
  cli/          — CLI entry point (commander) + logger
  bridge/       — Context generation (Squad → SpecKit direction)
    adapters/   — SquadFileReader, SpecKitContextWriter
    ports.ts    — Port interfaces
    context.ts  — Use case
  install/      — Bridge installation
  review/       — Design Review ceremony
  issues/       — Issue creation from tasks.md
  sync/         — Learnings sync (execution → Squad memory + constitution)
    adapters/   — AgentHistoryReaderAdapter, ConstitutionAdapter, SyncStateAdapter
    sync-learnings.ts — Use case + ports
  demo/         — Demo orchestrator (v0.3.0)
  types.ts      — Entity layer (all shared types)
  main.ts       — Composition root (wiring diagram)

tests/
  unit/         — Layer-specific unit tests
  integration/  — Cross-layer integration tests
  e2e/          — Full CLI command tests
  fixtures/     — Test data

.squad/
  agents/       — Agent charters + history files
  decisions/    — Team decisions (decisions.md + inbox/)
  skills/       — Compressed knowledge (SKILL.md files)

specs/
  NNN-feature/  — Spec Kit artifacts (spec.md, plan.md, tasks.md, learnings.md)
```

## Examples

### Task ID in commit message
```bash
git commit -m "fix(sync): wire history reader + constitution output + CLI options [T001+T003+T004]"
```

### Constitution version bump
```markdown
**Version**: 1.2.0 | **Last Amended**: 2025-03-24
```

### Port + Adapter Pattern
```typescript
// Port (use case layer)
export interface AgentHistoryReader {
  extractLearnings(agentDir: string, since?: Date): Promise<ExtractedLearning[]>;
}

// Adapter (adapter layer)
export class AgentHistoryReaderAdapter implements AgentHistoryReader {
  async extractLearnings(agentDir: string, since?: Date): Promise<ExtractedLearning[]> {
    // Implementation with fs/glob
  }
}

// Wiring (composition root)
const historyReader = new AgentHistoryReaderAdapter();
await syncLearnings(stateReader, memoryWriter, options, historyReader);
```

## Anti-Patterns

- **Task IDs without context** — Don't use T001 alone; include feature context (e.g., "[T001] Install bridge components")
- **Manual constitution edits without version bump** — Always bump version + update date when amending
- **Throwing errors for optional data** — Return empty arrays/null; only throw for required resources
- **Test-last development** — Co-locate tests with implementation tasks (avoid Phase 8 testing anti-pattern)
- **Import without .js extension** — TypeScript requires explicit `.js` for ESM imports
- **Business logic in adapters** — Scoring, filtering, validation belong in use cases, not adapters
