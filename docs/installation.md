---
layout: default
---

# Installation Guide

Get the Squad-SpecKit Bridge up and running in your project. Installation is a one-time setup; after that, the bridge works automatically.

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
$ npx @jmservera/squad-speckit-bridge install
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
Next: Run `npx @jmservera/squad-speckit-bridge status` to verify.
```

### Step 3: Verify Installation

```bash
$ npx @jmservera/squad-speckit-bridge status
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

---

## What Gets Automated

After installation, the bridge operates **in the background during Spec Kit planning**. Here's what happens without any additional commands:

### Files Created by Install (Commit These)

| File | Location | Purpose |
|------|----------|---------|
| `.bridge-manifest.json` | repo root | Tracks installed components and versions |
| `.squad/skills/speckit-bridge/SKILL.md` | .squad/ | Teaches Squad agents about Spec Kit artifacts |
| `.squad/ceremonies/design-review.md` | .squad/ | Design Review ceremony definition |
| `.specify/extensions/squad-bridge/extension.yml` | .specify/ | Hook definitions for automation |
| `bridge.config.json` | repo root | Configuration (customizable) |

### Files Created During Workflow (Also Commit These)

| File | Location | Created By | Purpose |
|------|----------|------------|---------|
| `squad-context.md` | specs/{feature}/ | Automatic (before planning) | Squad memory summary injected into planning |
| `review.md` | specs/{feature}/ | Automatic (after `/speckit.tasks`) | Design Review template with findings |

**Why commit generated files?** They're part of your feature's planning history. Future cycles and team members benefit from seeing what knowledge informed decisions.

### During Spec Kit Planning

| What | How | You See |
|------|-----|---------|
| **Memory Injection** | Bridge reads `.squad/` (skills, decisions, histories) and creates `squad-context.md` | Planning context includes your team's prior learnings |
| **Context Budgeting** | Recent and relevant decisions prioritized; older items pruned to fit budget | Focused, efficient context (default: 8KB) |
| **File Creation** | Context automatically created in your spec directory | `squad-context.md` available for reference |

### After `/speckit.tasks` Completes

| What | How | You See |
|------|-----|---------|
| **Review Generation** | Bridge analyzes `tasks.md` for conflicts and risks | `specs/YOUR-SPEC/review.md` auto-generated |
| **Decision Conflicts** | Checks against `.squad/decisions.md` for alignment | Flags highlighted: "⚠ Task T3 conflicts with decision D-042" |
| **Team Notification** | Logs message indicating review is ready | "[squad-bridge] Design Review ready at specs/001-feature/review.md" |
| **Configurability** | Respects `bridge.config.json` settings | Can be disabled via `hooks.afterTasks: false` |

### Hooks Active After Install

The `after-tasks.sh` hook in `.specify/extensions/squad-bridge/` automatically runs after `/speckit.tasks`:

```bash
# Trigger: After /speckit.tasks completes
# Defined in: extension.yml with enabled: true
# Configurable: bridge.config.json → hooks.afterTasks
```

To disable automation and use manual commands instead:

```json
{
  "hooks": {
    "afterTasks": false
  }
}
```

Then refer to the [Usage Guide](usage.md#manual-commands) for manual command details.

---

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
$ npx @jmservera/squad-speckit-bridge install
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
To complete: Initialize Spec Kit, then run `npx @jmservera/squad-speckit-bridge install` again.
```

Same applies if you have Spec Kit without Squad — both-sided functionality becomes available once both frameworks are present.

---

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
npx @jmservera/squad-speckit-bridge install
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
npx @jmservera/squad-speckit-bridge install
```

### Bridge Status Shows Warnings

**Symptom:**
```
⚠ Squad skill installed but path mismatch (.squad/skills/bridge/ vs expected)
```

**Solution:**
```bash
# Reinstall with force flag
npx @jmservera/squad-speckit-bridge install --force

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
npx @jmservera/squad-speckit-bridge install
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
   npx @jmservera/squad-speckit-bridge install
   ```

### Bridge commands not found after installation

**Symptom:**
```
command not found: squad-speckit-bridge
```

**Solution:**
```bash
# Install globally
npm install -g @jmservera/squad-speckit-bridge

# Or use npx (preferred)
npx @jmservera/squad-speckit-bridge --help
```

---

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

---

## Next Steps

After successful installation:

1. **Commit the generated files:**
   ```bash
   git add .bridge-manifest.json .squad/skills/speckit-bridge/ .squad/ceremonies/design-review.md .specify/extensions/squad-bridge/ bridge.config.json
   git commit -m "chore: install squad-speckit-bridge v0.1.0"
   ```

2. **Read the Usage Guide:**
   Now that the bridge is installed, see [Usage Guide](usage.md) to understand how automation works and when to use manual commands.

3. **Run your first planning cycle:**
   ```bash
   $ cd specs/001-my-feature/
   $ /speckit.specify && /speckit.plan && /speckit.tasks
   # Watch for squad-context.md and review.md to appear automatically
   ```

---

**Stuck?** Review the [Architecture](architecture.md) document for design details.
