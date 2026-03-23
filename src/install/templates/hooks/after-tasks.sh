#!/usr/bin/env bash
# Squad-SpecKit Bridge — after_tasks hook
# Called by Spec Kit after task generation (speckit.tasks).
# Notifies the developer that a Design Review is available.

set -euo pipefail

# Spec Kit sets SPECKIT_SPEC_DIR to the active spec directory
SPEC_DIR="${SPECKIT_SPEC_DIR:-}"
TASKS_FILE="${SPEC_DIR:+${SPEC_DIR}/tasks.md}"

# Check if the bridge is configured to run after-tasks hooks
CONFIG_FILE="${BRIDGE_CONFIG:-bridge.config.json}"
if [ -f "$CONFIG_FILE" ]; then
  HOOK_ENABLED=$(node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
      console.log(c.hooks?.afterTasks !== false ? 'true' : 'false');
    } catch { console.log('true'); }
  " 2>/dev/null || echo "true")
  if [ "$HOOK_ENABLED" = "false" ]; then
    exit 0
  fi
fi

# Validate tasks file exists
if [ -z "$TASKS_FILE" ] || [ ! -f "$TASKS_FILE" ]; then
  echo "[squad-bridge] No tasks.md found — skipping Design Review notification."
  exit 0
fi

# Generate context if not already present
CONTEXT_FILE="${SPEC_DIR}/squad-context.md"
if [ ! -f "$CONTEXT_FILE" ]; then
  echo "[squad-bridge] Generating squad-context.md..."
  npx @jmservera/squad-speckit-bridge context "$SPEC_DIR" --quiet 2>/dev/null || true
fi

# Notify developer about available Design Review
npx @jmservera/squad-speckit-bridge review --notify "$TASKS_FILE"
