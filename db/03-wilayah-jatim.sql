-- ==========================================================================
-- LacakIn - Data Referensi Wilayah Jawa Timur (idempotent, aman dijalankan ulang)
-- Isi: provinsi, kab/kota (kode Kemendagri), zona tarif, hub/gudang DUMMY,
--      cakupan hub, layanan, dan matriks tarif.
--
-- Cara pakai:
--   * Volume DB baru : otomatis jalan (urutan setelah 01-init.sql, 02-replication.sh)
--   * Volume sudah ada:
--       Get-Content db\03-wilayah-jatim.sql | docker exec -i lacakin-db-primary psql -U logistik -d logistik
--
-- Rumus tarif (dihitung di SERVER, bukan di browser):
--   berat_volumetrik = (P x L x T cm) / services.volumetric_divisor
--   berat_tertagih   = CEIL(MAX(berat_aktual, berat_volumetrik)), minimal 1 kg
--   ongkir           = base_price + (berat_tertagih - 1) * per_kg
--   asuransi         = declared_value * services.insurance_rate  (opsional)
--   Layanan yang tidak punya baris di tabel tariffs = tidak tersedia di rute itu.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS provinces (
    id   SMALLINT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
    id          SMALLINT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS cities (
    id          SERIAL PRIMARY KEY,
    province_id SMALLINT NOT NULL REFERENCES provinces(id),
    zone_id     SMALLINT NOT NULL REFERENCES zones(id),
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('KABUPATEN', 'KOTA'))
);

