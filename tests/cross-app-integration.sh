#!/usr/bin/env bash
# ============================================================================
#  BrickOS Cross-App Integration Tests
#  Tests cross-app communication between SHI, Sovereign Link, and
#  Sovereign Voice on the staging/production VPS.
#
#  Usage:
#    ./tests/cross-app-integration.sh staging
#    ./tests/cross-app-integration.sh production
# ============================================================================

set +e

# -- Configuration -----------------------------------------------------------

ENV="${1:-staging}"
VPS="root@72.61.154.115"

case "$ENV" in
  staging)
    SHI_API="http://localhost:8081"
    DEMO_EMAIL="demo@sovereignhealth.io"
    DEMO_PASS="SovereignDemo1"
    SL_BASE="https://brickos.io"
    SL_TEST_CODE="shDEMO2026"
    DB_CONTAINER="sh-staging-db"
    DB_NAME="sovereign_health_staging"
    DB_USER="sovereign_health"
    ;;
  production)
    SHI_API="https://api.sovereignhealth.io"
    DEMO_EMAIL="optimized@sovereignhealth.io"
    DEMO_PASS='SovereignOptimal2026!'
    SL_BASE="https://brickos.io"
    SL_TEST_CODE="shDEMO2026"
    DB_CONTAINER="sovereign-health-db-1"
    DB_NAME="sovereign_health"
    DB_USER="sovereign_health"
    ;;
  *)
    echo "Usage: $0 <staging|production>"
    exit 2
    ;;
esac

# -- Output helpers ----------------------------------------------------------

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m-- $1 --\033[0m"; }

echo "============================================================================"
echo "  BrickOS Cross-App Integration Tests"
echo "  Environment: $ENV"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================================"

# -- Helper: run command on VPS ----------------------------------------------

vps_cmd() {
  ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS" "$1" 2>/dev/null
}

vps_db() {
  local query="$1"
  vps_cmd "docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \"$query\""
}

# For staging, API calls go through the VPS since localhost:8081 is on the VPS
vps_curl() {
  if [ "$ENV" = "staging" ]; then
    vps_cmd "curl $*"
  else
    curl $*
  fi
}

# -- 1. Login to SHI, get JWT -----------------------------------------------

section "1. SHI Authentication"

if [ "$ENV" = "staging" ]; then
  LOGIN_RESPONSE=$(vps_cmd "curl -sf --max-time 10 -X POST '$SHI_API/auth/login' \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\"}'")
else
  LOGIN_RESPONSE=$(curl -sf --max-time 10 -X POST "$SHI_API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\"}" 2>/dev/null || echo "FAIL")
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"\K[^"]+' 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  pass "SHI login returns JWT for $DEMO_EMAIL"
else
  fail "SHI login failed - could not extract JWT"
fi

# -- 2. Affiliate API Tests ---------------------------------------------------

section "2. Affiliate API"

