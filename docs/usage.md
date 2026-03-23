---
layout: default
---

# Usage Guide: Squad-SpecKit Bridge Commands

Complete reference for all bridge commands with copy-pasteable examples and expected output. Each example is executable as-is.

## The Bridge Workflow Loop

```
Spec Kit Planning → Memory Bridge → Design Review → Issue Creation → Squad Execution → Learning Sync
```

## Command Reference

### Installation & Status

#### `install` — Deploy bridge to your project

Deploy bridge components to Squad and Spec Kit directories.

```bash
$ npx squad-speckit-bridge install
```

**Expected output:**
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

**With `--force` flag** (overwrite existing files):
```bash
$ npx squad-speckit-bridge install --force
```

---

#### `status` — Check bridge installation and configuration

Verify all components are installed and operational.

```bash
$ npx squad-speckit-bridge status
```

**Expected output:**
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

Last context run:   2025-07-24T10:30:00Z (specs/001-squad-speckit-bridge/)
```

**With `--json` flag** (machine-readable output):
```bash
$ npx squad-speckit-bridge status --json
```

**Expected output:**
```json
{
  "version": "0.1.0",
  "frameworks": {
    "squad": {
      "detected": true,
      "path": ".squad"
    },
    "specKit": {
      "detected": true,
      "path": ".specify"
    }
  },
  "components": {
    "squadSkill": {
      "installed": true,
      "path": ".squad/skills/speckit-bridge/SKILL.md"
    },
    "ceremonyDef": {
      "installed": true,
      "path": ".squad/ceremonies/design-review.md"
    },
    "specKitExtension": {
      "installed": true,
      "path": ".specify/extensions/squad-bridge/extension.yml"
    },
    "manifest": {
      "present": true,
      "path": ".bridge-manifest.json"
    }
  },
  "configuration": {
    "contextMaxBytes": 8192,
    "afterTasksHookEnabled": true,
    "sources": ["skills", "decisions", "histories"]
  },
  "lastContextRun": "2025-07-24T10:30:00Z"
}
```

---

### Memory Bridge & Planning

#### `context` — Inject Squad memory for Spec Kit planning

Generate a context summary from Squad memory and inject it into a spec directory for Spec Kit planning to consume.

```bash
$ npx squad-speckit-bridge context specs/001-squad-speckit-bridge/
```

**Expected output:**
```
Generating Squad context for specs/001-squad-speckit-bridge/...

Sources processed:
  Skills:    3 files (2.1KB)
  Decisions: 47 entries, 12 included (3.2KB)
  Histories: 5 files, 8 entries included (2.4KB)
  Skipped:   1 file (malformed: .squad/agents/erlich/history.md)

Output: specs/001-squad-speckit-bridge/squad-context.md (7.7KB / 8.0KB limit)

Tip: Reference squad-context.md in your spec.md to leverage team knowledge during planning.
```

**With `--max-size` flag** (custom context budget):
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --max-size 4096
```

**With `--sources` flag** (include only specific sources):
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --sources skills,decisions
```

**With `--json` flag** (machine-readable output):
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --json
```

**Expected output:**
```json
{
  "output": "specs/001-feature/squad-context.md",
  "sizeBytes": 7700,
  "maxBytes": 8192,
  "sources": {
    "skills": {
      "found": 3,
      "included": 3,
      "bytes": 2100
    },
    "decisions": {
      "found": 47,
      "included": 12,
      "bytes": 3200
    },
    "histories": {
      "found": 5,
      "entriesIncluded": 8,
      "bytes": 2400
    }
  },
  "skipped": [
    {
      "file": ".squad/agents/erlich/history.md",
      "reason": "malformed markdown"
    }
  ],
  "warnings": []
}
```

---

### Design Review

#### `review` — Generate Design Review ceremony template

Prepare a Design Review template for your team to vet Spec Kit-generated tasks against accumulated knowledge.

```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md
```

