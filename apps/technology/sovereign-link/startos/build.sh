#!/usr/bin/env bash
# Build Sovereign Link Start9 package (.s9pk)
#
# Requirements:
#   - Docker (for cross-compilation)
#   - start-sdk (https://github.com/Start9Labs/start-os)
#     Install: cargo install start-sdk
#
# Usage:
#   bash startos/build.sh              # Build .s9pk
#   bash startos/build.sh --docker     # Build using Docker (no local Rust needed)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(grep '^version' "$PROJECT_DIR/Cargo.toml" | head -1 | sed 's/.*"\(.*\)"/\1/')

echo "============================================================================"
echo "  Sovereign Link - Start9 Package Builder"
echo "  Version: $VERSION"
echo "  Part of the brickos.io platform"
echo "============================================================================"
echo ""

# Check if start-sdk is available
if command -v start-sdk &>/dev/null; then
    SDK="start-sdk"
elif command -v start-cli &>/dev/null; then
    SDK="start-cli"
else
    echo "start-sdk not found. Install with:"
    echo "  cargo install start-sdk"
    echo ""
    echo "Or build the Docker image only:"
    echo "  cd $PROJECT_DIR && make build-docker"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Build the Docker image for Start9
echo "Step 1: Building Docker image..."
docker build -t sovereign-link:$VERSION -t sovereign-link:latest .
echo ""

# Step 2: Verify required files
echo "Step 2: Checking Start9 package files..."
for f in startos/manifest.yaml startos/icon.png startos/instructions.md startos/health-check.sh startos/backup.sh startos/restore.sh; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Missing required file: $f"
        exit 1
    fi
    echo "  OK: $f"
done
echo ""

# Step 3: Build .s9pk
echo "Step 3: Building .s9pk package..."
$SDK pack

# Step 4: Verify output
S9PK_FILE=$(ls -1 sovereign-link*.s9pk 2>/dev/null | head -1)
if [ -n "$S9PK_FILE" ]; then
    echo ""
    echo "============================================================================"
    echo "  Package built: $S9PK_FILE ($(du -h "$S9PK_FILE" | cut -f1))"
    echo ""
    echo "  Install on Start9:"
    echo "    1. Open your Start9 dashboard"
    echo "    2. Go to System > Sideload"
    echo "    3. Upload $S9PK_FILE"
    echo ""
    echo "  Or submit to marketplace:"
    echo "    $SDK publish $S9PK_FILE"
    echo "============================================================================"
else
    echo "WARNING: .s9pk file not found. Check start-sdk output above."
fi
