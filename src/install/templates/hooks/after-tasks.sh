#!/usr/bin/env bash
# Squad-SpecKit Bridge — after_tasks hook
# Called by Spec Kit after task generation (speckit.tasks).
# Automatically creates GitHub issues from tasks.md.

set -euo pipefail

# Spec Kit sets SPECKIT_SPEC_DIR to the active spec directory
SPEC_DIR="${SPECKIT_SPEC_DIR:-}"
TASKS_FILE="${SPEC_DIR:+${SPEC_DIR}/tasks.md}"

# Check if the bridge is configured to run after-tasks hooks
CONFIG_FILE="${BRIDGE_CONFIG:-bridge.config.json}"
if [ -f "$CONFIG_FILE" ]; then
  if command -v node &> /dev/null; then
    HOOK_ENABLED=$(node -e "
      try {
        const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
        console.log(c.hooks?.afterTasks !== false ? 'true' : 'false');
      } catch { console.log('true'); }
    " 2>/dev/null || echo "true")
  else
    echo "[squad-bridge] WARNING: Node.js not found — cannot parse config, defaulting to hook enabled."
    HOOK_ENABLED="true"
  fi
  if [ "$HOOK_ENABLED" = "false" ]; then
    exit 0
  fi
fi

# Validate tasks file exists
if [ -z "$TASKS_FILE" ] || [ ! -f "$TASKS_FILE" ]; then
  echo "[squad-bridge] No tasks.md found — skipping issue creation."
  exit 0
fi

# Generate context if not already present
CONTEXT_FILE="${SPEC_DIR}/squad-context.md"
if [ ! -f "$CONTEXT_FILE" ]; then
  echo "[squad-bridge] Generating squad-context.md..."
  if command -v squask &> /dev/null; then
    squask context "$SPEC_DIR" --quiet 2>/dev/null || true
  else
    echo "[squad-bridge] WARNING: squask not found — install squad-speckit-bridge to enable context generation."
  fi
fi

# Create GitHub issues from tasks.md
if command -v squask &> /dev/null; then
  echo "[squad-bridge] Creating GitHub issues from tasks.md..."
  squask issues "$TASKS_FILE" || {
    echo "[squad-bridge] WARNING: Issue creation failed."
    echo "[squad-bridge] Run manually: squask issues ${TASKS_FILE}"
    exit 0
  }
  echo "[squad-bridge] GitHub issues created successfully."
else
  echo "[squad-bridge] WARNING: squask not found — skipping issue creation."
  echo "[squad-bridge] Install squad-speckit-bridge globally: npm install -g @jmservera/squad-speckit-bridge"
  echo "[squad-bridge] Then run: squask issues ${TASKS_FILE}"
  exit 0
fi
