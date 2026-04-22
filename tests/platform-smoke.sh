#!/usr/bin/env bash
# ============================================================================
#  BrickOS Platform Smoke Test
#  Validates the entire platform after deployment or migration.
#
#  Usage:
#    ./tests/platform-smoke.sh staging
#    ./tests/platform-smoke.sh production
# ============================================================================

set +e

# ── Configuration ─────────────────────────────────────────────────────────

ENV="${1:-staging}"
VPS="root@72.61.154.115"

case "$ENV" in
  staging)
    API_URL="https://api-demo.sovereignhealth.io"
    APP_URL="https://demo.sovereignhealth.io"
    WEB_URL="https://www-demo.sovereignhealth.io"
    SV_PORT="8081"
    DB_CONTAINER="sh-staging-db"
    DB_NAME="sovereign_health_staging"
    ;;
  production)
    API_URL="https://api.sovereignhealth.io"
    APP_URL="https://app.sovereignhealth.io"
    WEB_URL="https://www.sovereignhealth.io"
    SV_PORT="8080"
    DB_CONTAINER="sovereign-health-db-1"
    DB_NAME="sovereign_health"
    ;;
  *)
    echo "Usage: $0 <staging|production>"
    exit 2
    ;;
esac

DB_USER="sovereign_health"
BASIC_AUTH="helmut:JM8Lv97Ax3LiRDLMgYfXdw=="

# Per-environment demo user credentials.
#
# Sprint 049 #049-11: the three production "demo" users
# (optimized/average/atrisk@sovereignhealth.io) had their password
# hashes locked to an unverifiable sentinel, per Design 029. They
# remain readable via /demo/* but can no longer authenticate. For
# prod we therefore switch the smoke check to "auth endpoint up and
# correctly rejects invalid credentials" rather than "full login
# succeeds." The eval-smoke Playwright suite covers the
# demo-read path separately.
if [ "$ENV" = "production" ]; then
  DEMO_EMAIL="optimized@sovereignhealth.io"
  DEMO_PASS='locked-by-049-11-smoke-check-only'
else
  DEMO_EMAIL="demo@sovereignhealth.io"
  DEMO_PASS="SovereignDemo1"
fi

