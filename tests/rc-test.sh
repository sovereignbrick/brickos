#!/usr/bin/env bash
# ============================================================================
#  BrickOS RC (Release Candidate) Test Runner
#  Runs all test suites in sequence and reports aggregate results.
#
#  Usage:
#    ./tests/rc-test.sh staging
#    ./tests/rc-test.sh production
# ============================================================================

set +e

ENV="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

case "$ENV" in
  staging|production) ;;
  *)
    echo "Usage: $0 <staging|production>"
    exit 2
    ;;
esac

# ── Output helpers ────────────────────────────────────────────────────────

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
SUITE_RESULTS=""

pass() { echo -e "  \033[32m✓\033[0m $1"; }
fail() { echo -e "  \033[31m✗\033[0m $1"; }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; }

record_suite() {
  local name="$1"
  local exit_code="$2"
  local status

  if [ "$exit_code" -eq 0 ]; then
    status="\033[32mPASSED\033[0m"
    ((TOTAL_PASS++))
  elif [ "$exit_code" -eq 2 ]; then
    status="\033[33mSKIPPED\033[0m"
    ((TOTAL_SKIP++))
  else
    status="\033[31mFAILED\033[0m"
    ((TOTAL_FAIL++))
  fi

  SUITE_RESULTS="${SUITE_RESULTS}\n  $(printf '%-40s' "$name") $status"
}

echo "============================================================================"
echo "  BrickOS RC Test Runner"
echo "  Environment: $ENV"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================================"

# ── Suite 1: Platform Smoke Test ─────────────────────────────────────────

echo ""
echo -e "\033[1m================================================================\033[0m"
echo -e "\033[1m  Suite 1: Platform Smoke Test\033[0m"
echo -e "\033[1m================================================================\033[0m"

if [ -x "$SCRIPT_DIR/platform-smoke.sh" ]; then
  bash "$SCRIPT_DIR/platform-smoke.sh" "$ENV"
  SMOKE_EXIT=$?
  record_suite "Platform Smoke Test" $SMOKE_EXIT
else
  echo "  Script not found: $SCRIPT_DIR/platform-smoke.sh"
  record_suite "Platform Smoke Test" 2
fi

# ── Suite 2: Platform DB Test ────────────────────────────────────────────

echo ""
echo -e "\033[1m================================================================\033[0m"
echo -e "\033[1m  Suite 2: Platform DB Integrity Test\033[0m"
echo -e "\033[1m================================================================\033[0m"

if [ -x "$SCRIPT_DIR/platform-db-test.sh" ]; then
  bash "$SCRIPT_DIR/platform-db-test.sh" "$ENV"
  DB_EXIT=$?
  record_suite "Platform DB Integrity Test" $DB_EXIT
else
  echo "  Script not found: $SCRIPT_DIR/platform-db-test.sh"
  record_suite "Platform DB Integrity Test" 2
fi

# ── Suite 3: SHI Backend Cargo Tests ────────────────────────────────────

echo ""
echo -e "\033[1m================================================================\033[0m"
echo -e "\033[1m  Suite 3: SHI Backend Smoke Tests (cargo)\033[0m"
echo -e "\033[1m================================================================\033[0m"

SHI_BACKEND="$REPO_ROOT/apps/health/sovereign-health/api"
if [ -f "$SHI_BACKEND/Cargo.toml" ]; then
  (cd "$REPO_ROOT" && cargo test -p sovereign-health-backend --test smoke 2>&1)
  CARGO_SHI_EXIT=$?
  record_suite "SHI Backend Smoke (cargo)" $CARGO_SHI_EXIT
else
  echo "  SHI backend not found at $SHI_BACKEND"
  record_suite "SHI Backend Smoke (cargo)" 2
fi

# ── Suite 4: Sovereign Link Cargo Tests ─────────────────────────────────

echo ""
echo -e "\033[1m================================================================\033[0m"
echo -e "\033[1m  Suite 4: Sovereign Link Tests (cargo)\033[0m"
echo -e "\033[1m================================================================\033[0m"

SL_DIR="$REPO_ROOT/apps/technology/sovereign-link"
if [ -f "$SL_DIR/Cargo.toml" ]; then
  (cd "$REPO_ROOT" && cargo test -p sovereign-link --features standalone --no-default-features 2>&1)
  CARGO_SL_EXIT=$?
  record_suite "Sovereign Link (cargo)" $CARGO_SL_EXIT
else
  echo "  Sovereign Link not found at $SL_DIR"
  record_suite "Sovereign Link (cargo)" 2
fi

# ── Suite 5: SHI E2E Playwright Tests ───────────────────────────────────

echo ""
echo -e "\033[1m================================================================\033[0m"
echo -e "\033[1m  Suite 5: SHI E2E Tests (Playwright)\033[0m"
echo -e "\033[1m================================================================\033[0m"

E2E_DIR="$REPO_ROOT/apps/health/sovereign-health/frontend"

case "$ENV" in
  staging)
    export E2E_API_URL="https://api-demo.sovereignhealth.io"
    export BASE_URL="https://demo.sovereignhealth.io"
    export E2E_USER_EMAIL="demo@sovereignhealth.io"
    export E2E_USER_PASSWORD="SovereignDemo1"
    ;;
  production)
    export E2E_API_URL="https://api.sovereignhealth.io"
    export BASE_URL="https://app.sovereignhealth.io"
    # Production E2E credentials should be set externally
    ;;
esac

if [ -f "$E2E_DIR/package.json" ] && command -v npx >/dev/null 2>&1; then
  if [ -n "$E2E_USER_EMAIL" ]; then
    (cd "$E2E_DIR" && npx playwright test --reporter=list 2>&1)
    E2E_EXIT=$?
    record_suite "SHI E2E (Playwright)" $E2E_EXIT
  else
    echo "  E2E_USER_EMAIL not set, skipping E2E tests"
    record_suite "SHI E2E (Playwright)" 2
  fi
else
  echo "  Playwright not available or frontend not found at $E2E_DIR"
  record_suite "SHI E2E (Playwright)" 2
fi

# ── Aggregate Summary ───────────────────────────────────────────────────

echo ""
echo "============================================================================"
echo -e " \033[1mRC Test Runner - Aggregate Summary ($ENV)\033[0m"
echo "============================================================================"
echo -e "$SUITE_RESULTS"
echo ""
echo "  ──────────────────────────────────────────────"
echo -e "  \033[32mSuites passed:\033[0m  $TOTAL_PASS"
echo -e "  \033[31mSuites failed:\033[0m  $TOTAL_FAIL"
echo -e "  \033[33mSuites skipped:\033[0m $TOTAL_SKIP"
echo "  Total suites:    $((TOTAL_PASS + TOTAL_FAIL + TOTAL_SKIP))"
echo ""

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo -e "  \033[31mRC VERDICT: FAIL - Do not deploy\033[0m"
  exit 1
else
  echo -e "  \033[32mRC VERDICT: PASS - Ready to deploy\033[0m"
  exit 0
fi