**Expected output:**
```
Design Review prepared for specs/001-feature/tasks.md

Pre-populated findings:
  ⚠ 2 potential decision conflicts detected
  ℹ 3 tasks may benefit from agent expertise

Review template written to: specs/001-feature/review.md
Next: Run the Design Review ceremony with your Squad team.
```

**With `--output` flag** (custom output location):
```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md --output my-review.md
```

**With `--json` flag** (structured findings):
```bash
$ npx squad-speckit-bridge review specs/001-feature/tasks.md --json
```

**Expected output:**
```json
{
  "tasksFile": "specs/001-feature/tasks.md",
  "findings": [
    {
      "type": "decision_conflict",
      "severity": "warning",
      "taskId": "t3",
      "message": "Task conflicts with decision: API auth should use OAuth2",
      "relatedDecision": "Architecture: Use OAuth2 for API authentication (2025-07-20)"
    },
    {
      "type": "expertise_needed",
      "severity": "info",
      "taskId": "t5",
      "message": "Database migration may require domain expertise",
      "suggestedExperts": ["dex", "helena"]
    }
  ],
  "reviewTemplateWritten": "specs/001-feature/review.md"
}
```

---

### Issue Creation & Tracking

#### `issues` — Create GitHub issues from reviewed tasks

Convert approved tasks into GitHub issues (requires GitHub API token).

```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md
```

**Expected output:**
```
Creating issues from specs/001-feature/tasks.md...

Created 8 issues:
  #157: Task T1 — Set up database schema
  #158: Task T2 — Implement user authentication
  #159: Task T3 — API endpoint: POST /users
  #160: Task T4 — Integration tests for auth
  #161: Task T5 — Performance benchmarking
  #162: Task T6 — Documentation updates
  #163: Task T7 — Security audit
  #164: Task T8 — Deployment & rollout

All issues labeled with: feature/001, squad-generated
Assignees: (round-robin based on config)

Next: Issues are ready for Squad to pick up. Reference them in Design Review findings.
```

**With `--dry-run` flag** (preview without creating):
```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md --dry-run
```

**Expected output:**
```
Would create 8 issues from specs/001-feature/tasks.md

Preview:
  #1 (would be): Task T1 — Set up database schema
  #2 (would be): Task T2 — Implement user authentication
  ... (7 more)

No issues created (--dry-run mode).
Run without --dry-run to create actual issues.
```

**With `--labels` flag** (add custom labels):
```bash
$ npx squad-speckit-bridge issues specs/001-feature/tasks.md --labels priority/high,team/backend
```

---

## Common Workflows

### Workflow 1: Full Planning-to-Execution Cycle

**Step 1: Inject memory before planning**
```bash
$ npx squad-speckit-bridge context specs/001-my-feature/
```

**Step 2: Run Spec Kit planning**
```bash
$ cd specs/001-my-feature/
$ /speckit.specify
$ /speckit.plan
$ /speckit.tasks
```

**Step 3: Design Review with team**
```bash
$ npx squad-speckit-bridge review specs/001-my-feature/tasks.md
```

**Step 4: Create GitHub issues**
```bash
$ npx squad-speckit-bridge issues specs/001-my-feature/tasks.md
```

**Step 5: Squad executes (picks up issues, works, documents learnings)**

**Step 6: Sync learnings back**
```bash
$ npx squad-speckit-bridge sync
```

---

### Workflow 2: Context-Only (Memory Injection Without Full Bridge)

Inject Squad memory for planning reference without creating issues:

```bash
$ npx squad-speckit-bridge context specs/001-feature/ \
  --max-size 8192 \
  --sources skills,decisions

# Then run Spec Kit planning manually
cd specs/001-feature/
/speckit.specify
/speckit.plan
/speckit.tasks
```

---

### Workflow 3: Verbose Debugging

See detailed logs for troubleshooting:

```bash
$ npx squad-speckit-bridge context specs/001-feature/ --verbose
$ npx squad-speckit-bridge review specs/001-feature/tasks.md --verbose
$ npx squad-speckit-bridge status --verbose
```

