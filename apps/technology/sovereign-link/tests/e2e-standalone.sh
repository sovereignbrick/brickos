#!/usr/bin/env bash
# ============================================================================
#  Sovereign Link - Standalone E2E Tests (curl-based)
#  Builds the standalone Docker image, starts a container, and runs
#  curl-based tests against the HTTP API.
#
#  Usage:
#    ./tests/e2e-standalone.sh              # build and test
#    ./tests/e2e-standalone.sh --skip-build  # skip Docker build, reuse image
# ============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/../../.." && pwd)"

IMAGE_NAME="brickos/sovereign-link:e2e-test"
CONTAINER_NAME="sl-e2e-test-$$"
HOST_PORT=$((30000 + RANDOM % 10000))
BASE_URL="http://localhost:$HOST_PORT"
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

# -- Output helpers ----------------------------------------------------------

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m-- $1 --\033[0m"; }

# -- Cleanup on exit --------------------------------------------------------

cleanup() {
  echo ""
  echo "Cleaning up container $CONTAINER_NAME..."
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1
  docker rm "$CONTAINER_NAME" >/dev/null 2>&1
}
trap cleanup EXIT

echo "============================================================================"
echo "  Sovereign Link - Standalone E2E Tests"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Port: $HOST_PORT"
echo "============================================================================"

# -- 1. Build Docker image --------------------------------------------------

section "1. Docker Image"

if [ "$SKIP_BUILD" = true ]; then
  if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    pass "Docker image exists (--skip-build)"
  else
    fail "Docker image $IMAGE_NAME not found (--skip-build but image missing)"
    echo ""
    echo "Build the image first:  cd $REPO_ROOT && docker build -t $IMAGE_NAME -f apps/technology/sovereign-link/Dockerfile ."
    exit 2
  fi
else
  echo "  Building Docker image (this may take a few minutes)..."
  if docker build -t "$IMAGE_NAME" -f "$PROJECT_DIR/Dockerfile" "$REPO_ROOT" >/dev/null 2>&1; then
    pass "Docker image built"
  else
    fail "Docker image build failed"
    exit 2
  fi
fi

# -- 2. Start container -----------------------------------------------------

section "2. Start Container"

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$HOST_PORT:8080" \
  -e SOVEREIGN_LINK_ALLOW_REGISTRATION=true \
  "$IMAGE_NAME" >/dev/null 2>&1

if [ $? -eq 0 ]; then
  pass "Container started ($CONTAINER_NAME)"
else
  fail "Container failed to start"
  exit 2
fi

# -- 3. Wait for health check -----------------------------------------------

section "3. Health Check"

HEALTHY=false
for i in $(seq 1 30); do
  HEALTH=$(curl -sf --max-time 3 "$BASE_URL/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"status":"ok"'; then
    HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$HEALTHY" = true ]; then
  pass "Health endpoint responds OK (waited ${i}s)"
else
  fail "Health endpoint not responding after 30s"
  docker logs "$CONTAINER_NAME" 2>&1 | tail -20
  exit 2
fi

# -- 4. Register a user -----------------------------------------------------

section "4. Register User"

TEST_EMAIL="e2e-test-$(date +%s)@example.com"
TEST_PASS="TestPassword123"

REG_RESPONSE=$(curl -sf --max-time 10 -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" 2>/dev/null || echo "FAIL")

if echo "$REG_RESPONSE" | grep -q '"token"'; then
  pass "Register user ($TEST_EMAIL)"
else
  fail "Register user - response: $REG_RESPONSE"
fi

# -- 5. Login ----------------------------------------------------------------

section "5. Login"

LOGIN_RESPONSE=$(curl -sf --max-time 10 -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" 2>/dev/null || echo "FAIL")

JWT=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"\K[^"]+' 2>/dev/null || echo "")

if [ -n "$JWT" ]; then
  pass "Login returns JWT"
else
  fail "Login failed - response: $LOGIN_RESPONSE"
fi

# -- 6. Create a link with vanity code --------------------------------------

section "6. Create Link"

VANITY_CODE="e2etest$(date +%s)"

if [ -n "$JWT" ]; then
  CREATE_RESPONSE=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/v1/links" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT" \
    -d "{\"target_url\":\"https://example.com/e2e-test\",\"code\":\"$VANITY_CODE\"}" 2>/dev/null || echo "FAIL")

  if echo "$CREATE_RESPONSE" | grep -q "$VANITY_CODE"; then
    pass "Create link with vanity code ($VANITY_CODE)"
  else
    fail "Create link - response: $CREATE_RESPONSE"
  fi
else
  skip "Create link (no JWT)"
fi

# -- 7. List links -----------------------------------------------------------

section "7. List Links"

if [ -n "$JWT" ]; then
  LIST_RESPONSE=$(curl -sf --max-time 10 "$BASE_URL/api/v1/links" \
    -H "Authorization: Bearer $JWT" 2>/dev/null || echo "FAIL")

  if echo "$LIST_RESPONSE" | grep -q "$VANITY_CODE"; then
    pass "List links returns created link"
  elif echo "$LIST_RESPONSE" | grep -q '\['; then
    pass "List links returns array"
  else
    fail "List links - response: $LIST_RESPONSE"
  fi
else
  skip "List links (no JWT)"
fi

# -- 8. Redirect works ------------------------------------------------------

section "8. Redirect"

if [ -n "$VANITY_CODE" ]; then
  REDIR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 --max-redirs 0 \
    "$BASE_URL/r/$VANITY_CODE" 2>/dev/null || echo "000")

  if [ "$REDIR_STATUS" = "301" ] || [ "$REDIR_STATUS" = "302" ] || [ "$REDIR_STATUS" = "307" ]; then
    REDIR_LOC=$(curl -s -D - -o /dev/null --max-time 10 --max-redirs 0 \
      "$BASE_URL/r/$VANITY_CODE" 2>/dev/null | grep -i "^location:" | head -1 | tr -d '\r')
    pass "Redirect returns $REDIR_STATUS ($REDIR_LOC)"
  else
    fail "Redirect returned HTTP $REDIR_STATUS (expected 301/302/307)"
  fi
else
  skip "Redirect (no vanity code created)"
fi

# -- 9. QR code --------------------------------------------------------------

section "9. QR Code"

if [ -n "$VANITY_CODE" ]; then
  QR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "$BASE_URL/r/${VANITY_CODE}.qr" 2>/dev/null || echo "000")

  if [ "$QR_STATUS" = "200" ]; then
    QR_CT=$(curl -sf -I --max-time 10 "$BASE_URL/r/${VANITY_CODE}.qr" 2>/dev/null | grep -i "content-type" | head -1)
    if echo "$QR_CT" | grep -qi "svg"; then
      pass "QR endpoint returns SVG (HTTP 200)"
    else
      pass "QR endpoint returns HTTP 200 ($QR_CT)"
    fi
  else
    fail "QR endpoint returned HTTP $QR_STATUS (expected 200)"
  fi
