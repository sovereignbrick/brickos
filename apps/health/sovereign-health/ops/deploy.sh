#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
#
# Unified deploy script for staging and production.
# Runs on your local dev machine, deploys to VPS + GitLab.
#
# Usage:
#   bash ops/deploy.sh staging               # Deploy develop -> demo.*
#   bash ops/deploy.sh staging backend       # Only staging backend
#   bash ops/deploy.sh staging frontend      # Only staging frontend
#   bash ops/deploy.sh staging website       # Only staging website
#   bash ops/deploy.sh staging postgres      # Build & transfer pgaudit postgres image
#   bash ops/deploy.sh production --confirm  # Deploy main -> app.* (requires --confirm)
#   bash ops/deploy.sh production backend --confirm
#   bash ops/deploy.sh git                   # Push all repos to GitLab
#   bash ops/deploy.sh promote              # Merge develop -> main (no deploy)
#   bash ops/deploy.sh status               # Show VPS container status
#   bash ops/deploy.sh staging-reset-db     # Reset staging DB to clean state

set -e

# Notify on unexpected exit (set -e failures)
trap '_exit_code=$?; if [ $_exit_code -ne 0 ]; then notify "Deploy FAILED (${ENV:-?} ${COMPONENT:-?})" "Exit code ${_exit_code} at $(date -u '\''+%H:%M UTC'\'')" 5 "critical" "warning,deploy"; fi' EXIT

# ══════════════════════════════════════════════════════════════════════════════
# VARIABLES — Change these per release or environment
# ══════════════════════════════════════════════════════════════════════════════

# Version: Update this before each release. Used in Docker image tags.
VERSION="0.38.0"

# Local project root: BrickOS monorepo.
PROJECT_ROOT="/home/dev-comp/Projects/brickos"

# App root: Where the Sovereign Health app lives within the monorepo.
APP_ROOT="${PROJECT_ROOT}/apps/health/sovereign-health"

# VPS connection: SSH user@host for the deployment target.
VPS="root@72.61.154.115"

# VPS paths: Where files live on the server.
VPS_BASE="/opt/sovereign-health"                       # Base directory on VPS
VPS_HOMEPAGE_PROD="${VPS_BASE}/homepage"                # Production website static files
VPS_HOMEPAGE_STAGING="${VPS_BASE}/homepage-staging"     # Staging website static files

# Docker Compose files: Located on the VPS in $VPS_BASE.
COMPOSE_PROD="docker-compose.prod.yml"
COMPOSE_STAGING="docker-compose.staging.yml"

# Docker image names: Used for build, save, and transfer.
BACKEND_IMAGE="sovereign-health-backend"
FRONTEND_IMAGE="sovereign-health-frontend"
POSTGRES_IMAGE="sovereign-health-postgres"

# API URLs: Baked into frontend at build time (NEXT_PUBLIC_* vars).
# These CANNOT be changed after the Docker image is built.
API_URL_PROD="https://api.sovereignhealth.io"
API_URL_STAGING="https://api-demo.sovereignhealth.io"

# Verification URLs: Checked after deploy to confirm everything works.
VERIFY_API_PROD="https://api.sovereignhealth.io/health"
VERIFY_APP_PROD="https://app.sovereignhealth.io/"
VERIFY_WEB_PROD="https://sovereignhealth.io/"
VERIFY_API_STAGING="https://api-demo.sovereignhealth.io/health"
VERIFY_APP_STAGING="https://demo.sovereignhealth.io/"
VERIFY_WEB_STAGING="https://www-demo.sovereignhealth.io/"

# Basic auth credentials for staging verification.
# These must match what's configured in nginx on the VPS.
STAGING_AUTH_USER="${STAGING_AUTH_USER:-admin}"
STAGING_AUTH_PASS="${STAGING_AUTH_PASS:-}"

# Git branches: Which branch deploys where.
BRANCH_PROD="main"
BRANCH_STAGING="develop"

# Cloudflare: Zone ID is fixed (sovereignhealth.io). API token loaded from .env.
CF_ZONE_ID="4162ecad4799d0f97385d1ba589e9b3b"

# Load secrets from .env (Cloudflare tokens, etc.)
# This file is gitignored and contains CF_ZONE_ID, CF_API_TOKEN, etc.
if [ -f "$APP_ROOT/api/.env" ]; then
    # Only load safe key=value lines (skip lines with special chars like <>)
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        case "$key" in CF_ZONE_ID|CF_API_TOKEN|STAGING_AUTH_PASS|NTFY_BASE_URL|NTFY_TOKEN|NTFY_APP_PREFIX|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|TELEGRAM_CRITICAL_TOPIC_ID|TELEGRAM_ERRORS_TOPIC_ID|TELEGRAM_BILLING_TOPIC_ID|TELEGRAM_USERS_TOPIC_ID|TELEGRAM_INFO_TOPIC_ID|TELEGRAM_STATUS_TOPIC_ID) export "$key=$value" ;; esac
    done < "$APP_ROOT/api/.env"
fi

# ══════════════════════════════════════════════════════════════════════════════
# COLORS — For readable terminal output
# ══════════════════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ── Pre-deploy sanity check ──────────────────────────────────────────────────
# Verify PROJECT_ROOT is the actual git working directory, not a stale symlink
# or mismatched path. Prevents Docker from building stale code.

if [ ! -d "$PROJECT_ROOT/.git" ]; then
    fail "PROJECT_ROOT ($PROJECT_ROOT) is not a git repository. Check the path."
fi

RESOLVED_ROOT="$(readlink -f "$PROJECT_ROOT")"
RESOLVED_GIT="$(git -C "$RESOLVED_ROOT" rev-parse --show-toplevel 2>/dev/null)"
if [ "$RESOLVED_ROOT" != "$RESOLVED_GIT" ]; then
    fail "PROJECT_ROOT resolves to $RESOLVED_ROOT but git root is $RESOLVED_GIT"
fi

# ── Staging build number ─────────────────────────────────────────────────────
# Auto-increment build suffix (v0.23.0-b1 → v0.23.0-b2) for staging deploys
# so the version in the UI changes visibly on each deploy.

bump_staging_version() {
    # Sprint 014 lesson: modifying lib.rs breaks snapshot tests and requires
    # manual VERSION resets. Instead, pass build number via Docker build-arg
    # and read from BUILD_NUMBER env var at runtime (lib.rs stays clean).
    local base_ver="$VERSION"
    local build_num=1

    # Check if VPS already has a build number for this version
    local remote_ver
    remote_ver=$(ssh "$VPS" "docker exec sh-staging-backend printenv BUILD_NUMBER 2>/dev/null" || echo "0")
    if [ -n "$remote_ver" ] && [ "$remote_ver" -gt 0 ] 2>/dev/null; then
        build_num=$((remote_ver + 1))
    fi

    # Pass as Docker build-arg (does NOT modify lib.rs)
    export BUILD_NUMBER="$build_num"
    VERSION="${base_ver}-b${build_num}"
    log "Staging build number: $VERSION"
}

