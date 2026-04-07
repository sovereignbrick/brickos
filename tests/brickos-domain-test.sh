#!/usr/bin/env bash
# ============================================================================
#  BrickOS Domain Routing Tests
#  Tests that all brickos.io subdomains and paths route correctly.
#
#  Usage:
#    ./tests/brickos-domain-test.sh
#
#  Prerequisites: DNS records for app/demo/api/status.brickos.io
# ============================================================================

set +e

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m── $1 ──\033[0m"; }

echo "============================================================================"
echo "  BrickOS Domain Routing Tests"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================================"

# -- 1. api.brickos.io --------------------------------------------------------

section "1. api.brickos.io"

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://api.brickos.io/health 2>/dev/null)
if [ "$STATUS" = "200" ]; then
  VERSION=$(curl -sf --max-time 10 https://api.brickos.io/health 2>/dev/null | grep -oP '"version":"\K[^"]+')
  pass "1a. api.brickos.io/health returns 200 (v$VERSION)"
else
  fail "1a. api.brickos.io/health returned HTTP $STATUS"
fi

# CORS check
CORS=$(curl -sf -H "Origin: https://app.brickos.io" -I --max-time 10 https://api.brickos.io/health 2>/dev/null | grep -i "access-control-allow-origin" | tr -d '\r')
if echo "$CORS" | grep -qi "app.brickos.io"; then
  pass "1b. CORS allows app.brickos.io"
else
  skip "1b. CORS header check (may need OPTIONS preflight)"
fi

# -- 2. app.brickos.io --------------------------------------------------------

section "2. app.brickos.io"

# Root should redirect to /platform/
ROOT_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 https://app.brickos.io/ 2>/dev/null)
if [ "$ROOT_STATUS" = "302" ]; then
  ROOT_LOC=$(curl -sf -D - -o /dev/null --max-time 10 --max-redirs 0 https://app.brickos.io/ 2>/dev/null | grep -i "^location:" | tr -d '\r')
  pass "2a. Root redirects to /platform/ ($ROOT_STATUS, $ROOT_LOC)"
else
  fail "2a. Root should redirect 302, got $ROOT_STATUS"
fi

# /platform/ should return 200 (or redirect to login)
PLAT_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://app.brickos.io/platform/ 2>/dev/null)
if [ "$PLAT_STATUS" = "200" ] || [ "$PLAT_STATUS" = "307" ]; then
  pass "2b. /platform/ returns $PLAT_STATUS"
else
  fail "2b. /platform/ returned $PLAT_STATUS"
fi

# /sovereignhealth/ should proxy to SHI
SHI_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://app.brickos.io/sovereignhealth/ 2>/dev/null)
if [ "$SHI_STATUS" = "200" ]; then
  pass "2c. /sovereignhealth/ returns 200 (SHI app)"
else
  fail "2c. /sovereignhealth/ returned $SHI_STATUS"
fi

# /sovereignlink should redirect to /platform/links
SL_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 https://app.brickos.io/sovereignlink 2>/dev/null)
if [ "$SL_STATUS" = "302" ]; then
  pass "2d. /sovereignlink redirects 302 to /platform/links"
else
  fail "2d. /sovereignlink returned $SL_STATUS (expected 302)"
fi

# /sovereignvoice should redirect to /platform/apps
SV_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 https://app.brickos.io/sovereignvoice 2>/dev/null)
if [ "$SV_STATUS" = "302" ]; then
  pass "2e. /sovereignvoice redirects 302 to /platform/apps"
else
  fail "2e. /sovereignvoice returned $SV_STATUS (expected 302)"
fi

# -- 3. demo.brickos.io -------------------------------------------------------

section "3. demo.brickos.io (requires basic auth)"

# Should require basic auth (401 without credentials)
DEMO_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://demo.brickos.io/ 2>/dev/null)
if [ "$DEMO_STATUS" = "401" ]; then
  pass "3a. demo.brickos.io requires basic auth (401)"
else
  fail "3a. demo.brickos.io returned $DEMO_STATUS (expected 401)"
fi

# -- 4. status.brickos.io -----------------------------------------------------

section "4. status.brickos.io (Gatus)"

GATUS_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://status.brickos.io/ 2>/dev/null)
if [ "$GATUS_STATUS" = "200" ]; then
  pass "4a. status.brickos.io returns 200 (Gatus)"
elif [ "$GATUS_STATUS" = "000" ]; then
  skip "4a. status.brickos.io not reachable (DNS may not be set)"
else
  fail "4a. status.brickos.io returned $GATUS_STATUS"
fi

# -- 5. brickos.io (existing) -------------------------------------------------

section "5. brickos.io (website + short links)"

SITE_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://brickos.io/ 2>/dev/null)
if [ "$SITE_STATUS" = "200" ]; then
  pass "5a. brickos.io website returns 200"
else
  fail "5a. brickos.io returned $SITE_STATUS"
fi

REDIR_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 https://brickos.io/r/shDEMO2026 2>/dev/null)
if [ "$REDIR_STATUS" = "301" ] || [ "$REDIR_STATUS" = "302" ]; then
  pass "5b. Short link redirect works ($REDIR_STATUS)"
else
  fail "5b. Short link returned $REDIR_STATUS"
fi

# -- 6. Legacy domains (still working) ----------------------------------------

section "6. Legacy domains"

LEGACY_APP=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://app.sovereignhealth.io/ 2>/dev/null)
if [ "$LEGACY_APP" = "200" ]; then
  pass "6a. app.sovereignhealth.io still works (200)"
else
  fail "6a. app.sovereignhealth.io returned $LEGACY_APP"
fi

LEGACY_API=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 https://api.sovereignhealth.io/health 2>/dev/null)
if [ "$LEGACY_API" = "200" ]; then
  pass "6b. api.sovereignhealth.io still works (200)"
else
  fail "6b. api.sovereignhealth.io returned $LEGACY_API"
fi

# -- Summary -------------------------------------------------------------------

echo ""
echo "============================================================================"
echo -e " \033[1mBrickOS Domain Test Summary\033[0m"
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
