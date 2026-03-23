#!/usr/bin/env bash
# Squad-SpecKit Bridge — before_specify hook
# Called by Spec Kit before specification generation (speckit.specify).
# Injects Squad context so planning benefits from accumulated team knowledge.

set -euo pipefail

# Check npx availability
if ! command -v npx &> /dev/null; then
  echo "[squad-bridge] WARNING: npx not found — skipping context injection."
  echo "[squad-bridge] Install Node.js 18+ to enable the Squad-SpecKit bridge."
  exit 0
fi

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
npx squad-speckit-bridge context "$SPEC_DIR" --quiet 2>/dev/null || {
  echo "[squad-bridge] WARNING: Context injection failed — continuing without Squad context."
  exit 0
}

echo "[squad-bridge] Squad context injected successfully."
