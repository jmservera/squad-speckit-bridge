# Quickstart: Bridge Self-Validation & Knowledge Loop

**Feature**: 004-bridge-self-validation | **Date**: 2025-07-17

## Prerequisites

- **Node.js** ≥ 18 with ESM support
- **TypeScript** 5.9+ (`devDependencies`)
- **Vitest** 4.1+ (`devDependencies`)
- **GitHub CLI** (`gh`) — authenticated for issue creation (`sqsk issues`)
- **Git** — for branch management

## Setup

```bash
# Clone and install
git clone https://github.com/jmservera/squad-speckit-bridge.git
cd squad-speckit-bridge
git checkout 004-bridge-self-validation
npm install

# Verify build
npm run build

# Run tests
npm test
```

## Project Layout

```
src/
├── types.ts           # Layer 0: Entities (pure types + validation)
├── bridge/            # Layer 1: Context use case + port interfaces
│   ├── ports.ts       #   All port interface definitions
│   ├── context.ts     #   BuildSquadContext use case
│   └── adapters/      # Layer 2: File system adapters
├── issues/            # Layer 1: Issue creation use case
├── sync/              # Layer 1: Learning sync use case
├── review/            # Layer 1: Design review use case
├── install/           # Layer 1: Bridge installation use case
├── cli/               # Layer 3: Commander CLI entry point
└── main.ts            # Composition root (wires adapters → use cases)

tests/
├── unit/              # Use case tests (ports are mocked)
└── integration/       # Adapter tests (real fixture files)
```

## Key Development Patterns

### Adding a New Entity

1. Define the type in `src/types.ts` (pure — no imports from other layers)
2. Add validation as a pure function in the same file
3. Write unit tests in `tests/unit/types.test.ts`

```typescript
// src/types.ts
export interface DistributionAnalysis {
  agentCounts: Record<string, number>;
  totalIssues: number;
  imbalanced: boolean;
  threshold: number;
  warnings: DistributionWarning[];
  suggestions: RebalanceSuggestion[];
}

export function analyzeDistribution(
  assignments: AgentAssignment[],
  threshold = 0.5,
): DistributionAnalysis {
  // Pure computation — no I/O
}
```

### Adding a New Port Interface

1. Define the interface in `src/bridge/ports.ts`
2. Interface methods accept/return only DTOs from `src/types.ts`
3. Never reference framework types (`fs`, `commander`, `gray-matter`)

```typescript
// src/bridge/ports.ts
import type { SpecRequirement } from '../types.js';

export interface SpecReader {
  readRequirements(specPath: string): Promise<SpecRequirement[]>;
}
```

### Adding a New Adapter

1. Create implementation in `src/<module>/adapters/<name>.ts`
2. Import the port interface and implement it
3. Write integration test in `tests/integration/<name>.test.ts`

```typescript
// src/review/adapters/spec-reader.ts
import { readFile } from 'node:fs/promises';
import type { SpecReader } from '../../bridge/ports.js';
import type { SpecRequirement } from '../../types.js';

export class SpecFileReader implements SpecReader {
  async readRequirements(specPath: string): Promise<SpecRequirement[]> {
    const content = await readFile(specPath, 'utf-8');
    // Parse FR-XXX lines...
  }
}
```

### Wiring in the Composition Root

1. Import adapter and use case in `src/main.ts`
2. Create factory function that wires adapter → use case
3. Export from composition root for CLI consumption

```typescript
// src/main.ts
export function createReviewer(options: ReviewerOptions) {
  const specReader = new SpecFileReader();
  const scanner = new ImplementationFileScanner();
  
  return {
    async reviewFidelity(specPath: string, srcDir: string) {
      return reviewImplementation(specReader, scanner, { specPath, srcDir });
    }
  };
}
```

### Writing Tests

**Unit tests** (use cases + entities): Mock all ports.

```typescript
// tests/unit/distribution.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeDistribution } from '../../src/types.js';

describe('analyzeDistribution', () => {
  it('flags imbalance when one agent exceeds threshold', () => {
    const assignments = [
      { issueNumber: 1, agentName: 'dinesh', labels: [] },
      { issueNumber: 2, agentName: 'dinesh', labels: [] },
      { issueNumber: 3, agentName: 'gilfoyle', labels: [] },
    ];
    const result = analyzeDistribution(assignments, 0.5);
    expect(result.imbalanced).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].agentName).toBe('dinesh');
  });
});
```

**Integration tests** (adapters): Use real fixture files.

```typescript
// tests/integration/spec-reader.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { SpecFileReader } from '../../src/review/adapters/spec-reader.js';

describe('SpecFileReader', () => {
  const tmpDir = 'tests/integration/.fixtures/spec-reader';
  
  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(`${tmpDir}/spec.md`, `
      ## Requirements
      - **FR-001**: Must generate context
      - **FR-002**: Must include skills section
    `);
  });

  it('parses FR-XXX requirements from spec markdown', async () => {
    const reader = new SpecFileReader();
    const reqs = await reader.readRequirements(`${tmpDir}/spec.md`);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].id).toBe('FR-001');
  });
});
```

## Build & Test Commands

```bash
# Build TypeScript → dist/
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/context.test.ts

# Run the CLI in dev mode (via tsx)
npm run dev -- context specs/004-bridge-self-validation/

# Run the CLI from built artifacts
node dist/cli/index.js context specs/004-bridge-self-validation/
```

## Architecture Rules (from Constitution)

1. **Dependency Rule**: Inner layers MUST NOT import from outer layers. `types.ts` → `use-cases` → `adapters` → `cli`. Never reverse.
2. **DTO Boundaries**: Port methods accept/return only DTOs from `types.ts`. No `Buffer`, `ReadStream`, `GrayMatterFile`, or framework types in signatures.
3. **Framework Isolation**: `fs`, `commander`, `gray-matter`, `glob` only in adapters and composition root. Swapping any framework requires zero entity/use-case changes.
4. **Test Parity**: Every `src/` module has a parallel `tests/` file. No layer ships without tests.
5. **Task Ordering**: Build innermost first — Entities → Use Cases → Adapters → CLI wiring.
