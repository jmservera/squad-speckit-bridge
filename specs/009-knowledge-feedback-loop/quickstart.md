# Quickstart: Knowledge Feedback Loop (Reverse Sync)

**Time to first sync**: ~5 minutes  
**Prerequisites**: Node.js 20+, existing Squad + SpecKit setup, completed implementation cycle

---

## 1. Build

```bash
cd /home/azureuser/source/squad-speckit-bridge
npm run build
```

## 2. Verify Setup

Confirm both Squad and SpecKit directories exist:

```bash
ls -la .squad/          # Should contain agents/, decisions.md, skills/
ls -la .specify/        # Should contain memory/constitution.md
ls -la specs/009-*/     # Should contain spec.md
```

## 3. Preview (Dry Run)

Always preview before writing:

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --dry-run
```

This shows:
- Which sources will be read (agent histories, decisions, skills)
- How many learnings would be extracted
- Which entries are constitution-worthy vs learnings-only
- Privacy redaction summary
- No files are written

## 4. Execute Reverse Sync

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --cooldown 0
```

This:
1. Reads `.squad/agents/*/history.md`, `.squad/decisions.md`, `.squad/skills/`
2. Filters by cooldown (0 = include all), deduplicates via fingerprints
3. Applies privacy filter (masks secrets, strips PII)
4. Classifies each learning (constitution-worthy or learnings-only)
5. Writes `specs/009-knowledge-feedback-loop/learnings.md`
6. Appends constitution-worthy entries to `.specify/memory/constitution.md`
7. Persists state to `.squad/.bridge-sync-reverse.json`

## 5. Verify Output

```bash
# Check learnings were generated
cat specs/009-knowledge-feedback-loop/learnings.md

# Check constitution was enriched (if applicable)
tail -20 .specify/memory/constitution.md

# Verify spec files were NOT modified
git diff specs/009-knowledge-feedback-loop/spec.md   # Should be empty
git diff specs/009-knowledge-feedback-loop/plan.md   # Should be empty
```

## 6. Re-run (Idempotency Check)

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --cooldown 0
# Expected: "No new learnings — all entries already synced"
```

---

## Common Workflows

### Skip constitution updates

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --no-constitution
```

### Sync only from team decisions

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --sources decisions
```

### JSON output for scripting

```bash
npx squask sync-reverse specs/009-knowledge-feedback-loop --json | jq '.learningsWritten'
```

---

## Development Workflow

### Run tests

```bash
npm test                                    # All tests
npx vitest run tests/unit/privacy-filter    # Privacy filter unit tests
npx vitest run tests/unit/sync-reverse      # Use case unit tests
npx vitest run tests/integration/learning   # Adapter integration tests
npx vitest run tests/e2e/sync-reverse       # End-to-end test
```

### Layer order for implementation

Follow Clean Architecture ordering:

1. **Entities first** (`src/types.ts`): Add new types + pure functions
2. **Use case** (`src/sync/sync-reverse.ts`): Define ports + orchestration logic
3. **Adapters** (`src/sync/adapters/`): Implement ports with `fs/promises`
4. **CLI** (`src/cli/index.ts`): Wire the `sync-reverse` subcommand
5. **Composition root** (`src/main.ts`): Add `createReverseSyncer()` factory

### Key files to understand

| File | Purpose | Layer |
|------|---------|-------|
| `src/sync/sync-learnings.ts` | Forward sync (pattern to follow) | Use Case |
| `src/sync/adapters/sync-state-adapter.ts` | State persistence pattern | Adapter |
| `src/types.ts` | All entity types + pure functions | Entity |
| `src/main.ts` | Composition root (adapter wiring) | Driver |
| `src/cli/index.ts` | CLI commands (commander) | Driver |
