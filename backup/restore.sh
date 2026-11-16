#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
PG_USER="${POSTGRES_USER:-logistik}"
PG_DB="${POSTGRES_DB:-logistik}"
TARGET_HOST="${TARGET_HOST:-db-primary}"

DUMP_FILE="${1:-}"

if [ -z "$DUMP_FILE" ]; then
    DUMP_FILE=$(ls -1t "$BACKUP_DIR"/logistik_*.dump 2>/dev/null | head -n 1 || true)
fi

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
    echo "[restore] ERROR: No backup .dump file found in $BACKUP_DIR" >&2
    exit 1
fi

SHA_FILE="${DUMP_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
    echo "[restore] Verifying SHA-256 checksum ($SHA_FILE)..."
    sha256sum -c "$SHA_FILE"
else
    echo "[restore] WARNING: Checksum file $SHA_FILE not found, skipping sha256sum"
fi

echo "[restore] Validating archive structure with pg_restore --list..."
pg_restore --list "$DUMP_FILE" >/dev/null

echo "[restore] Waiting for $TARGET_HOST to accept connections..."
until pg_isready -h "$TARGET_HOST" -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; do
    sleep 1
done

echo "[restore] Restoring $DUMP_FILE into $PG_DB on $TARGET_HOST..."
pg_restore --clean --if-exists --no-owner --no-privileges \
    -h "$TARGET_HOST" -U "$PG_USER" -d "$PG_DB" "$DUMP_FILE"

echo "[restore] Completed successfully from $DUMP_FILE"

