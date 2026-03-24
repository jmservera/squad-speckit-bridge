---
layout: default
---

# Quickstart: Squad-SpecKit Bridge

Get the Squad-SpecKit Bridge running in 5 minutes. This guide covers basic installation and your first workflow.

---

## Prerequisites Checklist ✓

Before starting, verify your environment:

- [ ] **Node.js 18.0+** installed
  ```bash
  $ node --version
  v20.11.0  # Must be 18.0 or higher
  ```

- [ ] **npm 8.0+** installed
  ```bash
  $ npm --version
  10.2.4  # Must be 8.0 or higher
  ```

- [ ] **Git** available (for repository commands)
  ```bash
  $ git --version
  git version 2.43.0
  ```

- [ ] **Squad framework** initialized in your repo
  ```bash
  $ ls -la .squad/
  # Should contain: agents/, skills/, decisions.md
  # If missing: npx squad init
  ```

- [ ] **Spec Kit framework** initialized in your repo
  ```bash
  $ ls -la .specify/
  # Should contain: extensions/, memory/, templates/
  # If missing: npx speckit init
  ```

**Not ready?** Initialize missing frameworks:
```bash
# Initialize Squad
npx squad init

# Initialize Spec Kit
npx speckit init
```

---

## Installation: Three Options

### Option 1: npx (Recommended for Quick Start) ⚡

No installation needed. Run directly:

```bash
$ npx @jmservera/squad-speckit-bridge install
```

**Pros:** Fastest, always latest version, no setup overhead  
**Cons:** Slightly slower first run (downloads package)  
**Best for:** Testing, one-off setups, CI/CD

### Option 2: Global Installation

Install once, use in all your projects:

```bash
$ npm install -g @jmservera/squad-speckit-bridge
$ squad-speckit-bridge install
```

**Pros:** Faster subsequent runs, shorter commands  
**Cons:** Manual updates, version conflicts  
**Best for:** Power users, dedicated development machines

### Option 3: Project Dependencies (Team Projects) 🏆

Add to your project's dev dependencies:

```bash
$ npm install --save-dev @jmservera/squad-speckit-bridge
$ npx squad-speckit-bridge install
```

**Pros:** Team consistency, version control, reproducible builds  
**Cons:** Adds to package.json  
**Best for:** Teams, CI/CD, long-term projects

---

## Step 1: Run Install (1 minute)

Pick your method above and run the install command. Example with npx:

```bash
$ npx @jmservera/squad-speckit-bridge install
```

**Expected output:**
```
Squad-SpecKit Bridge v0.2.0

Detecting frameworks...
  ✓ Squad detected at .squad/
  ✓ Spec Kit detected at .specify/

Installing components...
  ✓ Squad skill: .squad/skills/speckit-bridge/SKILL.md
  ✓ Ceremony definition: .squad/ceremonies/design-review.md
  ✓ Spec Kit extension: .specify/extensions/squad-speckit-bridge/extension.yml
  ✓ Manifest: .bridge-manifest.json
  ✓ Configuration: bridge.config.json

Installation complete. 5 files created.
Next: Run `npx @jmservera/squad-speckit-bridge status` to verify.
```

---

## Step 2: Verify Installation (30 seconds)

Run the status command:

```bash
$ npx @jmservera/squad-speckit-bridge status
```

**Expected output:** All items should show ✓ (checkmark)

```
Squad-SpecKit Bridge v0.2.0

Frameworks:
  Squad:    ✓ detected at .squad/
  Spec Kit: ✓ detected at .specify/

Bridge Components:
  Squad skill:      ✓ installed
  Ceremony def:     ✓ installed
  Spec Kit ext:     ✓ installed
  Manifest:         ✓ present

Hooks Deployed:
  after_tasks:      ✓ enabled
  before_specify:   ✓ enabled
  after_implement:  ✓ enabled

Configuration:
  Context max size: 8192 bytes
  Sources:          skills, decisions, histories
```

