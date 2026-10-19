CREATE TABLE shipments (
    code TEXT PRIMARY KEY,
    current_status TEXT NOT NULL,
    current_location TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tracking_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_code TEXT NOT NULL REFERENCES shipments(code),
    status TEXT NOT NULL,
    location TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_shipment ON tracking_events (shipment_code, recorded_at DESC);
CREATE INDEX idx_events_time ON tracking_events (recorded_at DESC);
