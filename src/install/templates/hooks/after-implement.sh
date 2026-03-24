#!/usr/bin/env bash
# Squad-SpecKit Bridge — after_implement hook
# Called by Spec Kit after implementation is complete (speckit.implement).
# Syncs execution results back to Squad's memory for future planning cycles.

set -euo pipefail

# Spec Kit sets SPECKIT_SPEC_DIR to the active spec directory
SPEC_DIR="${SPECKIT_SPEC_DIR:-}"

if [ -z "$SPEC_DIR" ]; then
  echo "[squad-bridge] No SPECKIT_SPEC_DIR set — skipping learning sync."
  exit 0
fi

# Check if the bridge is configured to run after-implement hooks
CONFIG_FILE="${BRIDGE_CONFIG:-bridge.config.json}"
if [ -f "$CONFIG_FILE" ]; then
  if command -v node &> /dev/null; then
    HOOK_ENABLED=$(node -e "
      try {
        const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
        console.log(c.hooks?.afterImplement !== false ? 'true' : 'false');
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

# Sync learnings from implementation back to Squad memory
echo "[squad-bridge] Syncing implementation results to Squad memory..."
if command -v squask &> /dev/null; then
  squask sync "$SPEC_DIR" --quiet 2>/dev/null || {
    echo "[squad-bridge] WARNING: Learning sync failed — manual sync recommended."
    echo "[squad-bridge] Run: squask sync ${SPEC_DIR}"
    exit 0
  }
  echo "[squad-bridge] Implementation learnings synced to Squad memory."
else
  echo "[squad-bridge] WARNING: squask not found — install squad-speckit-bridge to enable learning sync."
  echo "[squad-bridge] Install with: npm install -g @jmservera/squad-speckit-bridge"
  exit 0
fi
