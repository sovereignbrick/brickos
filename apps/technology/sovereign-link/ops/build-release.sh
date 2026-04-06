#!/bin/bash
# Build Sovereign Link release binary
# Usage: bash ops/build-release.sh [target]
# Default target: current platform
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

VERSION=$(grep '^version' Cargo.toml | head -1 | cut -d'"' -f2)
BINARY="sovereign-link"

echo "Building Sovereign Link v${VERSION}..."

if [ -n "$1" ]; then
    TARGET="$1"
    cargo build --release -p sovereign-link --no-default-features --features standalone --target "$TARGET"
    BIN_PATH="target/${TARGET}/release/${BINARY}"
else
    cargo build --release -p sovereign-link --no-default-features --features standalone
    BIN_PATH="target/release/${BINARY}"
fi

if [ -f "$BIN_PATH" ]; then
    SIZE=$(du -h "$BIN_PATH" | cut -f1)
    echo "Built: $BIN_PATH ($SIZE)"

    # Create release artifacts
    RELEASE_DIR="release/sovereign-link-v${VERSION}"
    mkdir -p "$RELEASE_DIR"
    cp "$BIN_PATH" "$RELEASE_DIR/"
    cp README.md "$RELEASE_DIR/" 2>/dev/null || true
    cp config.example.toml "$RELEASE_DIR/" 2>/dev/null || true

    # SHA256 checksum
    cd "$RELEASE_DIR"
    sha256sum "$BINARY" > "${BINARY}.sha256"
    echo "Checksum: $(cat ${BINARY}.sha256)"
    cd -

    echo ""
    echo "Release artifacts in: $RELEASE_DIR/"
    ls -la "$RELEASE_DIR/"
else
    echo "ERROR: Binary not found at $BIN_PATH"
    exit 1
fi
