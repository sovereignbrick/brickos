#!/usr/bin/env bash
# BrickOS Tracker -> GitHub auto-sync
# Idempotent: safe to run repeatedly. Picks up any local issue or milestone
# without a `github_number` field and creates it on GitHub. Updates state for
# closed issues. Pre-checks rate limit and exits cleanly if too low.
#
# Usage: bash docs/tracker/sync/auto-sync.sh
# Designed to be invoked by an hourly cron.
set -euo pipefail

REPO=sovereignbrick/brickos
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TRACKER="$ROOT/docs/tracker"
LOG_DIR="$ROOT/docs/tracker/sync/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/auto-sync-$(date +%Y%m%d-%H%M).log"

# Pipe-safe log function: writes to both the log file and stdout, but never
# crashes on SIGPIPE from a broken caller (e.g. `... | tail -30`).
log() {
    local msg="[$(date +%H:%M:%S)] $*"
    printf '%s\n' "$msg" >> "$LOG"
    printf '%s\n' "$msg" 2>/dev/null || true
}

log "=== auto-sync start ==="

# Pre-check rate limit
remaining=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "0")
limit=$(gh api rate_limit --jq '.resources.core.limit' 2>/dev/null || echo "0")
reset=$(gh api rate_limit --jq '.resources.core.reset' 2>/dev/null || echo "0")
log "Rate limit: $remaining / $limit (resets $(date -d @"$reset" 2>/dev/null || echo $reset))"

# Reserve at least 5 calls for safety
if [ "$remaining" -lt 5 ]; then
  log "ABORT: only $remaining calls remaining, need >= 5. Will retry next cycle."
  exit 0
fi

# ----------------------------------------------------------------------------
# Step 1: Sync milestones (local -> GitHub) for milestones missing github_number
# ----------------------------------------------------------------------------
log "--- Milestones ---"
ms_created=0
for file in "$TRACKER"/milestones/*.md; do
  [ -f "$file" ] || continue
  if grep -q "^github_number:" "$file"; then
    continue
  fi

  title=$(awk '/^name:/ {sub(/^name: /, ""); print; exit}' "$file" | tr -d '"')
  description=$(awk '/^description:/ {sub(/^description: /, ""); print; exit}' "$file" | tr -d '"')
  state=$(awk '/^status:/ {sub(/^status: /, ""); print; exit}' "$file" | tr -d '"')

  [ -z "$title" ] && continue

  # Map "active" -> "open"
  gh_state="open"
  [ "$state" = "closed" ] && gh_state="closed"

  payload=$(jq -n \
    --arg title "$title" \
    --arg description "$description" \
    --arg state "$gh_state" \
    '{title: $title, description: $description, state: $state}')

  ms_num=$(echo "$payload" | gh api "repos/$REPO/milestones" --method POST --input - --jq '.number' 2>>"$LOG")
  if [[ "$ms_num" =~ ^[0-9]+$ ]]; then
    log "  CREATED milestone '$title' -> #$ms_num"
    sed -i "/^name: /a github_number: $ms_num" "$file"
    ms_created=$((ms_created + 1))
  else
    # Self-heal: maybe it already exists by title (422 from earlier sync attempt).
    # Look it up and backfill the github_number.
    existing=$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq ".[] | select(.title == \"$title\") | .number" 2>>"$LOG" | head -1)
    if [[ "$existing" =~ ^[0-9]+$ ]]; then
      log "  ADOPTED existing milestone '$title' -> #$existing"
      sed -i "/^name: /a github_number: $existing" "$file"
    else
      log "  FAIL milestone '$title' (response not numeric, no match by title)"
    fi
  fi

  # Re-check rate budget every iteration
  rem=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "0")
  if [ "$rem" -lt 5 ]; then
    log "  STOP: rate budget exhausted mid-milestones"
    exit 0
  fi
  sleep 1
done
log "Milestones created: $ms_created"

# ----------------------------------------------------------------------------
# Step 2: Sync issues (local -> GitHub) for issues missing github_number
# ----------------------------------------------------------------------------
log "--- Issues ---"
issues_created=0
issues_failed=0
issues_skipped=0
issues_remaining_after_cap=0

# Cap creates per run so a backlog of 100+ issues doesn't burn the entire
# 60/hour rate budget in one cron fire. The cron runs hourly so the backlog
# drains over a few cycles.
ISSUES_PER_RUN_CAP=20

# Process both open and closed dirs
for dir in "$TRACKER/issues/open" "$TRACKER/issues/closed"; do
  [ -d "$dir" ] || continue
  for file in "$dir"/*.md; do
    [ -f "$file" ] || continue
    if grep -q "^github_number:" "$file"; then
      continue
    fi
    # Honor skip flag for issues that should remain local-only
    if grep -q "^skip_github_sync: *true" "$file"; then
      issues_skipped=$((issues_skipped + 1))
      continue
    fi

    # Cap reached -- count remaining and stop
    if [ "$issues_created" -ge "$ISSUES_PER_RUN_CAP" ]; then
      issues_remaining_after_cap=$((issues_remaining_after_cap + 1))
      continue
    fi

    # Re-check rate budget BEFORE each create
    rem=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "0")
    if [ "$rem" -lt 5 ]; then
      log "STOP: rate budget exhausted ($rem remaining). Will retry next cycle."
      log "Issues created this run: $issues_created"
      exit 0
    fi

    title=$(awk -F': ' '/^title:/ {sub(/^title: /, ""); gsub(/^"/, ""); gsub(/"$/, ""); print; exit}' "$file")
    [ -z "$title" ] && { log "  SKIP $(basename "$file") (no title)"; continue; }

    labels_raw=$(awk '/^labels:/ {sub(/^labels: \[/, ""); gsub(/\]$/, ""); print; exit}' "$file")
    if [ -n "$labels_raw" ]; then
      labels_json=$(echo "$labels_raw" | tr -d ' ' | jq -R 'split(",") | map(select(length > 0))')
    else
      labels_json='[]'
    fi

    # Look up milestone by name from frontmatter
    ms_name=$(awk -F': ' '/^milestone:/ {sub(/^milestone: /, ""); gsub(/^"/, ""); gsub(/"$/, ""); print; exit}' "$file")
    ms_arg=""
    if [ -n "$ms_name" ] && [ "$ms_name" != "none" ]; then
      # Look up the milestone's github_number from local milestone files.
      # `set -e` + pipefail would kill us if grep finds nothing, so we wrap.
      ms_file=""
      while IFS= read -r mf; do
        ms_file="$mf"
        break
      done < <(grep -lF "name: $ms_name" "$TRACKER"/milestones/*.md 2>/dev/null || true)
      if [ -n "$ms_file" ]; then
        ms_num=$(awk '/^github_number:/ {sub(/^github_number: /, ""); print; exit}' "$ms_file" 2>/dev/null || true)
        if [ -n "$ms_num" ]; then
          ms_arg="$ms_num"
        fi
      fi
    fi

    body=$(cat "$file")

    if [ -n "$ms_arg" ]; then
      payload=$(jq -n \
        --arg title "$title" \
        --arg body "$body" \
        --argjson milestone "$ms_arg" \
        --argjson labels "$labels_json" \
        '{title: $title, body: $body, milestone: $milestone, labels: $labels}')
    else
      payload=$(jq -n \
        --arg title "$title" \
        --arg body "$body" \
        --argjson labels "$labels_json" \
        '{title: $title, body: $body, labels: $labels}')
    fi

    ghnum=$(echo "$payload" | gh api "repos/$REPO/issues" --method POST --input - --jq '.number' 2>>"$LOG")

    if [[ "$ghnum" =~ ^[0-9]+$ ]]; then
      log "  CREATED $(basename "$file") -> #$ghnum"
      sed -i "/^number: /a github_number: $ghnum" "$file"
      issues_created=$((issues_created + 1))

      # If file is in /closed, immediately close on GitHub
      if [[ "$dir" == */closed* ]]; then
        gh api "repos/$REPO/issues/$ghnum" -X PATCH -f state=closed >/dev/null 2>>"$LOG" || true
      fi
    else
      log "  FAIL $(basename "$file"): $ghnum"
      issues_failed=$((issues_failed + 1))
    fi

    sleep 1
  done