# Verify Docker image was loaded on VPS and has the expected size
verify_image_loaded() {
    local image="$1"
    local tag="$2"

    local local_size remote_size
    local_size=$(docker inspect --format='{{.Size}}' "${image}:${tag}" 2>/dev/null)
    remote_size=$(ssh $VPS "docker inspect --format='{{.Size}}' '${image}:${tag}' 2>/dev/null")

    if [ -z "$remote_size" ]; then
        warn "Image not found on VPS: ${image}:${tag}"
        report_add "FAIL" "Image not found on VPS: ${image}:${tag}"
    elif [ -n "$local_size" ] && [ "$local_size" = "$remote_size" ]; then
        local size_mb=$(( local_size / 1048576 ))
        log "Image verified on VPS: ${image}:${tag} (${size_mb}MB)"
        report_add "OK" "Image verified: ${image}:${tag} (${size_mb}MB)"
    else
        local local_mb=$(( ${local_size:-0} / 1048576 ))
        local remote_mb=$(( ${remote_size:-0} / 1048576 ))
        warn "Image size differs: local=${local_mb}MB remote=${remote_mb}MB"
        report_add "FAIL" "Image size mismatch: ${image}:${tag} local=${local_mb}MB remote=${remote_mb}MB"
    fi
}

# ── Report tracking ──────────────────────────────────────────────────────────
# Collects what was done during the deploy and prints a summary at the end.
# Each step calls report_add to log its action. report_print shows the full report.

REPORT_ITEMS=()         # Array of "STATUS | ACTION" strings
DEPLOY_START=$(date +%s)  # Timestamp for duration calculation

report_add() {
    # Usage: report_add "OK" "Backend built and deployed to staging"
    #        report_add "SKIP" "Git push skipped (uncommitted changes)"
    #        report_add "FAIL" "Cloudflare purge failed"
    local status="$1"
    local message="$2"
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
    echo -e "${BOLD} DEPLOYMENT REPORT -- Sovereign Health Intelligence${NC}"
    echo "============================================================================"
    echo ""
    echo "  Environment:  $env"
    echo "  Version:      $VERSION"
    echo "  Date:         $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  Duration:     ${minutes}m ${seconds}s"
    echo "  Branch:       $([ "$env" = "staging" ] && echo "$BRANCH_STAGING" || echo "$BRANCH_PROD")"
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

    # Show URLs for the deployed environment.
    if [ "$env" = "staging" ]; then
        echo "  Staging URLs:"
        echo "    App:     https://demo.sovereignhealth.io/"
        echo "    API:     https://api-demo.sovereignhealth.io/health"
        echo "    Website: https://www-demo.sovereignhealth.io/"
    elif [ "$env" = "production" ]; then
        echo "  Production URLs:"
        echo "    App:     https://app.sovereignhealth.io/"
        echo "    API:     https://api.sovereignhealth.io/health"
        echo "    Website: https://sovereignhealth.io/"
    fi

    echo ""
    echo "============================================================================"
    echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS — Dual-dispatch to ntfy (sovereign) + Telegram (admin UI)
# ══════════════════════════════════════════════════════════════════════════════

# Sends a notification to both ntfy and Telegram. Fire-and-forget — failures
# are logged but never block the deploy.
#
# Usage: notify "title" "body" [priority] [channel] [tags]
#   priority: 1=min, 2=low, 3=default, 4=high, 5=urgent
#   channel:  critical|errors|billing|users|info|status
#   tags:     comma-separated ntfy tags (e.g. "rocket,staging")

notify() {
    local title="$1" body="$2"
    local priority="${3:-3}" channel="${4:-info}" tags="${5:-}"

    # ── ntfy (sovereign store + fallback) ──
    if [ -n "${NTFY_BASE_URL:-}" ]; then
        local ntfy_topic="${NTFY_APP_PREFIX:-sh}-${channel}"
        local auth_header=""
        if [ -n "${NTFY_TOKEN:-}" ]; then
            auth_header="-H \"Authorization: Bearer ${NTFY_TOKEN}\""
        fi
        eval curl -s \
            -H "\"Title: ${title}\"" \
            -H "\"Priority: ${priority}\"" \
            ${tags:+-H "\"Tags: ${tags}\""} \
            ${auth_header} \
            -d "\"${body}\"" \
            "\"${NTFY_BASE_URL}/${ntfy_topic}\"" >/dev/null 2>&1 || true
    fi

    # ── Telegram (admin UI) ──
    if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
        # Map channel name to forum topic thread ID
        local thread_id=""
        case "$channel" in
            critical) thread_id="${TELEGRAM_CRITICAL_TOPIC_ID:-}" ;;
            errors)   thread_id="${TELEGRAM_ERRORS_TOPIC_ID:-}" ;;
            billing)  thread_id="${TELEGRAM_BILLING_TOPIC_ID:-}" ;;
            users)    thread_id="${TELEGRAM_USERS_TOPIC_ID:-}" ;;
            info)     thread_id="${TELEGRAM_INFO_TOPIC_ID:-}" ;;
            status)   thread_id="${TELEGRAM_STATUS_TOPIC_ID:-}" ;;
        esac

        local thread_param=""
        if [ -n "$thread_id" ]; then
            thread_param="-d message_thread_id=${thread_id}"
        fi

        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            ${thread_param} \
            -d parse_mode=HTML \
            --data-urlencode "text=<b>${title}</b>
${body}" >/dev/null 2>&1 || true
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

# ── Pre-flight checks ────────────────────────────────────────────────────────
# Runs before every deploy. Checks disk space and SSH connectivity.
# Fails early if something is wrong, before any build starts.

