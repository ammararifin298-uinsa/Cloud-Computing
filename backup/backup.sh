#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
INTERVAL="${BACKUP_INTERVAL:-900}"
PG_USER="${POSTGRES_USER:-logistik}"
PG_DB="${POSTGRES_DB:-logistik}"

mkdir -p "$BACKUP_DIR"

echo "[backup] started: interval=${INTERVAL}s, db=${PG_DB}"

while true; do
    TS=$(date -u +%Y%m%dT%H%M%SZ)
    PART_FILE="$BACKUP_DIR/logistik_${TS}.dump.part"
    FINAL_FILE="$BACKUP_DIR/logistik_${TS}.dump"
    SHA_FILE="$BACKUP_DIR/logistik_${TS}.dump.sha256"

    TARGET_HOST=""
    if pg_isready -h db-primary -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
        TARGET_HOST="db-primary"
    elif pg_isready -h db-standby -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
        TARGET_HOST="db-standby"
    fi

    if [ -z "$TARGET_HOST" ]; then
        echo "[backup] WARNING: neither db-primary nor db-standby is ready at $TS"
    else
        echo "[backup] dumping from $TARGET_HOST at $TS..."
        if pg_dump -h "$TARGET_HOST" -U "$PG_USER" -Fc -Z 6 "$PG_DB" > "$PART_FILE"; then
            if pg_restore --list "$PART_FILE" >/dev/null 2>&1; then
                mv "$PART_FILE" "$FINAL_FILE"
                sha256sum "$FINAL_FILE" > "$SHA_FILE"
                SIZE=$(du -h "$FINAL_FILE" | cut -f1)
                echo "[backup] OK & verified: $FINAL_FILE ($SIZE) from $TARGET_HOST"
            else
                echo "[backup] ERROR: pg_restore --list validation failed, discarding $PART_FILE"
                rm -f "$PART_FILE"
            fi
        else
            echo "[backup] ERROR: pg_dump failed from $TARGET_HOST"
            rm -f "$PART_FILE"
        fi
    fi

    # Prune local backups older than 24 hours (1440 minutes)
    find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "*.dump" -o -name "*.dump.sha256" \) -mmin +1440 -delete || true

    sleep "$INTERVAL"
done
