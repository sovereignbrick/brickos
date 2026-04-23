#!/bin/bash
# =============================================================================
#  Sovereign Health -- self-hosted installer
#  AGPL-3.0 -- https://github.com/sovereignbrick/brickos
#
#  One-shot: generate secrets, pull images, start stack.
#
#  Usage:
#    ./sh-install.sh              # install with cloud-free defaults
#    ./sh-install.sh --with-ai    # also bundle a local Ollama container
#    ./sh-install.sh --uninstall  # stop + remove; data volumes preserved
#    ./sh-install.sh --upgrade    # pull latest images + restart
#
#  Requirements: Docker + Docker Compose plugin, ~4GB RAM, ~10GB disk.
#  Supported: Pop!_OS / Ubuntu 22.04+ / Debian 12+ / Fedora 38+. Other
#  Linux flavors should work if Docker does.
#
#  Data lives in Docker volumes (shi-pgdata, shi-uploads, shi-reports)
#  and the config at /etc/sovereign-health/.env. Back those up to back
#  up your instance.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/apps/health/sovereign-health/ops/docker-compose.selfhosted.yml"
COMPOSE_FILE_AI="$SCRIPT_DIR/apps/health/sovereign-health/ops/docker-compose.selfhosted-ai.yml"
ENV_TEMPLATE="$SCRIPT_DIR/apps/health/sovereign-health/ops/.env.example"
ENV_DIR="/etc/sovereign-health"
ENV_FILE="$ENV_DIR/.env"
PROJECT_NAME="sovereign-health"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INSTALL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

MODE="install"
WITH_AI="0"
for arg in "$@"; do
    case "$arg" in
        --with-ai) WITH_AI="1" ;;
        --uninstall) MODE="uninstall" ;;
        --upgrade) MODE="upgrade" ;;
        --help|-h)
            sed -n '/^#  Usage:/,/^#  Data/p' "$0" | sed 's/^# *//'
            exit 0
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Offer to install Docker via the official get.docker.com script.
# Called when prereq check finds Docker missing. User must consent; we
# never install without an explicit yes.
# -----------------------------------------------------------------------------
offer_docker_install() {
    echo
    warn "Docker is not installed."
    echo
    echo "Sovereign Health needs Docker + Docker Compose plugin to run."
    echo "I can install both for you using the official Docker setup script."
    echo "This requires sudo (you'll be prompted for your password)."
    echo
    echo "Manual alternative (if you prefer):"
    echo "  # Ubuntu / Pop!_OS / Debian:"
    echo "  sudo apt update && sudo apt install -y docker.io docker-compose-plugin"
    echo "  sudo usermod -aG docker \$USER && newgrp docker"
    echo "  # Fedora:"
    echo "  sudo dnf install -y docker docker-compose-plugin"
    echo "  sudo systemctl enable --now docker"
    echo "  sudo usermod -aG docker \$USER && newgrp docker"
    echo
    read -r -p "Install Docker automatically now? [y/N] " answer
    case "$answer" in
        [yY]|[yY][eE][sS])
            log "Installing Docker via get.docker.com..."
            if ! curl -fsSL https://get.docker.com | sudo sh; then
                fail "Docker install failed. Review the output above and try the manual steps."
            fi
            log "Enabling Docker service..."
            sudo systemctl enable --now docker
            log "Adding $USER to the docker group..."
            sudo usermod -aG docker "$USER"
            echo
            warn "Your user was added to the 'docker' group, but group membership"
            warn "only takes effect on the NEXT login. Two options:"
            warn "  1) Log out and log back in, then re-run:  ./sh-install.sh"
            warn "  2) Or run:  newgrp docker   followed by:  ./sh-install.sh"
            echo
            exit 0
            ;;
        *)
            fail "Aborted. Install Docker manually (see above), then re-run this script."
            ;;
    esac
}

# -----------------------------------------------------------------------------
# Check prereqs: Docker + Docker Compose plugin.
# -----------------------------------------------------------------------------
check_prereqs() {
    log "Checking prerequisites..."

    # Docker binary missing -- offer to install it.
    if ! command -v docker >/dev/null 2>&1; then
        offer_docker_install
    fi

    # Compose plugin missing -- print clear install instruction.
    if ! docker compose version >/dev/null 2>&1; then
        echo
        warn "Docker is installed but the Compose plugin is missing."
        echo "Install it:"
        echo "  # Ubuntu / Pop!_OS / Debian:"
        echo "  sudo apt install -y docker-compose-plugin"
        echo "  # Fedora:"
        echo "  sudo dnf install -y docker-compose-plugin"
        fail "After installing, re-run:  ./sh-install.sh"
    fi

    # Daemon not reachable -- likely not started, or user not in docker group.
    if ! docker info >/dev/null 2>&1; then
        echo
        warn "Docker daemon not reachable. Likely causes + fixes:"
        echo "  1) Daemon not started:  sudo systemctl start docker"
        echo "  2) Your user lacks docker-group membership. Run:"
        echo "        sudo usermod -aG docker \$USER && newgrp docker"
        echo "     (or log out + back in), then re-run this script."
        fail "Docker daemon check failed."
    fi

    [ -f "$COMPOSE_FILE" ] || fail "Compose file missing: $COMPOSE_FILE -- are you running this from the repo root?"
    log "Prerequisites OK."
}

