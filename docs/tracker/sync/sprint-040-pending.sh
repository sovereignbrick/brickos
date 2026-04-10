#!/usr/bin/env bash
# Sprint 040 -- finish syncing the 4 issues that hit rate limit during initial push
# Run this AFTER rate limit reset (check with: gh api rate_limit --jq '.resources.core')
# Reset was at 2026-04-10 09:33:25 CEST
set -euo pipefail

cd "$(dirname "$0")/../../.."
TRACKER=docs/tracker/issues/open
MILESTONE=35
REPO=sovereignbrick/brickos

REMAINING="0486 0487 0488 0489"

remaining=$(gh api rate_limit --jq '.resources.core.remaining')
if [ "$remaining" -lt 10 ]; then
  echo "ERROR: only $remaining API calls remaining. Wait for reset before running."
  gh api rate_limit --jq '.resources.core'
  exit 1
fi

for prefix in $REMAINING; do
  file=$(ls $TRACKER/${prefix}-*.md 2>/dev/null | head -1)
  [ -z "$file" ] && { echo "MISSING $prefix"; continue; }

  # Skip if already has github_number
  if grep -q "^github_number:" "$file"; then
    echo "SKIP $prefix (already has github_number)"
    continue
  fi

  title=$(awk -F': ' '/^title:/ {sub(/^title: /, ""); gsub(/^"/, ""); gsub(/"$/, ""); print; exit}' "$file")
  labels_raw=$(awk '/^labels:/ {sub(/^labels: \[/, ""); gsub(/\]$/, ""); print; exit}' "$file")
  labels_json=$(echo "$labels_raw" | tr -d ' ' | jq -R 'split(",")')
  body=$(cat "$file")

  payload=$(jq -n \
    --arg title "$title" \
    --arg body "$body" \
    --argjson milestone $MILESTONE \
    --argjson labels "$labels_json" \
    '{title: $title, body: $body, milestone: $milestone, labels: $labels}')

  ghnum=$(echo "$payload" | gh api repos/$REPO/issues --method POST --input - --jq '.number' 2>&1)

  if [[ "$ghnum" =~ ^[0-9]+$ ]]; then
    echo "OK $prefix -> #$ghnum"
    sed -i "/^number: /a github_number: $ghnum" "$file"
  else
    echo "FAIL $prefix: $ghnum"
  fi

  sleep 1
done
echo "DONE"
