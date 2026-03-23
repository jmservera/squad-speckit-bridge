---
layout: default
---

# Installation Guide

Get the Squad-SpecKit Bridge up and running in your project. This guide covers prerequisites, installation, verification, and troubleshooting.

## Prerequisites

Before installing the bridge, ensure you have:

- **Node.js 18.0+** — Runtime environment
- **npm 8.0+** — Package manager
- **Squad** (`.squad/` directory) — Initialized in your repository
- **Spec Kit** (`.specify/` directory) — Initialized in your repository

### Verify Prerequisites

```bash
# Check Node.js version (should be 18.0.0 or higher)
$ node --version
v20.11.0  ✓

# Check npm version (should be 8.0.0 or higher)
$ npm --version
10.2.4  ✓

# Verify Squad is initialized
$ ls -la .squad/
total 8
drwxr-xr-x  agents/
drwxr-xr-x  decisions.md
drwxr-xr-x  skills/

# Verify Spec Kit is initialized
$ ls -la .specify/
total 8
drwxr-xr-x  extensions/
drwxr-xr-x  memory/
drwxr-xr-x  templates/
```

If either is missing, initialize the framework first:

```bash
# Initialize Squad
npx squad init

# Initialize Spec Kit
npx speckit init
```

## Installation Steps

### Step 1: Install via npm

In your repository root, run:

```bash
$ npx squad-speckit-bridge install
```

This command:
- Detects Squad and Spec Kit in your repository
- Deploys bridge components to both frameworks
- Creates a `bridge.config.json` configuration file
- Validates the installation

### Step 2: Review Installation Output

Expected successful output:

```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/ceremonies/design-review.md
  ✓ Spec Kit extension: .specify/extensions/squad-bridge/extension.yml
  ✓ Manifest: .bridge-manifest.json
  ✓ Configuration: bridge.config.json

Installation complete. 5 files created.
Next: Run `npx squad-speckit-bridge status` to verify.
```

### Step 3: Verify Installation

```bash
$ npx squad-speckit-bridge status
```

Expected output:

```
Squad-SpecKit Bridge v0.1.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed (.squad/skills/speckit-bridge/SKILL.md)
  Ceremony def:     ✓ installed (.squad/ceremonies/design-review.md)
  Spec Kit ext:     ✓ installed (.specify/extensions/squad-bridge/extension.yml)
  Manifest:         ✓ present (.bridge-manifest.json)

Configuration:
  Context max size: 8192 bytes
  After-tasks hook: enabled
  Sources:          skills, decisions, histories

Last context run:   (none yet)
```

All items should show `✓`. If any show `✗`, review the troubleshooting section below.

## What Gets Automated

After installation, the bridge operates **silently in the background** during Spec Kit's planning phases. Here's what happens without any additional commands:

### During `/speckit.plan`

| What | How | You See |
|------|-----|---------|
| **Memory Injection** | Bridge reads `.squad/` (skills, decisions, histories) and creates `squad-context.md` | Planning context includes your team's prior learnings |
| **Context Budgeting** | Recent and relevant decisions prioritized; older items pruned to fit context budget | Focused, efficient context (default: 8192 bytes) |
| **Availability** | File automatically created in your spec directory | `squad-context.md` available for manual reference during planning |

### After `/speckit.tasks` Completes

| What | How | You See |
|------|-----|---------|
| **Review Generation** | Bridge analyzes `tasks.md` for potential conflicts and risks | `specs/YOUR-SPEC/review.md` auto-generated with pre-populated findings |
| **Decision Conflicts** | Checks against `.squad/decisions.md` for alignment | Flags highlighted in review template: "⚠ Task T3 conflicts with decision D-042" |
| **Team Notification** | Logs a message indicating review is ready | "[squad-bridge] Design Review ready at specs/001-feature/review.md" |
| **Configuration Check** | Respects `bridge.config.json` settings | Can be disabled via `"hooks": { "afterTasks": false }` |

### These Hooks Are Active

1. **`after-tasks.sh`** (in `.specify/extensions/squad-bridge/`)
   - Trigger: Automatically runs after `/speckit.tasks`
   - Defined in: `extension.yml` with `enabled: true`
   - Configurable: `bridge.config.json` → `hooks.afterTasks`

### To Disable Automation

If you prefer **manual mode** (run all commands explicitly):

```json
{
  "hooks": {
    "afterTasks": false
  }
}
```

