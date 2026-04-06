#!/bin/bash
# Backup script for Start9 - copies SQLite database to backup volume
# The SQLite file at /data/data.db contains all links, users, and clicks.

set -e

BACKUP_DIR="${1:-/backup}"
SOURCE="/data/data.db"

if [ ! -f "$SOURCE" ]; then
    echo "No database found at $SOURCE - nothing to backup"
    exit 0
fi

# Use SQLite .backup command for a consistent snapshot (safe even while running)
sqlite3 "$SOURCE" ".backup '$BACKUP_DIR/data.db'"

echo "Backup complete: $BACKUP_DIR/data.db ($(du -h "$BACKUP_DIR/data.db" | cut -f1))"
