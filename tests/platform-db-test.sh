#!/usr/bin/env bash
# ============================================================================
#  BrickOS Platform DB Integrity Test
#  Validates database structure after platform schema migration.
#
#  Usage:
#    ./tests/platform-db-test.sh staging
#    ./tests/platform-db-test.sh production
# ============================================================================

set +e

# ── Configuration ─────────────────────────────────────────────────────────

ENV="${1:-staging}"
VPS="root@72.61.154.115"

case "$ENV" in
  staging)
    DB_CONTAINER="sh-staging-db"
    DB_NAME="sovereign_health_staging"
    ;;
  production)
    DB_CONTAINER="sovereign-health-db-1"
    DB_NAME="sovereign_health"
    ;;
  *)
    echo "Usage: $0 <staging|production>"
    exit 2
    ;;
esac

DB_USER="sovereign_health"

# ── Output helpers ────────────────────────────────────────────────────────

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo -e "  \033[32m✓\033[0m $1"; ((PASS_COUNT++)); }
fail() { echo -e "  \033[31m✗\033[0m $1"; ((FAIL_COUNT++)); }
skip() { echo -e "  \033[33m-\033[0m $1 (skipped)"; ((SKIP_COUNT++)); }
section() { echo -e "\n\033[1m── $1 ──\033[0m"; }

echo "============================================================================"
echo "  BrickOS Platform DB Integrity Test"
echo "  Environment: $ENV"
echo "  Container: $DB_CONTAINER"
echo "  Database: $DB_NAME"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================================"

# ── DB query helper ──────────────────────────────────────────────────────

run_q() {
  local query="$1"
  ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS" \
    "docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \"$query\"" 2>/dev/null
}

# Connectivity check
CONN_CHECK=$(run_q "SELECT 1")
if [ "$CONN_CHECK" != "1" ]; then
  echo ""
  fail "Cannot connect to database via SSH + docker exec"
  echo "  Ensure SSH access to $VPS and container $DB_CONTAINER is running."
  echo ""
  echo "============================================================================"
  echo -e "  \033[31mResult: DB UNREACHABLE - 0 passed, 1 failed, 0 skipped\033[0m"
  echo "============================================================================"
  exit 1
fi

pass "Database connection established"

# ── 1. brickos schema exists ─────────────────────────────────────────────

section "1. Schema Structure"

SCHEMA_EXISTS=$(run_q "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'brickos')")
if [ "$SCHEMA_EXISTS" = "t" ]; then
  pass "1. brickos schema exists"
else
  fail "1. brickos schema does not exist"
fi

# ── 2. Table count in brickos schema ────────────────────────────────────

BRICKOS_TABLES=$(run_q "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'brickos' AND table_type = 'BASE TABLE'")
if [ -n "$BRICKOS_TABLES" ] && [ "$BRICKOS_TABLES" -ge 37 ] 2>/dev/null; then
  pass "2. brickos schema has $BRICKOS_TABLES tables (>= 37)"
else
  fail "2. brickos schema has ${BRICKOS_TABLES:-0} tables (expected >= 37)"
fi

# ── 3. Table count in public schema ─────────────────────────────────────

