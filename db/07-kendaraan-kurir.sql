-- ==========================================================================
-- LacakIn v2 - Master Database Merek, Tipe, dan Tahun Minimal Kendaraan Kurir
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS vehicle_models (
    id           SERIAL PRIMARY KEY,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Sepeda Motor', 'Mobil Van / Blind Van', 'Pick Up / Box')),
    brand        TEXT NOT NULL,
    model        TEXT NOT NULL,
    min_year     SMALLINT NOT NULL DEFAULT 2016,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (vehicle_type, brand, model)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_type ON vehicle_models (vehicle_type);

ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_model_id INTEGER REFERENCES vehicle_models(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_year     SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plate_number     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_number       TEXT;

WITH v(vehicle_type, brand, model, min_year) AS (VALUES
  -- Sepeda Motor (Min. Tahun 2016)
  ('Sepeda Motor', 'Honda',   'Beat',             2016),
  ('Sepeda Motor', 'Honda',   'Vario 125',        2016),
  ('Sepeda Motor', 'Honda',   'Vario 160',        2021),
  ('Sepeda Motor', 'Honda',   'Scoopy',           2016),
  ('Sepeda Motor', 'Honda',   'Supra X 125',      2016),
  ('Sepeda Motor', 'Honda',   'Revo Fit',         2016),
  ('Sepeda Motor', 'Honda',   'PCX 160',          2020),
  ('Sepeda Motor', 'Honda',   'ADV 160',          2021),
  ('Sepeda Motor', 'Yamaha',  'NMAX',             2016),
  ('Sepeda Motor', 'Yamaha',  'Aerox 155',        2017),
  ('Sepeda Motor', 'Yamaha',  'Mio M3',           2016),
  ('Sepeda Motor', 'Yamaha',  'Gear 125',         2020),
  ('Sepeda Motor', 'Yamaha',  'Lexi',             2018),
  ('Sepeda Motor', 'Yamaha',  'Jupiter Z1',       2016),
  ('Sepeda Motor', 'Yamaha',  'Vega Force',       2016),
  ('Sepeda Motor', 'Suzuki',  'Nex II',           2018),
  ('Sepeda Motor', 'Suzuki',  'Address',          2016),

  -- Mobil Van / Blind Van (Min. Tahun 2015)
  ('Mobil Van / Blind Van', 'Daihatsu', 'Gran Max Blind Van', 2015),
  ('Mobil Van / Blind Van', 'Suzuki',   'APV Blind Van',      2015),
  ('Mobil Van / Blind Van', 'Suzuki',   'Carry Blind Van',    2018),
  ('Mobil Van / Blind Van', 'Wuling',   'Formo Blind Van',    2019),
  ('Mobil Van / Blind Van', 'DFSK',     'Gelora Blind Van',   2020),

  -- Pick Up / Box (Min. Tahun 2015 - Armada Kargo)
  ('Pick Up / Box', 'Daihatsu',   'Gran Max Pick Up',  2015),
  ('Pick Up / Box', 'Daihatsu',   'Gran Max Box',      2015),
  ('Pick Up / Box', 'Suzuki',     'New Carry Pick Up', 2018),
  ('Pick Up / Box', 'Suzuki',     'New Carry Box',     2018),
  ('Pick Up / Box', 'Mitsubishi', 'L300 Pick Up',      2015),
  ('Pick Up / Box', 'Mitsubishi', 'L300 Box',          2015),
  ('Pick Up / Box', 'Isuzu',      'Traga Pick Up',     2018),
  ('Pick Up / Box', 'Isuzu',      'Traga Box',         2018),
  ('Pick Up / Box', 'Wuling',     'Formo Max Pick Up', 2022)
)
INSERT INTO vehicle_models (vehicle_type, brand, model, min_year)
SELECT v.vehicle_type, v.brand, v.model, v.min_year FROM v
ON CONFLICT (vehicle_type, brand, model) DO UPDATE SET
  min_year = EXCLUDED.min_year;