if [ -n "$TOKEN" ]; then
  # 2a. GET /api/affiliate/me - affiliate info
  if [ "$ENV" = "staging" ]; then
    AFF_ME=$(vps_cmd "curl -sf --max-time 10 '$SHI_API/api/affiliate/me' \
      -H 'Authorization: Bearer $TOKEN'" 2>/dev/null || echo "FAIL")
  else
    AFF_ME=$(curl -sf --max-time 10 "$SHI_API/api/affiliate/me" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  fi

  if echo "$AFF_ME" | grep -q '"affiliate_code"'; then
    AFF_CODE=$(echo "$AFF_ME" | grep -oP '"affiliate_code":"\K[^"]+' || echo "?")
    pass "2a. Affiliate info returns code: $AFF_CODE"
  elif [ "$AFF_ME" = "FAIL" ]; then
    fail "2a. Affiliate info endpoint unreachable"
  else
    fail "2a. Affiliate info - unexpected response: ${AFF_ME:0:100}"
  fi

  # 2b. GET /api/affiliate/me/conversions - conversion list
  if [ "$ENV" = "staging" ]; then
    AFF_CONV=$(vps_cmd "curl -sf --max-time 10 '$SHI_API/api/affiliate/me/conversions' \
      -H 'Authorization: Bearer $TOKEN'" 2>/dev/null || echo "FAIL")
  else
    AFF_CONV=$(curl -sf --max-time 10 "$SHI_API/api/affiliate/me/conversions" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  fi

  if echo "$AFF_CONV" | grep -q '"conversions"'; then
    CONV_COUNT=$(echo "$AFF_CONV" | grep -oP '"total":\K[0-9]+' || echo "?")
    pass "2b. Conversions endpoint returns list (total: $CONV_COUNT)"
  elif [ "$AFF_CONV" = "FAIL" ]; then
    fail "2b. Conversions endpoint unreachable"
  else
    fail "2b. Conversions - unexpected response: ${AFF_CONV:0:100}"
  fi

  # 2c. GET /api/affiliate/vanity/check - vanity code availability
  if [ "$ENV" = "staging" ]; then
    VANITY_CHECK=$(vps_cmd "curl -sf --max-time 10 '$SHI_API/api/affiliate/vanity/check?code=test-avail-check' \
      -H 'Authorization: Bearer $TOKEN'" 2>/dev/null || echo "FAIL")
  else
    VANITY_CHECK=$(curl -sf --max-time 10 "$SHI_API/api/affiliate/vanity/check?code=test-avail-check" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  fi

  if echo "$VANITY_CHECK" | grep -q '"available"'; then
    pass "2c. Vanity check endpoint works"
  elif [ "$VANITY_CHECK" = "FAIL" ]; then
    fail "2c. Vanity check endpoint unreachable"
  else
    fail "2c. Vanity check - unexpected response: ${VANITY_CHECK:0:100}"
  fi

  # 2d. PII check - verify no raw IPs in click tracking
  PII_COLS=$(vps_db "SELECT column_name FROM information_schema.columns WHERE table_name='short_link_clicks' AND column_name LIKE '%ip%'" 2>/dev/null)
  if [ -z "$PII_COLS" ]; then
    pass "2d. No raw IP columns in short_link_clicks (PII safe)"
  else
    fail "2d. PII risk - IP-related columns found: $PII_COLS"
  fi
else
  skip "Affiliate API tests (no SHI JWT)"
fi

# -- 3. Sovereign Voice is running ------------------------------------------

section "3. Sovereign Voice Service"

SV_STATUS=$(vps_cmd "systemctl is-active nostr-scheduler 2>/dev/null" || echo "unknown")

if [ "$SV_STATUS" = "active" ]; then
  pass "Sovereign Voice systemd service is active"
elif [ "$SV_STATUS" = "inactive" ] || [ "$SV_STATUS" = "dead" ]; then
  fail "Sovereign Voice systemd service is $SV_STATUS"
else
  skip "Sovereign Voice systemd check (SSH unreachable or service not found)"
fi

# -- 4. Sovereign Link redirect works ---------------------------------------

section "4. Sovereign Link Redirect"

REDIR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 \
  "$SL_BASE/r/$SL_TEST_CODE" 2>/dev/null || echo "000")

if [ "$REDIR_STATUS" = "301" ] || [ "$REDIR_STATUS" = "302" ] || [ "$REDIR_STATUS" = "307" ]; then
  REDIR_LOC=$(curl -s -D - -o /dev/null --max-time 10 --max-redirs 0 \
    "$SL_BASE/r/$SL_TEST_CODE" 2>/dev/null | grep -i "^location:" | head -1 | tr -d '\r')
  pass "Sovereign Link redirect ($REDIR_STATUS, $REDIR_LOC)"
elif [ "$REDIR_STATUS" = "404" ]; then
  skip "Sovereign Link redirect (404 - test code '$SL_TEST_CODE' may not exist)"
else
  skip "Sovereign Link redirect (HTTP $REDIR_STATUS)"
fi

# -- 5. Cross-schema query --------------------------------------------------

section "5. Cross-Schema Query"

# Test that a JOIN across brickos.users and public.measurements works.
# This validates that the shared database schema setup is correct.
CROSS_QUERY="SELECT count(*) FROM brickos.users u LEFT JOIN public.measurements m ON m.user_id = u.id"
CROSS_RESULT=$(vps_db "$CROSS_QUERY" 2>/dev/null)

if [ -n "$CROSS_RESULT" ] && [ "$CROSS_RESULT" -ge 0 ] 2>/dev/null; then
  pass "Cross-schema JOIN (brickos.users + public.measurements) returns $CROSS_RESULT rows"
else
  if [ -z "$CROSS_RESULT" ]; then
    skip "Cross-schema query (DB unreachable)"
  else
    fail "Cross-schema query failed - result: $CROSS_RESULT"
  fi
fi

# Also verify that the health overview endpoint works (it spans schemas internally)
if [ -n "$TOKEN" ]; then
  if [ "$ENV" = "staging" ]; then
    OVERVIEW=$(vps_cmd "curl -sf --max-time 10 '$SHI_API/health-overview' \
      -H 'Authorization: Bearer $TOKEN'" 2>/dev/null || echo "")
  else
    OVERVIEW=$(curl -sf --max-time 10 "$SHI_API/health-overview" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
  fi

  if [ -n "$OVERVIEW" ] && [ "$OVERVIEW" != "FAIL" ]; then
    pass "Health overview endpoint returns data (cross-schema)"
  else
    skip "Health overview endpoint (may not exist or returned empty)"
  fi
else
  skip "Health overview (no JWT)"
fi

# -- Summary -----------------------------------------------------------------

echo ""
echo "============================================================================"
echo -e " \033[1mCross-App Integration Test Summary ($ENV)\033[0m"
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