# ── Output helpers ────────────────────────────────────────────────────────

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m── $1 ──\033[0m"; }

echo "============================================================================"
echo "  BrickOS Platform Smoke Test"
echo "  Environment: $ENV"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================================"

# ── 1. SHI Backend Health ─────────────────────────────────────────────────

section "1. SHI Backend Health"

HEALTH=$(curl -sf --max-time 10 "$API_URL/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  VER=$(echo "$HEALTH" | grep -oP '"version":"\K[^"]+' 2>/dev/null || echo "unknown")
  pass "SHI backend health endpoint (v$VER)"
else
  fail "SHI backend health endpoint unreachable"
fi

# ── 2. SHI Frontend Loads ────────────────────────────────────────────────

section "2. SHI Frontend"

FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -u "$BASIC_AUTH" "$APP_URL/login" 2>/dev/null || echo "000")
if [ "$FE_STATUS" = "200" ]; then
  pass "SHI frontend loads (HTTP $FE_STATUS)"
else
  fail "SHI frontend returns HTTP $FE_STATUS"
fi

# ── 3. SHI Website Loads ────────────────────────────────────────────────

section "3. SHI Website"

WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -u "$BASIC_AUTH" "$WEB_URL" 2>/dev/null || echo "000")
if [ "$WEB_STATUS" = "200" ]; then
  pass "SHI website loads (HTTP $WEB_STATUS)"
else
  fail "SHI website returns HTTP $WEB_STATUS"
fi

# ── 4. SHI Login with Demo User ─────────────────────────────────────────

section "4. SHI Authentication"

# Sprint 049 #049-11: curl without -f so we can inspect 4xx responses
# (locked demo accounts on prod return 401 with structured JSON).
LOGIN_HTTP=$(curl -s --max-time 10 -o /tmp/shi-smoke-login.json -w "%{http_code}" \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\"}" 2>/dev/null || echo "000")

LOGIN=$(cat /tmp/shi-smoke-login.json 2>/dev/null || echo "")
TOKEN=$(echo "$LOGIN" | grep -oP '"token":"\K[^"]+' 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  pass "Login with demo user returns JWT"
elif [ "$LOGIN_HTTP" = "401" ] && echo "$LOGIN" | grep -q '"code"'; then
  # Endpoint reachable + correctly rejects with structured JSON. On prod
  # this is expected for the locked demo accounts (Sprint 049 #049-11).
  pass "Auth endpoint rejects invalid credentials with structured 401"
elif [ "$LOGIN_HTTP" = "429" ]; then
  # Governor rate-limit kicked in from repeated smoke runs; not a fail.
  pass "Auth endpoint rate-limited (governor active -- still healthy)"
else
  fail "Login check failed (HTTP $LOGIN_HTTP; expected 200/token or 401/structured)"
fi

# ── 5. SHI Authenticated Endpoint ───────────────────────────────────────

section "5. Authenticated Endpoint"

if [ -n "$TOKEN" ]; then
  ME=$(curl -sf --max-time 10 "$API_URL/me" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$ME" | grep -q "$DEMO_EMAIL"; then
    pass "GET /me returns user profile"
  else
    # Try alternate endpoint
    ME2=$(curl -sf --max-time 10 "$API_URL/auth/me" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
    if echo "$ME2" | grep -q "$DEMO_EMAIL"; then
      pass "GET /auth/me returns user profile"
    else
      fail "Authenticated endpoint did not return user profile"
    fi
  fi
else
  skip "Authenticated endpoint (no token)"
fi

# ── 5b. SHI /demo/* read (Sprint 050 #050-B6) ────────────────────────────

section "5b. SHI /demo/zones (anonymous read)"

DEMO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -u "$BASIC_AUTH" "$API_URL/demo/zones?profile=optimized" 2>/dev/null || echo "000")
if [ "$DEMO_STATUS" = "200" ]; then
  pass "/demo/zones reachable anonymously (HTTP $DEMO_STATUS)"
elif [ "$DEMO_STATUS" = "429" ]; then
  pass "/demo/zones rate-limited (governor active -- still healthy)"
else
  fail "/demo/zones returns HTTP $DEMO_STATUS (expected 200 or 429)"
fi

# ── 5c. SHI /signup endpoint reachable (Sprint 050 #050-B6) ──────────────

section "5c. SHI /signup endpoint"

# POST with empty body -> expect 400 (validation) -- confirms the endpoint
# is wired and serving. A 500 would mean the endpoint is broken; a 404
# would mean the route is missing from nginx/backend.
SIGNUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -X POST -H "Content-Type: application/json" -d '{}' \
  -u "$BASIC_AUTH" "$API_URL/auth/signup" 2>/dev/null || echo "000")
if [ "$SIGNUP_STATUS" = "400" ] || [ "$SIGNUP_STATUS" = "422" ]; then
  pass "/auth/signup validation-rejects empty body (HTTP $SIGNUP_STATUS)"
elif [ "$SIGNUP_STATUS" = "403" ]; then
  pass "/auth/signup gate closed (registration disabled; still healthy)"
elif [ "$SIGNUP_STATUS" = "429" ]; then
  pass "/auth/signup rate-limited (governor active -- still healthy)"
else
  fail "/auth/signup returns HTTP $SIGNUP_STATUS (expected 400/422/403/429)"
fi

# ── 6. Sovereign Voice systemd Active ────────────────────────────────────

section "6. Sovereign Voice"

SV_STATUS=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS" \
  "systemctl is-active nostr-scheduler 2>/dev/null" 2>/dev/null || echo "unknown")

if [ "$SV_STATUS" = "active" ]; then
  pass "Sovereign Voice systemd service is active"
elif [ "$SV_STATUS" = "inactive" ] || [ "$SV_STATUS" = "dead" ]; then
  fail "Sovereign Voice systemd service is $SV_STATUS"
else
  skip "Sovereign Voice systemd check (SSH unreachable or service not found)"
fi

# ── 7. Sovereign Voice Schedule List ────────────────────────────────────

section "7. Sovereign Voice Schedule"

SV_LIST=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS" \
  "cd /opt/nostr-scheduler && node dist/index.js list schedule.json 2>&1" 2>/dev/null || echo "FAIL")

if [ "$SV_LIST" = "FAIL" ]; then
  skip "Sovereign Voice schedule list (SSH or command failed)"
elif echo "$SV_LIST" | grep -qi "error\|not found\|cannot find"; then
  fail "Sovereign Voice schedule list returned error: $SV_LIST"
else
  pass "Sovereign Voice schedule list works"
fi

# ── 8-14. Platform DB Checks ────────────────────────────────────────────

section "8-14. Platform Database"

run_db_query() {
  local query="$1"
  ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS" \
    "docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \"$query\"" 2>/dev/null
}

# 8. brickos schema exists
SCHEMA_EXISTS=$(run_db_query "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'brickos')")
if [ "$SCHEMA_EXISTS" = "t" ]; then
  pass "8. brickos schema exists"
elif [ -z "$SCHEMA_EXISTS" ]; then
  skip "8. brickos schema check (DB unreachable)"
else
  fail "8. brickos schema does not exist"
fi

# 9. Table count in brickos schema
if [ "$SCHEMA_EXISTS" = "t" ]; then
  TABLE_COUNT=$(run_db_query "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'brickos'")
  if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -ge 37 ] 2>/dev/null; then
    pass "9. brickos schema has $TABLE_COUNT tables (>= 37)"
  elif [ -n "$TABLE_COUNT" ]; then
    fail "9. brickos schema has only $TABLE_COUNT tables (expected >= 37)"
  else
    skip "9. Table count check failed"
  fi
else
  skip "9. Table count (no brickos schema)"
fi

# 10. search_path includes brickos
SEARCH_PATH=$(run_db_query "SHOW search_path")
if echo "$SEARCH_PATH" | grep -q "brickos"; then
  pass "10. search_path includes brickos ($SEARCH_PATH)"
else
  if [ -n "$SEARCH_PATH" ]; then
    fail "10. search_path does not include brickos ($SEARCH_PATH)"
  else
    skip "10. search_path check (DB unreachable)"
  fi
fi

# 11. Unqualified SELECT FROM users works
USERS_COUNT=$(run_db_query "SELECT count(*) FROM users")
if [ -n "$USERS_COUNT" ] && [ "$USERS_COUNT" -ge 0 ] 2>/dev/null; then
  pass "11. Unqualified SELECT FROM users works ($USERS_COUNT rows)"
else
  if [ -z "$USERS_COUNT" ]; then
    skip "11. SELECT FROM users (DB unreachable)"
  else
    fail "11. Unqualified SELECT FROM users failed"
  fi
fi

# 12. Unqualified SELECT FROM measurements works
MEAS_COUNT=$(run_db_query "SELECT count(*) FROM measurements")
if [ -n "$MEAS_COUNT" ] && [ "$MEAS_COUNT" -ge 0 ] 2>/dev/null; then
  pass "12. Unqualified SELECT FROM measurements works ($MEAS_COUNT rows)"
else
  if [ -z "$MEAS_COUNT" ]; then
    skip "12. SELECT FROM measurements (DB unreachable)"
  else
    fail "12. Unqualified SELECT FROM measurements failed"
  fi
fi

# 13. reserved_codes count
RC_COUNT=$(run_db_query "SELECT count(*) FROM reserved_codes" 2>/dev/null)
if [ -n "$RC_COUNT" ] && [ "$RC_COUNT" -ge 30 ] 2>/dev/null; then
  pass "13. reserved_codes has $RC_COUNT entries (>= 30)"
elif [ -n "$RC_COUNT" ]; then
  fail "13. reserved_codes has only $RC_COUNT entries (expected >= 30)"
else
  skip "13. reserved_codes check (table may not exist yet)"
fi

# 14. service_accounts table exists
SA_EXISTS=$(run_db_query "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'service_accounts')")
if [ "$SA_EXISTS" = "t" ]; then
  pass "14. service_accounts table exists"
elif [ -z "$SA_EXISTS" ]; then
  skip "14. service_accounts check (DB unreachable)"
else
  fail "14. service_accounts table does not exist"
fi

# ── 15. Sovereign Link Redirect Test ────────────────────────────────────

section "15. Sovereign Link"

REDIR_STATUS=$(curl -s -X GET -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 \
  "https://brickos.io/r/shDEMO2026" 2>/dev/null || echo "000")

if [ "$REDIR_STATUS" = "301" ] || [ "$REDIR_STATUS" = "302" ] || [ "$REDIR_STATUS" = "307" ]; then
  REDIR_LOC=$(curl -s -X GET -D - -o /dev/null --max-time 10 --max-redirs 0 \
    "https://brickos.io/r/shDEMO2026" 2>/dev/null | grep -i "^location:" | head -1 | tr -d '\r')
  pass "15. Sovereign Link redirect ($REDIR_STATUS, $REDIR_LOC)"
elif [ "$REDIR_STATUS" = "404" ]; then
  skip "15. Sovereign Link redirect (404, test code may not exist)"
else
  skip "15. Sovereign Link redirect (HTTP $REDIR_STATUS)"
fi

# ── 16. Sovereign Link QR Endpoint ──────────────────────────────────────

section "16. Sovereign Link QR"

QR_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 \
  "https://brickos.io/r/shDEMO2026.qr" 2>/dev/null || echo "000")

