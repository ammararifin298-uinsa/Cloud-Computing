#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
INTERVAL="${BACKUP_INTERVAL:-900}"
PG_USER="${POSTGRES_USER:-logistik}"
PG_DB="${POSTGRES_DB:-logistik}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

mkdir -p "$BACKUP_DIR"

echo "[backup] started: interval=${INTERVAL}s, db=${PG_DB} (prefer replica to offload primary)"

while true; do
    TS=$(date -u +%Y%m%dT%H%M%SZ)
    PART_FILE="$BACKUP_DIR/logistik_${TS}.dump.part"
    FINAL_FILE="$BACKUP_DIR/logistik_${TS}.dump"
    SHA_FILE="$BACKUP_DIR/logistik_${TS}.dump.sha256"

    # Kelompok 6 DRP Strategy: prefer Read Replica (haproxy-db / db-replica) first so periodic dumps
    # DO NOT burden db-primary. Automatically fall back to db-primary if replicas are unavailable.
    TARGET_HOST=""
    if pg_isready -h haproxy-db -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
        TARGET_HOST="haproxy-db"
    elif pg_isready -h db-replica -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
        TARGET_HOST="db-replica"
    elif pg_isready -h db-primary -p 5432 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
        TARGET_HOST="db-primary"
    fi

    if [ -z "$TARGET_HOST" ]; then
        echo "[backup] WARNING: no database host ready at $TS"
    else
        echo "[backup] dumping from $TARGET_HOST at $TS..."
        if pg_dump -h "$TARGET_HOST" -U "$PG_USER" -Fc -Z 6 "$PG_DB" > "$PART_FILE"; then
            if pg_restore --list "$PART_FILE" >/dev/null 2>&1; then
                mv "$PART_FILE" "$FINAL_FILE"
                sha256sum "$FINAL_FILE" > "$SHA_FILE"
                SIZE=$(du -h "$FINAL_FILE" | cut -f1)
                echo "[backup] OK dan verified: $FINAL_FILE ($SIZE) from $TARGET_HOST"

                # Tier 1 local retention: prune files older than 24h ONLY after a successful verified dump
                # and always keep at least the 3 newest dumps safe.
                DUMP_COUNT=$(ls -1 "$BACKUP_DIR"/logistik_*.dump 2>/dev/null | wc -l || echo 0)
                if [ "$DUMP_COUNT" -gt 3 ]; then
                    find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "*.dump" -o -name "*.dump.sha256" \) -mmin +1440 -delete || true
                fi

                # Tier 2 off-site Cloud Sync (2-30 days retention via rclone to Google Drive if configured)
                if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
                    echo "[backup] Syncing to off-site cloud remote ($RCLONE_REMOTE, retention 2-30 days)..."
                    rclone copy "$FINAL_FILE" "$RCLONE_REMOTE" >/dev/null 2>&1 || true
                    rclone copy "$SHA_FILE" "$RCLONE_REMOTE" >/dev/null 2>&1 || true
                    rclone delete "$RCLONE_REMOTE" --min-age 30d >/dev/null 2>&1 || true
                fi
            else
                echo "[backup] ERROR: pg_restore --list validation failed, discarding $PART_FILE"
                rm -f "$PART_FILE"
            fi
        else
            echo "[backup] ERROR: pg_dump failed from $TARGET_HOST"
            rm -f "$PART_FILE"
        fi
    fi

    sleep "$INTERVAL"
done
