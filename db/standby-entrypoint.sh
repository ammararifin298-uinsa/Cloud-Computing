#!/bin/sh
set -eu

export PGPASSWORD="${REPLICATOR_PASSWORD:-repl_dr_pass}"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[standby] Waiting for db-primary:5432..."
  until pg_isready -h db-primary -p 5432 -U "${POSTGRES_USER:-logistik}" >/dev/null 2>&1; do
    sleep 2
  done

  echo "[standby] Running pg_basebackup from db-primary..."
  rm -rf "${PGDATA:?}"/*
  until pg_basebackup -h db-primary -p 5432 -U replicator -D "$PGDATA" -Fp -Xs -P -R; do
    echo "[standby] pg_basebackup failed, retrying in 3s..."
    rm -rf "${PGDATA:?}"/*
    sleep 3
  done

  chown -R postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
fi

exec docker-entrypoint.sh postgres -c hot_standby=on

