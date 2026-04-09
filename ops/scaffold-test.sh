#!/usr/bin/env bash
# ============================================================================
# BrickOS Scaffold Integration Test
# ============================================================================
# Generates a test app, registers it in the workspace, verifies it compiles
# cleanly (fmt + clippy -D warnings), then cleans up.
#
# Usage: bash ops/scaffold-test.sh
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TEST_NAME="test-scaffold"
TEST_PREFIX="tst"
TEST_PILLAR="technology"
TEST_PORT="9998"
TEST_DIR="apps/${TEST_PILLAR}/${TEST_NAME}"
TEST_CRATE="${TEST_NAME}-api"
PASS=true

cleanup() {
    echo ""
    echo "[CLEANUP] Removing test app..."
    rm -rf "${REPO_ROOT}/${TEST_DIR}"
    # Remove workspace registration
    sed -i "/${TEST_DIR//\//\\/}/d" "${REPO_ROOT}/Cargo.toml"
    echo "[CLEANUP] Done."
}

trap cleanup EXIT

echo "============================================================"
echo "BrickOS Scaffold Integration Test"
echo "============================================================"
echo ""

# -- Step 1: Generate test app -----------------------------------------------
echo "[1/5] Generating test app..."
if [[ -d "${TEST_DIR}" ]]; then
    echo "  Cleaning previous test run..."
    rm -rf "${TEST_DIR}"
    sed -i "/${TEST_DIR//\//\\/}/d" Cargo.toml
fi

bash ops/scaffold-app.sh "${TEST_NAME}" "${TEST_PREFIX}" "${TEST_PILLAR}" "${TEST_PORT}" "Test Scaffold" 2>&1 | tail -5
echo ""

# -- Step 2: Register in workspace -------------------------------------------
echo "[2/5] Registering in workspace Cargo.toml..."
if ! grep -q "${TEST_DIR}/api" Cargo.toml; then
    sed -i "/# \"apps\/finance\/btc-tracker\/api\"/i\\    \"${TEST_DIR}/api\"," Cargo.toml
    echo "  Registered: ${TEST_DIR}/api"
fi

# -- Step 3: cargo fmt -------------------------------------------------------
echo "[3/5] Checking cargo fmt..."
if cargo fmt -p "${TEST_CRATE}" -- --check 2>&1; then
    echo "  PASS: cargo fmt clean"
else
    echo "  FAIL: cargo fmt has diffs"
    PASS=false
fi

# -- Step 4: cargo clippy ----------------------------------------------------
echo "[4/5] Checking cargo clippy..."
if cargo clippy -p "${TEST_CRATE}" -- -D warnings 2>&1 | tail -3; then
    echo "  PASS: cargo clippy clean"
else
    echo "  FAIL: cargo clippy has errors"
    PASS=false
fi

# -- Step 5: Verify file count -----------------------------------------------
echo "[5/5] Checking generated files..."
FILE_COUNT=$(find "${TEST_DIR}" -type f | wc -l)
echo "  Generated ${FILE_COUNT} files"

if [[ ${FILE_COUNT} -lt 30 ]]; then
    echo "  FAIL: Expected at least 30 files, got ${FILE_COUNT}"
    PASS=false
else
    echo "  PASS: File count OK"
fi

# -- Result -------------------------------------------------------------------
echo ""
echo "============================================================"
if $PASS; then
    echo "RESULT: ALL CHECKS PASSED"
    echo "Scaffold generates clean, compilable code with zero manual fixes."
else
    echo "RESULT: SOME CHECKS FAILED"
    echo "Review output above for details."
fi
echo "============================================================"

$PASS
