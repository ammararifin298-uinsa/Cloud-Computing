CREATE TABLE IF NOT EXISTS shipments (
    code TEXT PRIMARY KEY,
    current_status TEXT NOT NULL,
    current_location TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_code TEXT NOT NULL REFERENCES shipments(code),
    status TEXT NOT NULL,
    location TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    nik TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    station TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'supervisor', 'operator', 'kurir')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_shipment ON tracking_events (shipment_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_time ON tracking_events (recorded_at DESC);
