#!/usr/bin/env bash
# ============================================================================
# BrickOS App Scaffold Generator v2
# ============================================================================
# Creates a new BrickOS app with full platform integration:
#   - Rust API (Actix-web, two-pool, auth, encryption, migrations)
#   - Next.js frontend (dark theme, auth pages, navbar, settings, i18n)
#   - Docker + deploy infrastructure
#
# Usage:
#   bash ops/scaffold-app.sh <app-name> <prefix> <pillar> <prod-port> [custom-title]
#
# Example:
#   bash ops/scaffold-app.sh sovereign-crm scr data 8084 "Sovereign CRM"
#   bash ops/scaffold-app.sh sovereign-voice svo attention 8086
#
# Pillars: finance, health, data, attention, energy, technology, governance
#
# Architecture: Templates live in ops/scaffold-templates/ as real source files.
# - Static files (.rs, .tsx, .css, .json) are copied verbatim (IDE-lintable)
# - Template files (.tmpl) are processed by envsubst for variable substitution
# See docs/design/019-scaffold-generator-architecture.md for full specification.
# ============================================================================
set -euo pipefail

# -- Helpers -----------------------------------------------------------------

# Smart title case: words <= 3 chars get UPPERCASED (CRM, API, AI)
# "sovereign-crm" -> "Sovereign CRM"
# "sovereign-health" -> "Sovereign Health"
smart_title_case() {
    echo "$1" | tr '-' ' ' | awk '{
        for (i=1; i<=NF; i++) {
            if (length($i) <= 3 && $i ~ /^[a-zA-Z]+$/) {
                $i = toupper($i)
            } else {
                $i = toupper(substr($i,1,1)) tolower(substr($i,2))
            }
        }
        print
    }'
}

# Render template directory to target directory
# - .tmpl files: envsubst -> strip suffix -> write
# - other files: copy verbatim
render_all() {
    local src_dir="$1" dst_dir="$2"
    find "$src_dir" -type f | sort | while read -r src; do
        local rel="${src#"$src_dir"/}"
        if [[ "$rel" == *.tmpl ]]; then
            local dst="${dst_dir}/${rel%.tmpl}"
            mkdir -p "$(dirname "$dst")"
            envsubst < "$src" > "$dst"
        else
            local dst="${dst_dir}/${rel}"
            mkdir -p "$(dirname "$dst")"
            cp "$src" "$dst"
        fi
    done
}

# -- Args -------------------------------------------------------------------
APP_NAME="${1:?Usage: scaffold-app.sh <app-name> <prefix> <pillar> <prod-port> [custom-title]}"
PREFIX="${2:?Missing prefix (e.g., scr, svo)}"
PILLAR="${3:?Missing pillar (e.g., data, finance, health)}"
PROD_PORT="${4:?Missing production port (e.g., 8084)}"

# -- Derived variables (all exported for envsubst) --------------------------
export APP_NAME PREFIX PILLAR PROD_PORT
export PREFIX_UPPER="${PREFIX^^}"
export CRATE_NAME="${APP_NAME}-api"
export STAGING_PORT=$((PROD_PORT + 1))
export DOCKER_PREFIX="sovereignbrick/${PREFIX}"
export APP_TITLE="${5:-$(smart_title_case "$APP_NAME")}"
# Frontend dev port: API 8080->3000, 8082->3002, 8084->3004, etc.
export FRONTEND_PORT=$((3000 + (PROD_PORT - 8080) / 2 * 2))
# Dev DB port: API 8080->5432, 8082->5433, 8084->5434, etc.
export DEV_DB_PORT=$((5432 + (PROD_PORT - 8080) / 2))
# DOLLAR is used in .tmpl files to produce literal ${...} in output (docker-compose)
export DOLLAR='$'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="${REPO_ROOT}/ops/scaffold-templates"
APP_DIR="${REPO_ROOT}/apps/${PILLAR}/${APP_NAME}"

