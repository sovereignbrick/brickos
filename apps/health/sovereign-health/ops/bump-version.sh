#!/bin/bash
# Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
#
# Bump version across all files that contain the version string.
# Does NOT auto-commit — review changes and commit manually.
#
# Usage:
#   bash ops/bump-version.sh 0.21.0
#   bash ops/bump-version.sh 0.21.0-rc1

set -e

NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: bash ops/bump-version.sh <version>"
    echo "  e.g. bash ops/bump-version.sh 0.21.0"
    exit 1
fi

# Validate semver-ish format
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
    echo "Error: '$NEW_VERSION' doesn't look like a valid version (expected X.Y.Z or X.Y.Z-tag)"
    exit 1
fi

# Resolve paths relative to this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ROOT="$(dirname "$SCRIPT_DIR")"

# Files to update and their patterns
declare -A FILES
FILES=(
    ["$APP_ROOT/api/src/lib.rs"]='pub const VERSION: &str = '
    ["$APP_ROOT/api/Cargo.toml"]='version = '
    ["$APP_ROOT/frontend/package.json"]='"version": '
    ["$APP_ROOT/website/package.json"]='"version": '
    ["$SCRIPT_DIR/deploy.sh"]='VERSION='
    ["$APP_ROOT/api/tests/snapshots/integration__health_snapshot.snap"]='"version": '
    ["$APP_ROOT/api/tests/snapshots/integration__hello_snapshot.snap"]='"version": '
)

# Detect current version from lib.rs (single source of truth)
CURRENT_VERSION=$(grep 'pub const VERSION' "$APP_ROOT/api/src/lib.rs" | sed 's/.*"\(.*\)".*/\1/')

if [ -z "$CURRENT_VERSION" ]; then
    echo "Error: Could not detect current version from api/src/lib.rs"
    exit 1
fi

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
    echo "Already at version $NEW_VERSION — nothing to do."
    exit 0
fi

echo "Bumping version: $CURRENT_VERSION → $NEW_VERSION"
echo ""

UPDATED=0
FAILED=0

for file in "${!FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "  SKIP  $file (not found)"
        continue
    fi

    # Get relative path for display
    rel="${file#$APP_ROOT/}"

    if grep -q "$CURRENT_VERSION" "$file"; then
        sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
        echo "  OK    $rel"
        UPDATED=$((UPDATED + 1))
    else
        echo "  WARN  $rel (version string '$CURRENT_VERSION' not found)"
        FAILED=$((FAILED + 1))
    fi
done

# Regenerate Cargo.lock
echo ""
echo "Regenerating Cargo.lock..."
MONOREPO_ROOT="$(cd "$APP_ROOT/../../.." && pwd)"
cd "$MONOREPO_ROOT"
cargo generate-lockfile 2>/dev/null && echo "  OK    Cargo.lock updated" || echo "  WARN  cargo generate-lockfile failed"

echo ""
echo "Summary: $UPDATED files updated, $FAILED warnings"
echo ""
echo "Next steps:"
echo "  1. Review changes:  git diff"
echo "  2. Run tests:       cargo test -p sovereign-health-api"
echo "  3. Commit:          git add -A && git commit -m 'chore: bump version to $NEW_VERSION'"
