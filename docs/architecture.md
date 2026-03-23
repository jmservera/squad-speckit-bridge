---
layout: default
---

# Architecture Overview

The Squad-SpecKit Bridge applies Clean Architecture principles to create a maintainable, testable integration between two complementary frameworks.

## Conceptual Framework Layers

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

## Clean Architecture: 4-Layer Model

The bridge implements Uncle Bob's Clean Architecture with 4 concentric layers.

### Layer 0: Entities (Core Business Logic)

Pure domain logic with zero external dependencies.

**Key Entities:**
- **ContextBudget** — Allocates token limits across memory sources
- **RelevanceScorer** — Prioritizes learnings by recency
- **ReviewFinding** — Represents conflicts and risks
- **BridgeConfig** — Validates configuration

**Properties:**
- ✅ No imports from `fs`, `path`, `commander`, `gray-matter`
- ✅ Pure algorithms: allocation, scoring, classification
- ✅ Fully testable without mocks

### Layer 1: Use Cases (Application Orchestration)

Orchestration logic that coordinates entities and defines ports (interfaces).

**Key Use Cases:**
- **GenerateContext** — Reads Squad artifacts, scores learnings, produces context summary
- **PrepareReview** — Parses tasks, generates review template
- **InstallBridge** — Detects frameworks, deploys components
- **CheckStatus** — Probes framework initialization

**Port Interfaces (defined here, implemented in Layer 2):**
- **SquadStatePort** — Read-only access to agent histories and decisions
- **SpecKitStatePort** — Read/write access to spec files
- **ConfigPort** — Configuration resolution
- **FileWriterPort** — File persistence
- **FrameworkDetectorPort** — Framework detection

**Properties:**
- ✅ Depend only on entities and port interfaces
- ✅ All I/O through injected ports
- ✅ Fully testable by mocking ports

### Layer 2: Adapters (Format Conversion)

Concrete implementations of ports that adapt external libraries.

**Key Adapters:**
- **SquadFileSystemAdapter** — Implements SquadStatePort
- **SpecKitFileSystemAdapter** — Implements SpecKitStatePort
- **ConfigFileAdapter** — Implements ConfigPort
- **CLIAdapter** — Parses command-line arguments
- **ManifestAdapter** — Generates installation manifests

**Properties:**
- ✅ Do only format conversion (markdown ↔ DTO)
- ✅ Cannot call each other (composition root wires them)
- ✅ Cannot contain business logic

### Layer 3: Frameworks & Drivers

Third-party libraries: `commander`, `gray-matter`, `fs`, `@octokit/rest`, `glob`

## Dependency Flow

```
┌──────────────────────────────────────────────────────────────┐
│  External Libraries (Layer 3)                                │
│  commander, fs, gray-matter, glob, @octokit/rest            │
└────────────────────────────────────┬─────────────────────────┘
                                     │ used only by
┌────────────────────────────────────▼─────────────────────────┐
│  Adapters (Layer 2)                                          │
│  SquadFS, SpecKitFS, CLI, Config, Manifest                  │
└────────────────────────────────────┬─────────────────────────┘
                                     │ implement
┌────────────────────────────────────▼─────────────────────────┐
│  Use Cases (Layer 1)                                         │
│  GenerateContext, PrepareReview, InstallBridge, CheckStatus │
└────────────────────────────────────┬─────────────────────────┘
                                     │ use only
┌────────────────────────────────────▼─────────────────────────┐
│  Entities (Layer 0)                                          │
│  ContextBudget, RelevanceScorer, ReviewFinding, BridgeConfig │
└──────────────────────────────────────────────────────────────┘

RULE: All arrows point inward.
```

## Module Mapping to src/ Directory

```
src/
├── entities/                 # Layer 0: Pure business logic
│   ├── context-budget.ts
│   ├── relevance-scorer.ts
│   ├── review-finding.ts
│   └── bridge-config.ts
├── use-cases/                # Layer 1: Application orchestration
│   ├── ports/
│   │   ├── squad-state.port.ts
│   │   ├── speckit-state.port.ts
│   │   ├── config.port.ts
│   │   └── framework-detector.port.ts
│   ├── generate-context.use-case.ts
│   ├── prepare-review.use-case.ts
│   ├── install-bridge.use-case.ts
│   └── check-status.use-case.ts
├── adapters/                 # Layer 2: Format conversion
│   ├── squad-filesystem.adapter.ts
│   ├── speckit-filesystem.adapter.ts
│   ├── config-file.adapter.ts
│   ├── cli.adapter.ts
│   └── manifest.adapter.ts
├── dto/                      # Data Transfer Objects
│   ├── context-generation.dto.ts
│   ├── review-record.dto.ts
│   ├── install-manifest.dto.ts
│   └── status.dto.ts
└── main.ts                   # Composition root (wires layers)
```

