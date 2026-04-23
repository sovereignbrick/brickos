#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0
#
# Sprint 053 Phase E: end-to-end smoke test of the PUBLISHED Docker Hub
# images. Meant to run on a scratch VM / LXC / CI box with nothing
# pre-warm: no local repo clone, no existing volumes, no prior install.
#
# What Playwright smoke missed in v1.0.0: two latent bugs surfaced only
# on a truly fresh install (hex ENCRYPTION_KEY + localhost API resolver).
# This script simulates that first-install surface so the next time we
# cut a selfhosted/* tag, we catch such bugs BEFORE the user does.
#
# Usage:
#   bash ops/docker-hub-smoke.sh                   # test :latest
#   bash ops/docker-hub-smoke.sh 1.0.1             # test a specific tag
#   SMOKE_KEEP=1 bash ops/docker-hub-smoke.sh      # don't tear down at end
#
# Requirements:
#   - docker + docker compose plugin
#   - curl, jq
#   - ~4 GB free RAM, ~2 GB disk for image pulls
#
# Exit codes:
#   0  -- all smoke checks passed
#   1  -- any step failed (images pull, backend health, signup, login, etc.)
#
# Safe to run alongside a real sh-install.sh instance: uses a separate
# compose project name + port range. Tears down at the end unless
# SMOKE_KEEP=1 is set.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
VERSION="${1:-latest}"
SMOKE_PROJECT="shi-smoke-$$"
SMOKE_DIR="$(mktemp -d -t shi-smoke-XXXXXX)"

# Separate port range so this can run alongside a real install.
SMOKE_BACKEND_PORT=18080
SMOKE_FRONTEND_PORT=13000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SMOKE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; cleanup; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

cleanup() {
    if [ "${SMOKE_KEEP:-0}" = "1" ]; then
        warn "SMOKE_KEEP=1 set -- leaving containers + volumes for inspection."
        warn "  project: $SMOKE_PROJECT"
        warn "  dir:     $SMOKE_DIR"
        return 0
    fi
    log "Tearing down..."
    docker compose -p "$SMOKE_PROJECT" -f "$SMOKE_DIR/compose.yml" --env-file "$SMOKE_DIR/.env" down -v 2>/dev/null || true
    rm -rf "$SMOKE_DIR"
}
trap cleanup EXIT

# ── Prereqs ────────────────────────────────────────────────────────────
log "Checking prereqs..."
command -v docker >/dev/null 2>&1 || fail "docker not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin missing"
command -v curl >/dev/null 2>&1 || fail "curl not installed"
command -v jq >/dev/null 2>&1 || fail "jq not installed"
docker info >/dev/null 2>&1 || fail "docker daemon not reachable"
log "Prereqs OK."

# ── Write a scratch compose file + .env ────────────────────────────────
# Mirrors ops/docker-compose.selfhosted.yml but on different ports + a
# different compose project name so it doesn't collide with a real install.
log "Writing compose + env in $SMOKE_DIR..."

cat > "$SMOKE_DIR/.env" <<EOF
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '+/=' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '+/=' | head -c 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SHI_VERSION=$VERSION
SHI_MODE=oss
FRONTEND_URL=http://localhost:$SMOKE_FRONTEND_PORT
REGISTRATION_ENABLED=true
RUST_LOG=warn
DEPLOY_ENVIRONMENT=smoke
AI_PROVIDER=none
EOF
chmod 600 "$SMOKE_DIR/.env"

cat > "$SMOKE_DIR/compose.yml" <<EOF
services:
  backend:
    image: sovereignbrick/shi-api:\${SHI_VERSION}
    ports:
      - "127.0.0.1:$SMOKE_BACKEND_PORT:8080"
    environment:
      DATABASE_URL: postgres://sovereign_health:\${DB_PASSWORD}@db:5432/sovereign_health
      JWT_SECRET: \${JWT_SECRET}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      SHI_MODE: \${SHI_MODE}
      FRONTEND_URL: \${FRONTEND_URL}
      REGISTRATION_ENABLED: \${REGISTRATION_ENABLED}
      RUST_LOG: \${RUST_LOG}
      DEPLOY_ENVIRONMENT: \${DEPLOY_ENVIRONMENT}
      AI_PROVIDER: \${AI_PROVIDER}
    depends_on:
      db:
        condition: service_healthy
  frontend:
    image: sovereignbrick/shi-web:\${SHI_VERSION}
    ports:
      - "127.0.0.1:$SMOKE_FRONTEND_PORT:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:$SMOKE_BACKEND_PORT
      NEXT_PUBLIC_MODE: oss
  db:
    image: sovereignbrick/shi-postgres:\${SHI_VERSION}
    environment:
      POSTGRES_DB: sovereign_health
      POSTGRES_USER: sovereign_health
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    command:
      - "postgres"
      - "-c"
      - "shared_preload_libraries=pgaudit"
      - "-c"
      - "pgaudit.log=write,ddl"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sovereign_health"]
      interval: 5s
      timeout: 5s
      retries: 10
