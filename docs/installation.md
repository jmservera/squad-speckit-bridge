---
layout: default
---

# Installation Guide

## Prerequisites

Before installing the Squad-SpecKit Bridge, ensure your environment has:

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Squad** initialized in your project (`.squad/` directory present)
- **Spec Kit** initialized in your project (`.specify/` directory present)

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check npm version
npm --version   # Should be 8.0.0 or higher

# Verify Squad and Spec Kit are initialized
ls -la .squad/   # Should exist
ls -la .specify/ # Should exist
```

## Installation Steps

### 1. Initialize the Bridge

Run the initialization command in your project root:

```bash
npx squad-speckit-bridge init
```

### 2. What the Init Command Does

The `init` command performs the following setup:

- **Creates Squad plugin** — Adds a skill definition (`.squad/skills/speckit-bridge/`) that teaches Squad agents about the bridge workflow
- **Installs Spec Kit extension** — Adds hook scripts (`.specify/extensions/squad-bridge/`) for automated task review and learning sync
- **Generates bridge configuration** — Creates `bridge.config.json` with default settings (memory budget, relevance scoring, issue creation templates)
- **Sets up GitHub Actions workflows** (optional) — Configures CI/CD workflows for automated design review ceremonies
- **Updates documentation** — Adds bridge-specific README sections

### 3. Verify Installation

After initialization, verify everything is in place:

```bash
# Check Squad plugin installed
ls -la .squad/skills/speckit-bridge/

# Check Spec Kit extension installed
ls -la .specify/extensions/squad-bridge/

# Check configuration created
ls -la bridge.config.json

# Test the bridge
npx squad-speckit-bridge status
```

Expected output:
```
✓ Squad initialized
✓ Spec Kit initialized
✓ Bridge plugin loaded
✓ Bridge extension loaded
✓ Configuration valid
```

## Configuration

After initialization, customize `bridge.config.json`:

```json
{
  "version": "0.1.0",
  "memory": {
    "contextBudget": 8000,
    "prioritizeRecent": true,
    "maxAgentHistories": 3
  },
  "review": {
    "autoCreateIssues": false,
    "defaultLabel": "squad",
    "assignmentStrategy": "round-robin"
  },
  "extensions": {
    "squad": {
      "enabled": true,
      "skillPath": ".squad/skills/speckit-bridge/"
    },
    "speckit": {
      "enabled": true,
      "extensionPath": ".specify/extensions/squad-bridge/"
    }
  }
}
```

### Configuration Options

- **memory.contextBudget** — Maximum tokens to include in memory context (default: 8000)
- **memory.prioritizeRecent** — Prioritize recent learnings over older ones (default: true)
- **memory.maxAgentHistories** — Maximum number of agent histories to include (default: 3)
- **review.autoCreateIssues** — Automatically create issues from tasks without review (default: false)
- **review.defaultLabel** — GitHub label to apply to auto-created issues (default: "squad")
- **review.assignmentStrategy** — How to assign issues: `none`, `round-robin`, or `random` (default: "round-robin")

## Troubleshooting

### "Squad not initialized" error

```bash
# Initialize Squad first
npx squad init
```

### "Spec Kit not initialized" error

```bash
# Initialize Spec Kit first
npx speckit init
```

### Bridge status shows warnings

Run the verification steps above and check that all directories exist and contain expected files.

### Configuration validation fails

Ensure `bridge.config.json` is valid JSON and all required fields are present. Use the default configuration as a template.

## Next Steps

Once installed and verified, proceed to:

1. **[Usage Guide](usage.md)** — Learn how to use the bridge in your workflow
2. **[Architecture Overview](architecture.md)** — Understand the design and extension points
3. Run `npx squad-speckit-bridge context` to inject Squad memory before your first Spec Kit planning cycle

---

**Note:** 🚧 The installation experience described here documents the planned integration. The `squad-speckit-bridge` CLI and plugin/extension system are not yet implemented. This guide will be updated as development progresses.
