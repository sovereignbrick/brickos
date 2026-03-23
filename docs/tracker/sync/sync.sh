#!/usr/bin/env bash
set -euo pipefail

# BrickOS Tracker <-> GitHub Sync
# Usage: bash docs/tracker/sync/sync.sh [push|pull|status]

REPO="sovereignbrick/brickos"
TRACKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_FILE="$TRACKER_DIR/sync/last-sync.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_rate_limit() {
    local remaining
    remaining=$(gh api rate_limit 2>/dev/null | jq -r '.resources.core.remaining' 2>/dev/null || echo "0")
    if [[ "$remaining" == "0" ]]; then
        local reset
        reset=$(gh api rate_limit 2>/dev/null | jq -r '.resources.core.reset' 2>/dev/null || echo "unknown")
        echo -e "${RED}GitHub API rate limit exhausted. Resets at: $(date -d @"$reset" 2>/dev/null || echo "$reset")${NC}"
        exit 1
    fi
    echo -e "${GREEN}API calls remaining: $remaining${NC}"
}

cmd_status() {
    echo "=== Tracker Status ==="
    local open_count closed_count
    open_count=$(find "$TRACKER_DIR/issues/open" -name "*.md" 2>/dev/null | wc -l)
    closed_count=$(find "$TRACKER_DIR/issues/closed" -name "*.md" 2>/dev/null | wc -l)
    echo "Open issues:   $open_count"
    echo "Closed issues: $closed_count"
    echo ""

    echo "=== Open Issues by Milestone ==="
    grep -rh "^milestone:" "$TRACKER_DIR/issues/open/" 2>/dev/null | sed 's/milestone: //' | sort | uniq -c | sort -rn
    echo ""

    echo "=== Last Sync ==="
    if [[ -f "$SYNC_FILE" ]]; then
        jq '.' "$SYNC_FILE"
    else
        echo "Never synced"
    fi
}

cmd_pull() {
    check_rate_limit
    echo "=== Pulling issues from GitHub ==="

    # Fetch all open issues
    local issues
    issues=$(gh api "repos/$REPO/issues?state=open&per_page=100" --paginate 2>/dev/null)

    echo "$issues" | jq -c '.[]' | while read -r issue; do
        local number title labels milestone state
        number=$(echo "$issue" | jq -r '.number')
        title=$(echo "$issue" | jq -r '.title')
        labels=$(echo "$issue" | jq -r '[.labels[].name] | join(", ")')
        milestone=$(echo "$issue" | jq -r '.milestone.title // "none"')
        state=$(echo "$issue" | jq -r '.state')

        local padded
        padded=$(printf "%04d" "$number")
        local slug
        slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | head -c 60)
        local filepath="$TRACKER_DIR/issues/open/${padded}-${slug}.md"

        # Skip if already exists
        if find "$TRACKER_DIR/issues" -name "${padded}-*.md" 2>/dev/null | grep -q .; then
            echo -e "${YELLOW}SKIP${NC} #$number (already tracked)"
            continue
        fi

        cat > "$filepath" <<EOF
---
github_number: $number
title: "$title"
milestone: $milestone
labels: [$labels]
points: 0
---

## Description
Pulled from GitHub. Review and update description.
EOF
        echo -e "${GREEN}NEW${NC}  #$number $title"
    done

    # Update sync state
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.last_sync = $ts' "$SYNC_FILE" > "$SYNC_FILE.tmp" && mv "$SYNC_FILE.tmp" "$SYNC_FILE"
    echo -e "${GREEN}Pull complete.${NC}"
}

cmd_push() {
    check_rate_limit
    echo "=== Pushing local changes to GitHub ==="

    # Find issues that exist locally but may need creation/update on GitHub
    for file in "$TRACKER_DIR"/issues/open/*.md "$TRACKER_DIR"/issues/closed/*.md; do
        [[ -f "$file" ]] || continue

        local number title state
        number=$(grep "^github_number:" "$file" | head -1 | awk '{print $2}')
        title=$(grep "^title:" "$file" | head -1 | sed 's/^title: "//' | sed 's/"$//')

        # Determine desired state from directory
        if [[ "$file" == */closed/* ]]; then
            state="closed"
        else
            state="open"
        fi

        # Check if issue exists on GitHub
        local gh_state
        gh_state=$(gh api "repos/$REPO/issues/$number" 2>/dev/null | jq -r '.state' 2>/dev/null || echo "not_found")

        if [[ "$gh_state" == "not_found" ]]; then
            echo -e "${YELLOW}SKIP${NC} #$number (not found on GitHub — may need manual creation)"
            continue
        fi

        if [[ "$gh_state" != "$state" ]]; then
            echo -e "${GREEN}UPDATE${NC} #$number $gh_state -> $state"
            gh api "repos/$REPO/issues/$number" -X PATCH -f state="$state" >/dev/null 2>&1
        else
            echo -e "${YELLOW}OK${NC}    #$number (already $state)"
        fi
    done

    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.last_sync = $ts' "$SYNC_FILE" > "$SYNC_FILE.tmp" && mv "$SYNC_FILE.tmp" "$SYNC_FILE"
    echo -e "${GREEN}Push complete.${NC}"
}

case "${1:-status}" in
    push)   cmd_push ;;
    pull)   cmd_pull ;;
    status) cmd_status ;;
    *)
        echo "Usage: $0 [push|pull|status]"
        echo ""
        echo "  status  Show tracker stats and last sync time (default)"
        echo "  pull    Fetch open issues from GitHub into local tracker"
        echo "  push    Sync local state changes (open/closed) to GitHub"
        exit 1
        ;;
esac
