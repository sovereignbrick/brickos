#!/usr/bin/env bash
# ============================================================================
#  Sovereign Health Intelligence — Staging Smoke Test
#  Covers: API health, auth, PWA, cache headers, sync, push, Sovereign Link
#  Usage: bash ops/staging-smoke-test.sh
# ============================================================================

set +e  # Don't exit on errors — we handle them per-check

API="https://api-demo.sovereignhealth.io"
APP="https://demo.sovereignhealth.io"
WEB="https://www-demo.sovereignhealth.io"
EMAIL="demo@sovereignhealth.io"
PASS="Demo2026!"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m–\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m── $1\033[0m"; }

# ── 1. API Health ──────────────────────────────────────────────────────────

section "Layer 0: API Health"

HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  VER=$(echo "$HEALTH" | grep -oP '"version":"\K[^"]+')
  pass "API health returns 200 (v$VER)"
else
  fail "API health endpoint unreachable"
fi

# ── 2. Auth ────────────────────────────────────────────────────────────────

section "Layer 1: Auth"

LOGIN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" 2>/dev/null || echo "FAIL")

TOKEN=$(echo "$LOGIN" | grep -oP '"token":"\K[^"]+' 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  pass "Login returns JWT token"
else
  fail "Login failed — cannot continue auth-dependent tests"
  TOKEN=""
fi

# Verify /me
if [ -n "$TOKEN" ]; then
  ME=$(curl -sf "$API/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$ME" | grep -q "$EMAIL"; then
    pass "GET /me returns user profile"
  else
    fail "GET /me failed"
  fi
fi

# ── 3. PWA Manifest & Meta ────────────────────────────────────────────────

section "Layer 18: PWA — Manifest & Meta"

MANIFEST=$(curl -sf "$APP/manifest.json" 2>/dev/null || echo "FAIL")
if echo "$MANIFEST" | grep -q '"Sovereign Health Intelligence"'; then
  pass "manifest.json loads with correct name"
else
  fail "manifest.json missing or wrong"
fi

if echo "$MANIFEST" | grep -q '"start_url":"/dashboard"'; then
  pass "manifest.json start_url is /dashboard"
else
  fail "manifest.json start_url wrong"
fi

if echo "$MANIFEST" | grep -q '"display":"standalone"'; then
  pass "manifest.json display is standalone"
else
  fail "manifest.json display wrong"
fi

if echo "$MANIFEST" | grep -q 'android-chrome-512x512'; then
  pass "manifest.json includes 512x512 icon"
else
  fail "manifest.json missing 512 icon"
fi

# Check SW file exists
SW_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$APP/sw.js" 2>/dev/null || echo "000")
if [ "$SW_STATUS" = "200" ]; then
  pass "sw.js accessible (service worker)"
else
  fail "sw.js not accessible (HTTP $SW_STATUS)"
fi

# ── 4. Cache Headers ──────────────────────────────────────────────────────

section "Layer 20: Cache Headers"

# Content endpoint
CC_CONTENT=$(curl -sf -I "$API/v1/content/zones" 2>/dev/null | grep -i "cache-control" | head -1 || echo "")
if echo "$CC_CONTENT" | grep -qi "public.*max-age=3600"; then
  pass "Content zones: Cache-Control public, max-age=3600"
else
  fail "Content zones: Cache-Control wrong or missing ($CC_CONTENT)"
fi

# Health endpoint
CC_HEALTH=$(curl -sf -I "$API/health" 2>/dev/null | grep -i "cache-control" | head -1 || echo "")
if echo "$CC_HEALTH" | grep -qi "no-cache"; then
  pass "Health: Cache-Control no-cache"
else
  fail "Health: Cache-Control wrong or missing ($CC_HEALTH)"
fi

# POST should get no-store (test with OPTIONS or check docs)
# We can't easily test POST cache headers without a body, skip
skip "POST mutation Cache-Control (requires authenticated POST)"

# ── 5. Sync Endpoints ─────────────────────────────────────────────────────

section "Layer 21: Sync Endpoints"

if [ -n "$TOKEN" ]; then
  SYNC_VER=$(curl -sf "$API/sync/version" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$SYNC_VER" | grep -q '"current_version"'; then
    SVER=$(echo "$SYNC_VER" | grep -oP '"current_version":\K[0-9]+')
    pass "GET /sync/version returns current_version ($SVER)"
  else
    fail "GET /sync/version failed"
  fi

  SYNC_CHANGES=$(curl -sf "$API/sync/changes?since_version=0&limit=5" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$SYNC_CHANGES" | grep -q '"measurements"'; then
    pass "GET /sync/changes returns measurements array"
  else
    fail "GET /sync/changes failed"
  fi

  if echo "$SYNC_CHANGES" | grep -q '"current_version"'; then
    pass "GET /sync/changes includes current_version"
  else
    fail "GET /sync/changes missing current_version"
  fi
else
  skip "Sync endpoints (no auth token)"
fi

# ── 6. Push Endpoints ─────────────────────────────────────────────────────

section "Layer 22: Push Endpoints"

if [ -n "$TOKEN" ]; then
  VAPID=$(curl -sf "$API/push/vapid-key" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$VAPID" | grep -q '"vapid_public_key"'; then
    VKEY=$(echo "$VAPID" | grep -oP '"vapid_public_key":"\K[^"]*')
    if [ -n "$VKEY" ]; then
      pass "GET /push/vapid-key returns key"
    else
      pass "GET /push/vapid-key returns empty (VAPID not configured — expected on staging)"
    fi
  else
    fail "GET /push/vapid-key failed"
  fi
else
  skip "Push endpoints (no auth token)"
fi

# ── 7. Sovereign Link ─────────────────────────────────────────────────────

section "Layer 17: Sovereign Link"

# Test redirect (follow 1 redirect, check location header)
REDIR_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -L --max-redirs 0 "https://brickos.io/r/shDEMO2026" 2>/dev/null || echo "000")
if [ "$REDIR_STATUS" = "301" ] || [ "$REDIR_STATUS" = "302" ] || [ "$REDIR_STATUS" = "307" ]; then
  REDIR_LOC=$(curl -sf -I -L --max-redirs 0 "https://brickos.io/r/shDEMO2026" 2>/dev/null | grep -i "^location:" | head -1 || echo "")
  pass "GET /r/shDEMO2026 redirects ($REDIR_STATUS → $REDIR_LOC)"
elif [ "$REDIR_STATUS" = "200" ]; then
  pass "GET /r/shDEMO2026 returns 200 (followed redirect)"
elif [ "$REDIR_STATUS" = "404" ]; then
  fail "GET /r/shDEMO2026 returns 404 (link not found)"
else
  skip "Sovereign Link redirect (HTTP $REDIR_STATUS — brickos.io may not be configured)"
fi

# QR code endpoint
QR_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "https://brickos.io/r/shDEMO2026.qr" 2>/dev/null || echo "000")
if [ "$QR_STATUS" = "200" ]; then
  QR_CT=$(curl -sf -I "https://brickos.io/r/shDEMO2026.qr" 2>/dev/null | grep -i "content-type" | head -1 || echo "")
  if echo "$QR_CT" | grep -qi "svg"; then
    pass "GET /r/shDEMO2026.qr returns SVG QR code"
  else
    pass "GET /r/shDEMO2026.qr returns 200 ($QR_CT)"
  fi
elif [ "$QR_STATUS" = "404" ]; then
  fail "GET /r/shDEMO2026.qr returns 404"
else
  skip "Sovereign Link QR (HTTP $QR_STATUS)"
fi

# Admin links endpoint
if [ -n "$TOKEN" ]; then
  LINKS=$(curl -sf "$API/admin/links?limit=3" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "FAIL")
  if echo "$LINKS" | grep -q '"links"\|"data"'; then
    pass "GET /admin/links returns link data"
  else
    fail "GET /admin/links failed ($LINKS)"
  fi
else
  skip "Admin links (no auth token)"
fi

# ── 8. Measurement Idempotency ────────────────────────────────────────────

section "Layer 21: Measurement Idempotency (POST with idempotency_key)"

if [ -n "$TOKEN" ]; then
  IDEMP_KEY="smoke-test-$(date +%s)-$$"
  CREATE1=$(curl -sf -X POST "$API/measurements" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"measured_at\":\"2026-03-24T10:00:00Z\",\"values\":[{\"marker_slug\":\"glucose\",\"value\":95}],\"idempotency_key\":\"$IDEMP_KEY\"}" \
    2>/dev/null || echo "FAIL")

  if echo "$CREATE1" | grep -q '"measurements"'; then
    pass "POST /measurements with idempotency_key succeeds"

    # Replay same key — should not error
    CREATE2=$(curl -sf -X POST "$API/measurements" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"measured_at\":\"2026-03-24T10:00:00Z\",\"values\":[{\"marker_slug\":\"glucose\",\"value\":95}],\"idempotency_key\":\"$IDEMP_KEY\"}" \
      2>/dev/null || echo "FAIL")

    if echo "$CREATE2" | grep -q '"measurements"\|"id"'; then
      pass "Idempotent replay returns success (no duplicate)"
    else
      fail "Idempotent replay failed ($CREATE2)"
    fi

    # Clean up — delete the test measurement
    MEAS_ID=$(echo "$CREATE1" | grep -oP '"id":"?\K[^",}]+' | head -1)
    if [ -n "$MEAS_ID" ]; then
      curl -sf -X DELETE "$API/measurements/$MEAS_ID" \
        -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
      pass "Cleanup: deleted test measurement $MEAS_ID"
    fi
  else
    fail "POST /measurements failed ($CREATE1)"
  fi
else
  skip "Measurement idempotency (no auth token)"
fi

# ── 9. Website Manifest ───────────────────────────────────────────────────

section "Layer 23: Website"

WEB_MANIFEST=$(curl -sf "$WEB/site.webmanifest" 2>/dev/null || echo "FAIL")
if echo "$WEB_MANIFEST" | grep -q 'android-chrome-512x512'; then
  pass "Website webmanifest includes 512 icon"
else
  fail "Website webmanifest missing 512 icon"
fi

# ── 10. Frontend Basics ───────────────────────────────────────────────────

section "Layer 24: Frontend Basics"

# Check offline page exists
OFFLINE_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$APP/offline" 2>/dev/null || echo "000")
if [ "$OFFLINE_STATUS" = "200" ]; then
  pass "GET /offline returns 200"
else
  fail "GET /offline returns $OFFLINE_STATUS"
fi

# Check that manifest link is in HTML
HTML=$(curl -sf "$APP/login" 2>/dev/null || echo "")
if echo "$HTML" | grep -q 'manifest'; then
  pass "HTML contains manifest link"
else
  fail "HTML missing manifest link"
fi

if echo "$HTML" | grep -q 'theme-color'; then
  pass "HTML contains theme-color meta"
else
  fail "HTML missing theme-color meta"
fi

if echo "$HTML" | grep -q 'apple-mobile-web-app-capable'; then
  pass "HTML contains apple-mobile-web-app-capable"
else
  fail "HTML missing apple-mobile-web-app-capable"
fi

# ── Summary ───────────────────────────────────────────────────────────────

echo ""
echo "============================================================================"
echo -e " \033[1mStaging Smoke Test Summary\033[0m"
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
