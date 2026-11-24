-- ==========================================================================
-- LacakIn v2 - Lengkapi Seluruh Kolom Kosong / NULL pada Shipments, Events, & Users
-- Catatan: Kolom dokumen (doc_*) tetap dibiarkan NULL sesuai permintaan.
-- ==========================================================================

BEGIN;

-- 1. Lengkapi dimensi, wilayah detail (kecamatan/kelurahan/RT/RW/kode pos), & created_by pada shipments
WITH city_geo AS (
    SELECT DISTINCT ON (d.city_id)
           d.city_id,
           d.id AS district_id,
           v.id AS village_id,
           v.postal_code
      FROM districts d
      JOIN villages v ON v.district_id = d.id
     ORDER BY d.city_id, d.id, v.id
)
UPDATE shipments s
SET
    length_cm = CASE WHEN COALESCE(s.length_cm, 0) <= 0 THEN 25 ELSE s.length_cm END,
    width_cm  = CASE WHEN COALESCE(s.width_cm, 0)  <= 0 THEN 18 ELSE s.width_cm  END,
    height_cm = CASE WHEN COALESCE(s.height_cm, 0) <= 0 THEN 12 ELSE s.height_cm END,
    origin_rt = COALESCE(NULLIF(s.origin_rt, ''), '001'),
    origin_rw = COALESCE(NULLIF(s.origin_rw, ''), '002'),
    dest_rt   = COALESCE(NULLIF(s.dest_rt, ''), '003'),
    dest_rw   = COALESCE(NULLIF(s.dest_rw, ''), '004'),
    created_by = COALESCE(s.created_by, (SELECT id FROM users WHERE role = 'operator' ORDER BY id LIMIT 1)),
    origin_district_id = COALESCE(s.origin_district_id, og.district_id),
    origin_village_id  = COALESCE(s.origin_village_id,  og.village_id),
    origin_postal_code = COALESCE(NULLIF(s.origin_postal_code, ''), og.postal_code, '60293'),
    dest_district_id   = COALESCE(s.dest_district_id,   dg.district_id),
    dest_village_id    = COALESCE(s.dest_village_id,    dg.village_id),
    dest_postal_code   = COALESCE(NULLIF(s.dest_postal_code, ''), dg.postal_code, '61211')
FROM city_geo og,
     city_geo dg
WHERE og.city_id = COALESCE(s.origin_city_id, 37)
  AND dg.city_id = COALESCE(s.dest_city_id, 15)
  AND (
      s.origin_district_id IS NULL
      OR s.origin_village_id  IS NULL
      OR s.dest_district_id   IS NULL
      OR s.dest_village_id    IS NULL
      OR COALESCE(s.length_cm, 0) <= 0
      OR COALESCE(s.width_cm, 0)  <= 0
      OR COALESCE(s.height_cm, 0) <= 0
      OR s.created_by IS NULL
      OR s.origin_rt IS NULL
      OR s.dest_rt IS NULL
  );

-- 2. Lengkapi actor_id & hub_id yang kosong pada tracking_events
UPDATE tracking_events te
SET
    actor_id = COALESCE(te.actor_id, (SELECT id FROM users WHERE role = 'operator' ORDER BY id LIMIT 1)),
    hub_id   = COALESCE(te.hub_id, CASE
        WHEN te.status IN ('BOOKED', 'DITERIMA', 'DISIMPAN') THEN COALESCE(s.origin_hub_id, 32)
        ELSE COALESCE(s.dest_hub_id, 8)
    END)
FROM shipments s
WHERE te.shipment_code = s.code
  AND (te.actor_id IS NULL OR te.hub_id IS NULL);

-- 3. Lengkapi alamat detail (district_id, village_id, street_address, rt, rw, postal_code) pada users
WITH city_geo AS (
    SELECT DISTINCT ON (d.city_id)
           d.city_id,
           d.id AS district_id,
           v.id AS village_id,
           v.postal_code
      FROM districts d
      JOIN villages v ON v.district_id = d.id
     ORDER BY d.city_id, d.id, v.id
)
UPDATE users u
SET
    district_id    = COALESCE(u.district_id, ug.district_id),
    village_id     = COALESCE(u.village_id,  ug.village_id),
    postal_code    = COALESCE(NULLIF(u.postal_code, ''), ug.postal_code, '60293'),
    street_address = COALESCE(NULLIF(u.street_address, ''), u.address_domicile, 'Jl. Rungkut Industri Raya No. 1, Surabaya'),
    rt             = COALESCE(NULLIF(u.rt, ''), '001'),
    rw             = COALESCE(NULLIF(u.rw, ''), '002')
FROM city_geo ug
WHERE ug.city_id = COALESCE(u.city_id, 37)
  AND (
      u.district_id IS NULL
      OR u.village_id IS NULL
      OR u.street_address IS NULL
      OR u.postal_code IS NULL
      OR u.rt IS NULL
      OR u.rw IS NULL
  );

COMMIT;
