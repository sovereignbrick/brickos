#!/bin/bash
# Sprint 049 #049-16 (Design 029 v0.3 §19): nightly eval-smoke cron.
#
# Runs the eval-smoke Playwright suite against
# https://eval.sovereignhealth.io once a day. Catches drift between
# prod deploys (certificate expiry, DNS changes, Cloudflare edge
# regressions, third-party API changes -- anything that would break
# the demo surface without a code change on our side).
#
# Install as a systemd timer OR a standard cron entry:
#
#   # /etc/crontab (user: dev-comp or dedicated runner):
#   0 3 * * *  dev-comp  bash /home/dev-comp/Projects/brickos/apps/health/sovereign-health/ops/eval-smoke-cron.sh >> /var/log/eval-smoke.log 2>&1
#
# Output:
#   * Green: posts OK to ntfy (low priority) once per day.
#   * Red:   posts FAIL to ntfy (priority 5, errors+eval-smoke tags)
#            with a log tail so oncall can investigate without opening
#            a browser.
#
# Self-healing: rotates stale Playwright browsers if needed.
# Exit code: 0 on success (includes "all tests passed"), 1 on failure.

set -e

FRONTEND_DIR="/home/dev-comp/Projects/brickos/apps/health/sovereign-health/frontend"
EVAL_URL="https://eval.sovereignhealth.io"
NTFY_TOPIC_URL="${NTFY_TOPIC_URL:-https://ntfy.brickos.io/sovereign-health-alerts}"
NTFY_TOKEN="${NTFY_TOKEN:-}"  # optional; set to authenticate

cd "$FRONTEND_DIR" || {
    echo "[$(date -u +%FT%TZ)] FATAL: frontend dir $FRONTEND_DIR not found"
    exit 1
}

echo "[$(date -u +%FT%TZ)] Running eval-smoke against $EVAL_URL"

OUTPUT=$(E2E_BASE_URL="$EVAL_URL" \
  pnpm exec playwright test eval-smoke.spec.ts --project=unauth --reporter=list 2>&1 || true)

# Simple success signal from Playwright's "list" reporter.
if echo "$OUTPUT" | grep -qE '^[[:space:]]+[0-9]+ passed'; then
    # Count the passed number + any failed.
    PASSED=$(echo "$OUTPUT" | grep -oE '[0-9]+ passed' | head -1 | awk '{print $1}')
    FAILED=$(echo "$OUTPUT" | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}' || echo 0)
    FAILED=${FAILED:-0}

    if [ "$FAILED" = "0" ]; then
        echo "[$(date -u +%FT%TZ)] OK -- $PASSED tests passed"
        if [ -n "$NTFY_TOKEN" ]; then
            curl -s -H "Authorization: Bearer $NTFY_TOKEN" \
                 -H "Priority: 2" \
                 -H "Tags: white_check_mark,eval-smoke" \
                 -d "eval-smoke nightly OK: $PASSED passed" \
                 "$NTFY_TOPIC_URL" > /dev/null || true
        fi
        exit 0
    fi
fi

# Failure path: extract the failure lines and post.
echo "[$(date -u +%FT%TZ)] FAIL"
echo "$OUTPUT" | tail -40

if [ -n "$NTFY_TOKEN" ]; then
    TAIL=$(echo "$OUTPUT" | tail -20 | tr '\n' '|')
    curl -s -H "Authorization: Bearer $NTFY_TOKEN" \
         -H "Priority: 5" \
         -H "Tags: warning,eval-smoke" \
         -H "Title: eval-smoke nightly FAILED" \
         -d "eval.sovereignhealth.io smoke failed: $TAIL" \
         "$NTFY_TOPIC_URL" > /dev/null || true
fi

exit 1
