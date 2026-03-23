# Configuration Schema: Squad-SpecKit Bridge

**Phase**: 1 — Design & Contracts
**Date**: 2025-07-24

## Configuration File

**Location**: `bridge.config.json` at repository root (optional — all values have defaults)

**Alternative**: `"squad-speckit-bridge"` key in `package.json`

## Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Squad-SpecKit Bridge Configuration",
  "type": "object",
  "properties": {
    "contextMaxBytes": {
      "type": "integer",
      "minimum": 1024,
      "maximum": 32768,
      "default": 8192,
      "description": "Maximum size of generated context summary in bytes"
    },
    "sources": {
      "type": "object",
      "properties": {
        "skills": {
          "type": "boolean",
          "default": true,
          "description": "Include Squad skills in context summary"
        },
        "decisions": {
          "type": "boolean",
          "default": true,
          "description": "Include Squad decisions in context summary"
        },
        "histories": {
          "type": "boolean",
          "default": true,
          "description": "Include agent histories in context summary"
        }
      },
      "additionalProperties": false
    },
    "summarization": {
      "type": "object",
      "properties": {
        "recencyBiasWeight": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "default": 0.7,
          "description": "Weight toward recent entries (0=oldest first, 1=newest first)"
        },
        "maxDecisionAgeDays": {
          "type": "integer",
          "minimum": 1,
          "default": 90,
          "description": "Decisions older than this are deprioritized (not removed)"
        }
      },
      "additionalProperties": false
    },
    "hooks": {
      "type": "object",
      "properties": {
        "afterTasks": {
          "type": "boolean",
          "default": true,
          "description": "Enable after_tasks hook notification"
        }
      },
      "additionalProperties": false
    },
    "paths": {
      "type": "object",
      "properties": {
        "squadDir": {
          "type": "string",
          "default": ".squad",
          "description": "Path to Squad directory (relative to repo root)"
        },
        "specifyDir": {
          "type": "string",
          "default": ".specify",
          "description": "Path to Spec Kit directory (relative to repo root)"
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## Default Configuration

When no `bridge.config.json` exists, these defaults are used:

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

## Minimal Configuration Example

Only override what you need:

```json
{
  "contextMaxBytes": 16384,
  "summarization": {
    "maxDecisionAgeDays": 30
  }
}
```

## Spec Kit Extension Manifest

Installed at `.specify/extensions/squad-bridge/extension.yml`:

```yaml
id: squad-bridge
name: Squad-SpecKit Bridge
version: 0.1.0
description: Connects Squad team memory with Spec Kit planning

hooks:
  after_tasks:
    command: npx squad-speckit-bridge review --notify
    description: Notify that a Design Review ceremony is available
    enabled: true
```

## Squad Skill Metadata

Installed at `.squad/skills/speckit-bridge/SKILL.md` with frontmatter:

```yaml
---
name: speckit-bridge
description: Understanding Spec Kit artifacts and bridge workflow
version: 0.1.0
tags: [planning, spec-kit, integration]
---
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BRIDGE_CONFIG` | Override config file path | `./bridge.config.json` |
| `BRIDGE_MAX_CONTEXT` | Override context max bytes | (from config) |
| `NO_COLOR` | Disable colored output | — |

## Config Resolution Order

1. CLI flags (highest priority)
2. Environment variables
3. `bridge.config.json` at repo root
4. `"squad-speckit-bridge"` key in `package.json`
5. Built-in defaults (lowest priority)
