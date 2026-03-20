#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
#
# Pre-flight checks — run before every commit and deploy.
# Fails on first error. Covers: fmt, clippy, backend tests, frontend
# build, frontend tests, and theme audit.
#
# Usage:
#   bash ops/preflight.sh          # Full preflight
#   bash ops/preflight.sh --quick  # Skip frontend build (faster)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ROOT="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(cd "$APP_ROOT/../../.." && pwd)"
API_DIR="$APP_ROOT/api"
FRONTEND_DIR="$APP_ROOT/frontend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASSED=0
FAILED=0
START=$(date +%s)

run() {
    local name="$1"; shift
    echo -e "${BOLD}▸${NC} $name"
    if "$@" 2>&1 | tail -3; then
        echo -e "  ${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗${NC} $name"
        FAILED=$((FAILED + 1))
        echo -e "\n${RED}FAILED:${NC} $name — fix before committing.\n"
        exit 1
    fi
}

MODE="${1:-full}"

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Sovereign Health — Pre-flight Checks${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# Backend
cd "$MONOREPO_ROOT"
run "cargo fmt --check"      cargo fmt --check -p sovereign-health-backend
run "cargo clippy"            cargo clippy -p sovereign-health-backend --all-targets -- -D warnings
run "cargo test (smoke)"      cargo test -p sovereign-health-backend --test smoke
run "INSTA_UPDATE=no integration" env INSTA_UPDATE=no cargo test -p sovereign-health-backend --test integration
run "cargo test (property)"   env PROPTEST_CASES=100 cargo test -p sovereign-health-backend --test property

# Frontend
cd "$FRONTEND_DIR"
run "vitest"                  pnpm test

if [ "$MODE" != "--quick" ]; then
    run "pnpm build"          pnpm build
fi

# Theme audit
if [ -f "$FRONTEND_DIR/scripts/check-theme-colors.sh" ]; then
    run "theme audit"         bash "$FRONTEND_DIR/scripts/check-theme-colors.sh"
fi

# Report
END=$(date +%s)
DUR=$((END - START))

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}ALL CHECKS PASSED${NC} ($PASSED checks, ${DUR}s)"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
