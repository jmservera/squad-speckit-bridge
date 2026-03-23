# Quickstart: Squad-SpecKit Knowledge Bridge

Get the bridge running in 3 steps.

## Prerequisites

- **Node.js 18+** installed
- A repository with **Squad** (`.squad/` directory) and/or **Spec Kit** (`.specify/` directory) initialized
- Both frameworks work independently before adding the bridge

## Step 1: Install

From your repository root:

```bash
npx squad-speckit-bridge install
```

**Expected output (both frameworks detected):**
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ .squad/skills/speckit-bridge/SKILL.md
  ✓ .squad/skills/speckit-bridge/ceremony.md
  ✓ .specify/extensions/squad-bridge/extension.yml
  ✓ Manifest: .bridge-manifest.json

Installation complete. 3 files created.
```

**Partial install (only Squad detected):**
```bash
npx squad-speckit-bridge install
```
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ⚠ Spec Kit not detected (.specify/ missing)

Installing partial components...
  ✓ .squad/skills/speckit-bridge/SKILL.md
  ✓ .squad/skills/speckit-bridge/ceremony.md
  ✓ Manifest: .bridge-manifest.json

Partial installation complete. 2 files created.
To complete: Initialize Spec Kit, then run `squad-speckit-bridge install` again.
```

**JSON output:**
```bash
npx squad-speckit-bridge install --json
```

## Step 2: Verify Installation

```bash
npx squad-speckit-bridge status
```

**Expected output:**
```
Squad-SpecKit Bridge v0.1.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md)
  Ceremony def:     ✓ installed (.squad/skills/speckit-bridge/ceremony.md)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json)

Configuration:
  Context max size: 8192 bytes
  After-tasks hook: enabled
  Sources:          skills, decisions, histories
```

## Step 3: Generate Context (Before Planning)

Before running Spec Kit's `specify` or `plan` commands, generate a Squad context summary:

```bash
npx squad-speckit-bridge context specs/001-your-feature/
```

**Expected output:**
```
Generating Squad context...

Sources processed:
  Skills:    3 included
  Decisions: 2 included
  Histories: 4 included

Output: specs/001-your-feature/squad-context.md (3.2KB / 8.0KB limit)
```

This reads your Squad team's accumulated knowledge (skills, decisions, agent learnings) and produces a `squad-context.md` in the spec directory — prioritized, summarized, and sized to fit within Spec Kit's planning context window (default: 8KB).

**With size limit:**
```bash
npx squad-speckit-bridge context specs/001-your-feature/ --max-size 4096
```

**JSON output:**
```bash
npx squad-speckit-bridge context specs/001-your-feature/ --json
```

**What gets included** (in priority order):
1. **Team Skills** — Compressed knowledge from `.squad/skills/*/SKILL.md` (highest signal)
2. **Relevant Decisions** — Filtered entries from `.squad/decisions.md` (recent + relevant)
3. **Agent Learnings** — Summarized entries from `.squad/agents/*/history.md`

## Step 4: Design Review

After generating tasks with Spec Kit, run a Design Review:

```bash
npx squad-speckit-bridge review specs/001-your-feature/tasks.md
```

**Expected output:**
```
Design Review prepared for specs/001-your-feature/tasks.md

Pre-populated findings:
  ℹ 5 task(s) may benefit from agent expertise

Review template written to: specs/001-your-feature/review.md
Next: Run the Design Review ceremony with your Squad team.
```

**Custom output path:**
```bash
npx squad-speckit-bridge review specs/001-your-feature/tasks.md --output my-review.md
```

**Notification mode (lightweight):**
```bash
npx squad-speckit-bridge review specs/001-your-feature/tasks.md --notify
```

## The Full Knowledge Loop

```
1. npx squad-speckit-bridge context specs/NNN-feature/    # Squad memory → planning context
2. speckit specify                                         # Write spec (with Squad context)
3. speckit plan                                            # Create implementation plan
4. speckit tasks                                           # Generate task breakdown
5. npx squad-speckit-bridge review specs/NNN-feature/tasks.md  # Review with Squad team
6. [Create issues from reviewed tasks]                     # Lead creates GitHub issues
7. [Squad agents execute tasks]                            # Execution + learning
8. [Go to step 1 for next feature]                         # Knowledge compounds!
```

Each cycle, the Squad context gets richer because agents write learnings during execution, and those learnings feed the next planning cycle.

## Optional: Customize Configuration

Create `bridge.config.json` at your repo root to override defaults:

```json
{
  "contextMaxBytes": 16384,
  "summarization": {
    "maxDecisionAgeDays": 30
  }
}
```

See [config-schema.md](contracts/config-schema.md) for all configuration options.

## Error Handling

All errors include a code and suggestion. In JSON mode:

```bash
npx squad-speckit-bridge context nonexistent-dir/ --json 2>&1
```

```json
{
  "error": true,
  "code": "SQUAD_NOT_FOUND",
  "message": "...",
  "suggestion": "Initialize Squad first, or use --squad-dir to specify a custom path."
}
```

| Error Code | Meaning | Fix |
|-----------|---------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` directory missing | Initialize Squad or use `--squad-dir` |
| `SPECKIT_NOT_FOUND` | `.specify/` directory missing | Initialize Spec Kit or use `--specify-dir` |
| `SPEC_DIR_NOT_FOUND` | Target spec directory missing | Create the directory first |
| `TASKS_NOT_FOUND` | Tasks file not found | Check the file path |
| `PERMISSION_DENIED` | Cannot read/write files | Check permissions |
| `CONFIG_INVALID` | Bad config values | Validate against config schema |
| `PARSE_ERROR` | Malformed markdown/YAML | Check file syntax |

## Common Scenarios

### "I only have Squad, no Spec Kit yet"

Install the bridge — it will set up Squad-side components (skill + ceremony). When you add Spec Kit later, run `install` again to complete the integration.

### "My decisions.md is huge (100KB+)"

The bridge handles this automatically. Progressive summarization extracts the most relevant decisions and keeps the context summary under the configured limit. Increase `contextMaxBytes` if you want more context, or decrease `maxDecisionAgeDays` to focus on recent decisions.

### "I want to skip the Design Review ceremony"

You can — the ceremony is optional. Just create issues directly from `tasks.md`. But the ceremony is where your Squad team's accumulated knowledge catches planning blind spots. We recommend it for features touching complex areas of the codebase.

### "The after_tasks hook is too noisy"

Disable it in your config:

```json
{
  "hooks": {
    "afterTasks": false
  }
}
```

The bridge still works — you just trigger reviews manually instead of getting auto-notifications.
