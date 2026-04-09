#!/usr/bin/env bash
# Sovereign CRM -- Deploy Script
#
# Usage:
#   bash apps/data/sovereign-crm/ops/deploy.sh staging           # Deploy backend to staging
#   bash apps/data/sovereign-crm/ops/deploy.sh staging backend   # Backend only (explicit)
#   bash apps/data/sovereign-crm/ops/deploy.sh status            # Show VPS container status
#
# Production deploy is not yet implemented.

set -euo pipefail

# Notify on unexpected exit (set -e failures)
trap '_exit_code=$?; if [ $_exit_code -ne 0 ]; then notify "CRM Deploy FAILED (${ENV:-?} ${COMPONENT:-?})" "Exit code ${_exit_code} at $(date -u +%H:%M\ UTC)" 5 "critical"; fi' EXIT

# ══════════════════════════════════════════════════════════════════════════════
# VARIABLES
# ══════════════════════════════════════════════════════════════════════════════

VERSION="0.1.0"

PROJECT_ROOT="/home/dev-comp/Projects/brickos"
APP_ROOT="${PROJECT_ROOT}/apps/data/sovereign-crm"
OPS_DIR="${APP_ROOT}/ops"

VPS="root@72.61.154.115"
VPS_BASE="/opt/sovereign-crm"

BACKEND_IMAGE="sovereignbrick/scr-api"
COMPOSE_STAGING="docker-compose.staging.yml"

# Ports: production 8084, staging 8085 (mapped in compose files)
PROD_PORT=8084
STAGING_PORT=8085

# API URLs (placeholder until DNS is configured)
API_URL_STAGING="http://72.61.154.115:${STAGING_PORT}"

# Staging DB: shared with SHI on the same VPS
STAGING_DB_CONTAINER="sh-staging-db"

# Load secrets from .env if available (ntfy tokens, etc.)
if [ -f "$APP_ROOT/api/.env" ]; then
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        case "$key" in NTFY_BASE_URL|NTFY_TOKEN|NTFY_APP_PREFIX) export "$key=$value" ;; esac
    done < "$APP_ROOT/api/.env"
fi

# ══════════════════════════════════════════════════════════════════════════════
# COLORS & LOGGING
# ══════════════════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ══════════════════════════════════════════════════════════════════════════════
# REPORT TRACKING
# ══════════════════════════════════════════════════════════════════════════════

REPORT_ITEMS=()
DEPLOY_START=$(date +%s)

report_add() {
    local status="$1" message="$2"
    REPORT_ITEMS+=("${status}|${message}")
}

report_print() {
    local env="$1"
    local deploy_end
    deploy_end=$(date +%s)
    local duration=$(( deploy_end - DEPLOY_START ))
    local minutes=$(( duration / 60 ))
    local seconds=$(( duration % 60 ))

    echo ""
    echo -e "${BOLD}============================================================================${NC}"
    echo -e "${BOLD} DEPLOYMENT REPORT -- Sovereign CRM${NC}"
    echo "============================================================================"
    echo ""
    echo "  Environment:  $env"
    echo "  Version:      $VERSION"
    echo "  Date:         $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  Duration:     ${minutes}m ${seconds}s"
    echo ""
    echo "  Actions:"

    for item in "${REPORT_ITEMS[@]}"; do
        local status="${item%%|*}"
        local message="${item#*|}"
        case "$status" in
            OK)   echo -e "    ${GREEN}[OK]${NC}    $message" ;;
            SKIP) echo -e "    ${YELLOW}[SKIP]${NC}  $message" ;;
            FAIL) echo -e "    ${RED}[FAIL]${NC}  $message" ;;
            INFO) echo -e "    ${CYAN}[INFO]${NC}  $message" ;;
        esac
    done

    echo ""
    if [ "$env" = "staging" ]; then
        echo "  Staging API: ${API_URL_STAGING}/health"
    fi
    echo ""
    echo "============================================================================"
    echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS -- ntfy (fire-and-forget)
# ══════════════════════════════════════════════════════════════════════════════

