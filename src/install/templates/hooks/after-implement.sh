#!/usr/bin/env bash
# Squad-SpecKit Bridge — after_implement hook
# Called by Spec Kit after implementation is complete (speckit.implement).
# Syncs execution results back to Squad's memory for future planning cycles.

set -euo pipefail

# Check npx availability
if ! command -v npx &> /dev/null; then
  echo "[squad-bridge] WARNING: npx not found — skipping learning sync."
  echo "[squad-bridge] Install Node.js 18+ to enable the Squad-SpecKit bridge."
  exit 0
fi

# Spec Kit sets SPECKIT_SPEC_DIR to the active spec directory
SPEC_DIR="${SPECKIT_SPEC_DIR:-}"

if [ -z "$SPEC_DIR" ]; then
  echo "[squad-bridge] No SPECKIT_SPEC_DIR set — skipping learning sync."
  exit 0
fi

# Check if the bridge is configured to run after-implement hooks
CONFIG_FILE="${BRIDGE_CONFIG:-bridge.config.json}"
if [ -f "$CONFIG_FILE" ]; then
  HOOK_ENABLED=$(node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8'));
      console.log(c.hooks?.afterImplement !== false ? 'true' : 'false');
    } catch { console.log('true'); }
  " 2>/dev/null || echo "true")
  if [ "$HOOK_ENABLED" = "false" ]; then
    exit 0
  fi
fi

# Sync learnings from implementation back to Squad memory
echo "[squad-bridge] Syncing implementation results to Squad memory..."
npx squad-speckit-bridge sync "$SPEC_DIR" --quiet 2>/dev/null || {
  echo "[squad-bridge] WARNING: Learning sync failed — manual sync recommended."
  echo "[squad-bridge] Run: npx squad-speckit-bridge sync ${SPEC_DIR}"
  exit 0
}

echo "[squad-bridge] Implementation learnings synced to Squad memory."
