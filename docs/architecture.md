---
layout: default
---

# Architecture Overview

The Squad-SpecKit Bridge applies Clean Architecture principles to create a maintainable, testable integration between two complementary frameworks.

## Framework Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Planning Layer (Spec Kit)                                  │
│  Structured spec → plan → tasks generation                 │
│  Stateless, single-agent, specification-driven             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ (tasks.md + memory bridge)
        ┌──────────────────────────────┐
        │  Squad-SpecKit Bridge         │
        │  Design review + issue sync   │
        │  Memory context injection     │
        └──────────────────────────────┘
                       ↑
                       │ (learnings + decisions)
┌──────────────────────┴──────────────────────────────────────┐
│  Execution Layer (Squad)                                    │
│  Multi-agent coordination with persistent memory            │
│  Issue-driven, learning-accumulating, team-based           │
└─────────────────────────────────────────────────────────────┘
```

## Clean Architecture Layers

The bridge is structured in 4 layers following Uncle Bob's Clean Architecture:

### Layer 0: Entities (Pure Business Logic)

Core domain logic with zero dependencies on external frameworks.

**Key Entities:**
- **ContextBudget** — Allocates token limits across memory sources, respects recency bias
- **RelevanceScorer** — Prioritizes agent learnings and decisions by recency and keyword matching
- **ReviewFinding** — Represents issues or flags discovered during design review
- **BridgeConfig** — Validates configuration and provides defaults

**Properties:**
- No imports from `fs`, `path`, `commander`, `gray-matter`, or `@octokit/rest`
- No knowledge of `.squad/`, `.specify/`, or GitHub API
- Pure algorithms: allocation, scoring, classification
- Testable without mocks or fixtures

### Layer 1: Use Cases (Application Orchestration)

Orchestration logic that coordinates entities and defines ports (interfaces) for external concerns.

**Key Use Cases:**
- **GenerateContext** — Reads Squad artifacts, scores learnings, produces ContextSummaryDTO
- **PrepareReview** — Parses tasks, stores them in review state, generates ReviewRecordDTO
- **InstallBridge** — Validates frameworks, creates directories, outputs InstallManifestDTO
- **CheckStatus** — Probes frameworks, returns StatusDTO

**Port Interfaces (defined here, implemented in Layer 2):**
- **SquadStatePort** — Read-only access to agent histories and decisions
- **SpecKitStatePort** — Read/write access to spec files and context
- **ConfigPort** — Configuration resolution and validation
- **FileWriterPort** — Persistence of generated files
- **FrameworkDetectorPort** — Probes for Squad and Spec Kit initialization
- **IssueTrackerPort** — GitHub issue creation and metadata

**Properties:**
- Depend only on entities and port interfaces (never on adapters)
- All I/O goes through injected ports
- Return Data Transfer Objects (DTOs), never format-specific data
- Testable by mocking port interfaces

### Layer 2: Adapters (Format Conversion)

Concrete implementations of ports that adapt external frameworks/libraries to use case interfaces.

**Key Adapters:**
- **SquadFileSystemAdapter** — Implements SquadStatePort by reading `.squad/` markdown files
- **SpecKitFileSystemAdapter** — Implements SpecKitStatePort by reading/writing `.specify/` files
- **ConfigFileAdapter** — Implements ConfigPort using JSON files
- **CLIAdapter** — Parses command-line arguments and calls use cases
- **ManifestAdapter** — Generates installation manifests
- **GitHubIssueAdapter** — Implements IssueTrackerPort using Octokit REST API

**Dependencies:**
- External: `fs`, `path`, `gray-matter`, `@octokit/rest`, `glob`, `commander`
- Own layer: Other adapters (via composition root only)
- Zero knowledge of business logic

**Properties:**
- Do only format conversion (markdown → DTO, DTO → JSON)
- Cannot call each other (only called by composition root)
- Cannot contain business logic
- Swappable: can replace SquadFileSystemAdapter with SquadDatabaseAdapter without changing use cases

### Layer 3: Frameworks/Drivers (External Libraries)

Third-party libraries and infrastructure.

**Examples:**
- `commander` — CLI framework
- `gray-matter` — YAML frontmatter parsing
- `fs`, `path`, `glob` — File system
- `@octokit/rest` — GitHub API
- `zod` — Schema validation (future)

## Data Transfer Objects (DTOs)

DTOs carry data across layer boundaries. They own no business logic.

```typescript
// DTO crossing adapter → use case boundary
interface ContextGenerationRequest {
  squadPath: string;
  specKitPath: string;
  contextBudget: number;
  prioritizeRecent: boolean;
}