notify() {
    local title="$1" body="$2"
    local priority="${3:-3}" channel="${4:-info}"

    if [ -n "${NTFY_BASE_URL:-}" ]; then
        local ntfy_topic="${NTFY_APP_PREFIX:-scr}-${channel}"
        local auth_header=""
        if [ -n "${NTFY_TOKEN:-}" ]; then
            auth_header="-H \"Authorization: Bearer ${NTFY_TOKEN}\""
        fi
        eval curl -s \
            -H "\"Title: ${title}\"" \
            -H "\"Priority: ${priority}\"" \
            ${auth_header} \
            -d "\"${body}\"" \
            "\"${NTFY_BASE_URL}/${ntfy_topic}\"" >/dev/null 2>&1 || true
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ══════════════════════════════════════════════════════════════════════════════

preflight() {
    log "Pre-flight checks..."

    # Verify project root is a git repo
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        fail "PROJECT_ROOT ($PROJECT_ROOT) is not a git repository."
    fi

    # Check local disk (need ~2GB for Docker build cache)
    local local_free
    local_free=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
    if [ "$local_free" -lt 2 ]; then
        fail "Local disk too low: ${local_free}G free (need 2G+). Try: docker builder prune -f"
    fi
    log "Local disk: ${local_free}G free"

    # Check VPS disk
    local vps_free
    vps_free=$(ssh $VPS "df -BG / | awk 'NR==2 {gsub(\"G\",\"\"); print \$4}'" 2>/dev/null) || warn "Could not check VPS disk"
    if [ -n "${vps_free:-}" ]; then
        if [ "$vps_free" -lt 2 ]; then
            warn "VPS disk low: ${vps_free}G free -- consider: ssh $VPS 'docker image prune -af'"
        else
            log "VPS disk: ${vps_free}G free"
        fi
    fi

    # Verify SSH connectivity
    ssh -o ConnectTimeout=5 $VPS "echo ok" >/dev/null 2>&1 || fail "Cannot reach VPS at $VPS"
    log "VPS reachable"

    # Verify compose project isolation (name: field required)
    local staging_compose="${OPS_DIR}/docker-compose.staging.yml"
    if [ -f "$staging_compose" ] && ! grep -q '^name:' "$staging_compose"; then
        fail "docker-compose.staging.yml missing 'name:' field -- compose isolation required"
    fi
    log "Compose project isolation verified"

    # Version consistency: deploy.sh VERSION must match Cargo.toml version
    local cargo_version
    cargo_version=$(grep -oP '^version = "\K[^"]+' "${APP_ROOT}/api/Cargo.toml" 2>/dev/null || echo "")
    if [ -n "$cargo_version" ] && [ "$cargo_version" != "$VERSION" ]; then
        fail "Version mismatch: deploy.sh has VERSION=${VERSION} but Cargo.toml has version=${cargo_version}. Update both to match."
    fi
    log "Version consistency: v${VERSION}"

    # Check Docker is available locally
    if ! command -v docker &>/dev/null; then
        fail "Docker not found. Install Docker to build images."
    fi
    log "Docker available"

    report_add "OK" "Pre-flight checks passed"
}

# ══════════════════════════════════════════════════════════════════════════════
# BACKEND DEPLOY
# ══════════════════════════════════════════════════════════════════════════════

deploy_backend() {
    local env="$1"

    local compose_file image_tag
    if [ "$env" = "staging" ]; then
        compose_file="$COMPOSE_STAGING"
        image_tag="staging"
    else
        fail "Production deploy not yet implemented."
    fi

    log "Building backend ($env)..."
    cd "$PROJECT_ROOT"
    docker build --no-cache \
        -f apps/data/sovereign-crm/ops/Dockerfile.api \
        -t "${BACKEND_IMAGE}:${image_tag}" .

    log "Transferring backend to VPS..."
    docker save "${BACKEND_IMAGE}:${image_tag}" | ssh $VPS "docker load"

    # Verify image was loaded on VPS
    local local_size remote_size
    local_size=$(docker inspect --format='{{.Size}}' "${BACKEND_IMAGE}:${image_tag}" 2>/dev/null || echo "0")
    remote_size=$(ssh $VPS "docker inspect --format='{{.Size}}' '${BACKEND_IMAGE}:${image_tag}' 2>/dev/null" || echo "0")

    if [ -z "$remote_size" ] || [ "$remote_size" = "0" ]; then
        warn "Image not found on VPS: ${BACKEND_IMAGE}:${image_tag}"
        report_add "FAIL" "Image not found on VPS: ${BACKEND_IMAGE}:${image_tag}"
    else
        local size_mb=$(( ${remote_size:-0} / 1048576 ))
        log "Image verified on VPS: ${BACKEND_IMAGE}:${image_tag} (${size_mb}MB)"
    fi

    # Ensure VPS_BASE directory exists
    ssh $VPS "mkdir -p ${VPS_BASE}"

    # Copy compose file to VPS
    scp "${OPS_DIR}/${compose_file}" "${VPS}:${VPS_BASE}/${compose_file}"

    log "Restarting backend ($env) on VPS..."
    ssh $VPS "cd ${VPS_BASE} && VERSION=${VERSION} docker compose -f ${compose_file} --env-file .env.staging -p scr-staging up -d --force-recreate scr-staging-api && docker image prune -f"

    # Prune local Docker build cache
    docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true

    log "Backend ($env) deployed."
    report_add "OK" "Backend built, transferred, restarted ($env, tag: ${image_tag})"
    notify "CRM Backend deployed to ${env}" "v${VERSION} -- container recreated at $(date -u '+%H:%M UTC')" 2 "info"
}

# ══════════════════════════════════════════════════════════════════════════════
# SMOKE TEST
# ══════════════════════════════════════════════════════════════════════════════

smoke_test() {
    local env="$1"

    log "Waiting 5s for container to stabilize..."
    sleep 5

    local health_url
    if [ "$env" = "staging" ]; then
        health_url="${API_URL_STAGING}/health"
    else
        fail "Production smoke test not yet implemented."
    fi

    log "Smoke test: ${health_url}"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$health_url" 2>/dev/null || echo "000")

    if [ "$status" = "200" ]; then
        # Try to extract version from health response
        local api_version
        api_version=$(curl -sf --max-time 10 "$health_url" 2>/dev/null | grep -oP '"version"\s*:\s*"\K[^"]+' || echo "unknown")
        echo -e "  ${GREEN}${status}${NC}  API health  ${health_url}  (v${api_version})"
        report_add "OK" "Smoke test passed (HTTP ${status}, v${api_version})"
        notify "CRM Smoke test passed (${env})" "v${api_version} -- HTTP ${status}" 2 "status"
    else
        echo -e "  ${RED}${status}${NC}  API health  ${health_url}"
        report_add "FAIL" "Smoke test failed (HTTP ${status})"
        notify "CRM Smoke test FAILED (${env})" "HTTP ${status} at ${health_url}" 4 "critical"
        warn "Smoke test failed. Check logs: ssh ${VPS} 'docker logs scr-staging-api --tail 50'"
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# STATUS
# ══════════════════════════════════════════════════════════════════════════════

show_status() {
    log "CRM containers on VPS:"
    ssh $VPS "docker ps --filter 'name=scr-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null || warn "Could not list containers"
    echo ""

    log "VPS disk usage:"
    ssh $VPS "df -h / | awk 'NR==2 {print \"  \" \$3 \" used / \" \$2 \" total (\" \$5 \" full)\"}'"

    log "Docker disk usage:"
    ssh $VPS "docker system df --format 'table {{.Type}}\t{{.Size}}\t{{.Reclaimable}}'"
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN -- Parse arguments and dispatch
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "============================================================================"
echo " SOVEREIGN CRM -- Deploy v${VERSION}"
echo "============================================================================"
echo ""

ENV="${1:-}"
COMPONENT="${2:-all}"

case "$ENV" in

    # ── Staging deploy ────────────────────────────────────────────────────
    staging)
        preflight
        case "$COMPONENT" in
            backend|all)
                deploy_backend staging
                ;;
            *) fail "Unknown component: $COMPONENT. Use: backend or all." ;;
        esac
        smoke_test staging
        report_print staging
        ;;

    # ── Production (not yet implemented) ──────────────────────────────────
    production)
        fail "Production deploy not yet implemented. Deploy to staging first."
        ;;

    # ── Status ────────────────────────────────────────────────────────────
    status)
        show_status
        ;;

    # ── Help ──────────────────────────────────────────────────────────────
    *)
        echo "Usage:"
        echo "  bash ops/deploy.sh staging              # Deploy backend to staging"
        echo "  bash ops/deploy.sh staging backend      # Backend only (explicit)"
        echo "  bash ops/deploy.sh status               # Show container status on VPS"
        echo ""
        if [ -n "$ENV" ]; then
            fail "Unknown command: $ENV"
        fi
        ;;
esac
