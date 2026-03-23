# Research: Squad-SpecKit Knowledge Bridge

**Phase**: 0 — Outline & Research
**Date**: 2025-07-24
**Status**: Complete

## Resolved Clarifications

### RC-1: Degraded Mode Behavior (FR-020)

**Spec Question**: "Should degraded mode silently skip operations or require explicit confirmation to proceed?"

**Decision**: Silent skip with visible warning output.

**Rationale**: The bridge is a developer tool, not a production service. Requiring interactive confirmation would break CI/CD usage and automation workflows. Developers who install the bridge know they may have partial setups. The correct UX is:
- Print a warning to stderr: `⚠ Squad not detected (.squad/ missing). Running in Spec Kit-only mode.`
- Skip all Squad-dependent operations (memory bridge, ceremony definition)
- Continue with whatever operations are possible
- Exit with code 0 (success) — a partial run is not an error

**Alternatives Considered**:
1. **Interactive confirmation** — Rejected. Blocks automation, annoying for developers who intentionally have partial setups.
2. **Exit with error** — Rejected. A missing framework is an expected state, not an error condition. The spec explicitly supports partial installation (US-1 scenarios 2 and 3).
3. **Config flag to choose behavior** — Rejected for v1. Over-engineering. Can add later if demanded.

---

### RC-2: GitHub API Dependency

**Decision**: No GitHub API dependency for v0.1. Remove `@octokit/rest` from initial dependencies.

**Rationale**: The bridge's v0.1 scope is file-system-only. It reads `.squad/` and writes to `specs/`. Issue creation (which would need `@octokit/rest`) is explicitly outside the bridge's ceremony scope (FR-013: "The ceremony MUST NOT create GitHub issues"). Issue creation is a separate step performed by Squad's Coordinator after review approval. The GitHub API dependency can be added in v0.2+ if the bridge evolves to include optional issue creation.

**Alternatives Considered**:
1. **Include @octokit/rest now** — Rejected. YAGNI. Adds 2MB+ to install, requires token configuration, and no v0.1 feature uses it.
2. **Optional peer dependency** — Considered for v0.2 when issue creation support is added.

---

### RC-3: Context Summary Format

**Decision**: Plain Markdown with YAML frontmatter for metadata.

**Rationale**: Both frameworks are markdown-native. Spec Kit's planning phases read markdown. Squad agents read markdown. A markdown context summary requires zero parsing infrastructure and is human-readable for debugging. The frontmatter carries machine-readable metadata (timestamp, source files, size) while the body carries the knowledge content.

**Format**:
```markdown
---
generated: 2025-07-24T10:30:00Z
sources:
  skills: 3
  decisions: 47
  histories: 5
size_bytes: 7200
max_bytes: 8192
---
# Squad Context for Spec Kit Planning

## Team Skills (Highest Signal)
...

## Relevant Decisions
...

## Agent Learnings (Summarized)
...
```

**Alternatives Considered**:
1. **JSON** — Rejected. Not human-readable, requires parsing, not consumable by Spec Kit planning prompts as-is.
2. **Raw concatenation** — Rejected. No structure, no prioritization, no size control.

---

### RC-4: Progressive Summarization Strategy

**Decision**: Three-tier approach — truncation by section priority, then by recency within sections, then by content compression.

**Rationale**: The 8KB limit must be enforced without losing high-signal content. The strategy:

1. **Priority ordering**: Skills (full content) → Decisions (filtered) → Learnings (summarized). If budget exhausted after skills, decisions and learnings are omitted.
2. **Recency bias**: Within each section, most recent entries first. Older entries are dropped first when budget is tight.
3. **Content compression**: For large individual entries, extract first paragraph + any bullet lists. Drop prose body.

This mirrors how humans naturally prioritize — curated knowledge (skills) over institutional decisions over individual experience.

**Alternatives Considered**:
1. **LLM-based summarization** — Rejected for v0.1. Adds API dependency, latency, cost, and non-determinism. Can be added as optional enhancement in v1.0.
2. **Equal allocation per section** — Rejected. Skills are dramatically higher signal-to-noise than raw history entries. Equal allocation wastes budget on low-signal content.

---

### RC-5: Package Distribution

**Decision**: npm package, installable via `npx squad-speckit-bridge install`.

**Rationale**: The project uses TypeScript/Node.js. npm is the natural distribution channel. `npx` allows zero-install usage for trying the bridge. The `install` subcommand handles framework detection and file deployment. Published package name: `squad-speckit-bridge`.

**Alternatives Considered**:
1. **Shell script** — Rejected. Hard to maintain, no dependency management, poor Windows support.
2. **Python package** — Rejected. Squad ecosystem is Node.js-oriented. Adding Python dependency is unnecessary friction.
3. **Go binary** — Rejected. Excellent portability but wrong ecosystem. TypeScript allows the bridge to eventually share code with Squad's Node.js SDK.

---

## Technology Best Practices

### gray-matter (Markdown Frontmatter Parsing)

- Use for reading YAML frontmatter from Squad's SKILL.md files and generating frontmatter for context summaries
- Handles edge cases: no frontmatter, malformed YAML, empty files
- Already battle-tested in the Spec Kit ecosystem (Spec Kit uses similar parsing internally)

### commander (CLI Framework)

- Standard for Node.js CLI tools
- Supports subcommands (`bridge context`, `bridge install`, `bridge review`)
- Built-in help generation, argument parsing, version display
- Zero-config TypeScript support via tsx or compiled JS

### Vitest (Testing)

- Native TypeScript support, no compilation step needed for tests
- ESM-first (aligns with modern Node.js)
- Fast execution, watch mode for development
- Compatible with Jest API (easy migration if needed)
- Built-in mocking for file system operations (via vi.mock)

### File System Operations

- Use Node.js `fs/promises` API (async by default)
- Use `glob` package for file discovery (`.squad/skills/*/SKILL.md`, `.squad/agents/*/history.md`)
- Always handle ENOENT gracefully — missing files are expected states, not errors
- Use path.join() consistently for cross-platform compatibility
