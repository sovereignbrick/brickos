#!/bin/bash
# Restore script for Start9 - restores SQLite database from backup

set -e

BACKUP_DIR="${1:-/backup}"
TARGET="/data/data.db"

if [ ! -f "$BACKUP_DIR/data.db" ]; then
    echo "No backup found at $BACKUP_DIR/data.db"
    exit 1
fi

# Stop the service gracefully if running
if pgrep sovereign-link > /dev/null 2>&1; then
    echo "Stopping Sovereign Link for restore..."
    kill -TERM "$(pgrep sovereign-link)" 2>/dev/null || true
    sleep 2
fi

# Copy backup to data directory
cp "$BACKUP_DIR/data.db" "$TARGET"

echo "Restore complete: $TARGET ($(du -h "$TARGET" | cut -f1))"
echo "Restart the service to apply."
