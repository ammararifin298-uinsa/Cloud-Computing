#!/bin/sh
set -eu

REPL_PASS="${REPLICATOR_PASSWORD:-repl_dr_pass}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replicator') THEN
            CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPL_PASS}';
        END IF;
    END
    \$\$;
EOSQL

cat >> "$PGDATA/postgresql.conf" <<'EOF'
wal_level = replica
max_connections = 150
max_wal_senders = 40
max_replication_slots = 40
wal_keep_size = 128MB
hot_standby = on
hot_standby_feedback = on
EOF

echo "host replication replicator 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