## Data Transfer Objects (DTOs)

DTOs carry data across layer boundaries with no business logic.

```typescript
// Adapter → Use Case
interface ContextGenerationRequest {
  squadPath: string;
  specKitPath: string;
  contextBudget: number;
  recencyBiasWeight: number;
}

// Use Case → Adapter
interface ContextSummaryDTO {
  agentLearnings: AgentLearningEntry[];
  teamDecisions: DecisionEntry[];
  totalBytesUsed: number;
  generatedAt: Date;
}
```

**Rule:** No raw markdown, file paths, or format-specific data crosses layer boundaries.

## Knowledge Flow Loop (The Flywheel)

```
Step 1: Spec Kit Planning
────────────────────────
  spec.md → plan.md → tasks.md (no project context yet)

Step 2: Memory Bridge (Inject Squad Learning)
──────────────────────────────────────────
  Read:  .squad/agents/*/history.md, .squad/decisions.md, skills
  Score: By recency and relevance (ContextBudget, RelevanceScorer entities)
  Write: squad-context.md (budgeted, summarized)

Step 3: Design Review Ceremony
──────────────────────────────
  Team: Validate tasks against real-world experience
  Output: tasks-reviewed.md (annotations + approval)

Step 4: Issue Creation
──────────────────────
  tasks-reviewed.md → GitHub Issues (labeled, assigned)

Step 5: Squad Execution
──────────────────────
  Ralph: Triage → Agents: Work → Issues: Closed
  Learnings: Written to .squad/agents/*/history.md

Step 6: Learning Sync
────────────────────
  .squad/agents/*/history.md → Summarization → Persist
  
    ⤴ LOOP BACK TO STEP 2
```

**Key Insight:** Without the loop, each planning cycle starts from zero. With it, execution learnings compound over time.

## Extension Points

### For Squad Developers
- **SKILL.md** — Teaches agents about bridge workflow
- **Ceremony Definition** — Design Review ceremony in `.squad/ceremonies.md`
- Extend by creating agent roles specialized in design review

### For Spec Kit Users
- **Extension Hooks** — `after_tasks` automation scripts
- **Context Injection** — `squad-context.md` available in spec templates
- Extend by creating custom Spec Kit extensions

### For Custom Integration (v1.0+)
- **MCP Server** — Tool-based interface for other agent frameworks
- **Programmatic API** — TypeScript types and adapter interfaces
- **CLI** — Extensible command structure

## Framework Boundary Respect

The bridge respects each framework's design:

### Squad Boundaries ✅
- ✅ Never writes to runtime files (team.md, routing.md)
- ✅ Only reads from `.squad/skills/` and `.squad/decisions.md`
- ✅ Read-only access to agent histories

### Spec Kit Boundaries ✅
- ✅ Never modifies spec.md or plan.md
- ✅ Reads only from tasks.md output
- ✅ Writes only to squad-context.md (external input)
- ✅ Uses only documented extension hooks

## Technology Stack

### Core
- **TypeScript 5.x** — Type safety
- **zod** — Runtime schema validation
- **gray-matter** — YAML frontmatter parsing
- **commander** — CLI framework
- **glob** — File pattern matching

### Testing
- **Vitest** — TypeScript-native test runner
- **Jest** — Assertions library

### Optional (v1.0+)
- **@modelcontextprotocol/sdk** — MCP server
- **@octokit/rest** — GitHub API

## Implementation Roadmap

**Phase 1 (Current):**
- Entities layer (pure business logic)
- Use cases with port interfaces
- Core adapters (SquadFS, SpecKitFS, Config, CLI)
- Squad plugin (SKILL.md, ceremony definition)
- Spec Kit extension hooks (after_tasks)
- 60 test cases

**Phase 2 (v0.2):**
- GitHubIssueAdapter (full workflow)
- Learning sync use case
- Installation package (npm)

**Phase 3 (v1.0):**
- MCP server wrapper
- Advanced features (memory pruning)
- Multi-framework integration

---

**Design Decision Details:** See [.squad/decisions.md](../.squad/decisions.md)