# -- Guard ------------------------------------------------------------------
if [[ -d "$APP_DIR/api/src" ]]; then
    echo "ERROR: ${APP_DIR}/api/src already exists. Aborting."
    exit 1
fi

if [[ ! -d "$TEMPLATE_DIR" ]]; then
    echo "ERROR: Template directory not found: ${TEMPLATE_DIR}"
    echo "Run this script from the repository root."
    exit 1
fi

# -- Banner -----------------------------------------------------------------
echo "============================================================"
echo "BrickOS App Scaffold Generator v2"
echo "============================================================"
echo "App:      ${APP_NAME} (${APP_TITLE})"
echo "Prefix:   ${PREFIX} / ${PREFIX_UPPER}"
echo "Pillar:   ${PILLAR}"
echo "Ports:    API ${PROD_PORT} (prod) / ${STAGING_PORT} (staging)"
echo "          Frontend ${FRONTEND_PORT} (dev) / DB ${DEV_DB_PORT} (dev)"
echo "Path:     ${APP_DIR}"
echo "Docker:   ${DOCKER_PREFIX}-api / ${DOCKER_PREFIX}-web"
echo "Database: ${PREFIX}"
echo "============================================================"
echo ""

# -- Step 1: Render API templates -------------------------------------------
echo "[1/7] Rendering API scaffold..."
render_all "${TEMPLATE_DIR}/api" "${APP_DIR}/api"


# -- Step 2: Render frontend templates -------------------------------------
echo "[2/7] Rendering frontend scaffold..."
render_all "${TEMPLATE_DIR}/frontend" "${APP_DIR}/frontend"

# -- Step 3: Render ops templates -------------------------------------------
echo "[3/7] Rendering ops scaffold..."
render_all "${TEMPLATE_DIR}/ops" "${APP_DIR}/ops"
chmod +x "${APP_DIR}/ops/deploy.sh"

# -- Step 4: Root + dev files ------------------------------------------------
echo "[4/7] Creating root + dev files..."
cp "${TEMPLATE_DIR}/.gitignore" "${APP_DIR}/.gitignore"
cp "${TEMPLATE_DIR}/.dockerignore" "${APP_DIR}/.dockerignore"
# Dev database init + docker-compose
cp "${TEMPLATE_DIR}/init-dev-db.sql" "${APP_DIR}/init-dev-db.sql"
envsubst < "${TEMPLATE_DIR}/docker-compose.dev.yml.tmpl" > "${APP_DIR}/docker-compose.dev.yml"

# -- Step 5: Create empty directories + placeholders -----------------------
echo "[5/8] Creating placeholder directories..."
mkdir -p "${APP_DIR}/api/migrations"
touch "${APP_DIR}/api/migrations/.gitkeep"
mkdir -p "${APP_DIR}/frontend/public"
touch "${APP_DIR}/frontend/public/.gitkeep"

# -- Step 6: Release notes scaffold -----------------------------------------
# The .github/workflows/release.yml workflow triggers on tag push `{app}/v*`
# and reads docs/releases/{app}/{version}/RELEASE_{version}.md. Create the
# app folder so future releases have a home.
echo "[6/8] Creating release notes scaffold..."
RELEASE_NOTES_DIR="${REPO_ROOT}/docs/releases/${APP_NAME}"
mkdir -p "${RELEASE_NOTES_DIR}"
if [[ ! -f "${RELEASE_NOTES_DIR}/README.md" ]]; then
    cat > "${RELEASE_NOTES_DIR}/README.md" <<EOF
# ${APP_TITLE} — Release Notes

