-- ==========================================================================
-- LacakIn - Skema BDL Tahap 1 (Idempotent, aman dijalankan ulang)
-- Mencakup: State Machine (shipment_statuses & allowed_transitions),
--           Perluasan shipments (intake order, tarif, optimistic lock, soft delete),
--           Counter resi atomik, tracking_events (actor_id, clock_timestamp),
--           proofs (bukti foto terikat event), shipment_assignments,
--           users hardening (hub_id, token_version, lockout),
--           audit_log append-only, idempotency_keys, dan public_tracking_view.
--
-- Cara pakai pada volume yang sudah ada:
--   Get-Content db\04-bdl-upgrade.sql | docker exec -i lacakin-db-primary psql -U logistik -d logistik
-- ==========================================================================

-- 1. Referensi Status & State Machine (#4)
CREATE TABLE IF NOT EXISTS shipment_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO shipment_statuses (code, label, sort_order, is_terminal) VALUES
  ('BOOKED',           'Pesanan Dibuat',       1, FALSE),
  ('DITERIMA',         'Diterima di Loket',    2, FALSE),
  ('DISIMPAN',         'Disimpan di Gudang',   3, FALSE),
  ('DALAM_PERJALANAN', 'Dalam Perjalanan',     4, FALSE),
  ('DIKIRIM',          'Dikirim Kurir',        5, FALSE),
  ('GAGAL_KIRIM',      'Gagal Kirim',          6, FALSE),
  ('RETUR',            'Retur ke Pengirim',    7, TRUE),
  ('BATAL',            'Dibatalkan',           8, TRUE),
  ('SELESAI',          'Selesai Diterima',     9, TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS allowed_transitions (
    from_status   TEXT NOT NULL REFERENCES shipment_statuses(code),
    to_status     TEXT NOT NULL REFERENCES shipment_statuses(code),
    allowed_roles TEXT[] NOT NULL,
    requires_proof BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO allowed_transitions (from_status, to_status, allowed_roles, requires_proof) VALUES
  ('BOOKED',           'DITERIMA',         ARRAY['operator','admin','superadmin'],           FALSE),
  ('BOOKED',           'BATAL',            ARRAY['operator','admin','superadmin'],           FALSE),
  ('DITERIMA',         'DISIMPAN',         ARRAY['operator','admin','superadmin'],           FALSE),
  ('DITERIMA',         'DALAM_PERJALANAN', ARRAY['operator','kurir','admin','superadmin'],   FALSE),
  ('DITERIMA',         'BATAL',            ARRAY['admin','superadmin'],                      FALSE),
  ('DISIMPAN',         'DALAM_PERJALANAN', ARRAY['operator','kurir','admin','superadmin'],   FALSE),
  ('DISIMPAN',         'DIKIRIM',          ARRAY['operator','kurir','admin','superadmin'],   FALSE),
  ('DALAM_PERJALANAN', 'DISIMPAN',         ARRAY['operator','admin','superadmin'],           FALSE),
  ('DALAM_PERJALANAN', 'DIKIRIM',          ARRAY['operator','kurir','admin','superadmin'],   FALSE),
  ('DIKIRIM',          'SELESAI',          ARRAY['kurir','operator','admin','superadmin'],   TRUE),
  ('DIKIRIM',          'GAGAL_KIRIM',      ARRAY['kurir','operator','admin','superadmin'],   TRUE),
  ('GAGAL_KIRIM',      'DIKIRIM',          ARRAY['kurir','operator','admin','superadmin'],   FALSE),
  ('GAGAL_KIRIM',      'DISIMPAN',         ARRAY['operator','admin','superadmin'],           FALSE),
  ('GAGAL_KIRIM',      'RETUR',            ARRAY['operator','admin','superadmin'],           TRUE)
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 2. Hardening Tabel Users (#6, #8, #1.5, #1.6, #2.6)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hub_id          INTEGER REFERENCES hubs(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version   INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_username ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email    ON users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_users_upper_emp_code ON users (upper(employee_code));
CREATE INDEX        IF NOT EXISTS idx_users_hub_id         ON users (hub_id);

-- 3. Perluasan Tabel Shipments (#1, #4, #7, #10)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_name          TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_phone         TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_address       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_city_id       INTEGER REFERENCES cities(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_hub_id        INTEGER REFERENCES hubs(id);

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_name        TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_phone       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_address     TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dest_city_id         INTEGER REFERENCES cities(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dest_hub_id          INTEGER REFERENCES hubs(id);

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS service_code         TEXT REFERENCES services(code);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS weight_kg            NUMERIC(8,2) DEFAULT 1.00;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS length_cm            NUMERIC(8,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS width_cm             NUMERIC(8,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS height_cm            NUMERIC(8,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS chargeable_weight_kg INTEGER DEFAULT 1;

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS declared_value       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_cost        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_cost       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_cost           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS payment_status       TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS channel              TEXT NOT NULL DEFAULT 'LOKET';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by           INTEGER REFERENCES users(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS version              INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS deleted_by           INTEGER REFERENCES users(id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_status') THEN
        ALTER TABLE shipments
            ADD CONSTRAINT fk_shipments_status FOREIGN KEY (current_status) REFERENCES shipment_statuses(code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shipments_payment_status') THEN
        ALTER TABLE shipments
            ADD CONSTRAINT chk_shipments_payment_status CHECK (payment_status IN ('UNPAID', 'PAID', 'COD', 'REFUNDED'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shipments_channel') THEN
        ALTER TABLE shipments
            ADD CONSTRAINT chk_shipments_channel CHECK (channel IN ('ONLINE', 'LOKET', 'API'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shipments_updated_code
    ON shipments (updated_at DESC, code DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status_updated
    ON shipments (current_status, updated_at DESC, code DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_dest_hub
    ON shipments (dest_hub_id) WHERE deleted_at IS NULL;

-- 4. Counter Penerbitan Resi Atomik per Hub & Tanggal (#2)
CREATE TABLE IF NOT EXISTS resi_counters (
    hub_code  TEXT NOT NULL,
    resi_date DATE NOT NULL,
    last_seq  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (hub_code, resi_date)
);

-- 5. Perluasan Tracking Events (#5, #7, #2.3)
ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS actor_id     INTEGER REFERENCES users(id);
ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS hub_id       INTEGER REFERENCES hubs(id);
ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS occurred_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();
ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS proof_status TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS notes        TEXT;
ALTER TABLE tracking_events ALTER COLUMN recorded_at SET DEFAULT clock_timestamp();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_status') THEN
        ALTER TABLE tracking_events
            ADD CONSTRAINT fk_events_status FOREIGN KEY (status) REFERENCES shipment_statuses(code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_proof_status') THEN
        ALTER TABLE tracking_events
            ADD CONSTRAINT chk_events_proof_status CHECK (proof_status IN ('NONE', 'PENDING', 'VERIFIED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_shipment_id ON tracking_events (shipment_code, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor       ON tracking_events (actor_id);

-- 6. Tabel Bukti Foto Pengiriman Terikat ke Event (#5)
CREATE TABLE IF NOT EXISTS proofs (
    id            BIGSERIAL PRIMARY KEY,
    shipment_code TEXT NOT NULL REFERENCES shipments(code),
    event_id      BIGINT REFERENCES tracking_events(id),
    object_key    TEXT UNIQUE NOT NULL,
    sha256        TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
    uploaded_by   INTEGER REFERENCES users(id),
    taken_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proofs_shipment ON proofs (shipment_code, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proofs_event    ON proofs (event_id) WHERE deleted_at IS NULL;

-- 7. Penugasan Kurir (#6)
CREATE TABLE IF NOT EXISTS shipment_assignments (
    id            BIGSERIAL PRIMARY KEY,
    shipment_code TEXT NOT NULL REFERENCES shipments(code),
    courier_id    INTEGER NOT NULL REFERENCES users(id),
    hub_id        INTEGER REFERENCES hubs(id),
    assigned_by   INTEGER REFERENCES users(id),
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    unassigned_at TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_active_shipment
    ON shipment_assignments (shipment_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_assignments_courier
    ON shipment_assignments (courier_id) WHERE is_active = TRUE;

-- 8. Audit Log Append-Only (#7)
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    INTEGER REFERENCES users(id),
    action      TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    before_data JSONB,
    after_data  JSONB,
    request_id  TEXT,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target  ON audit_log (target_type, target_id);

-- 9. Idempotency Keys (#11)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key           TEXT PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id),
    endpoint      TEXT NOT NULL,
    request_hash  TEXT NOT NULL,
    status_code   SMALLINT NOT NULL,
    response_json JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys (expires_at);

-- 10. View Pelacakan Publik Bebas PII (#9)
CREATE OR REPLACE VIEW public_tracking_view AS
SELECT
    s.code,
    s.current_status,
    ss.label AS status_label,
    s.current_location,
    s.service_code,
    sv.name AS service_name,
    oc.name AS origin_city,
    dc.name AS dest_city,
    s.updated_at
FROM shipments s
JOIN shipment_statuses ss ON ss.code = s.current_status
LEFT JOIN services sv     ON sv.code = s.service_code
LEFT JOIN cities oc       ON oc.id   = s.origin_city_id
LEFT JOIN cities dc       ON dc.id   = s.dest_city_id
WHERE s.deleted_at IS NULL;