**With `--json` output:**
```bash
$ npx squad-speckit-bridge context specs/001-feature/ --verbose --json
```

---

### Workflow 4: Quiet Mode (CI/CD Integration)

Suppress informational output, only show errors:

```bash
$ npx squad-speckit-bridge install --quiet
$ npx squad-speckit-bridge context specs/001-feature/ --quiet
```

Exit codes indicate success/failure:
- `0` — Success
- `1` — Fatal error (check stderr for details)

---

## Configuration & Customization

### View Current Configuration

```bash
$ cat bridge.config.json
```

### Customize Context Budget

Edit `bridge.config.json`:
```json
{
  "contextMaxBytes": 4096
}
```

Then verify:
```bash
$ npx squad-speckit-bridge context specs/001-feature/
# Output will respect 4096-byte limit
```

### Override Paths

For non-standard Squad/Spec Kit directories:

```bash
$ npx squad-speckit-bridge context specs/001-feature/ \
  --squad-dir path/to/.squad \
  --specify-dir path/to/.specify
```

---

## Flags Reference

### Global Flags (work with all commands)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--config <path>` | string | `./bridge.config.json` | Path to bridge configuration |
| `--json` | boolean | false | Machine-readable JSON output |
| `--quiet` | boolean | false | Suppress info/warnings, show errors only |
| `--verbose` | boolean | false | Detailed debug output |
| `--version` | boolean | — | Print version and exit |
| `--help` | boolean | — | Print command help |

### Command-Specific Flags

**`install`:**
- `--squad-dir <path>` — Custom Squad path (default: `.squad`)
- `--specify-dir <path>` — Custom Spec Kit path (default: `.specify`)
- `--force` — Overwrite existing files without prompt

**`context`:**
- `--max-size <bytes>` — Context budget (default: 8192)
- `--sources <list>` — Comma-separated sources: `skills`, `decisions`, `histories` (default: all)
- `--squad-dir <path>` — Custom Squad path

**`review`:**
- `--output <path>` — Custom review template output location
- `--focus <pattern>` — Review only tasks matching regex

**`issues`:**
- `--dry-run` — Preview without creating
- `--auto-assign` — Assign issues per config strategy
- `--labels <list>` — Comma-separated labels to apply

---

## Error Handling

### Common Error Codes

| Error | Cause | Fix |
|-------|-------|-----|
| `SQUAD_NOT_FOUND` | `.squad/` doesn't exist | Run `npx squad init` |
| `SPECKIT_NOT_FOUND` | `.specify/` doesn't exist | Run `npx speckit init` |
| `SPEC_DIR_NOT_FOUND` | Target spec dir missing | Check path argument |
| `PERMISSION_DENIED` | Can't read/write files | Check file permissions |
| `CONFIG_INVALID` | `bridge.config.json` is invalid | Validate JSON format |
| `PARSE_ERROR` | Can't parse markdown/YAML | Check file syntax |

### Example Error Output

```bash
$ npx squad-speckit-bridge context nonexistent/
```

**stderr:**
```json
{
  "error": true,
  "code": "SPEC_DIR_NOT_FOUND",
  "message": "Spec directory not found: nonexistent/",
  "suggestion": "Create the directory or check the path. Example: `mkdir -p specs/001-feature`"
}
```

**Exit code:** `1`

---

## Tips & Best Practices

1. **Always inject memory before planning** — Run `context` before `specify` to leverage team knowledge
2. **Review before creating issues** — Let the team vet tasks; it catches blind spots
3. **Use `--dry-run` first** — Preview issues before creating them
4. **Keep config.json in version control** — Standardize bridge settings across the team
5. **Check status regularly** — `npx squad-speckit-bridge status` ensures bridge is healthy

---

**For More Info:**
- Installation: [Installation Guide](installation.md)
- Architecture: [Architecture Overview](architecture.md)
- Contracts: [specs/001-squad-speckit-bridge/contracts/](../specs/001-squad-speckit-bridge/contracts/)