CREATE TABLE IF NOT EXISTS hubs (
    id        SERIAL PRIMARY KEY,
    code      TEXT UNIQUE NOT NULL,
    name      TEXT NOT NULL,
    kind      TEXT NOT NULL CHECK (kind IN
              ('GUDANG_UTAMA', 'HUB_REGIONAL', 'HUB_TRANSIT', 'TERMINAL_KARGO', 'LOKET', 'LASTMILE')),
    city_id   INTEGER NOT NULL REFERENCES cities(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Setiap kab/kota dilayani tepat satu hub regional (untuk routing dan penugasan)
CREATE TABLE IF NOT EXISTS hub_coverage (
    city_id INTEGER PRIMARY KEY REFERENCES cities(id),
    hub_id  INTEGER NOT NULL REFERENCES hubs(id)
);

CREATE TABLE IF NOT EXISTS services (
    code               TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    volumetric_divisor INTEGER NOT NULL,
    insurance_rate     NUMERIC(6,4) NOT NULL,
    max_weight_kg      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tariffs (
    origin_zone_id SMALLINT NOT NULL REFERENCES zones(id),
    dest_zone_id   SMALLINT NOT NULL REFERENCES zones(id),
    service_code   TEXT NOT NULL REFERENCES services(code),
    base_price     INTEGER NOT NULL,   -- kg pertama (Rupiah)
    per_kg         INTEGER NOT NULL,   -- tiap kg berikutnya (Rupiah)
    eta_min_days   SMALLINT NOT NULL,
    eta_max_days   SMALLINT NOT NULL,
    PRIMARY KEY (origin_zone_id, dest_zone_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_cities_zone ON cities (zone_id);
CREATE INDEX IF NOT EXISTS idx_hubs_city   ON hubs (city_id);
CREATE INDEX IF NOT EXISTS idx_hubs_kind   ON hubs (kind);

-- ---------- Provinsi & Zona ----------
INSERT INTO provinces (id, code, name) VALUES (1, '35', 'Jawa Timur')
ON CONFLICT (id) DO NOTHING;

INSERT INTO zones (id, code, name, description) VALUES
  (1, 'Z1', 'Surabaya Raya',                   'Surabaya, Sidoarjo, Gresik'),
  (2, 'Z2', 'Ring Terdekat',                   'Mojokerto, Pasuruan, Jombang, Lamongan, Bangkalan'),
  (3, 'Z3', 'Malang Raya dan Tapal Kuda Barat', 'Malang, Batu, Probolinggo, Lumajang'),
  (4, 'Z4', 'Mataraman dan Pantura Barat',     'Kediri, Blitar, Madiun, Ponorogo, Pacitan, Bojonegoro, Tuban, dll'),
  (5, 'Z5', 'Tapal Kuda Timur dan Madura',     'Jember, Banyuwangi, Bondowoso, Situbondo, Sampang, Pamekasan, Sumenep')
ON CONFLICT (id) DO NOTHING;

-- ---------- 38 Kabupaten/Kota (kode Kemendagri) ----------
WITH v(code, name, type, zone_id) AS (VALUES
  ('35.01', 'Pacitan',      'KABUPATEN', 4),
  ('35.02', 'Ponorogo',     'KABUPATEN', 4),
  ('35.03', 'Trenggalek',   'KABUPATEN', 4),
  ('35.04', 'Tulungagung',  'KABUPATEN', 4),
  ('35.05', 'Blitar',       'KABUPATEN', 4),
  ('35.06', 'Kediri',       'KABUPATEN', 4),
  ('35.07', 'Malang',       'KABUPATEN', 3),
  ('35.08', 'Lumajang',     'KABUPATEN', 3),
  ('35.09', 'Jember',       'KABUPATEN', 5),
  ('35.10', 'Banyuwangi',   'KABUPATEN', 5),
  ('35.11', 'Bondowoso',    'KABUPATEN', 5),
  ('35.12', 'Situbondo',    'KABUPATEN', 5),
  ('35.13', 'Probolinggo',  'KABUPATEN', 3),
  ('35.14', 'Pasuruan',     'KABUPATEN', 2),
  ('35.15', 'Sidoarjo',     'KABUPATEN', 1),
  ('35.16', 'Mojokerto',    'KABUPATEN', 2),
  ('35.17', 'Jombang',      'KABUPATEN', 2),
  ('35.18', 'Nganjuk',      'KABUPATEN', 4),
  ('35.19', 'Madiun',       'KABUPATEN', 4),
  ('35.20', 'Magetan',      'KABUPATEN', 4),
  ('35.21', 'Ngawi',        'KABUPATEN', 4),
  ('35.22', 'Bojonegoro',   'KABUPATEN', 4),
  ('35.23', 'Tuban',        'KABUPATEN', 4),
  ('35.24', 'Lamongan',     'KABUPATEN', 2),
  ('35.25', 'Gresik',       'KABUPATEN', 1),
  ('35.26', 'Bangkalan',    'KABUPATEN', 2),
  ('35.27', 'Sampang',      'KABUPATEN', 5),
  ('35.28', 'Pamekasan',    'KABUPATEN', 5),
  ('35.29', 'Sumenep',      'KABUPATEN', 5),
  ('35.71', 'Kediri',       'KOTA',      4),
  ('35.72', 'Blitar',       'KOTA',      4),
  ('35.73', 'Malang',       'KOTA',      3),
  ('35.74', 'Probolinggo',  'KOTA',      3),
  ('35.75', 'Pasuruan',     'KOTA',      2),
  ('35.76', 'Mojokerto',    'KOTA',      2),
  ('35.77', 'Madiun',       'KOTA',      4),
  ('35.78', 'Surabaya',     'KOTA',      1),
  ('35.79', 'Batu',         'KOTA',      3)
)
INSERT INTO cities (province_id, zone_id, code, name, type)
SELECT 1, v.zone_id, v.code, v.name, v.type FROM v
ON CONFLICT (code) DO NOTHING;

-- ---------- Hub / Gudang DUMMY (32 titik) ----------
WITH v(code, name, kind, city_code) AS (VALUES
  -- Gudang utama (pusat sortir provinsi)
  ('SUB-DC01', 'DC Rungkut, Surabaya',                'GUDANG_UTAMA',   '35.78'),
  -- Hub regional (kepala wilayah)
  ('MLG-HR01', 'Hub Regional Singosari, Malang',      'HUB_REGIONAL',   '35.07'),
  ('KDR-HR01', 'Hub Regional Kediri',                 'HUB_REGIONAL',   '35.71'),
  ('MAD-HR01', 'Hub Regional Madiun',                 'HUB_REGIONAL',   '35.77'),
  ('BJN-HR01', 'Hub Regional Bojonegoro',             'HUB_REGIONAL',   '35.22'),
  ('JBR-HR01', 'Hub Regional Jember',                 'HUB_REGIONAL',   '35.09'),
  ('BWI-HR01', 'Hub Regional Banyuwangi',             'HUB_REGIONAL',   '35.10'),
  ('PMK-HR01', 'Hub Regional Madura, Pamekasan',      'HUB_REGIONAL',   '35.28'),
  -- Terminal kargo (udara/laut/penyeberangan)
  ('SUB-KG01', 'Terminal Kargo Juanda (SUB)',         'TERMINAL_KARGO', '35.15'),
  ('SUB-KG02', 'Terminal Kargo Tanjung Perak',        'TERMINAL_KARGO', '35.78'),
  ('BWI-KG01', 'Terminal Kargo Pelabuhan Ketapang',   'TERMINAL_KARGO', '35.10'),
  -- Hub transit / cross-dock di jalur utama
  ('PSR-TR01', 'Hub Transit Pandaan',                 'HUB_TRANSIT',    '35.14'),
  ('MJK-TR01', 'Hub Cross-Dock Mojokerto',            'HUB_TRANSIT',    '35.16'),
  ('GSK-TR01', 'Hub Industri Gresik',                 'HUB_TRANSIT',    '35.25'),
  ('PBL-TR01', 'Hub Transit Probolinggo',             'HUB_TRANSIT',    '35.74'),
  -- Loket (penerimaan offline / walk-in oleh operator)
  ('SUB-LK01', 'Loket Gubeng, Surabaya',              'LOKET',          '35.78'),
  ('SUB-LK02', 'Loket Wonokromo, Surabaya',           'LOKET',          '35.78'),
  ('SUB-LK03', 'Loket Tandes, Surabaya',              'LOKET',          '35.78'),
  ('SDA-LK01', 'Loket Sidoarjo Kota',                 'LOKET',          '35.15'),
  ('GSK-LK01', 'Loket Gresik Kota',                   'LOKET',          '35.25'),
  ('MJK-LK01', 'Loket Mojokerto Kota',                'LOKET',          '35.76'),
  ('JBG-LK01', 'Loket Jombang Kota',                  'LOKET',          '35.17'),
  ('MLG-LK01', 'Loket Lowokwaru, Malang',             'LOKET',          '35.73'),
  ('KDR-LK01', 'Loket Kediri Kota',                   'LOKET',          '35.71'),
  ('MAD-LK01', 'Loket Madiun Kota',                   'LOKET',          '35.77'),
  ('JBR-LK01', 'Loket Jember Kota',                   'LOKET',          '35.09'),
  ('BWI-LK01', 'Loket Banyuwangi Kota',               'LOKET',          '35.10'),
  ('PMK-LK01', 'Loket Pamekasan Kota',                'LOKET',          '35.28'),
  -- Last-mile (basis kurir pengantar)
  ('SUB-LM01', 'Hub Kurir Surabaya Selatan',          'LASTMILE',       '35.78'),
  ('SUB-LM02', 'Hub Kurir Surabaya Utara',            'LASTMILE',       '35.78'),
  ('SDA-LM01', 'Hub Kurir Sidoarjo',                  'LASTMILE',       '35.15'),
  ('MLG-LM01', 'Hub Kurir Malang Kota',               'LASTMILE',       '35.73')
)
INSERT INTO hubs (code, name, kind, city_id)
SELECT v.code, v.name, v.kind, c.id FROM v JOIN cities c ON c.code = v.city_code
ON CONFLICT (code) DO NOTHING;

-- ---------- Cakupan: tiap kab/kota -> 1 hub regional ----------
WITH v(city_code, hub_code) AS (VALUES
  ('35.78','SUB-DC01'), ('35.15','SUB-DC01'), ('35.25','SUB-DC01'), ('35.16','SUB-DC01'),
  ('35.76','SUB-DC01'), ('35.14','SUB-DC01'), ('35.75','SUB-DC01'), ('35.24','SUB-DC01'),
  ('35.17','SUB-DC01'),
  ('35.07','MLG-HR01'), ('35.73','MLG-HR01'), ('35.79','MLG-HR01'), ('35.13','MLG-HR01'),
  ('35.74','MLG-HR01'), ('35.08','MLG-HR01'),
  ('35.06','KDR-HR01'), ('35.71','KDR-HR01'), ('35.05','KDR-HR01'), ('35.72','KDR-HR01'),
  ('35.04','KDR-HR01'), ('35.03','KDR-HR01'), ('35.18','KDR-HR01'),
  ('35.19','MAD-HR01'), ('35.77','MAD-HR01'), ('35.20','MAD-HR01'), ('35.21','MAD-HR01'),
  ('35.02','MAD-HR01'), ('35.01','MAD-HR01'),
  ('35.22','BJN-HR01'), ('35.23','BJN-HR01'),
  ('35.09','JBR-HR01'), ('35.11','JBR-HR01'), ('35.12','JBR-HR01'),
  ('35.10','BWI-HR01'),
  ('35.26','PMK-HR01'), ('35.27','PMK-HR01'), ('35.28','PMK-HR01'), ('35.29','PMK-HR01')
)
INSERT INTO hub_coverage (city_id, hub_id)
SELECT c.id, h.id FROM v
JOIN cities c ON c.code = v.city_code
JOIN hubs   h ON h.code = v.hub_code
ON CONFLICT (city_id) DO NOTHING;

-- ---------- Layanan ----------
INSERT INTO services (code, name, volumetric_divisor, insurance_rate, max_weight_kg) VALUES
  ('REG', 'Reguler',                      6000, 0.0020, 50),
  ('EXP', 'Express',                      6000, 0.0020, 30),
  ('SDY', 'Same Day (Surabaya Raya)',     5000, 0.0030, 10)
ON CONFLICT (code) DO NOTHING;

-- ---------- Matriks tarif: level jarak antar zona x harga per level ----------
WITH lvl(oz, dz, l) AS (VALUES
  (1,1,1),(1,2,1),(1,3,2),(1,4,3),(1,5,3),
  (2,1,1),(2,2,1),(2,3,2),(2,4,2),(2,5,3),
  (3,1,2),(3,2,2),(3,3,1),(3,4,3),(3,5,3),
  (4,1,3),(4,2,2),(4,3,3),(4,4,2),(4,5,4),
  (5,1,3),(5,2,3),(5,3,3),(5,4,4),(5,5,2)
),
prc(l, base, per_kg, reg_min, reg_max, exp_min, exp_max) AS (VALUES
  (1,  9000, 3000, 1, 2, 1, 1),
  (2, 12000, 4000, 2, 3, 1, 2),
  (3, 15000, 5000, 3, 4, 2, 3),
  (4, 19000, 6500, 4, 5, 2, 3)
)
INSERT INTO tariffs (origin_zone_id, dest_zone_id, service_code, base_price, per_kg, eta_min_days, eta_max_days)
SELECT lvl.oz, lvl.dz, 'REG', prc.base, prc.per_kg, prc.reg_min, prc.reg_max
FROM lvl JOIN prc ON prc.l = lvl.l
UNION ALL
SELECT lvl.oz, lvl.dz, 'EXP',
       CAST(round(prc.base   * 1.6 / 500.0) * 500 AS INTEGER),
       CAST(round(prc.per_kg * 1.5 / 500.0) * 500 AS INTEGER),
       prc.exp_min, prc.exp_max
FROM lvl JOIN prc ON prc.l = lvl.l
UNION ALL
SELECT lvl.oz, lvl.dz, 'SDY',
       CAST(round(prc.base   * 2.5 / 500.0) * 500 AS INTEGER),
       CAST(round(prc.per_kg * 2.0 / 500.0) * 500 AS INTEGER),
       0, 0
FROM lvl JOIN prc ON prc.l = lvl.l
WHERE lvl.l = 1 AND (lvl.oz = 1 OR lvl.dz = 1)
ON CONFLICT DO NOTHING;