PUBLIC_TABLES=$(run_q "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
if [ -n "$PUBLIC_TABLES" ] && [ "$PUBLIC_TABLES" -ge 50 ] 2>/dev/null; then
  pass "3. public schema has $PUBLIC_TABLES tables (>= 50)"
else
  fail "3. public schema has ${PUBLIC_TABLES:-0} tables (expected >= 50)"
fi

# ── 4. search_path includes brickos ─────────────────────────────────────

SEARCH_PATH=$(run_q "SHOW search_path")
if echo "$SEARCH_PATH" | grep -q "brickos"; then
  pass "4. search_path includes brickos ($SEARCH_PATH)"
else
  fail "4. search_path does not include brickos ($SEARCH_PATH)"
fi

# ── 5. Key platform tables exist ────────────────────────────────────────

section "5. Platform Tables"

PLATFORM_TABLES="users organizations org_members app_roles short_links service_accounts reserved_codes"
for tbl in $PLATFORM_TABLES; do
  EXISTS=$(run_q "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '$tbl' AND table_schema = 'brickos')")
  if [ "$EXISTS" = "t" ]; then
    pass "5. brickos.$tbl exists"
  else
    # Check if it exists in public (not yet migrated)
    PUB_EXISTS=$(run_q "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '$tbl' AND table_schema = 'public')")
    if [ "$PUB_EXISTS" = "t" ]; then
      fail "5. $tbl exists in public but not in brickos (not migrated)"
    else
      fail "5. $tbl does not exist in any schema"
    fi
  fi
done

# ── 6. Key SHI tables remain ────────────────────────────────────────────

section "6. SHI Domain Tables"

SHI_TABLES="measurements markers zones devices"
for tbl in $SHI_TABLES; do
  EXISTS=$(run_q "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '$tbl')")
  if [ "$EXISTS" = "t" ]; then
    pass "6. $tbl table exists"
  else
    fail "6. $tbl table missing"
  fi
done

# ── 7. Unqualified query: users ──────────────────────────────────────────

section "7-8. Unqualified Query Resolution"

USERS_COUNT=$(run_q "SELECT count(*) FROM users")
if [ -n "$USERS_COUNT" ] && [ "$USERS_COUNT" -ge 0 ] 2>/dev/null; then
  pass "7. SELECT count(*) FROM users resolves ($USERS_COUNT rows)"
else
  fail "7. Unqualified SELECT FROM users failed"
fi

# ── 8. Unqualified query: measurements ───────────────────────────────────

MEAS_COUNT=$(run_q "SELECT count(*) FROM measurements")
if [ -n "$MEAS_COUNT" ] && [ "$MEAS_COUNT" -ge 0 ] 2>/dev/null; then
  pass "8. SELECT count(*) FROM measurements resolves ($MEAS_COUNT rows)"
else
  fail "8. Unqualified SELECT FROM measurements failed"
fi

# ── 9. Foreign key integrity ────────────────────────────────────────────

section "9. Foreign Key Integrity"

# Sample check: every measurement has a valid user
ORPHAN_MEAS=$(run_q "SELECT count(*) FROM measurements m LEFT JOIN users u ON m.user_id = u.id WHERE u.id IS NULL")
if [ -n "$ORPHAN_MEAS" ] && [ "$ORPHAN_MEAS" -eq 0 ] 2>/dev/null; then
  pass "9. No orphan measurements (all user_id references valid)"
elif [ -n "$ORPHAN_MEAS" ]; then
  fail "9. Found $ORPHAN_MEAS measurements with invalid user_id"
else
  fail "9. FK integrity check query failed"
fi

# ── 10. No orphan users (users without personal org) ────────────────────

section "10. Data Consistency"

# From design-006: every user should have a personal org
ORPHAN_USERS=$(run_q "SELECT count(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM organizations o JOIN org_members om ON o.id = om.org_id WHERE om.user_id = u.id AND o.org_type = 'personal')")
if [ -n "$ORPHAN_USERS" ] && [ "$ORPHAN_USERS" -eq 0 ] 2>/dev/null; then
  pass "10. No orphan users (all have personal org)"
elif [ -n "$ORPHAN_USERS" ]; then
  fail "10. Found $ORPHAN_USERS users without a personal organization"
else
  # Organizations may not exist yet if migration hasn't run
  skip "10. Orphan users check (organizations table may not be populated)"
fi

# ── 11. reserved_codes seeded ───────────────────────────────────────────

section "11. Seed Data"

RC_COUNT=$(run_q "SELECT count(*) FROM reserved_codes" 2>/dev/null)
if [ -n "$RC_COUNT" ] && [ "$RC_COUNT" -ge 30 ] 2>/dev/null; then
  pass "11. reserved_codes has $RC_COUNT entries (>= 30)"
elif [ -n "$RC_COUNT" ]; then
  fail "11. reserved_codes has only $RC_COUNT entries (expected >= 30)"
else
  skip "11. reserved_codes check (table may not exist yet)"
fi

# ── 12. license_tiers has app_key column ────────────────────────────────

section "12. Schema Evolution"

APP_KEY_EXISTS=$(run_q "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'license_tiers' AND column_name = 'app_key')")
if [ "$APP_KEY_EXISTS" = "t" ]; then
  pass "12. license_tiers has app_key column"
else
  fail "12. license_tiers missing app_key column"
fi

# ── 13. Index count in brickos schema ───────────────────────────────────

section "13. Indexes"

IDX_COUNT=$(run_q "SELECT count(*) FROM pg_indexes WHERE schemaname = 'brickos'")
if [ -n "$IDX_COUNT" ] && [ "$IDX_COUNT" -gt 0 ] 2>/dev/null; then
  pass "13. brickos schema has $IDX_COUNT indexes"
else
  if [ "$SCHEMA_EXISTS" = "t" ]; then
    fail "13. No indexes found in brickos schema"
  else
    skip "13. Index count (brickos schema does not exist)"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────

echo ""
echo "============================================================================"
echo -e " \033[1mPlatform DB Integrity Test Summary ($ENV)\033[0m"
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
