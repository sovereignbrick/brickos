#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
#
# Local dev machine cleanup script.
# Removes Docker build cache, Rust/Node build artifacts, and temp files
# to reclaim disk space on the system SSD.
#
# Usage:
#   bash ops/cleanup.sh          # Standard cleanup (safe, ~minutes)
#   bash ops/cleanup.sh --deep   # Aggressive cleanup (removes cargo target, node_modules)

set -e

PROJECT_ROOT="/home/dev-comp/projects/brickos"
APP_ROOT="${PROJECT_ROOT}/apps/health/sovereign-health"

DEEP=false
[ "${1:-}" = "--deep" ] && DEEP=true

log()  { echo -e "\033[1;34m[cleanup]\033[0m $1"; }
warn() { echo -e "\033[1;33m[cleanup]\033[0m $1"; }

freed_before=$(df --output=avail / | tail -1)

# ── Docker ────────────────────────────────────────────────────────────────────

log "Pruning dangling Docker images..."
docker image prune -f 2>/dev/null || true

log "Pruning Docker build cache older than 24h..."
docker builder prune -f --filter "until=24h" 2>/dev/null || true

log "Removing stopped containers..."
docker container prune -f 2>/dev/null || true

if $DEEP; then
    log "Deep: removing ALL unused Docker images..."
    docker image prune -af 2>/dev/null || true
    log "Deep: removing ALL Docker build cache..."
    docker builder prune -af 2>/dev/null || true
fi

# ── Rust ──────────────────────────────────────────────────────────────────────

if $DEEP; then
    if [ -d "$PROJECT_ROOT/target" ]; then
        log "Deep: removing cargo target dir (will rebuild on next compile)..."
        rm -rf "$PROJECT_ROOT/target"
    fi
else
    # Remove release artifacts only (debug kept for dev workflow)
    if [ -d "$PROJECT_ROOT/target/release" ]; then
        log "Removing cargo release build artifacts..."
        rm -rf "$PROJECT_ROOT/target/release"
    fi
fi

# ── Node / Next.js ────────────────────────────────────────────────────────────

# Remove .next build caches (rebuilt on next dev/build)
find "$PROJECT_ROOT" -name ".next" -type d -prune -exec rm -rf {} + 2>/dev/null || true
log "Removed Next.js .next build caches."

if $DEEP; then
    # Remove all node_modules (pnpm install restores them quickly)
    find "$PROJECT_ROOT" -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    log "Deep: removed all node_modules dirs."
fi

# ── Temp / log files ─────────────────────────────────────────────────────────

# Remove common temp patterns
find "$PROJECT_ROOT" -name "*.log" -not -path "*/.git/*" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name ".DS_Store" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*.swp" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*.swo" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*~" -not -path "*/.git/*" -delete 2>/dev/null || true
log "Removed temp and log files."

# ── Summary ───────────────────────────────────────────────────────────────────

freed_after=$(df --output=avail / | tail -1)
freed_mb=$(( (freed_after - freed_before) / 1024 ))

log "Done. Freed approximately ${freed_mb} MB on system SSD."
df -h / | tail -1 | awk '{print "  Disk: "$3" used / "$4" free ("$5" full)"}'
