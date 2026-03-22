#!/bin/bash
# Container Watchdog — Sovereign Health
# Checks that critical containers are running and alerts via ntfy if any are down.
# Designed to run every 60s via systemd timer.
#
# Usage: container-watchdog.sh [--auto-restart]

set -euo pipefail

# --- Configuration ---
PROD_CONTAINERS="sovereign-health-db-1 sovereign-health-backend-1 sovereign-health-frontend-1"
STAGING_CONTAINERS="sh-staging-db sh-staging-backend sh-staging-frontend"
ALL_CONTAINERS="$PROD_CONTAINERS $STAGING_CONTAINERS"

NTFY_URL="${NTFY_URL:-http://127.0.0.1:2586}"
NTFY_TOKEN="${NTFY_TOKEN:-}"
NTFY_TOPIC="${NTFY_TOPIC:-sh-critical}"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_TOPIC_ID="${TELEGRAM_CRITICAL_TOPIC_ID:-2}"

AUTO_RESTART="${1:-}"
COOLDOWN_FILE="/tmp/watchdog-cooldown"
COOLDOWN_SECONDS=300

# --- Functions ---
send_ntfy() {
    local title="$1" body="$2" priority="${3:-5}"
    [ -z "$NTFY_TOKEN" ] && return
    curl -sf -o /dev/null \
        -H "Authorization: Bearer $NTFY_TOKEN" \
        -H "Title: $title" \
        -H "Priority: $priority" \
        -H "Tags: rotating_light,skull" \
        -d "$body" \
        "$NTFY_URL/$NTFY_TOPIC" 2>/dev/null || true
}

send_telegram() {
    local text="$1"
    [ -z "$TELEGRAM_BOT_TOKEN" ] && return
    curl -sf -o /dev/null \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "message_thread_id=${TELEGRAM_TOPIC_ID}" \
        -d "text=$text" \
        -d "parse_mode=HTML" 2>/dev/null || true
}

alert() {
    local title="$1" body="$2" priority="${3:-5}"
    send_ntfy "$title" "$body" "$priority"
    send_telegram "<b>$title</b>\n$body"
}

is_in_cooldown() {
    local name="$1"
    local file="${COOLDOWN_FILE}-${name}"
    if [ -f "$file" ]; then
        local last
        last=$(cat "$file")
        local now
        now=$(date +%s)
        if [ $((now - last)) -lt $COOLDOWN_SECONDS ]; then
            return 0
        fi
    fi
    return 1
}

set_cooldown() {
    local name="$1"
    date +%s > "${COOLDOWN_FILE}-${name}"
}

# --- Main ---
DOWN_COUNT=0

for name in $ALL_CONTAINERS; do
    running=$(docker inspect --format='{{.State.Running}}' "$name" 2>/dev/null || echo "missing")

    if [ "$running" != "true" ]; then
        DOWN_COUNT=$((DOWN_COUNT + 1))

        # Determine environment
        if echo "$name" | grep -q "staging"; then
            env="STAGING"
        else
            env="PRODUCTION"
        fi

        # Alert (with cooldown to avoid spam)
        if ! is_in_cooldown "$name"; then
            alert \
                "$env: Container $name is DOWN" \
                "Container $name is not running on $(hostname) at $(date -u '+%Y-%m-%d %H:%M:%S UTC'). Status: $running" \
                5
            set_cooldown "$name"
        fi

        # Auto-restart if requested
        if [ "$AUTO_RESTART" = "--auto-restart" ]; then
            docker start "$name" 2>/dev/null && \
                alert "$env: Auto-restarted $name" "Container $name was auto-restarted by watchdog" 3 || true
        fi
    fi
done

if [ $DOWN_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi
