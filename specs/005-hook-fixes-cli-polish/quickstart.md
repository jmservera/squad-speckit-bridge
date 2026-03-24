# Quickstart: Hook Fixes and CLI Polish (v0.3.1)

**Feature**: 005-hook-fixes-cli-polish  
**Date**: 2026-03-24

## Implementation Order

Following Clean Architecture task ordering (Entity → Use Case → Adapter → Driver):

### Step 1: Entity Layer — Add `autoCreateIssues` config field

**File**: `src/types.ts`

Add `autoCreateIssues: boolean` to the `hooks` section of `BridgeConfig`. Update `createDefaultConfig()` to set default `true`. Update `isValidConfig()` if needed.

```typescript
// In BridgeConfig.hooks:
hooks: {
  afterTasks: boolean;
  beforeSpecify: boolean;
  afterImplement: boolean;
  autoCreateIssues: boolean;  // NEW — default: true
}
```

**Test**: `tests/unit/types.test.ts` — verify default config has `autoCreateIssues: true`, verify validation accepts/rejects correctly.

### Step 2: Adapter Layer — Verify file deployer permissions

**File**: `src/install/adapters/file-deployer.ts`

No code changes expected — `deployExecutable()` already calls `chmod(fullPath, 0o755)`. Verify this behavior with a test.

**Test**: `tests/integration/file-deployer.test.ts` — add test that deploys a file via `deployExecutable()` and asserts `0o755` permissions on the output.

### Step 3: Driver Layer — Fix hook template permissions

**Files**:
- `src/install/templates/hooks/before-specify.sh`
- `src/install/templates/hooks/after-tasks.sh`
- `src/install/templates/hooks/after-implement.sh`

```bash
# Set executable bit in git for all hook templates
git update-index --chmod=+x src/install/templates/hooks/before-specify.sh
git update-index --chmod=+x src/install/templates/hooks/after-tasks.sh
git update-index --chmod=+x src/install/templates/hooks/after-implement.sh
```

### Step 4: Driver Layer — Fix CLI alias in all hooks

**Files**: Same three hook templates

Replace all `npx @jmservera/squad-speckit-bridge` and `npx squad-speckit-bridge` with `npx squask`:

- `before-specify.sh`: Change `npx squad-speckit-bridge context` → `npx squask context`
- `after-tasks.sh`: Change `npx @jmservera/squad-speckit-bridge` → `npx squask` (two occurrences)
- `after-implement.sh`: Change `npx squad-speckit-bridge sync` → `npx squask sync`

### Step 5: Driver Layer — Automate after-tasks hook

**File**: `src/install/templates/hooks/after-tasks.sh`

Replace the notification-only behavior with actual issue creation:

```bash
# Check if auto-create issues is enabled
AUTO_CREATE=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
    console.log(c.hooks?.autoCreateIssues !== false ? 'true' : 'false');
  } catch { console.log('true'); }
" 2>/dev/null || echo "true")

if [ "$AUTO_CREATE" = "false" ]; then
  echo "[squad-bridge] Auto-issue creation disabled — skipping."
  exit 0
fi

# Create GitHub issues from tasks
echo "[squad-bridge] Creating GitHub issues from ${TASKS_FILE}..."
npx squask issues "$TASKS_FILE" || {
  echo "[squad-bridge] WARNING: Issue creation failed — create manually:"
  echo "[squad-bridge]   npx squask issues ${TASKS_FILE}"
  exit 0
}

echo "[squad-bridge] Issues created successfully."
```

### Step 6: Documentation — Complete demo command docs

**File**: `docs/api-reference.md`

Add to the demo command section:
- Full option descriptions with types and defaults
- Exit code table: `0` = success, `1` = failure
- JSON output schema with field descriptions
- Usage example 1: CI smoke test (`squask demo --dry-run --json`)
- Usage example 2: Interactive developer demo (`squask demo --verbose --keep`)

### Step 7: Verification — Clean Architecture compliance

Review all changes against the five constitutional principles:
1. No outward dependencies added (Principle I)
2. Changes in correct layers (Principle II)
3. Tests exist for each changed layer (Principle III)
4. Only DTOs cross boundaries (Principle IV)
5. No framework leakage into inner layers (Principle V)

## Build & Test Commands

```bash
# Build
npm run build

# Run all tests
npx vitest run

# Run specific test files
npx vitest run tests/unit/types.test.ts
npx vitest run tests/integration/file-deployer.test.ts
npx vitest run tests/unit/installer.test.ts

# Verify hook permissions after build
ls -la dist/install/templates/hooks/

# Verify CLI alias consistency
grep -rn 'npx.*squad' src/install/templates/hooks/
```

## Verification Checklist

- [ ] All three hook templates have executable permissions in git
- [ ] All hooks use `npx squask` (not scoped name, not unscoped full name)
- [ ] After-tasks hook calls `squask issues` instead of `review --notify`
- [ ] After-tasks hook reads `autoCreateIssues` config flag
- [ ] After-tasks hook handles issue creation failure gracefully
- [ ] `BridgeConfig.hooks.autoCreateIssues` defaults to `true`
- [ ] Demo command fully documented in api-reference.md
- [ ] All existing tests pass
- [ ] New tests cover permission handling and config flag
- [ ] Clean Architecture principles verified