Then use commands manually as described in the [Usage Guide](usage.md#manual-commands).

## Configuration (Optional)

The bridge creates a default `bridge.config.json`. You can customize it:

```json
{
  "contextMaxBytes": 8192,
  "sources": {
    "skills": true,
    "decisions": true,
    "histories": true
  },
  "summarization": {
    "recencyBiasWeight": 0.7,
    "maxDecisionAgeDays": 90
  },
  "hooks": {
    "afterTasks": true
  },
  "paths": {
    "squadDir": ".squad",
    "specifyDir": ".specify"
  }
}
```

### Common Configuration Tweaks

**Reduce context to 4KB (minimal memory footprint):**
```json
{
  "contextMaxBytes": 4096
}
```

**Include only skills (no decisions or histories):**
```json
{
  "sources": {
    "skills": true,
    "decisions": false,
    "histories": false
  }
}
```

**Use custom Squad directory:**
```json
{
  "paths": {
    "squadDir": "path/to/.squad"
  }
}
```

## Partial Installation (One Framework Only)

If you have Squad **without** Spec Kit:

```bash
$ npx squad-speckit-bridge install
```

Output:
```
Squad-SpecKit Bridge v0.1.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ⚠ Spec Kit not detected (.specify/ missing)

Installing Squad-only components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Manifest: .bridge-manifest.json
  ✓ Configuration: bridge.config.json

Partial installation complete. 3 files created.
To complete: Initialize Spec Kit, then run `npx squad-speckit-bridge install` again.
```

Same applies if you have Spec Kit without Squad — both-sided functionality becomes available once both frameworks are present.

## Troubleshooting

### Installation Fails: "Squad not found"

**Symptom:**
```
Error: Squad directory not found at .squad/
```

**Solution:**
```bash
# Initialize Squad first
npx squad init

# Then run bridge install
npx squad-speckit-bridge install
```

### Installation Fails: "Spec Kit not found"

**Symptom:**
```
Error: Spec Kit directory not found at .specify/
```

**Solution:**
```bash
# Initialize Spec Kit first
npx speckit init

# Then run bridge install
npx squad-speckit-bridge install
```

### Bridge Status Shows Warnings

**Symptom:**
```
⚠ Squad skill installed but path mismatch (.squad/skills/bridge/ vs expected)
```

**Solution:**
```bash
# Reinstall with force flag
npx squad-speckit-bridge install --force

# Or verify directory structure manually
ls -la .squad/skills/speckit-bridge/
ls -la .specify/extensions/squad-bridge/
```

### "Permission denied" during installation

**Symptom:**
```
Error: EACCES: permission denied, mkdir '.squad/skills'
```

**Solution:**
```bash
# Ensure you have write access to .squad/ and .specify/
chmod -R u+w .squad/ .specify/

# Then retry installation
npx squad-speckit-bridge install
```

### Configuration validation errors

**Symptom:**
```
Error: bridge.config.json is invalid
```

**Solution:**
1. Validate JSON syntax (use `jq . bridge.config.json`)
2. Delete `bridge.config.json` and reinstall to get defaults:
   ```bash
   rm bridge.config.json
   npx squad-speckit-bridge install
   ```

### Bridge commands not found after installation

**Symptom:**
```
command not found: squad-speckit-bridge
```

**Solution:**
```bash
# Install globally
npm install -g squad-speckit-bridge

# Or use npx (preferred)
npx squad-speckit-bridge --help
```

## Uninstalling

To remove the bridge from your project:

```bash
# Remove bridge files
rm -rf .squad/skills/speckit-bridge/
rm -rf .squad/ceremonies/design-review.md
rm -rf .specify/extensions/squad-bridge/
rm bridge.config.json
rm .bridge-manifest.json
```

Both Squad and Spec Kit remain unaffected — the bridge is purely additive.

## Next Steps

After successful installation:

1. **[Usage Guide](usage.md)** — Learn the memory bridge and design review workflows
2. **[Architecture Overview](architecture.md)** — Understand design principles and extension points
3. **First Command:**
   ```bash
   npx squad-speckit-bridge context specs/001-my-feature/
   ```
   This injects Squad memory into your next Spec Kit planning cycle.

---

**Stuck?** Review the [Architecture](architecture.md) document for design details, or check the contracts in [specs/001-squad-speckit-bridge/contracts/](../specs/001-squad-speckit-bridge/contracts/).