preflight() {
    log "Pre-flight checks..."

    # Check local disk: Docker builds need ~2GB free for layer cache.
    local local_free
    local_free=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
    if [ "$local_free" -lt 2 ]; then
        fail "Local disk too low: ${local_free}G free (need 2G+). Try: docker builder prune -f"
    fi
    log "Local disk: ${local_free}G free"

    # Check VPS disk: Need space for Docker images + website files.
    local vps_free
    vps_free=$(ssh $VPS "df -BG / | awk 'NR==2 {gsub(\"G\",\"\"); print \$4}'" 2>/dev/null) || warn "Could not check VPS disk"
    if [ -n "$vps_free" ]; then
        if [ "$vps_free" -lt 2 ]; then
            warn "VPS disk low: ${vps_free}G free -- consider: ssh $VPS 'docker image prune -af'"
        else
            log "VPS disk: ${vps_free}G free"
        fi
    fi

    # Verify SSH connectivity: Fail fast if VPS is unreachable.
    ssh -o ConnectTimeout=5 $VPS "echo ok" >/dev/null 2>&1 || fail "Cannot reach VPS at $VPS"
    log "VPS reachable"

    # Check frontend lockfile sync: Prevents Docker build failure from stale pnpm-lock.yaml.
    # Note: workspace deps (@brickos/*) are rewritten to file: protocol in Docker,
    # so we skip frozen-lockfile here and just verify non-workspace deps resolve.
    local frontend_dir="${APP_ROOT}/frontend"
    if [ -f "${frontend_dir}/package.json" ] && [ -f "${frontend_dir}/pnpm-lock.yaml" ]; then
        if ! (cd "$frontend_dir" && pnpm install --frozen-lockfile 2>/dev/null); then
            fail "Frontend pnpm-lock.yaml is out of sync with package.json. Run: cd frontend && pnpm install"
        fi
        log "Frontend lockfile in sync"
    fi

    # Verify compose project isolation: Production and staging must have separate project names.
    # Without explicit names, docker compose can cross-contaminate containers.
    # Incident 2026-03-22: staging compose command destroyed production DB container.
    local prod_compose="${OPS_DIR}/docker-compose.prod.yml"
    local staging_compose="${OPS_DIR}/docker-compose.staging.yml"
    if [ -f "$prod_compose" ] && ! grep -q '^name:' "$prod_compose"; then
        fail "docker-compose.prod.yml missing 'name:' field — compose isolation required"
    fi
    if [ -f "$staging_compose" ] && ! grep -q '^name:' "$staging_compose"; then
        fail "docker-compose.staging.yml missing 'name:' field — compose isolation required"
    fi
    log "Compose project isolation verified"

    # Version consistency: deploy.sh VERSION must match lib.rs VERSION (ignoring -bN staging suffix).
    # Prevents deploying with stale version tag (container shows old version).
    local lib_version lib_version_base
    lib_version=$(grep -oP 'pub const VERSION: &str = "\K[^"]+' "${APP_ROOT}/api/src/lib.rs" 2>/dev/null || echo "")
    lib_version_base=$(echo "$lib_version" | sed 's/-b[0-9]*//')
    if [ -n "$lib_version" ] && [ "$lib_version_base" != "$VERSION" ]; then
        fail "Version mismatch: deploy.sh has VERSION=${VERSION} but lib.rs has VERSION=${lib_version}. Update both to match."
    fi
    # Reset lib.rs to base version before staging bump (prevents -bN accumulation)
    if [ "$lib_version" != "$VERSION" ] && [ "$lib_version_base" = "$VERSION" ]; then
        sed -i 's|pub const VERSION: &str = "[^"]*"|pub const VERSION: \&str = "'"${VERSION}"'"|' "${APP_ROOT}/api/src/lib.rs"
        log "Reset lib.rs VERSION from ${lib_version} to ${VERSION}"
    fi
    log "Version consistency: v${VERSION}"

    # Migration stability: Warn if any migration file was modified after initial commit.
    # Modified migrations are silently skipped by SQLx, breaking all subsequent migrations.
    local modified_migrations
    modified_migrations=$(cd "$PROJECT_ROOT" && git diff --name-only HEAD -- "${APP_ROOT#$PROJECT_ROOT/}/api/migrations/" 2>/dev/null || echo "")
    if [ -n "$modified_migrations" ]; then
        warn "Modified migration files detected (SQLx skips modified migrations):"
        echo "$modified_migrations" | while read -r f; do echo "  - $f"; done
        warn "If these are already applied, all subsequent migrations will be skipped silently."
    fi

    # Notification connectivity: verify ntfy token works before deploying.
    # Catches stale/rotated tokens that would silently break all notifications.
    if [ -n "${NTFY_BASE_URL:-}" ] && [ -n "${NTFY_TOKEN:-}" ]; then
        local ntfy_status
        ntfy_status=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
            -H "Authorization: Bearer ${NTFY_TOKEN}" \
            "${NTFY_BASE_URL}/sh-info" 2>/dev/null || echo "000")
        if [ "$ntfy_status" = "302" ] || [ "$ntfy_status" = "401" ] || [ "$ntfy_status" = "000" ]; then
            fail "ntfy pre-flight failed (HTTP ${ntfy_status}). Token may be stale or ntfy unreachable. Check NTFY_TOKEN in .env.staging on VPS."
        fi
        log "ntfy connectivity verified (HTTP ${ntfy_status})"
    else
        # Check VPS-side token if local doesn't have one.
        # Use grep to extract vars safely (source can fail on unquoted special chars).
        local vps_ntfy_status
        vps_ntfy_status=$(ssh "$VPS" 'export $(grep -E "^NTFY_(BASE_URL|TOKEN)=" /opt/sovereign-health/.env.staging | xargs) && curl -s -o /dev/null -w "%{http_code}" -m 5 -H "Authorization: Bearer ${NTFY_TOKEN}" "${NTFY_BASE_URL}/sh-info"' 2>/dev/null || echo "000")
        if [ "$vps_ntfy_status" = "302" ] || [ "$vps_ntfy_status" = "401" ] || [ "$vps_ntfy_status" = "000" ]; then
            warn "ntfy pre-flight failed from VPS (HTTP ${vps_ntfy_status}). Check NTFY_TOKEN in .env.staging on VPS."
        else
            log "ntfy connectivity verified from VPS (HTTP ${vps_ntfy_status})"
        fi
    fi

    # Migration checksum verification — detect modified migrations before deploy
    log "Checking migration checksums against ${ENV} database..."
    local db_container
    if [[ "$ENV" == "staging" ]]; then
        db_container="sh-staging-db"
        db_name="sovereign_health_staging"
    else
        db_container="sovereign-health-db-1"
        db_name="sovereign_health"
    fi

    local mismatch_found=0
    local migrations_dir="${APP_ROOT}/api/migrations"
    for sql_file in "${migrations_dir}"/*.sql; do
        local version
        version=$(basename "$sql_file" | grep -oP '^\d+')
        local local_checksum
        local_checksum=$(sha384sum "$sql_file" | awk '{print $1}')

        # Check if this migration was already applied on the remote DB
        local remote_checksum
        remote_checksum=$(ssh -o ConnectTimeout=10 "$VPS" \
            "docker exec $db_container psql -U sovereign_health -d $db_name -t -A -c \
            \"SELECT encode(checksum, 'hex') FROM _sqlx_migrations WHERE version = $version;\"" 2>/dev/null | tr -d '[:space:]')

        if [[ -n "$remote_checksum" && "$remote_checksum" != "$local_checksum" ]]; then
            warn "MIGRATION CHECKSUM MISMATCH: $version"
            warn "  Local:  $local_checksum"
            warn "  Remote: $remote_checksum"
            warn "  File:   $(basename "$sql_file")"
            mismatch_found=1
        fi
    done

    if [[ "$mismatch_found" -eq 1 ]]; then
        report_add "WARN" "Migration checksum mismatch detected — backend will fail to start!"
        warn "═══════════════════════════════════════════════════════════════"
        warn "MIGRATION CHECKSUM MISMATCH DETECTED!"
        warn "The backend will refuse to start until this is resolved."
        warn ""
        warn "Fix: Update the remote checksum before deploying:"
        warn "  ssh $VPS \"docker exec $db_container psql -U sovereign_health -d $db_name -c"
        warn "    \\\"UPDATE _sqlx_migrations SET checksum = decode('<local_hex>', 'hex') WHERE version = <N>;\\\"\""
        warn ""
        warn "Or: Create a NEW migration instead of modifying the existing one."
        warn "═══════════════════════════════════════════════════════════════"

        if [[ "$ENV" == "production" ]]; then
            warn "Aborting production deploy due to migration mismatch."
            exit 1
        else
            warn "Continuing staging deploy — but backend may crash-loop!"
        fi
    else
        log "Migration checksums OK"
    fi

    report_add "OK" "Pre-flight passed (local: ${local_free}G free, VPS: ${vps_free:-?}G free)"
}

# ── Component change detection ───────────────────────────────────────────────
# Detect which components changed since the last deploy (remote HEAD).
# Sets DEPLOY_BACKEND, DEPLOY_FRONTEND, DEPLOY_WEBSITE to 0 or 1.

detect_changes() {
    local env="$1"
    local remote_branch
    if [ "$env" = "staging" ]; then
        remote_branch="origin/${BRANCH_STAGING}"
    else
        remote_branch="origin/${BRANCH_PROD}"
    fi

    # Files changed since remote HEAD
    local changed
    changed=$(git diff --name-only "$remote_branch"...HEAD 2>/dev/null || echo "FULL")

    if [ "$changed" = "FULL" ]; then
        DEPLOY_BACKEND=1; DEPLOY_FRONTEND=1; DEPLOY_WEBSITE=1
        log "Change detection: full deploy (no remote ref)"
        return
    fi

    DEPLOY_BACKEND=0; DEPLOY_FRONTEND=0; DEPLOY_WEBSITE=0

    if echo "$changed" | grep -qE "^(apps/health/sovereign-health/api/|crates/|platform/|Cargo)"; then
        DEPLOY_BACKEND=1
    fi
    if echo "$changed" | grep -qE "^(apps/health/sovereign-health/frontend/|packages/)"; then
        DEPLOY_FRONTEND=1
    fi
    if echo "$changed" | grep -qE "^apps/health/sovereign-health/website/"; then
        DEPLOY_WEBSITE=1
    fi
    # ops/ changes (deploy script, compose) → deploy everything
    if echo "$changed" | grep -qE "^apps/health/sovereign-health/ops/"; then
        DEPLOY_BACKEND=1; DEPLOY_FRONTEND=1; DEPLOY_WEBSITE=1
    fi

    # Safety: if nothing detected, deploy everything
    if [ "$DEPLOY_BACKEND" = "0" ] && [ "$DEPLOY_FRONTEND" = "0" ] && [ "$DEPLOY_WEBSITE" = "0" ]; then
        DEPLOY_BACKEND=1; DEPLOY_FRONTEND=1; DEPLOY_WEBSITE=1
        log "Change detection: no component-specific changes, full deploy"
    else
        local components=""
        [ "$DEPLOY_BACKEND" = "1" ] && components="${components}backend "
        [ "$DEPLOY_FRONTEND" = "1" ] && components="${components}frontend "
        [ "$DEPLOY_WEBSITE" = "1" ] && components="${components}website "
        log "Change detection: deploying ${components}"
    fi
}

# ── Git: Ensure correct branch ───────────────────────────────────────────────
# Before deploying, verify we're on the right branch.
# Staging deploys from 'develop', production from 'main'.

ensure_branch() {
    local target_branch="$1"
    local repo_path="$2"
    local repo_name="$3"

    cd "$repo_path"
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    if [ "$current_branch" != "$target_branch" ]; then
        fail "$repo_name is on '$current_branch' but should be on '$target_branch'. Run: cd $repo_path && git checkout $target_branch"
    fi
}

# ── Git: Push all repos ──────────────────────────────────────────────────────
# Pushes each repo to GitLab. Skips repos with uncommitted changes
# (you should commit first).

git_push() {
    log "Pushing to GitHub..."

    cd "$PROJECT_ROOT"
    if [ -n "$(git status --porcelain)" ]; then
        warn "Repository has uncommitted changes -- skipping push"
        report_add "SKIP" "Git push -- uncommitted changes"
    else
        git push origin --all --tags 2>&1 | tail -3
        log "brickos pushed to GitHub"
        report_add "OK" "Git push brickos to GitHub"

        # GitLab sovereign backup mirror (optional)
        if git remote get-url gitlab >/dev/null 2>&1; then
            log "Pushing to GitLab backup..."
            git push gitlab --all 2>&1 | tail -3
            git push gitlab --tags 2>&1 | tail -3
            log "brickos pushed to GitLab"
            report_add "OK" "Git push brickos to GitLab (backup mirror)"
        fi
    fi
}

# ── Git: Promote develop -> main ─────────────────────────────────────────────
# Merges 'develop' into 'main' in all 3 repos.
# Does NOT deploy -- you run 'deploy.sh production' separately.
# This is a safety measure: merge and deploy are two distinct steps.

git_promote() {
    log "Promoting develop -> main..."

    cd "$PROJECT_ROOT"
    {
        # Safety: don't merge if there are uncommitted changes.
        if [ -n "$(git status --porcelain)" ]; then
            fail "$repo has uncommitted changes. Commit or stash first."
        fi

        git checkout main
        git merge develop -m "Merge develop into main for release $VERSION"
        git checkout develop
        log "develop merged into main"
        report_add "OK" "Merged develop -> main"
    }

    echo ""
    info "Merge complete. Next steps:"
    info "  1. Review: git log --oneline -5"
    info "  2. Deploy: bash ops/deploy.sh production --confirm"
    info "  3. Push:   bash ops/deploy.sh git"
}

# ══════════════════════════════════════════════════════════════════════════════
# BUILD & DEPLOY FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

# ── Backend ──────────────────────────────────────────────────────────────────
# Builds the Rust backend Docker image locally, transfers it to VPS via
# 'docker save | ssh docker load' (no registry needed), then restarts
# the container on the VPS.

deploy_backend() {
    local env="$1"  # "staging" or "production"

    # Pick the right compose file, image tag, and branch.
    local compose_file image_tag branch
    if [ "$env" = "staging" ]; then
        compose_file="$COMPOSE_STAGING"
        image_tag="staging"
        branch="$BRANCH_STAGING"
    else
        compose_file="$COMPOSE_PROD"
        image_tag="latest"
        branch="$BRANCH_PROD"
    fi

    # Verify we're on the correct branch.
    ensure_branch "$branch" "$PROJECT_ROOT" "brickos"

    # Save current image for rollback before overwriting
    save_rollback_state "$env" "backend" "$BACKEND_IMAGE" "$image_tag"

    # Auto-bump build number for staging deploys
    if [ "$env" = "staging" ]; then
        bump_staging_version
    fi

    log "Building backend ($env)..."
    cd "$PROJECT_ROOT"
    local cache_flag=""
    if [ "$env" = "production" ]; then
        cache_flag="--no-cache"
    fi
    docker build $cache_flag -f apps/health/sovereign-health/api/Dockerfile -t "${BACKEND_IMAGE}:${image_tag}" .

    log "Transferring backend to VPS..."
    docker save "${BACKEND_IMAGE}:${image_tag}" | ssh $VPS "docker load"

    verify_image_loaded "$BACKEND_IMAGE" "$image_tag"

    # Backup staging DB before restart (migrations run on startup)
    if [ "$env" = "staging" ]; then
        backup_staging_db
    fi

    # Repair migration checksums on staging (modified migrations cause SQLx to halt)
    if [ "$env" = "staging" ]; then
        log "Repairing staging migration checksums..."
        ssh $VPS 'bash -s' << 'REPAIR_EOF'
DB_CONTAINER="sh-staging-db"
BE_CONTAINER="sh-staging-backend"
DB_NAME="sovereign_health_staging"
DB_USER="sovereign_health"
FIXED=0

# Get all applied migration versions from DB
for version in $(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "SELECT version FROM _sqlx_migrations ORDER BY version" 2>/dev/null); do
    # Find the matching migration file in the new container
    file=$(docker exec $BE_CONTAINER ls migrations/ 2>/dev/null | grep "^${version}_")
    [ -z "$file" ] && continue

    # Compute SHA-384 of the current file
    file_hash=$(docker exec $BE_CONTAINER cat "migrations/${file}" | sha384sum | cut -d' ' -f1)

    # Get stored checksum from DB (strip \x prefix, lowercase)
    db_hash=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "SELECT encode(checksum, 'hex') FROM _sqlx_migrations WHERE version = ${version}" 2>/dev/null)

    if [ "$file_hash" != "$db_hash" ]; then
        docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "UPDATE _sqlx_migrations SET checksum = decode('${file_hash}', 'hex') WHERE version = ${version}" >/dev/null 2>&1
        FIXED=$((FIXED + 1))
    fi
done

[ $FIXED -gt 0 ] && echo "Repaired $FIXED migration checksum(s)" || echo "All checksums OK"
REPAIR_EOF
    fi

    log "Restarting backend ($env) on VPS..."
    if [ "$env" = "staging" ]; then
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file --env-file .env.staging -p sh-staging up -d --force-recreate backend && docker image prune -f"
    else
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file up -d --force-recreate backend && docker image prune -f"
    fi
    log "Pruning local Docker build cache..."
    docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true

    log "Backend ($env) deployed."
    report_add "OK" "Backend built, transferred, restarted ($env, tag: $image_tag)"
    notify "Backend deployed to ${env}" "v${VERSION} — container recreated at $(date -u '+%H:%M UTC')" 2 "info" "rocket,${env}"
}

# ── Frontend ─────────────────────────────────────────────────────────────────
# Builds the Next.js frontend Docker image. The critical part is
# --build-arg NEXT_PUBLIC_API_URL, which bakes the API URL into the
# JavaScript bundle at build time. This CANNOT be changed later.

deploy_frontend() {
    local env="$1"

    local compose_file image_tag api_url branch
    if [ "$env" = "staging" ]; then
        compose_file="$COMPOSE_STAGING"
        image_tag="staging"
        api_url="$API_URL_STAGING"
        branch="$BRANCH_STAGING"
    else
        compose_file="$COMPOSE_PROD"
        image_tag="latest"
        api_url="$API_URL_PROD"
        branch="$BRANCH_PROD"
    fi

    ensure_branch "$branch" "$PROJECT_ROOT" "brickos"

    # Save current image for rollback before overwriting
    save_rollback_state "$env" "frontend" "$FRONTEND_IMAGE" "$image_tag"

    log "Building frontend ($env) with API_URL=$api_url..."
    cd "$PROJECT_ROOT"

    # NEXT_PUBLIC_API_URL is baked at build time. This is why we need
    # separate Docker images for staging vs production.
    # For staging: override DEMO_HOSTNAME so demo.sovereignhealth.io
    # doesn't trigger demo-only mode (staging needs full auth).
    local demo_host_arg=""
    if [ "$env" = "staging" ]; then
        demo_host_arg="--build-arg NEXT_PUBLIC_DEMO_HOSTNAME=public-demo.sovereignhealth.io"
    fi

    docker build \
        --build-arg NEXT_PUBLIC_API_URL="$api_url" \
        --build-arg NEXT_PUBLIC_ENVIRONMENT="$env" \
        $demo_host_arg \
        -f apps/health/sovereign-health/frontend/Dockerfile \
        -t "${FRONTEND_IMAGE}:${image_tag}" .

    log "Transferring frontend to VPS..."
    docker save "${FRONTEND_IMAGE}:${image_tag}" | ssh $VPS "docker load"

    verify_image_loaded "$FRONTEND_IMAGE" "$image_tag"

    log "Restarting frontend ($env) on VPS..."
    if [ "$env" = "staging" ]; then
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file --env-file .env.staging -p sh-staging up -d --force-recreate frontend && docker image prune -f"
    else
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file up -d --force-recreate frontend && docker image prune -f"
    fi
    log "Pruning local Docker build cache..."
    docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true

    log "Frontend ($env) deployed."
    report_add "OK" "Frontend built, transferred, restarted ($env, API: $api_url)"
    notify "Frontend deployed to ${env}" "v${VERSION} — API: ${api_url}" 2 "info" "rocket,${env}"
}

# ── Postgres (pgaudit) ────────────────────────────────────────────────────────
# Builds the custom PostgreSQL image with pgaudit extension and transfers
# it to the VPS. Does NOT restart the DB container automatically —
# DB migration requires pg_dump/pg_restore for in-place upgrades.
# Use 'deploy.sh staging postgres' to build and transfer.
# Then manually: ssh VPS "cd /opt/sovereign-health && docker compose -f <file> up -d --force-recreate db"

deploy_postgres() {
    local env="$1"

    log "Building postgres with pgaudit..."
    cd "$APP_ROOT/ops"
    docker build -f postgres/Dockerfile -t "${POSTGRES_IMAGE}:latest" postgres/

    log "Transferring postgres image to VPS..."
    docker save "${POSTGRES_IMAGE}:latest" | ssh $VPS "docker load"

    log "Pruning local Docker build cache..."
    docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true

    log "Postgres image ($env) transferred. Restart DB manually after pg_dump/pg_restore."
    report_add "OK" "Postgres image built and transferred (tag: latest)"
}

# ── Website (static) ─────────────────────────────────────────────────────────
# Builds the static marketing website with 'pnpm build' and rsyncs
# the output to the VPS. No Docker needed -- nginx serves it directly.

deploy_website() {
    local env="$1"

    local target_dir branch
    if [ "$env" = "staging" ]; then
        target_dir="$VPS_HOMEPAGE_STAGING"
        branch="$BRANCH_STAGING"
    else
        target_dir="$VPS_HOMEPAGE_PROD"
        branch="$BRANCH_PROD"
    fi

    # Website lives inside the saas repo.
    ensure_branch "$branch" "$PROJECT_ROOT" "brickos"

    log "Building website ($env)..."
    cd "$APP_ROOT/website"
    rm -rf .next out
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install

    # Bake staging API URL into the website build
    if [ "$env" = "staging" ]; then
        NEXT_PUBLIC_API_URL="https://api-demo.sovereignhealth.io" \
        NEXT_PUBLIC_APP_URL="https://demo.sovereignhealth.io" \
        pnpm build
    else
        pnpm build
    fi

    # Ensure target directory exists on VPS.
    ssh $VPS "mkdir -p $target_dir"

    log "Deploying website ($env) to VPS..."
    # --delete removes files on VPS that no longer exist locally,
    # keeping the deployment clean.
    rsync -avz --delete out/ "$VPS:$target_dir/"
    log "Website ($env) deployed."
    report_add "OK" "Website built and rsynced to $target_dir ($env)"
}

# ══════════════════════════════════════════════════════════════════════════════
# POST-DEPLOY
# ══════════════════════════════════════════════════════════════════════════════

# ── Cloudflare cache purge ───────────────────────────────────────────────────
# After deploying, old pages may be cached by Cloudflare CDN. Purging
# ensures visitors see the latest version immediately.
# Requires CF_ZONE_ID and CF_API_TOKEN in core-backend/.env.

cloudflare_purge() {
    if [ -z "$CF_API_TOKEN" ]; then
        warn "CF_API_TOKEN not set in api/.env -- skipping Cloudflare purge"
        warn "Purge manually: Cloudflare > sovereignhealth.io > Caching > Purge Everything"
        return
    fi

    log "Purging Cloudflare cache..."
    local response
    response=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}' 2>/dev/null)

    if echo "$response" | grep -q '"success":true'; then
        log "Cloudflare cache purged."
        report_add "OK" "Cloudflare cache purged"
    else
        warn "Cloudflare purge failed -- purge manually via Cloudflare Dashboard"
        echo "  Response: $response"
        report_add "FAIL" "Cloudflare cache purge failed"
    fi
}

# ── Rollback support ──────────────────────────────────────────────────────────
# Before each deploy, saves the current image ID so we can restore it.
# Rollback files stored on VPS at /opt/sovereign-health/.rollback/

save_rollback_state() {
    local env="$1" component="$2"
    local image_name="$3" image_tag="$4"
    local rollback_dir="$VPS_BASE/.rollback"

    ssh $VPS "mkdir -p $rollback_dir && \
        docker inspect --format='{{.Id}}' ${image_name}:${image_tag} 2>/dev/null > $rollback_dir/${component}_${env}_previous_id && \
        docker tag ${image_name}:${image_tag} ${image_name}:${env}-rollback 2>/dev/null || true" 2>/dev/null
}

rollback() {
    local env="$1"
    local component="${2:-all}"

    if [ "$env" != "staging" ] && [ "$env" != "production" ]; then
        fail "Usage: bash ops/deploy.sh rollback <staging|production> [backend|frontend|all]"
    fi

    local compose_file
    if [ "$env" = "staging" ]; then
        compose_file="$COMPOSE_STAGING"
    else
        compose_file="$COMPOSE_PROD"
    fi

    warn "Rolling back $component on $env..."

    do_rollback() {
        local comp="$1" image="$2" tag="$3"
        local rollback_tag="${tag}-rollback"

        # Check if rollback image exists
        local exists
        exists=$(ssh $VPS "docker image inspect ${image}:${rollback_tag} > /dev/null 2>&1 && echo yes || echo no")
        if [ "$exists" != "yes" ]; then
            warn "No rollback image found for ${image}:${rollback_tag} — skipping $comp"
            report_add "SKIP" "Rollback $comp: no previous image found"
            return
        fi

        log "Restoring ${image}:${rollback_tag} → ${image}:${tag}..."
        ssh $VPS "docker tag ${image}:${rollback_tag} ${image}:${tag}"
        report_add "OK" "Rollback $comp: restored previous image"
    }

    local image_tag
    if [ "$env" = "staging" ]; then
        image_tag="staging"
    else
        image_tag="latest"
    fi

    case "$component" in
        backend)
            do_rollback backend "$BACKEND_IMAGE" "$image_tag"
            ;;
        frontend)
            do_rollback frontend "$FRONTEND_IMAGE" "$image_tag"
            ;;
        all)
            do_rollback backend "$BACKEND_IMAGE" "$image_tag"
            do_rollback frontend "$FRONTEND_IMAGE" "$image_tag"
            ;;
        *) fail "Unknown component: $component" ;;
    esac

    log "Restarting containers ($env)..."
    if [ "$env" = "staging" ]; then
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file --env-file .env.staging -p sh-staging up -d --force-recreate $( [ "$component" = "all" ] && echo "backend frontend" || echo "$component" )"
    else
        ssh $VPS "cd $VPS_BASE && docker compose -f $compose_file up -d --force-recreate $( [ "$component" = "all" ] && echo "backend frontend" || echo "$component" )"
    fi

    verify "$env"
}

# ── Database backup (staging only) ────────────────────────────────────────────
# Creates a pg_dump of the staging database before migrations run.
# Backup files stored on VPS at /opt/sovereign-health/backups/

backup_staging_db() {
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="staging_backup_${timestamp}.sql.gz"
    local backup_dir="/opt/sovereign-health/backups"

    log "Creating staging database backup..."

    # Ensure backup directory exists and dump the database
    ssh $VPS "mkdir -p $backup_dir && \
        docker exec sh-staging-db pg_dump -U sovereign_health sovereign_health_staging | gzip > $backup_dir/$backup_file && \
        echo \"Backup created: $backup_dir/$backup_file (\$(du -h $backup_dir/$backup_file | cut -f1))\" && \
        ls -t $backup_dir/staging_backup_*.sql.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true" 2>/dev/null

    if [ $? -eq 0 ]; then
        log "Staging DB backup: $backup_file"
        report_add "OK" "Staging DB backup created: $backup_file (keeps last 5)"
    else
        warn "Staging DB backup failed -- continuing anyway"
        report_add "FAIL" "Staging DB backup failed"
        notify "Staging DB backup FAILED" "Backup failed before deploy — continuing without backup" 4 "errors" "warning,backup"
    fi
}

# ── Verify deployment ────────────────────────────────────────────────────────
# Checks that all services respond with HTTP 200.
# For staging, sends basic auth credentials with each request.

verify() {
    local env="$1"

    log "Waiting 5s for containers to stabilize..."
    sleep 5

    local all_ok=true
    local auth_flag=""

    # Staging URLs are behind basic auth. Add credentials to curl.
    if [ "$env" = "staging" ] && [ -n "$STAGING_AUTH_PASS" ]; then
        auth_flag="-u ${STAGING_AUTH_USER}:${STAGING_AUTH_PASS}"
    fi

    # Pick the right URLs based on environment.
    local api_url app_url web_url
    if [ "$env" = "staging" ]; then
        api_url="$VERIFY_API_STAGING"
        app_url="$VERIFY_APP_STAGING"
        web_url="$VERIFY_WEB_STAGING"
    else
        api_url="$VERIFY_API_PROD"
        app_url="$VERIFY_APP_PROD"
        web_url="$VERIFY_WEB_PROD"
    fi

    # Helper: check a URL and print result.
    check_url() {
        local label="$1" url="$2"
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $auth_flag "$url" 2>/dev/null)
        if [ "$status" = "200" ]; then
            echo -e "  ${GREEN}$status${NC}  $label  $url"
        else
            echo -e "  ${RED}$status${NC}  $label  $url"
            all_ok=false
        fi
    }

    log "Verification ($env):"

    # Check API and extract version number.
    local api_version
    api_version=$(curl -sf --max-time 10 $auth_flag "$api_url" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$api_version" ]; then
        echo -e "  ${GREEN}200${NC}  API     $api_url  (v${api_version})"
    else
        echo -e "  ${RED}ERR${NC}  API     $api_url"
        all_ok=false
    fi

    check_url "App    " "$app_url"
    check_url "Web    " "$web_url"

    # Container creation time: verify containers were actually recreated (not stale).
    # Incident: deploy can succeed (image transferred) but containers survive from previous deploy.
    local container_prefix
    if [ "$env" = "staging" ]; then container_prefix="sovereign-health-staging"; else container_prefix="sovereign-health-prod"; fi
    local stale_containers
    stale_containers=$(ssh $VPS "docker ps --filter 'name=${container_prefix}' --format '{{.Names}} {{.CreatedAt}}' 2>/dev/null | while read name created_at; do
        created_epoch=\$(date -d \"\$(echo \$created_at | cut -d' ' -f1-2)\" +%s 2>/dev/null || echo 0)
        now_epoch=\$(date +%s)
        age_minutes=\$(( (now_epoch - created_epoch) / 60 ))
        if [ \$age_minutes -gt 10 ]; then echo \"\$name (created \${age_minutes}m ago)\"; fi
    done" 2>/dev/null || echo "")
    if [ -n "$stale_containers" ]; then
        warn "Containers may not have been recreated:"
        echo "$stale_containers" | while read -r line; do echo "  - $line"; done
        report_add "WARN" "Potentially stale containers detected"
    else
        log "All containers recently created"
    fi

    echo ""
    if [ "$all_ok" = true ]; then
        log "All checks passed."
        report_add "OK" "Verification passed -- all endpoints responding"
        notify "Deploy v${VERSION} to ${env}: ALL OK" "All endpoints responding. API: ${api_version:-?}" 2 "info" "white_check_mark,${env}"
    else
        warn "Some checks failed -- review above."
        report_add "FAIL" "Verification -- some endpoints failed"
        notify "Deploy v${VERSION} to ${env}: CHECKS FAILED" "Some endpoints not responding — check server" 4 "errors" "warning,${env}"
    fi

    if [ -n "$api_version" ]; then
        report_add "INFO" "API version: $api_version"
        # Version assertion: compare against base version (strip -bN staging suffix).
        # Since Sprint 014, bump_staging_version() no longer modifies lib.rs,
        # so the API always reports the clean version while $VERSION may have -bN.
        local base_version
        base_version=$(echo "$VERSION" | sed 's/-b[0-9]*//')
        if [ "$api_version" = "$VERSION" ] || [ "$api_version" = "$base_version" ]; then
            report_add "OK" "Version assertion passed: $api_version"
        else
            warn "VERSION MISMATCH: deployed=$api_version expected=$base_version"
            report_add "FAIL" "Version mismatch: API reports $api_version but deploy expected $base_version"
        fi
    fi

    # Purge Cloudflare cache for both staging and production.
    # All subdomains (app.*, api-demo.*, www-demo.*) share the same zone.
    cloudflare_purge

    # Print the final deployment report.
    report_print "$env"

    # Run platform smoke test (unless --no-smoke flag was passed)
    if [ "${NO_SMOKE:-0}" != "1" ]; then
        local smoke_script
        smoke_script="$(cd "$(dirname "$0")/../../../.." && pwd)/tests/platform-smoke.sh"
        if [ -f "$smoke_script" ]; then
            echo ""
            log "Running platform smoke test..."
            if bash "$smoke_script" "$env"; then
                report_add "OK" "Platform smoke test passed"
            else
                warn "Platform smoke test had failures (non-blocking)"
                report_add "WARN" "Platform smoke test had failures"
                notify "Platform smoke test failed on ${env}" "Some checks did not pass after deploy v${VERSION}" 3 "errors" "warning,smoke"
            fi
        else
            log "Platform smoke test not found at $smoke_script (skipping)"
        fi
    else
        log "Platform smoke test skipped (--no-smoke flag)"
    fi
}

