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

# ══════════════════════════════════════════════════════════════════════════════
# VARIABLES — Change these per release or environment
# ══════════════════════════════════════════════════════════════════════════════

# Version: Update this before each release. Used in Docker image tags.
VERSION="0.21.0"

# Local project root: BrickOS monorepo.
PROJECT_ROOT="/home/dev-comp/projects/brickos"

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

# Cloudflare: Loaded from .env below. Set CF_ZONE_ID and CF_API_TOKEN there.

# Load secrets from .env (Cloudflare tokens, etc.)
# This file is gitignored and contains CF_ZONE_ID, CF_API_TOKEN, etc.
if [ -f "$APP_ROOT/api/.env" ]; then
    # Only load safe key=value lines (skip lines with special chars like <>)
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        case "$key" in CF_ZONE_ID|CF_API_TOKEN|STAGING_AUTH_PASS) export "$key=$value" ;; esac
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
    local frontend_dir="${APP_ROOT}/frontend"
    if [ -f "${frontend_dir}/package.json" ] && [ -f "${frontend_dir}/pnpm-lock.yaml" ]; then
        if ! (cd "$frontend_dir" && pnpm install --frozen-lockfile --ignore-workspace 2>/dev/null); then
            fail "Frontend pnpm-lock.yaml is out of sync with package.json. Run: cd frontend && pnpm install --ignore-workspace"
        fi
        log "Frontend lockfile in sync"
    fi

    report_add "OK" "Pre-flight passed (local: ${local_free}G free, VPS: ${vps_free:-?}G free)"
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

    log "Building backend ($env)..."
    cd "$PROJECT_ROOT"
    docker build -f apps/health/sovereign-health/api/Dockerfile -t "${BACKEND_IMAGE}:${image_tag}" .

    log "Transferring backend to VPS..."
    docker save "${BACKEND_IMAGE}:${image_tag}" | ssh $VPS "docker load"

    # Backup staging DB before restart (migrations run on startup)
    if [ "$env" = "staging" ]; then
        backup_staging_db
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
    cd "$APP_ROOT/frontend"

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
        -t "${FRONTEND_IMAGE}:${image_tag}" .

    log "Transferring frontend to VPS..."
    docker save "${FRONTEND_IMAGE}:${image_tag}" | ssh $VPS "docker load"

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
    pnpm build

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
    if [ -z "$CF_ZONE_ID" ] || [ -z "$CF_API_TOKEN" ]; then
        warn "CF_ZONE_ID or CF_API_TOKEN not set in api/.env -- skipping Cloudflare purge"
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

    echo ""
    if [ "$all_ok" = true ]; then
        log "All checks passed."
        report_add "OK" "Verification passed -- all endpoints responding"
    else
        warn "Some checks failed -- review above."
        report_add "FAIL" "Verification -- some endpoints failed"
    fi

    if [ -n "$api_version" ]; then
        report_add "INFO" "API version: $api_version"
        # Version assertion: verify deployed version matches expected VERSION
        if [ "$api_version" != "$VERSION" ]; then
            warn "VERSION MISMATCH: deployed=$api_version expected=$VERSION"
            report_add "FAIL" "Version mismatch: API reports $api_version but deploy expected $VERSION"
        else
            report_add "OK" "Version assertion passed: $api_version matches expected"
        fi
    fi

    # Only purge Cloudflare for production deploys.
    # Staging doesn't need it (different subdomain, usually not cached).
    if [ "$env" = "production" ]; then
        cloudflare_purge
    fi

    # Print the final deployment report.
    report_print "$env"
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
                deploy_backend staging
                deploy_frontend staging
                deploy_website staging
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
                deploy_backend production
                deploy_frontend production
                deploy_website production
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