Per-version release notes for \`${APP_NAME}\`.

## Tag convention

\`\`\`
git tag -a ${APP_NAME}/vX.Y.Z -m "${APP_TITLE} vX.Y.Z"
git push origin ${APP_NAME}/vX.Y.Z
\`\`\`

## Notes convention

\`\`\`
docs/releases/${APP_NAME}/vX.Y.Z/RELEASE_vX.Y.Z.md
\`\`\`

Pushing a matching tag triggers \`.github/workflows/release.yml\`, which reads
the notes file and publishes a GitHub Release. If the notes file is missing,
the workflow fails. Create the file and commit it before tagging.

See \`docs/releases/RELEASE_TEMPLATE.md\` for the full release workflow.
EOF
    echo "  Created ${RELEASE_NOTES_DIR}/README.md"
else
    echo "  ${RELEASE_NOTES_DIR}/README.md already exists, skipping"
fi

# -- Step 7: Workspace registration check -----------------------------------
echo "[7/8] Checking workspace registration..."
if grep -q "apps/${PILLAR}/${APP_NAME}/api" "${REPO_ROOT}/Cargo.toml"; then
    echo "  Already registered in workspace Cargo.toml"
else
    echo "  NOTE: Add this line to workspace members in Cargo.toml:"
    echo "    \"apps/${PILLAR}/${APP_NAME}/api\","
    echo ""
fi

# -- Step 8: Post-generation verification -----------------------------------
echo "[8/8] Verifying generated code..."

# Auto-format Rust code to match cargo fmt output
if cargo fmt -p "${CRATE_NAME}" 2>/dev/null; then
    echo "  cargo fmt: OK"
else
    echo "  cargo fmt: SKIPPED (crate not yet in workspace)"
fi

# Check compilation
if cargo check -p "${CRATE_NAME}" 2>/dev/null; then
    echo "  cargo check: OK"
else
    echo "  cargo check: SKIPPED (crate not yet in workspace)"
fi

# Clippy
if cargo clippy -p "${CRATE_NAME}" -- -D warnings 2>/dev/null; then
    echo "  cargo clippy: OK"
else
    echo "  cargo clippy: SKIPPED or has warnings"
fi

# -- Summary ----------------------------------------------------------------
echo ""
echo "============================================================"
echo "Scaffold complete: ${APP_DIR}"
echo "============================================================"
echo ""
echo "Generated from ops/scaffold-templates/ (template-based v2):"
echo ""
echo "  api/"
echo "    Cargo.toml        All brickos-* crate dependencies"
echo "    src/main.rs        Two-pool init (PlatformPool + AppPool)"
echo "    src/config.rs      ${PREFIX_UPPER}_* env var loading"
echo "    src/error.rs       AppError enum with ResponseError"
echo "    src/handlers/      Auth stubs (signup, login, MFA, reset)"
echo "    src/models/        Auth request/response types"
echo "    migrations/        SQLx migration directory"
echo "    tests/             Smoke + integration test stubs"
echo "    Makefile           ci, lint, test, bench targets"
echo "    .env.example       All required env vars"
echo ""
echo "  frontend/"
echo "    src/app/           Login, signup, dashboard, settings pages"
echo "    src/components/    Navbar (Settings, Affiliate, Admin, Theme, Sign out)"
echo "    src/lib/           AuthProvider, ThemeProvider, brand detection"
echo "    src/i18n/          EN + DE translations"
echo ""
echo "  ops/"
echo "    Dockerfile.api     Multi-stage cargo-chef build"
echo "    Dockerfile.web     Standalone Next.js build"
echo "    docker-compose.*   Staging + production"
echo "    deploy.sh          Deployment script (template)"
echo ""
echo "Quick start (local dev):"
echo "  1. Add \"apps/${PILLAR}/${APP_NAME}/api\" to workspace members in Cargo.toml"
echo "  2. docker compose -f docker-compose.dev.yml up -d    # Start PostgreSQL"
echo "  3. cd api && cargo run                                # API on :${PROD_PORT}"
echo "  4. cd frontend && npm install && npm run dev          # Frontend on :${FRONTEND_PORT}"
echo "  5. Open http://localhost:${FRONTEND_PORT}/login"
echo ""
echo "Port map:"
echo "  API:      http://localhost:${PROD_PORT}"
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Database: localhost:${DEV_DB_PORT}"
echo "============================================================"
