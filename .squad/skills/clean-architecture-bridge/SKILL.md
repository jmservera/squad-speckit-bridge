# Skill: Clean Architecture for the Squad-SpecKit Bridge

**Applies to**: All implementation tasks on `001-squad-speckit-bridge`
**Source**: Uncle Bob's Clean Architecture (2012), mapped to this project

## The Dependency Rule

Source code dependencies point **inward only**. There are four layers:

```
Outermost → Innermost:
  Frameworks & Drivers → Interface Adapters → Use Cases → Entities
```

An inner layer **never** imports from an outer layer. An adapter can import an entity. An entity cannot import an adapter. A use case can import an entity. A use case cannot import `fs`, `commander`, or `@octokit`.

## Our Layers — Concrete Mapping

### Entities (innermost) — `src/types.ts`

Pure TypeScript types and interfaces. Business objects with no behavior beyond validation and computed properties.

**Belongs here:**
- `ContextSummary`, `SkillEntry`, `DecisionEntry`, `LearningEntry`
- `BridgeConfig`, `DesignReviewRecord`, `ReviewFinding`, `InstallManifest`
- Validation functions (e.g., `isValidConfig(c: BridgeConfig): boolean`)
- Pure computations (e.g., `computeRelevanceScore(decision, now)`)

**Does NOT belong here:**
- `import fs from 'fs'` — ❌ entities don't touch the file system
- `import matter from 'gray-matter'` — ❌ entities don't know about markdown
- Any function that reads from disk, calls an API, or produces side effects

### Use Cases — `src/bridge/context.ts`, `src/bridge/summarizer.ts`, `src/bridge/ports.ts`, `src/review/ceremony.ts`, `src/install/installer.ts` (logic portion)

Application-specific orchestration. Use cases call **port interfaces** — they never call framework code directly.

**Belongs here:**
- `BuildSquadContext(reader: SquadStateReader, writer: ContextWriter, config: BridgeConfig)`
- `SummarizeContent(entries: SkillEntry[], budget: number): SkillEntry[]`
- Port interfaces: `SquadStateReader`, `ContextWriter`, `IssueCreator`, `FileDeployer`
- Priority ordering, budget allocation, recency bias computation

**Does NOT belong here:**
- `import fs from 'fs'` — ❌ use cases don't touch the file system
- `import { Octokit } from '@octokit/rest'` — ❌ use cases don't know about GitHub
- `glob('**/*.md')` — ❌ use cases don't discover files
- Direct construction of markdown strings for output — ❌ that's an adapter concern

### Interface Adapters — `src/bridge/parser.ts`, `src/bridge/adapters/`, `src/cli/index.ts` (handler portion)

Convert between entity format and external format. Implement port interfaces.

**Belongs here:**
- `SquadFileSystemReader implements SquadStateReader` — reads `.squad/` files, returns entity objects
- `SpecKitContextWriter implements ContextWriter` — converts `ContextSummary` to markdown file
- `MarkdownFrontmatterParser` — uses `gray-matter` to parse markdown into structured data
- `CLIAdapter` — translates `commander` args into use case invocations
- `GitHubIssueAdapter implements IssueCreator` — converts task entities to Octokit API calls

**Does NOT belong here:**
- Business logic (scoring, prioritization, budget allocation) — ❌ that's a use case concern

### Frameworks & Drivers (outermost) — external dependencies + `src/cli/index.ts` (bootstrap)

| Dependency | What It Does | Wrapped By |
|-----------|-------------|------------|
| `fs/promises` | File read/write | `SquadFileReader`, `SpecKitWriter`, `ConfigLoader` |
| `gray-matter` | YAML frontmatter parsing | `MarkdownFrontmatterParser` |
| `commander` | CLI argument parsing | `CLIAdapter` |
| `glob` | File pattern matching | `SquadFileReader` |
| `@octokit/rest` | GitHub API | `GitHubIssueAdapter` |

## What NOT to Do — Anti-Patterns

### ❌ Don't import `fs` in entity or use case code

```typescript
// BAD — use case directly reads files
async function buildContext(config: BridgeConfig): Promise<ContextSummary> {
  const files = await glob('.squad/skills/*/SKILL.md'); // ❌ framework in use case
  const content = await fs.readFile(files[0], 'utf-8');  // ❌ fs in use case
  return { skills: parseSkills(content) };
}

// GOOD — use case takes a port interface
async function buildContext(
  reader: SquadStateReader,     // port interface
  writer: ContextWriter,        // port interface
  config: BridgeConfig           // entity
): Promise<void> {
  const skills = await reader.readSkills();    // adapter handles file I/O
  const summary = summarize(skills, config);   // pure logic
  await writer.write(summary);                 // adapter handles file output
}
```

