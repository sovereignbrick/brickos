#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0
#
# Publish release images to Docker Hub so self-hosted users can
# `docker pull` instead of building from source. Companion to
# deploy.sh -- deploy.sh ships to our VPS; this script ships to the
# world.
#
# Usage:
#   bash ops/publish-docker-hub.sh <version>
#     version: the semver to publish. Tags pushed: X.Y.Z and `latest`.
#     Example: bash ops/publish-docker-hub.sh 1.0.1
#
# Flags:
#   --amd64-only           Build only linux/amd64 (default is multi-arch).
#                          Use when buildx/qemu isn't available.
#   --no-postgres          Skip the postgres image push (use upstream).
#
# Prereqs:
#   - Logged in to Docker Hub (`docker login`) as a user with push perms
#     on the sovereignbrick/* namespace.
#   - Must be run from the repo root (needs access to apps/health/...
#     and packages/ for frontend workspace resolution).
#   - For multi-arch: `docker buildx` with a builder that supports both
#     linux/amd64 and linux/arm64 (default docker-container driver +
#     qemu-user-static on the host).
#
# Multi-arch (Sprint 053 Phase F): images are built for linux/amd64 +
# linux/arm64 so Apple Silicon, Raspberry Pi 4/5, and AWS Graviton
# users can `docker pull` without emulation.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

BACKEND_IMAGE="sovereignbrick/shi-api"
FRONTEND_IMAGE="sovereignbrick/shi-web"
POSTGRES_IMAGE="sovereignbrick/shi-postgres"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PUBLISH]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ── Argument parsing. ───────────────────────────────────────────────────
VERSION=""
PLATFORMS="linux/amd64,linux/arm64"
SKIP_POSTGRES="0"
for arg in "$@"; do
    case "$arg" in
        --amd64-only) PLATFORMS="linux/amd64" ;;
        --no-postgres) SKIP_POSTGRES="1" ;;
        --help|-h)
            sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# *//'
            exit 0
            ;;
        -*)
            fail "Unknown flag: $arg"
            ;;
        *)
            [ -z "$VERSION" ] && VERSION="$arg" || fail "Too many positional args"
            ;;
    esac
done

[ -n "$VERSION" ] || fail "Usage: $0 <version> [--amd64-only] [--no-postgres]"
VERSION="${VERSION#v}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    fail "Version '$VERSION' doesn't look like semver"
fi

# ── Pre-flight. ─────────────────────────────────────────────────────────
log "Pre-flight checks..."

if ! docker info 2>/dev/null | grep -q "Username:"; then
    fail "Not logged in to Docker Hub. Run: docker login"
fi

# buildx is bundled in modern Docker but verify + ensure a builder exists
# with the requested platforms.
docker buildx version >/dev/null 2>&1 || fail "docker buildx not available"

if [ "$PLATFORMS" != "linux/amd64" ]; then
    if ! docker buildx inspect default 2>/dev/null | grep -q "linux/arm64"; then
        warn "Default builder doesn't advertise linux/arm64 support."
        warn "Setting up a fresh buildx builder with qemu..."
        docker run --rm --privileged multiarch/qemu-user-static --reset -p yes >/dev/null 2>&1 || \
            warn "qemu-user-static setup may have failed; continuing anyway"
        docker buildx create --name shi-multiarch --use --bootstrap 2>/dev/null || \
            docker buildx use shi-multiarch
    fi
fi

log "Publishing version $VERSION to Docker Hub (platforms: $PLATFORMS)..."

# ── Backend (Rust workspace build). ─────────────────────────────────────
log "Backend: buildx --push -> $BACKEND_IMAGE:$VERSION + :latest"
docker buildx build \
    --platform "$PLATFORMS" \
    -f "$APP_ROOT/api/Dockerfile" \
    -t "$BACKEND_IMAGE:$VERSION" \
    -t "$BACKEND_IMAGE:latest" \
    --push \
    "$REPO_ROOT"

# ── Frontend (Next.js). ─────────────────────────────────────────────────
# NEXT_PUBLIC_API_URL left as the prod URL; resolveApiBase() in lib/api.ts
# overrides to http://localhost:8080 at runtime when host is localhost
# (Sprint 053 fix).
log "Frontend: buildx --push -> $FRONTEND_IMAGE:$VERSION + :latest"
docker buildx build \
    --platform "$PLATFORMS" \
    --build-arg NEXT_PUBLIC_API_URL="https://api.sovereignhealth.io" \
    --build-arg NEXT_PUBLIC_BUILD_ID="selfhosted-$VERSION" \
    -f "$APP_ROOT/frontend/Dockerfile" \
    -t "$FRONTEND_IMAGE:$VERSION" \
    -t "$FRONTEND_IMAGE:latest" \
    --push \
    "$REPO_ROOT"

# ── Postgres (pgaudit-enabled custom build). ────────────────────────────
# Extends upstream postgres:16 which is already multi-arch, so buildx
# inherits. Skippable via --no-postgres if the upstream is fine.
if [ "$SKIP_POSTGRES" = "1" ]; then
    warn "Skipping postgres image per --no-postgres flag."
else
    log "Postgres: buildx --push -> $POSTGRES_IMAGE:$VERSION + :latest"
    docker buildx build \
        --platform "$PLATFORMS" \
        -f "$APP_ROOT/ops/postgres/Dockerfile" \
        -t "$POSTGRES_IMAGE:$VERSION" \
        -t "$POSTGRES_IMAGE:latest" \
        --push \
        "$APP_ROOT/ops/postgres"
fi

log ""
log "Published:"
log "  docker pull $BACKEND_IMAGE:$VERSION"
log "  docker pull $FRONTEND_IMAGE:$VERSION"
[ "$SKIP_POSTGRES" = "0" ] && log "  docker pull $POSTGRES_IMAGE:$VERSION"
log ""
log "Platforms: $PLATFORMS"
log ""
log "Smoke test against the published tag:"
log "  bash ops/docker-hub-smoke.sh $VERSION"