// DTO crossing use case → adapter boundary
interface ContextSummaryDTO {
  agentLearnings: AgentLearningEntry[];
  teamDecisions: DecisionEntry[];
  totalTokensUsed: number;
  generatedAt: Date;
}
```

**Rule:** No raw markdown, file paths, or format-specific data crosses the adapter ↔ use case boundary.

## Dependency Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Frameworks                                        │
│  commander, fs, gray-matter, @octokit/rest, glob           │
└────────────────────────────────────────────────────────────┘
                           ↑ uses only
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Adapters                                          │
│  SquadFS, SpecKitFS, CLI, GitHub, Config, Manifest         │
│  (Depend on frameworks and implement use case ports)        │
└────────────────────────────────────────────────────────────┘
                           ↑ implements
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Use Cases                                         │
│  GenerateContext, PrepareReview, InstallBridge, CheckStatus│
│  (Define ports, orchestrate entities)                       │
└────────────────────────────────────────────────────────────┘
                           ↑ uses only
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: Entities                                          │
│  ContextBudget, RelevanceScorer, ReviewFinding, BridgeConfig
│  (Pure logic, no dependencies)                              │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** All dependencies point inward. Nothing in Layer 1 or 0 depends on anything in Layer 2 or 3.

## Knowledge Flow Loop

```
1. Spec Kit Planning
   spec.md → plan.md → tasks.md
        │
        └─→ (Raw tasks, no project context)

2. Memory Bridge (Injection)
   .squad/agents/*/history.md  ─┐
   .squad/decisions.md         ─┼─→ Relevance scoring
   .squad/skills/*/SKILL.md    ─┘
        │
        └─→ (squad-context.md: summarized, budgeted)

3. Design Review
   Review tasks.md + squad-context.md
        │
        └─→ (Team validates/refines tasks)

4. Issue Creation
   tasks-reviewed.md → GitHub Issues
        │
        └─→ (Labeled with 'squad', assigned)

5. Squad Execution
   Ralph (triage) → Agents (work) → Close issues
        │
        └─→ (Execution learnings written to history.md)

6. Learning Sync
   .squad/agents/*/history.md → Summarization
        │
        └─→ [Loop back to #1]
```

**Key Insight:** The bridge closes the feedback loop. Without it, each planning cycle would start from zero context. With it, execution learnings compound.

## Extension Points

### For Squad Developers

The bridge provides:
- **SKILL.md** — Teaches agents about the bridge ceremony and workflow
- **Ceremony definition** — Design Review ceremony documented in `.squad/ceremonies.md`
- **Team decisions** — Bridge learnings available in `.squad/decisions.md`

Extend by:
- Adding agent charters that reference bridge SKILL
- Creating custom review ceremonies in ceremonies.md
- Writing agent skills that consume squad-context.md

### For Spec Kit Users

The bridge provides:
- **Extension hooks** — Automation scripts that trigger at planning boundaries
- **Context injection** — `squad-context.md` automatically available in spec templates
- **Task enrichment** — Ability to annotate tasks with Squad history before issue creation

Extend by:
- Creating custom Spec Kit extensions that call bridge tools
- Building templates that leverage squad-context.md
- Integrating with other framework extensions

### For Custom Integration

The bridge exposes:
- **MCP Server** (v1.0+) — Tool-based interface for agent frameworks beyond Squad/Spec Kit
- **Programmatic API** — TypeScript types and adapter interfaces
- **CLI** — Extensible command structure for new ceremonies

## Respect for Framework Boundaries

The bridge respects each framework's design:

### Squad Boundaries

- ✅ Never writes to Squad's runtime files (team.md, routing.md, orchestration-log)
- ✅ Never modifies agent charters or casting
- ✅ Only reads from `.squad/skills/` and `.squad/decisions.md`
- ✅ Read-only access to agent histories

### Spec Kit Boundaries

- ✅ Never modifies spec.md or plan.md
- ✅ Reads only from tasks.md (output)
- ✅ Writes only to squad-context.md (external input)
- ✅ Uses only documented extension hooks

### GitHub Boundaries

- ✅ Creates issues with clear provenance (`generated from squad-speckit-bridge`)
- ✅ Uses documented labels and metadata
- ✅ Respects existing issue workflow

## Technology Stack

### Core Dependencies
- **TypeScript** — Type safety, editor support
- **zod** — Runtime schema validation
- **gray-matter** — YAML frontmatter parsing
- **commander** — CLI argument parsing
- **@octokit/rest** — GitHub API (for v1.0+)
- **glob** — File pattern matching

### Testing
- **Jest** — Test runner and assertions
- **ts-jest** — TypeScript test support
- **@types/jest** — Type definitions

### Optional (v1.0+)
- **@modelcontextprotocol/sdk** — MCP server implementation
- **pino** — Structured logging

## Implementation Roadmap

**Phase 1 (Current):**
- Entities layer (ContextBudget, RelevanceScorer, ReviewFinding, BridgeConfig)
- Use cases with port interfaces (GenerateContext, PrepareReview, InstallBridge, CheckStatus)
- Core adapters (SquadFS, SpecKitFS, Config)
- CLI interface (commander-based)
- Squad plugin (SKILL.md)
- Spec Kit extension hooks
- Test pyramid: 60 tests (entities, use cases, adapters, CLI, E2E)

**Phase 2 (v0.2):**
- GitHubIssueAdapter (full issue creation workflow)
- Learning sync use case
- GitHub Actions workflow templates
- Installation package and publish to npm

**Phase 3 (v1.0):**
- MCP server wrapper
- Advanced feature: automatic memory pruning
- Integration with other frameworks via MCP
- Documentation website (this site)

---

**For questions about design decisions**, see [.squad/decisions.md](../.squad/decisions.md) in the project repository.