### ❌ Don't reference GitHub in use cases

```typescript
// BAD — use case knows about GitHub
import { Octokit } from '@octokit/rest';
async function createIssues(tasks: Task[], token: string) {
  const octokit = new Octokit({ auth: token }); // ❌
}

// GOOD — use case calls an output port
async function createIssues(tasks: Task[], issueCreator: IssueCreator) {
  for (const task of tasks) {
    await issueCreator.create(task);  // adapter handles GitHub details
  }
}
```

### ❌ Don't pass framework types across boundaries

```typescript
// BAD — gray-matter output leaks into use case
function processSkill(grayMatterResult: GrayMatterFile): SkillEntry { ... }

// GOOD — adapter converts to entity at the boundary
function processSkill(entry: SkillEntry): void { ... }
// The adapter does: const entity = toSkillEntry(matter(rawMarkdown));
```

### ❌ Don't put business logic in adapters

```typescript
// BAD — scoring logic in the file reader adapter
class SquadFileReader implements SquadStateReader {
  async readDecisions(): Promise<DecisionEntry[]> {
    // ... reads files ...
    return decisions.sort((a, b) => b.relevanceScore - a.relevanceScore); // ❌ business logic
  }
}

// GOOD — adapter returns raw entities, use case scores and sorts
class SquadFileReader implements SquadStateReader {
  async readDecisions(): Promise<DecisionEntry[]> {
    // ... reads files, converts to entities, returns unsorted
  }
}
```

## How to Test Each Layer

### Entities — Pure unit tests, zero setup

```typescript
describe('BridgeConfig validation', () => {
  it('rejects contextMaxBytes over 32KB', () => {
    const config = { contextMaxBytes: 50000 };
    expect(isValidConfig(config)).toBe(false);
  });

  it('computes relevance score from recency', () => {
    const decision = { date: '2025-07-01', title: 'Test' };
    const score = computeRelevanceScore(decision, new Date('2025-07-24'));
    expect(score).toBeGreaterThan(0.5);
  });
});
```

### Use Cases — In-memory fakes, no file system

```typescript
describe('BuildSquadContext', () => {
  it('produces summary within budget', async () => {
    const fakeReader: SquadStateReader = {
      readSkills: async () => [{ name: 'test', context: 'x'.repeat(1000) }],
      readDecisions: async () => [],
      readLearnings: async () => [],
    };
    let captured: ContextSummary | null = null;
    const fakeWriter: ContextWriter = {
      write: async (s) => { captured = s; },
    };
    const config = { contextMaxBytes: 8192 } as BridgeConfig;

    await buildSquadContext(fakeReader, fakeWriter, config);

    expect(captured).not.toBeNull();
    expect(captured!.metadata.sizeBytes).toBeLessThanOrEqual(8192);
  });
});
```

### Adapters — Integration tests with fixture files

```typescript
describe('SquadFileReader', () => {
  it('reads skill files from fixture directory', async () => {
    const reader = new SquadFileSystemReader('tests/fixtures/squad');
    const skills = await reader.readSkills();
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe('project-conventions');
  });
});
```

### End-to-End — Full pipeline with real files

```typescript
describe('bridge context command', () => {
  it('produces squad-context.md from fixture squad dir', async () => {
    // Uses real files in tests/fixtures/, real adapters, real use cases
    execSync('node dist/cli/index.js context --squad-dir tests/fixtures/squad');
    const output = fs.readFileSync('tests/fixtures/specify/squad-context.md', 'utf-8');
    expect(output).toContain('project-conventions');
  });
});
```

## Quick Reference — "Which layer?" Decision Tree

```
Is it a pure data type or validation rule?
  → ENTITY (src/types.ts)

Does it orchestrate business logic without touching I/O?
  → USE CASE (src/bridge/context.ts, summarizer.ts, etc.)

Does it convert between external formats and entities?
  → ADAPTER (src/bridge/parser.ts, adapters/, cli/)

Is it a third-party library or Node.js built-in?
  → FRAMEWORK/DRIVER (imported only by adapters)
```

## Port Interfaces — The Contracts

These interfaces live in the use case layer and are implemented by adapters:

| Port | Direction | Purpose |
|------|-----------|---------|
| `SquadStateReader` | Input | Read Squad memory artifacts as entities |
| `ContextWriter` | Output | Write generated context summary |
| `TasksReader` | Input | Read Spec Kit tasks for review |
| `IssueCreator` | Output | Create issues from approved tasks |
| `FrameworkDetector` | Input | Detect which frameworks are installed |
| `FileDeployer` | Output | Deploy bridge components to file system |
| `LearningReader` | Input | Read post-execution learnings |
| `LearningWriter` | Output | Write learnings back to Squad state |
