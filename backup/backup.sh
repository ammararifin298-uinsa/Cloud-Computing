#!/bin/sh
set -eu
mkdir -p /backups
while true; do
  TS=$(date +%Y%m%d_%H%M%S)
  if nice -n 19 pg_dump -h db -U logistik -Fc -Z 6 logistik > /backups/logistik_$TS.part; then
    mv /backups/logistik_$TS.part /backups/logistik_$TS.dump
    echo "[$(date)] backup OK: logistik_$TS.dump"
  else
    rm -f /backups/logistik_$TS.part
    echo "[$(date)] backup FAILED"
  fi
  find /backups -name 'logistik_*.dump' -mmin +1440 -delete
  sleep "${BACKUP_INTERVAL:-900}"
done