**Troubleshooting:** If any items show ✗, see the [Installation Guide](./installation.md#troubleshooting).

---

## Step 3: Your First Workflow (2-3 minutes)

### Create a feature specification

```bash
$ mkdir -p specs/001-test-feature/
$ cd specs/001-test-feature/
```

### Run Spec Kit planning (bridge handles context injection automatically)

```bash
$ /speckit.specify
$ /speckit.plan
$ /speckit.tasks
```

**What the bridge does automatically:**
- Before planning: Reads your Squad skills, decisions, and learnings
- Creates `squad-context.md` with relevant knowledge
- After tasks complete: Generates `review.md` for team review

### Verify generated files

```bash
$ ls -la specs/001-test-feature/
# Should include:
# - squad-context.md (auto-generated)
# - review.md (auto-generated)
# - tasks.md (from Spec Kit)
```

---

## Step 4: Common Workflows

### Workflow: Create Issues from Tasks

After your team approves the review:

```bash
$ npx @jmservera/squad-speckit-bridge issues specs/001-test-feature/tasks.md
```

**Options:**
- `--dry-run` — Preview issues without creating
- `--labels <list>` — Add custom labels (e.g., `--labels priority/high,team/backend`)

### Workflow: Sync Learnings Back to Squad

After Squad completes the feature (optional but recommended):

```bash
$ npx @jmservera/squad-speckit-bridge sync specs/001-test-feature/
```

This captures learnings from execution for the next planning cycle.

### Workflow: Manual Context Injection

To regenerate context (e.g., if Squad memory changed):

```bash
$ npx @jmservera/squad-speckit-bridge context specs/001-test-feature/
```

---

## Command Reference

| Command | Purpose | Typical Usage |
|---------|---------|---------------|
| `install` | Deploy bridge components (one-time) | `npx @jmservera/squad-speckit-bridge install` |
| `status` | Verify installation health | `npx @jmservera/squad-speckit-bridge status` |
| `context` | Generate Squad context for planning | `npx @jmservera/squad-speckit-bridge context specs/001-feature/` |
| `review` | Generate Design Review template | `npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md` |
| `issues` | Create GitHub issues from tasks | `npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md` |
| `sync` | Sync execution learnings back | `npx @jmservera/squad-speckit-bridge sync specs/001-feature/` |
| `demo` | Run E2E demo of pipeline | `npx @jmservera/squad-speckit-bridge demo` |

---

## Command Aliases

Both command names work identically:

```bash
# Primary name (recommended)
npx @jmservera/squad-speckit-bridge status

# Backward-compatible alias
npx sqsk status
```

If installed globally:
```bash
squad-speckit-bridge status    # Primary
sqsk status                     # Alias
```

---

## Global Flags

All commands support these options:

| Flag | Purpose | Example |
|------|---------|---------|
| `--json` | Machine-readable JSON output | `--json` |
| `--verbose` | Detailed debug output | `--verbose` |
| `--quiet` | Suppress informational output | `--quiet` |
| `--config <path>` | Custom config file path | `--config ./my-config.json` |

**Example:**
```bash
npx @jmservera/squad-speckit-bridge context specs/001-feature/ --json --verbose
```

---

## Configuration

After installation, customize behavior in `bridge.config.json`:

```json
{
  "contextMaxBytes": 8192,
  "sources": {
    "skills": true,
    "decisions": true,
    "histories": true
  },
  "hooks": {
    "afterTasks": true,
    "beforeSpecify": true,
    "afterImplement": true
  }
}
```

**Common tweaks:**
- Disable automation: Set `hooks.*` to `false`
- Reduce context size: `"contextMaxBytes": 4096`
- Skip histories: `"histories": false`

See [Installation Guide](./installation.md#configuration-optional) for full options.

---

## Generated Files (Commit These!)

| File | Purpose | When |
|------|---------|------|
| `.bridge-manifest.json` | Version tracking | Created by `install` |
| `bridge.config.json` | Bridge configuration | Created by `install` |
| `.squad/skills/speckit-bridge/SKILL.md` | Teaches agents about Spec Kit | Created by `install` |
| `.squad/ceremonies/design-review.md` | Design Review ceremony | Created by `install` |
| `.specify/extensions/squad-speckit-bridge/extension.yml` | Automation hooks | Created by `install` |
| `specs/{feature}/squad-context.md` | Squad memory summary | Auto-generated during planning |
| `specs/{feature}/review.md` | Design Review findings | Auto-generated after tasks |
| `.squad/.bridge-sync-state.json` | Sync tracking (v0.2+) | Auto-generated by `sync` |

**Why commit them?** They document your planning decisions and team review.

---

## Verification Checklist ✓

Use this checklist to verify your setup after installation:

### Pre-Installation
- [ ] Node.js 18.0+ installed (`node --version`)
- [ ] npm 8.0+ installed (`npm --version`)
- [ ] Squad framework initialized (`.squad/` exists with `agents/`, `skills/`, `decisions.md`)
- [ ] Spec Kit framework initialized (`.specify/` exists with `extensions/`, `templates/`)

### Installation
- [ ] Install command ran successfully without errors
- [ ] Bridge files created: `.bridge-manifest.json`, `bridge.config.json`
- [ ] Squad components installed: `.squad/skills/speckit-bridge/SKILL.md`, `.squad/ceremonies/design-review.md`
- [ ] Spec Kit components installed: `.specify/extensions/squad-speckit-bridge/extension.yml`

### Verification
- [ ] `npx @jmservera/squad-speckit-bridge status` shows all ✓
- [ ] Squad and Spec Kit frameworks both detected
- [ ] All bridge components installed
- [ ] Hooks deployed and enabled

### First Workflow
- [ ] Created test feature spec directory: `mkdir -p specs/001-test-feature/`
- [ ] Ran `/speckit.specify && /speckit.plan && /speckit.tasks`
- [ ] `squad-context.md` auto-generated in spec directory
- [ ] `review.md` auto-generated after tasks completed
- [ ] Both files exist and contain expected content

### Build & Test (Optional but Recommended)
- [ ] Project builds: `npm run build` succeeds without errors
- [ ] Tests pass: `npm test` completes with all tests passing
- [ ] Linter clean: `npm run lint` (if available) shows no errors

### Advanced (Optional)
- [ ] Created test GitHub issues: `npx @jmservera/squad-speckit-bridge issues specs/001-test-feature/tasks.md --dry-run`
- [ ] Previewed sync: `npx @jmservera/squad-speckit-bridge sync specs/001-test-feature/ --dry-run`
- [ ] Tested custom config: Updated `bridge.config.json` and verified changes take effect

---

## Next Steps

### For Individual Developers
1. **Read the Usage Guide** — [docs/usage.md](./usage.md)
   - Learn about automatic memory injection
   - Understand when to use manual commands
   - Discover advanced workflows

2. **Commit Generated Files**
   ```bash
   git add .bridge-manifest.json bridge.config.json .squad/skills/speckit-bridge/ .squad/ceremonies/design-review.md .specify/extensions/squad-speckit-bridge/
   git commit -m "chore: install squad-speckit-bridge v0.2.0"
   ```

3. **Run Your First Feature**
   - Create a real feature spec in `specs/001-my-feature/`
   - Follow the planning workflow
   - Generate and review design review
   - Create GitHub issues

### For Teams
1. **Add bridge as dev dependency** (recommended)
   ```bash
   npm install --save-dev @jmservera/squad-speckit-bridge
   ```

2. **Customize configuration** in `bridge.config.json` if needed

3. **Share with team** — Everyone runs `npm install` to get the bridge

4. **Establish workflow** — Team decides on naming conventions for specs, issue labels, etc.

### For CI/CD
1. **Use global flags** for machine-readable output
   ```bash
   npx @jmservera/squad-speckit-bridge context specs/001-feature/ --json
   npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md --json
   ```

2. **Use exit codes** for pipeline status
   - `0` = success
   - `1` = error

3. **See Workflow 4 in Usage Guide** for full CI/CD integration examples

---

## Troubleshooting

### "Squad not found" Error
```bash
# Verify Squad is initialized
ls -la .squad/

# If missing, initialize it
npx squad init

# Then reinstall bridge
npx @jmservera/squad-speckit-bridge install
```

### "Spec Kit not found" Error
```bash
# Verify Spec Kit is initialized
ls -la .specify/

# If missing, initialize it
npx speckit init

# Then reinstall bridge
npx @jmservera/squad-speckit-bridge install
```

### Files Not Auto-Generated
**Symptom:** `squad-context.md` or `review.md` not created

**Solution:**
1. Check configuration is valid: `npx @jmservera/squad-speckit-bridge status`
2. Check hooks are enabled: Look at `bridge.config.json` → `hooks`
3. Try manual generation:
   ```bash
   npx @jmservera/squad-speckit-bridge context specs/001-feature/
   npx @jmservera/squad-speckit-bridge review specs/001-feature/tasks.md
   ```

### Permission Errors
```bash
# Ensure you have write access
chmod -R u+w .squad/ .specify/

# Then reinstall
npx @jmservera/squad-speckit-bridge install --force
```

### Bridge Installation Incomplete
```bash
# Reinstall with force flag
npx @jmservera/squad-speckit-bridge install --force

# Verify again
npx @jmservera/squad-speckit-bridge status
```

**Still stuck?** See the full [Installation Guide](./installation.md#troubleshooting) or [Architecture](./architecture.md) for deeper details.

---

## Key Concepts (30-Second Summary)

| Concept | What It Does |
|---------|------------|
| **Memory Bridge** | Reads Squad (decisions, skills, learnings) and summarizes for planning |
| **Context Injection** | Automatically feeds Squad memory into Spec Kit planning context |
| **Design Review** | Team ceremony to validate tasks before execution |
| **Hooks** | Automated triggers that run after Spec Kit planning steps |
| **Configuration** | Customizable `bridge.config.json` to control automation behavior |

---

## What Gets Committed?

✓ **Commit these:**
- `.bridge-manifest.json`
- `bridge.config.json`
- `.squad/skills/speckit-bridge/`
- `.squad/ceremonies/design-review.md`
- `.specify/extensions/squad-speckit-bridge/`
- `specs/{feature}/squad-context.md` (planning context)
- `specs/{feature}/review.md` (design review)

✗ **Don't commit:**
- Temporary files generated during testing
- Personal configuration overrides (use `.gitignore`)

---

## Getting Help

- **Quick questions:** Check [Command Reference](#command-reference) above
- **Installation issues:** See [Installation Guide](./installation.md#troubleshooting)
- **How to use features:** Read [Usage Guide](./usage.md)
- **How it works:** See [Architecture](./architecture.md)
- **API Details:** Check [API Reference](./api-reference.md)

---

## One-Minute Recap

```bash
# 1. Prerequisites: Node 18+, npm 8+, Squad, Spec Kit
$ node --version && npm --version && ls .squad/ && ls .specify/

# 2. Install
$ npx @jmservera/squad-speckit-bridge install

# 3. Verify
$ npx @jmservera/squad-speckit-bridge status  # Should show all ✓

# 4. Use normally
$ cd specs/001-feature/
$ /speckit.specify && /speckit.plan && /speckit.tasks
# → Bridge auto-injects context + generates review

# 5. Create issues
$ npx @jmservera/squad-speckit-bridge issues specs/001-feature/tasks.md

# 6. Done! Team executes and learns.
```

That's it! The bridge stays in the background. You just use Spec Kit normally.

---

## FAQ

**Q: Do I need to run install every time?**  
A: No. Install once per repository. The bridge stays installed.

**Q: Can I disable automation and use manual commands?**  
A: Yes. Set `hooks.*` to `false` in `bridge.config.json`, then run commands explicitly.

**Q: What if I don't have Squad or Spec Kit?**  
A: Install them first: `npx squad init && npx speckit init`

**Q: Can I customize the default context size?**  
A: Yes. Edit `bridge.config.json` → `contextMaxBytes` (default: 8192)

**Q: Does the bridge modify my existing files?**  
A: No. It only creates new files. Your Squad and Spec Kit directories are untouched.

**Q: What version am I running?**  
A: Run `npx @jmservera/squad-speckit-bridge --version` or check `package.json` in your project.

**Q: How do I uninstall?**  
A: Delete the created files. Both frameworks remain unaffected.
```bash
rm -rf .squad/skills/speckit-bridge/ .squad/ceremonies/design-review.md
rm -rf .specify/extensions/squad-speckit-bridge/
rm bridge.config.json .bridge-manifest.json
```

---

**Ready?** [Install now](#step-1-run-install-1-minute) or read the [full Usage Guide](./usage.md) for advanced features.