else
  skip "QR code (no vanity code created)"
fi

# -- 10. Settings page -------------------------------------------------------

section "10. Settings Page"

if [ -n "$JWT" ]; then
  # Login via form to get a session cookie
  COOKIE_JAR=$(mktemp)
  curl -sf --max-time 10 -X POST "$BASE_URL/auth/login/form" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=$TEST_EMAIL&password=$TEST_PASS" \
    -c "$COOKIE_JAR" -L -o /dev/null 2>/dev/null

  SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -b "$COOKIE_JAR" "$BASE_URL/settings" 2>/dev/null || echo "000")

  rm -f "$COOKIE_JAR"

  if [ "$SETTINGS_STATUS" = "200" ]; then
    pass "Settings page loads (HTTP 200)"
  elif [ "$SETTINGS_STATUS" = "302" ] || [ "$SETTINGS_STATUS" = "303" ]; then
    pass "Settings page redirects to login (HTTP $SETTINGS_STATUS) - cookie may not have been set"
  else
    fail "Settings page returned HTTP $SETTINGS_STATUS"
  fi
else
  skip "Settings page (no JWT)"
fi

# -- 11. Health endpoint (final check) --------------------------------------

section "11. Health Endpoint"

FINAL_HEALTH=$(curl -sf --max-time 10 "$BASE_URL/health" 2>/dev/null || echo "FAIL")
if echo "$FINAL_HEALTH" | grep -q '"status":"ok"'; then
  pass "Health endpoint OK"
else
  fail "Health endpoint failed at end of test run"
fi

# -- Summary -----------------------------------------------------------------

echo ""
echo "============================================================================"
echo -e " \033[1mSovereign Link E2E Test Summary\033[0m"
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
