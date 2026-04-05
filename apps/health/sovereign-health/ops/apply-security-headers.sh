#!/usr/bin/env bash
# apply-security-headers.sh -- Copy nginx security headers snippet to VPS and reload nginx
# Usage: bash apply-security-headers.sh <staging|production>
#
# Prerequisites:
#   - SSH access to VPS configured in ~/.ssh/config
#   - sudo privileges on target host
#
# This script does NOT run automatically -- invoke manually after reviewing
# nginx-security-headers.conf.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNIPPET_SRC="${SCRIPT_DIR}/nginx-security-headers.conf"

if [[ ! -f "${SNIPPET_SRC}" ]]; then
    echo "ERROR: ${SNIPPET_SRC} not found"
    exit 1
fi

ENV="${1:-}"
if [[ -z "${ENV}" ]]; then
    echo "Usage: $0 <staging|production>"
    exit 1
fi

# Load VPS host from .env file
ENV_FILE="${SCRIPT_DIR}/.env.${ENV}"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
fi

VPS_HOST="${VPS_HOST:-}"
if [[ -z "${VPS_HOST}" ]]; then
    echo "ERROR: VPS_HOST not set. Export it or define in ${ENV_FILE}"
    exit 1
fi

REMOTE_SNIPPET_DIR="/etc/nginx/snippets"
REMOTE_SNIPPET_PATH="${REMOTE_SNIPPET_DIR}/security-headers.conf"

echo "==> Deploying security headers to ${VPS_HOST} (${ENV})"
echo "    Source: ${SNIPPET_SRC}"
echo "    Target: ${REMOTE_SNIPPET_PATH}"
echo ""

# Step 1: Copy snippet to VPS via stdin (avoids $-escaping issues with scp)
echo "==> Copying snippet..."
ssh "${VPS_HOST}" "sudo mkdir -p ${REMOTE_SNIPPET_DIR} && sudo tee ${REMOTE_SNIPPET_PATH} > /dev/null" < "${SNIPPET_SRC}"

# Step 2: Verify nginx config
echo "==> Testing nginx configuration..."
ssh "${VPS_HOST}" "sudo nginx -t"

# Step 3: Reload nginx
echo "==> Reloading nginx..."
ssh "${VPS_HOST}" "sudo systemctl reload nginx"

echo ""
echo "==> Done. Security headers deployed to ${VPS_HOST}."
echo ""
echo "NOTE: You still need to add the following line to each nginx server block"
echo "      that should use these headers (if not already present):"
echo ""
echo "    include snippets/security-headers.conf;"
echo ""
echo "Then run: ssh ${VPS_HOST} 'sudo nginx -t && sudo systemctl reload nginx'"