done

log "Issues created: $issues_created, failed: $issues_failed, skipped(local-only): $issues_skipped, remaining(over cap): $issues_remaining_after_cap"

# ----------------------------------------------------------------------------
# Step 3: State sync for issues that have github_number but moved between
#         open/ and closed/ directories
# ----------------------------------------------------------------------------
log "--- State sync ---"
state_changes=0
for dir_state in "open:open" "closed:closed"; do
  dir="${dir_state%:*}"
  expected="${dir_state#*:}"
  for file in "$TRACKER/issues/$dir"/*.md; do
    [ -f "$file" ] || continue
    ghnum=$(awk '/^github_number:/ {sub(/^github_number: /, ""); print; exit}' "$file")
    [ -z "$ghnum" ] && continue

    # Cheap budget check
    rem=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "0")
    if [ "$rem" -lt 3 ]; then
      log "STOP: rate budget exhausted in state sync"
      break 2
    fi

    actual=$(gh api "repos/$REPO/issues/$ghnum" --jq '.state' 2>/dev/null || echo "")
    if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
      gh api "repos/$REPO/issues/$ghnum" -X PATCH -f state="$expected" >/dev/null 2>>"$LOG" && {
        log "  STATE #$ghnum $actual -> $expected"
        state_changes=$((state_changes + 1))
      }
      sleep 1
    fi
  done
done
log "State changes: $state_changes"

# ----------------------------------------------------------------------------
# Final report
# ----------------------------------------------------------------------------
final_rem=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "?")
log "=== auto-sync done. Created $((ms_created + issues_created)) items, $state_changes state updates. Rate limit: $final_rem remaining ==="

# Update last-sync.json
SYNC_FILE="$TRACKER/sync/last-sync.json"
if [ -f "$SYNC_FILE" ]; then
  jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     --argjson ms "$ms_created" \
     --argjson iss "$issues_created" \
     --argjson st "$state_changes" \
     '.last_sync = $ts | .last_milestones_created = $ms | .last_issues_created = $iss | .last_state_changes = $st' \
     "$SYNC_FILE" > "$SYNC_FILE.tmp" && mv "$SYNC_FILE.tmp" "$SYNC_FILE"
fi