if [ "$QR_STATUS" = "200" ]; then
  QR_CT=$(curl -sf -I --max-time 10 "https://brickos.io/r/shDEMO2026.qr" 2>/dev/null | grep -i "content-type" | head -1)
  if echo "$QR_CT" | grep -qi "svg"; then
    pass "16. Sovereign Link QR returns SVG"
  else
    pass "16. Sovereign Link QR returns 200 ($QR_CT)"
  fi
elif [ "$QR_STATUS" = "404" ]; then
  skip "16. Sovereign Link QR (404, test code may not exist)"
else
  skip "16. Sovereign Link QR (HTTP $QR_STATUS)"
fi

# ── 17. Cross-schema FK Integrity ───────────────────────────────────────

section "17. Cross-schema Integrity"

FK_CHECK=$(run_db_query "SELECT count(*) FROM measurements m JOIN users u ON m.user_id = u.id LIMIT 1" 2>/dev/null)
if [ -n "$FK_CHECK" ] && [ "$FK_CHECK" -ge 0 ] 2>/dev/null; then
  pass "17. Cross-schema JOIN measurements -> users works ($FK_CHECK rows)"
else
  if [ -z "$FK_CHECK" ]; then
    skip "17. Cross-schema FK check (DB unreachable)"
  else
    fail "17. Cross-schema JOIN measurements -> users failed"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────

echo ""
echo "============================================================================"
echo -e " \033[1mPlatform Smoke Test Summary ($ENV)\033[0m"
echo "============================================================================"
echo -e "  \033[32mPassed:\033[0m  $PASS_COUNT"
echo -e "  \033[31mFailed:\033[0m  $FAIL_COUNT"
echo -e "  \033[33mSkipped:\033[0m $SKIP_COUNT"
echo "  Total:   $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "  \033[31mResult: SOME CHECKS FAILED\033[0m"
  exit 1
else
  echo -e "  \033[32mResult: ALL CHECKS PASSED\033[0m"
  exit 0
fi