EOF

# ── Pull + start ───────────────────────────────────────────────────────
log "Pulling sovereignbrick/shi-{api,web,postgres}:$VERSION..."
docker compose -p "$SMOKE_PROJECT" -f "$SMOKE_DIR/compose.yml" --env-file "$SMOKE_DIR/.env" pull 2>&1 | tail -3

log "Starting stack..."
docker compose -p "$SMOKE_PROJECT" -f "$SMOKE_DIR/compose.yml" --env-file "$SMOKE_DIR/.env" up -d

# ── Wait for backend health ────────────────────────────────────────────
log "Waiting for backend health (up to 90s)..."
tries=0
until curl -sf "http://localhost:$SMOKE_BACKEND_PORT/health" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -ge 90 ]; then
        docker compose -p "$SMOKE_PROJECT" -f "$SMOKE_DIR/compose.yml" logs backend --tail 30
        fail "Backend did not become healthy within 90s. See logs above."
    fi
    sleep 1
done
log "Backend healthy after ${tries}s."

# ── Assertions ─────────────────────────────────────────────────────────
log "Asserting /health response shape..."
HEALTH_JSON=$(curl -s "http://localhost:$SMOKE_BACKEND_PORT/health")
echo "$HEALTH_JSON" | jq -e '.status == "ok"' >/dev/null || fail "/health status != ok"
log "  status=ok"

log "Asserting frontend serves HTML..."
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$SMOKE_FRONTEND_PORT/")
[ "$FRONT_STATUS" = "200" ] || fail "Frontend returned $FRONT_STATUS (expected 200)"
log "  frontend HTTP $FRONT_STATUS"

# ── Signup flow (OSS auto-verify) ──────────────────────────────────────
log "Signup via API (OSS auto-verify should return a token)..."
SIGNUP_EMAIL="smoke+$$@example.test"
SIGNUP_PW="smoke-pass-$$-long-enough-12345"
SIGNUP_JSON=$(curl -s -X POST "http://localhost:$SMOKE_BACKEND_PORT/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SIGNUP_EMAIL\",\"password\":\"$SIGNUP_PW\",\"tos_accepted\":true}")
TOKEN=$(echo "$SIGNUP_JSON" | jq -r '.data.token // empty')
[ -n "$TOKEN" ] || { echo "$SIGNUP_JSON"; fail "Signup did not return token -- OSS auto-verify broken"; }
log "  got token (${#TOKEN} chars)"

# ── Authenticated /auth/me ─────────────────────────────────────────────
log "GET /auth/me with token..."
ME_JSON=$(curl -s "http://localhost:$SMOKE_BACKEND_PORT/auth/me" \
  -H "Authorization: Bearer $TOKEN")
ME_EMAIL=$(echo "$ME_JSON" | jq -r '.data.email // empty')
[ "$ME_EMAIL" = "$SIGNUP_EMAIL" ] || { echo "$ME_JSON"; fail "/auth/me returned unexpected email"; }
log "  /auth/me returned $ME_EMAIL"

# ── First-user admin promotion ─────────────────────────────────────────
log "Asserting first signup was promoted to admin..."
ME_ROLE=$(echo "$ME_JSON" | jq -r '.data.role // empty')
[ "$ME_ROLE" = "admin" ] || fail "First signup role=$ME_ROLE (expected admin -- bootstrap broken)"
log "  role=admin confirmed"

# ── All good ───────────────────────────────────────────────────────────
log ""
log "============================================================"
log "  SMOKE PASSED for sovereignbrick/shi-*:$VERSION"
log ""
log "  Tested:"
log "    - docker pull + compose up"
log "    - backend /health returns 200 within 90s"
log "    - frontend serves HTTP 200 on /"
log "    - signup auto-verifies in OSS mode (token returned)"
log "    - /auth/me works with the token"
log "    - first signup promoted to admin"
log "============================================================"