# -----------------------------------------------------------------------------
# Generate random secrets on first run.
# -----------------------------------------------------------------------------
generate_secrets() {
    if [ -f "$ENV_FILE" ]; then
        log "Existing config found at $ENV_FILE -- keeping it."
        return
    fi

    log "Generating secrets to $ENV_FILE..."
    sudo mkdir -p "$ENV_DIR"
    sudo chown "$(id -u):$(id -g)" "$ENV_DIR"

    local db_password jwt_secret encryption_key
    db_password=$(openssl rand -base64 32 | tr -d '+/=' | head -c 32)
    jwt_secret=$(openssl rand -base64 48 | tr -d '+/=' | head -c 48)
    encryption_key=$(openssl rand -hex 32)

    cp "$ENV_TEMPLATE" "$ENV_FILE"
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$db_password|" "$ENV_FILE"
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" "$ENV_FILE"
    sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$encryption_key|" "$ENV_FILE"

    chmod 600 "$ENV_FILE"
    log "Secrets written. Edit $ENV_FILE to change any setting (e.g. add ANTHROPIC_API_KEY)."
}

# -----------------------------------------------------------------------------
# Compose up + wait healthy.
# -----------------------------------------------------------------------------
start_stack() {
    log "Pulling images..."
    local compose_args=("-p" "$PROJECT_NAME" "--env-file" "$ENV_FILE" "-f" "$COMPOSE_FILE")
    if [ "$WITH_AI" = "1" ]; then
        [ -f "$COMPOSE_FILE_AI" ] && compose_args+=("-f" "$COMPOSE_FILE_AI") || warn "Ollama compose overlay not found; skipping --with-ai"
    fi
    docker compose "${compose_args[@]}" pull
    log "Starting stack..."
    docker compose "${compose_args[@]}" up -d

    log "Waiting for backend to be ready..."
    local tries=0
    until curl -sf http://localhost:8080/health >/dev/null 2>&1; do
        tries=$((tries + 1))
        if [ "$tries" -ge 120 ]; then
            warn "Backend did not become healthy within 120 seconds."
            warn "Check logs: docker compose -p $PROJECT_NAME logs backend"
            exit 1
        fi
        sleep 1
    done
    log "Backend ready."
}

# -----------------------------------------------------------------------------
# Success banner.
# -----------------------------------------------------------------------------
print_banner() {
    echo
    echo "============================================================"
    echo "  Sovereign Health is running."
    echo
    echo "    Open:  http://localhost:3000"
    echo
    echo "  The first account you create will be promoted to admin."
    echo "  Email can be fake -- no outbound mail, signup auto-verifies."
    echo "  Data lives in Docker volumes; config at $ENV_FILE."
    echo
    echo "  Helpful commands:"
    echo "    docker compose -p $PROJECT_NAME logs -f       # tail logs"
    echo "    docker compose -p $PROJECT_NAME down          # stop (data preserved)"
    echo "    ./sh-install.sh --upgrade                     # update to latest"
    echo "    ./sh-install.sh --uninstall                   # stop + remove"
    echo
    echo "  Optional: Dr. Alex chat needs AI_PROVIDER set in $ENV_FILE."
    echo "    - Cloud: ANTHROPIC_API_KEY=... AI_PROVIDER=anthropic"
    echo "    - Local: ./sh-install.sh --with-ai            # bundles Ollama"
    echo "============================================================"
}

# -----------------------------------------------------------------------------
# Uninstall: stop compose stack. Data volumes preserved unless --purge.
# -----------------------------------------------------------------------------
uninstall() {
    log "Stopping stack (data volumes preserved)..."
    docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down || true
    log "Done. To also remove data:"
    log "  docker volume rm ${PROJECT_NAME}_shi-pgdata ${PROJECT_NAME}_shi-uploads ${PROJECT_NAME}_shi-reports"
}

# -----------------------------------------------------------------------------
# Upgrade: pull latest + restart.
# -----------------------------------------------------------------------------
upgrade() {
    log "Pulling latest images..."
    docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
    log "Restarting stack..."
    docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
    log "Upgrade complete."
}

# -----------------------------------------------------------------------------
# Main.
# -----------------------------------------------------------------------------
case "$MODE" in
    install)
        check_prereqs
        generate_secrets
        start_stack
        print_banner
        ;;
    upgrade)
        check_prereqs
        upgrade
        ;;
    uninstall)
        uninstall
        ;;
esac
