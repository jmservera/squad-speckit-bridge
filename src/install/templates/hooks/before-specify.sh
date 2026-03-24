#!/usr/bin/env bash
# Squad-SpecKit Bridge — before_specify hook
# Called by Spec Kit before specification generation (speckit.specify).
# Injects Squad context so planning benefits from accumulated team knowledge.

set -euo pipefail

# Spec Kit sets SPECKIT_SPEC_DIR to the active spec directory
SPEC_DIR="${SPECKIT_SPEC_DIR:-}"

if [ -z "$SPEC_DIR" ]; then
  echo "[squad-bridge] No SPECKIT_SPEC_DIR set — skipping context injection."
  exit 0
fi

# Check if the bridge is configured to run before-specify hooks
CONFIG_FILE="${BRIDGE_CONFIG:-bridge.config.json}"
if [ -f "$CONFIG_FILE" ]; then
  HOOK_ENABLED=$(node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
      console.log(c.hooks?.beforeSpecify !== false ? 'true' : 'false');
    } catch { console.log('true'); }
  " 2>/dev/null || echo "true")
  if [ "$HOOK_ENABLED" = "false" ]; then
    exit 0
  fi
fi

# Generate squad-context.md for the spec directory
echo "[squad-bridge] Injecting Squad context into ${SPEC_DIR}..."
if command -v squask &> /dev/null; then
  squask context "$SPEC_DIR" --quiet 2>/dev/null || {
    echo "[squad-bridge] WARNING: Context injection failed — continuing without Squad context."
    exit 0
  }
  echo "[squad-bridge] Squad context injected successfully."
else
  echo "[squad-bridge] WARNING: squask not found — install squad-speckit-bridge to enable context injection."
  echo "[squad-bridge] Install with: npm install -g @jmservera/squad-speckit-bridge"
  exit 0
fi
