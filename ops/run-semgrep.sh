#!/bin/bash
# Run Semgrep SAST scan
# Usage: bash ops/run-semgrep.sh [--ci]
set -e

echo "=== Semgrep SAST Scan ==="

# Custom rules
semgrep scan --config .semgrep.yml \
  --exclude 'target' --exclude 'node_modules' --exclude '.next' \
  --exclude '*.lock' --exclude '*.json' \
  apps/health/sovereign-health/api/src/ \
  apps/health/sovereign-health/frontend/src/

# OWASP rules (if online)
if [ "$1" = "--ci" ]; then
  semgrep scan --config "p/owasp-top-ten" \
    --exclude 'target' --exclude 'node_modules' --exclude '.next' \
    apps/health/sovereign-health/api/src/ \
    apps/health/sovereign-health/frontend/src/
fi

echo "=== Done ==="
