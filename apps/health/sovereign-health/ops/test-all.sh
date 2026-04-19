#!/bin/bash
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE — Full Test Suite
#
#  Runs all tests: backend (Rust) + frontend (Node) + security audits.
#  Use this before commits, releases, or deploys.
#
#  Usage:
#    bash ops/test-all.sh           # Full suite (needs DB)
#    bash ops/test-all.sh --quick   # Quick: smoke + frontend only (no DB)
#    bash ops/test-all.sh --ci      # CI mode: strict, no interactive
#
#  https://sovereignhealth.io/
#  AGPL-3.0 — https://github.com/sovereignbrick/brickos
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$APP_ROOT/api"
FRONTEND_DIR="$APP_ROOT/frontend"
WEBSITE_DIR="$APP_ROOT/website"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

PASSED=0
FAILED=0
SKIPPED=0
START_TIME=$(date +%s)

run_test() {
    local name="$1"
    shift
    log "Running: $name"
    if "$@" 2>&1; then
        echo -e "  ${GREEN}PASS${NC} $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}FAIL${NC} $name"
        FAILED=$((FAILED + 1))
    fi
}

skip_test() {
    echo -e "  ${YELLOW}SKIP${NC} $1 — $2"
    SKIPPED=$((SKIPPED + 1))
}

MODE="${1:-full}"

echo ""
echo -e "${BOLD}============================================================================${NC}"
echo -e "${BOLD} SOVEREIGN HEALTH INTELLIGENCE — Test Suite${NC}"
echo "============================================================================"
echo ""
echo "  Mode:     $MODE"
echo "  Date:     $(date '+%Y-%m-%d %H:%M:%S')"
echo "  API:      $API_DIR"
echo "  Frontend: $FRONTEND_DIR"
echo ""

# ── Backend: Lint ────────────────────────────────────────────────────────────

log "=== Backend Lint ==="
cd "$API_DIR"
run_test "cargo fmt check" cargo fmt -- --check
run_test "cargo clippy" cargo clippy --all-targets -- -D warnings

# ── Backend: Smoke Tests ─────────────────────────────────────────────────────

log "=== Backend Smoke Tests ==="
run_test "smoke tests" cargo test --test smoke

# ── Backend: Integration Tests ───────────────────────────────────────────────

log "=== Backend Integration Tests ==="
INSTA_UPDATE=no run_test "integration tests" cargo test --test integration

# ── Backend: Property Tests ──────────────────────────────────────────────────

log "=== Backend Property Tests ==="
PROPTEST_CASES=100 run_test "property tests (100 cases)" cargo test --test property

if [ "$MODE" = "--quick" ]; then
    info "Quick mode — skipping DB tests"
else
    # ── Backend: DB Tests ────────────────────────────────────────────────────

    if [ -n "$DATABASE_URL" ]; then
        log "=== Backend DB Tests ==="
        run_test "auth tests" cargo test --test auth_test
        run_test "measurement tests" cargo test --test measurement_test
        run_test "tier tests" cargo test --test tier_test
        run_test "doctor chat tests" cargo test --test doctor_chat_test
    else
        skip_test "DB tests" "DATABASE_URL not set"
    fi
fi

# ── Backend: Security Audit ──────────────────────────────────────────────────

log "=== Security Audit ==="
if command -v cargo-audit &>/dev/null; then
    run_test "cargo audit" cargo audit
else
    skip_test "cargo audit" "not installed (cargo install cargo-audit)"
fi

# ── Frontend: Tests ──────────────────────────────────────────────────────────

log "=== Frontend Tests ==="
cd "$FRONTEND_DIR"

if [ -d "node_modules" ]; then
    run_test "vitest" pnpm test
else
    info "Installing frontend dependencies..."
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    run_test "vitest" pnpm test
fi

# ── Frontend: Build Check ────────────────────────────────────────────────────

log "=== Frontend Build ==="
run_test "next build" pnpm build

# ── Frontend: Playwright E2E (optional -- requires dev server on :3000) ─────

if [ "$MODE" = "--ci" ] || [ "$MODE" = "--e2e" ]; then
    log "=== Playwright E2E ==="
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
        E2E_BASE_URL=http://localhost:3000 run_test "playwright e2e" npx playwright test --reporter=line
    else
        skip_test "playwright e2e" "dev server not running on :3000"
    fi
fi

# ── Report ───────────────────────────────────────────────────────────────────

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))
TOTAL=$((PASSED + FAILED + SKIPPED))

echo ""
echo -e "${BOLD}============================================================================${NC}"
echo -e "${BOLD} TEST REPORT — Sovereign Health Intelligence${NC}"
echo "============================================================================"
echo ""
echo "  Duration:  ${MINUTES}m ${SECONDS}s"
echo "  Total:     $TOTAL"
echo -e "  Passed:    ${GREEN}$PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  Failed:    ${RED}$FAILED${NC}"
else
    echo -e "  Failed:    $FAILED"
fi
if [ $SKIPPED -gt 0 ]; then
    echo -e "  Skipped:   ${YELLOW}$SKIPPED${NC}"
else
    echo -e "  Skipped:   $SKIPPED"
fi
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}RESULT: FAILED${NC}"
    echo ""
    exit 1
else
    echo -e "  ${GREEN}RESULT: PASSED${NC}"
    echo ""
    exit 0
fi
