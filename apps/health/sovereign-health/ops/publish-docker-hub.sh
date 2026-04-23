#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0
#
# Sprint 052 #052-10 (closes #0344): publish release images to Docker
# Hub so self-hosted users can `docker pull` instead of building from
# source. Companion to deploy.sh -- deploy.sh ships to our VPS; this
# script ships to the world.
#
# Usage:
#   bash ops/publish-docker-hub.sh <version>
#     version: the semver to publish. Tags pushed: vX.Y.Z and `latest`.
#     Example: bash ops/publish-docker-hub.sh 0.49.0
#
# Prereqs:
#   - Logged in to Docker Hub (`docker login`) as a user with push perms
#     on the sovereignbrick/* namespace.
#   - Images already built by deploy.sh. This script re-tags + pushes.
#
# Multi-arch: today the images are linux/amd64 only. ARM64 (Apple
# Silicon / Raspberry Pi) builds are a Sprint 053+ item -- tracked in
# 052-11. When implemented, add a `--multiarch` flag that runs
# `docker buildx build --platform linux/amd64,linux/arm64 --push`.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_IMAGE="sovereignbrick/shi-api"
FRONTEND_IMAGE="sovereignbrick/shi-web"
POSTGRES_IMAGE="sovereignbrick/shi-postgres"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PUBLISH]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

VERSION="${1:-}"
[ -n "$VERSION" ] || fail "Usage: $0 <version>   (e.g. $0 0.49.0)"

# ── Strip any leading 'v' so both '0.49.0' and 'v0.49.0' work. ──────────
VERSION="${VERSION#v}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    fail "Version '$VERSION' doesn't look like semver (e.g. 0.49.0 or 1.0.0-rc1)"
fi

# ── Pre-flight: Docker Hub credentials + image presence. ────────────────
log "Pre-flight checks..."

if ! docker info 2>/dev/null | grep -q "Username:"; then
    fail "Not logged in to Docker Hub. Run: docker login"
fi

# Verify the images we want to tag exist locally.
for img in "$BACKEND_IMAGE:latest" "$FRONTEND_IMAGE:latest"; do
    if ! docker image inspect "$img" >/dev/null 2>&1; then
        fail "Local image missing: $img. Run deploy.sh production first (or build manually)."
    fi
done

log "Publishing version $VERSION to Docker Hub..."

# ── Tag + push backend. ─────────────────────────────────────────────────
log "Backend: tagging $BACKEND_IMAGE:$VERSION + :latest"
docker tag "$BACKEND_IMAGE:latest" "$BACKEND_IMAGE:$VERSION"
docker push "$BACKEND_IMAGE:$VERSION"
docker push "$BACKEND_IMAGE:latest"

# ── Tag + push frontend. ────────────────────────────────────────────────
log "Frontend: tagging $FRONTEND_IMAGE:$VERSION + :latest"
docker tag "$FRONTEND_IMAGE:latest" "$FRONTEND_IMAGE:$VERSION"
docker push "$FRONTEND_IMAGE:$VERSION"
docker push "$FRONTEND_IMAGE:latest"

# ── Postgres image (pgaudit-enabled custom build). ──────────────────────
# deploy.sh builds this from ops/postgres/Dockerfile. We tag it and push
# so self-host users don't have to rebuild (and don't silently downgrade
# to vanilla postgres without pgaudit).
if docker image inspect "$POSTGRES_IMAGE:latest" >/dev/null 2>&1; then
    log "Postgres: tagging $POSTGRES_IMAGE:$VERSION + :latest"
    docker tag "$POSTGRES_IMAGE:latest" "$POSTGRES_IMAGE:$VERSION"
    docker push "$POSTGRES_IMAGE:$VERSION"
    docker push "$POSTGRES_IMAGE:latest"
else
    warn "$POSTGRES_IMAGE:latest not present locally; skipping."
    warn "Build it first: (cd $APP_ROOT/ops/postgres && docker build -t $POSTGRES_IMAGE:latest .)"
fi

log "Published:"
log "  docker pull $BACKEND_IMAGE:$VERSION"
log "  docker pull $FRONTEND_IMAGE:$VERSION"
log "  docker pull $POSTGRES_IMAGE:$VERSION"
log ""
log "Self-hosted users can now: bash sh-install.sh"