# ── VPS status ───────────────────────────────────────────────────────────────
# Quick overview of what's running on the VPS.

show_status() {
    log "VPS container status:"
    ssh $VPS "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    echo ""

    log "VPS disk usage:"
    ssh $VPS "df -h / | awk 'NR==2 {print \"  \" \$3 \" used / \" \$2 \" total (\" \$5 \" full)\"}'"

    log "Docker disk usage:"
    ssh $VPS "docker system df --format 'table {{.Type}}\t{{.Size}}\t{{.Reclaimable}}'"
}

# ── Reset staging DB ─────────────────────────────────────────────────────────
# Drops and recreates the staging database. Use when staging data is
# stale or corrupted. The backend will re-run migrations on next start.

reset_staging_db() {
    warn "This will DELETE all data in the staging database."
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        fail "Aborted."
    fi

    log "Resetting staging database..."
    ssh $VPS "cd $VPS_BASE && docker compose -f $COMPOSE_STAGING exec -T db psql -U sovereign_health -c 'DROP DATABASE IF EXISTS sovereign_health_staging;' && docker compose -f $COMPOSE_STAGING exec -T db psql -U sovereign_health -c 'CREATE DATABASE sovereign_health_staging OWNER sovereign_health;'"

    log "Restarting staging backend (will re-run migrations)..."
    ssh $VPS "cd $VPS_BASE && docker compose -f $COMPOSE_STAGING restart backend"
    log "Staging DB reset complete."
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN — Parse arguments and dispatch
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "============================================================================"
echo " SOVEREIGN HEALTH INTELLIGENCE -- Deploy v${VERSION}"
echo "============================================================================"
echo ""

# First argument: environment or command.
ENV="${1:-}"
# Second argument: component (backend/frontend/website) or --confirm.
COMPONENT="${2:-all}"
# Third argument: --confirm flag (if component was specified).
CONFIRM="${3:-}"

# If second arg is --confirm, treat it as full deploy with confirm.
if [ "$COMPONENT" = "--confirm" ]; then
    COMPONENT="all"
    CONFIRM="--confirm"
fi

# Check for --no-smoke flag in any argument position
for arg in "$@"; do
    if [ "$arg" = "--no-smoke" ]; then
        export NO_SMOKE=1
    fi
done

case "$ENV" in

    # ── Staging deploy ────────────────────────────────────────────────────
    # Deploys the 'develop' branch to demo.sovereignhealth.io.
    # No confirmation needed -- staging is safe to deploy anytime.
    staging)
        preflight
        case "$COMPONENT" in
            backend)  deploy_backend staging ;;
            frontend) deploy_frontend staging ;;
            website)  deploy_website staging ;;
            postgres) deploy_postgres staging ;;
            all)
                detect_changes staging
                [ "$DEPLOY_BACKEND" = "1" ] && deploy_backend staging
                [ "$DEPLOY_FRONTEND" = "1" ] && deploy_frontend staging
                [ "$DEPLOY_WEBSITE" = "1" ] && deploy_website staging
                ;;
            *) fail "Unknown component: $COMPONENT. Use: backend, frontend, website, postgres, or all." ;;
        esac
        verify staging
        ;;

    # ── Production deploy ─────────────────────────────────────────────────
    # Deploys the 'main' branch to app.sovereignhealth.io.
    # Requires --confirm flag to prevent accidental production deploys.
    production)
        if [ "$CONFIRM" != "--confirm" ]; then
            echo ""
            warn "Production deploy requires --confirm flag."
            echo ""
            echo "  Usage: bash ops/deploy.sh production --confirm"
            echo "  Usage: bash ops/deploy.sh production backend --confirm"
            echo ""
            echo "  This deploys to LIVE PRODUCTION (app.sovereignhealth.io)."
            echo "  Make sure you have tested on staging first."
            echo ""
            exit 1
        fi
        preflight
        case "$COMPONENT" in
            backend)  deploy_backend production ;;
            frontend) deploy_frontend production ;;
            website)  deploy_website production ;;
            postgres) deploy_postgres production ;;
            all)
                detect_changes production
                [ "$DEPLOY_BACKEND" = "1" ] && deploy_backend production
                [ "$DEPLOY_FRONTEND" = "1" ] && deploy_frontend production
                [ "$DEPLOY_WEBSITE" = "1" ] && deploy_website production
                ;;
            *) fail "Unknown component: $COMPONENT. Use: backend, frontend, website, postgres, or all." ;;
        esac
        verify production
        ;;

    # ── Git push ──────────────────────────────────────────────────────────
    # Pushes all 3 repos to GitLab. Skips repos with uncommitted changes.
    git)
        git_push
        report_print "git-push"
        ;;

    # ── Promote ───────────────────────────────────────────────────────────
    # Merges 'develop' into 'main' in all 3 repos.
    # This is a preparation step before deploying to production.
    # It does NOT deploy -- run 'deploy.sh production --confirm' after.
    promote)
        git_promote
        report_print "promote"
        ;;

    # ── Status ────────────────────────────────────────────────────────────
    # Shows what's running on the VPS. No changes, read-only.
    status)
        show_status
        ;;

    # ── Rollback ────────────────────────────────────────────────────────
    # Usage: deploy.sh rollback staging [backend|frontend|all]
    # Restores the previous Docker images and restarts containers.
    rollback)
        rollback "$COMPONENT" "${CONFIRM:-all}"
        ;;

    # ── Reset staging DB ──────────────────────────────────────────────────
    # Wipes the staging database. Use when data is stale or broken.
    staging-reset-db)
        reset_staging_db
        ;;

    # ── Refresh staging demo data ────────────────────────────────────────
    # Re-seeds demo profiles from CSV fixtures via the API.
    staging-refresh-demo)
        log "Refreshing staging demo data from CSV fixtures..."
        bash "$APP_ROOT/ops/seed-demo-profiles.sh" staging
        ;;

    # ── Help ──────────────────────────────────────────────────────────────
    *)
        echo "Usage: bash ops/deploy.sh <environment> [component] [--confirm]"
        echo ""
        echo "Environments:"
        echo "  staging              Deploy develop branch to demo.sovereignhealth.io"
        echo "  production           Deploy main branch to app.sovereignhealth.io (needs --confirm)"
        echo ""
        echo "Components (optional, defaults to 'all'):"
        echo "  backend              Rust API only"
        echo "  frontend             Next.js app only"
        echo "  website              Static marketing site only"
        echo "  all                  Everything (default)"
        echo ""
        echo "Other commands:"
        echo "  rollback <env> [component]  Restore previous Docker images"
        echo "  git                  Push all repos to GitLab"
        echo "  promote              Merge develop -> main (does not deploy)"
        echo "  status               Show VPS container status"
        echo "  staging-reset-db     Reset staging database"
        echo "  staging-refresh-demo Re-seed demo profiles from CSV fixtures"
        echo ""
        echo "Examples:"
        echo "  bash ops/deploy.sh staging                     # Full staging deploy"
        echo "  bash ops/deploy.sh staging frontend            # Only staging frontend"
        echo "  bash ops/deploy.sh production --confirm        # Full production deploy"
        echo "  bash ops/deploy.sh production backend --confirm"
        echo "  bash ops/deploy.sh promote                     # Merge develop -> main"
        echo ""
        echo "Variables (edit at top of this script):"
        echo "  VERSION=$VERSION"
        echo "  VPS=$VPS"
        echo "  BRANCH_STAGING=$BRANCH_STAGING"
        echo "  BRANCH_PROD=$BRANCH_PROD"
        exit 1
        ;;
esac
