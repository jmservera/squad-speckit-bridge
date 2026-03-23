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

This detects which frameworks are present and installs the appropriate bridge components:
- **Squad side**: Skill file + Design Review ceremony definition → `.squad/skills/speckit-bridge/`
- **Spec Kit side**: Extension with `after_tasks` hook → `.specify/extensions/squad-bridge/`
- **Manifest**: `.bridge-manifest.json` tracking installed files

If only one framework is detected, partial installation proceeds with guidance for completing setup later.

## Step 2: Generate Context (Before Planning)

Before running Spec Kit's `specify` or `plan` commands, generate a Squad context summary:

```bash
squad-speckit-bridge context specs/001-your-feature/
```

This reads your Squad team's accumulated knowledge (skills, decisions, agent learnings) and produces a `squad-context.md` in the spec directory — prioritized, summarized, and sized to fit within Spec Kit's planning context window (default: 8KB).

**What gets included** (in priority order):
1. **Team Skills** — Compressed knowledge from `.squad/skills/*/SKILL.md` (highest signal)
2. **Relevant Decisions** — Filtered entries from `.squad/decisions.md` (recent + relevant)
3. **Agent Learnings** — Summarized entries from `.squad/agents/*/history.md`

## Step 3: Run the Knowledge Loop

The full workflow looks like this:

```
1. squad-speckit-bridge context specs/NNN-feature/    # Squad memory → planning context
2. speckit specify                                      # Write spec (with Squad context)
3. speckit plan                                         # Create implementation plan
4. speckit tasks                                        # Generate task breakdown
5. squad-speckit-bridge review specs/NNN-feature/tasks.md  # Review with Squad team
6. [Create issues from reviewed tasks]                  # Lead creates GitHub issues
7. [Squad agents execute tasks]                         # Execution + learning
8. [Go to step 1 for next feature]                      # Knowledge compounds!
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

## Verify Installation

Check that everything is set up correctly:

```bash
squad-speckit-bridge status
```

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
