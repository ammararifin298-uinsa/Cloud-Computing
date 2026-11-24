-- ==========================================================================
-- LacakIn v2 - Migrasi Resi ke LCK-{LAYANAN}-YYMMDD-NNNNNC & Kolom Jenis Paket
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

BEGIN;

-- 1. Tambah kolom package_type pada shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_type TEXT NOT NULL DEFAULT 'Umum';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shipments_package_type') THEN
        ALTER TABLE shipments
            ADD CONSTRAINT chk_shipments_package_type
            CHECK (package_type IN ('Umum', 'Dokumen', 'Elektronik', 'Pakaian', 'Makanan', 'Pecah Belah'));
    END IF;
END $$;

-- 2. Perbarui public_tracking_view agar menyertakan package_type
CREATE OR REPLACE VIEW public_tracking_view AS
SELECT s.code,
       s.current_status,
       ss.label AS status_label,
       s.current_location,
       s.service_code,
       sv.name AS service_name,
       oc.name AS origin_city,
       dc.name AS dest_city,
       s.updated_at,
       s.package_type
  FROM shipments s
  JOIN shipment_statuses ss ON ss.code = s.current_status
  LEFT JOIN services sv ON sv.code = s.service_code
  LEFT JOIN cities oc ON oc.id = s.origin_city_id
  LEFT JOIN cities dc ON dc.id = s.dest_city_id
 WHERE s.deleted_at IS NULL;

-- 3. Helper function sementara untuk Luhn check digit
CREATE OR REPLACE FUNCTION pg_temp.luhn_digit(p_digits TEXT) RETURNS TEXT AS $$
DECLARE
    v_total INTEGER := 0;
    v_len   INTEGER := LENGTH(p_digits);
    v_idx   INTEGER := 0;
    v_d     INTEGER;
    i       INTEGER;
BEGIN
    FOR i IN REVERSE v_len..1 LOOP
        v_d := SUBSTRING(p_digits, i, 1)::INTEGER;
        IF (v_idx % 2) = 0 THEN
            v_d := v_d * 2;
            IF v_d > 9 THEN v_d := v_d - 9; END IF;
        END IF;
        v_total := v_total + v_d;
        v_idx := v_idx + 1;
    END LOOP;
    RETURN ((10 - (v_total % 10)) % 10)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Migrasi semua resi lama LOG-* menjadi LCK-{SERVICE}-YYMMDD-NNNNNC + isi package_type
DO $$
DECLARE
    rec       RECORD;
    v_seq     INTEGER := 0;
    v_yymmdd  TEXT;
    v_svc     TEXT;
    v_seq5    TEXT;
    v_chk     TEXT;
    v_new     TEXT;
    v_pkg     TEXT;
    v_pkgs    TEXT[] := ARRAY['Umum', 'Dokumen', 'Elektronik', 'Pakaian', 'Makanan', 'Pecah Belah'];
BEGIN
    CREATE TEMP TABLE tmp_resi_map (
        old_code TEXT PRIMARY KEY,
        new_code TEXT UNIQUE NOT NULL,
        pkg_type TEXT NOT NULL
    ) ON COMMIT DROP;

    FOR rec IN
        SELECT code, COALESCE(NULLIF(UPPER(service_code), ''), 'REG') AS svc, created_at
          FROM shipments
         WHERE code LIKE 'LOG-%'
         ORDER BY created_at ASC, code ASC
    LOOP
        v_seq := v_seq + 1;
        v_yymmdd := TO_CHAR(rec.created_at AT TIME ZONE 'Asia/Jakarta', 'YYMMDD');
        v_svc := rec.svc;
        v_seq5 := LPAD(v_seq::TEXT, 5, '0');
        v_chk := pg_temp.luhn_digit(v_yymmdd || v_seq5);
        v_new := 'LCK-' || v_svc || '-' || v_yymmdd || '-' || v_seq5 || v_chk;

        IF v_svc = 'KRG' THEN
            v_pkg := CASE WHEN v_seq % 2 = 0 THEN 'Elektronik' ELSE 'Pecah Belah' END;
        ELSIF v_svc = 'SDY' THEN
            v_pkg := CASE WHEN v_seq % 2 = 0 THEN 'Makanan' ELSE 'Dokumen' END;
        ELSE
            v_pkg := v_pkgs[1 + (v_seq % ARRAY_LENGTH(v_pkgs, 1))];
        END IF;

        INSERT INTO tmp_resi_map (old_code, new_code, pkg_type)
        VALUES (rec.code, v_new, v_pkg);
    END LOOP;

    IF EXISTS (SELECT 1 FROM tmp_resi_map) THEN
        -- Sisipkan baris shipments baru dengan kode LCK-*
        INSERT INTO shipments (
            code, current_status, current_location, updated_at,
            sender_name, sender_phone, sender_address,
            origin_city_id, origin_hub_id, origin_district_id, origin_village_id, origin_rt, origin_rw, origin_postal_code,
            receiver_name, receiver_phone, receiver_address,
            dest_city_id, dest_hub_id, dest_district_id, dest_village_id, dest_rt, dest_rw, dest_postal_code,
            service_code, weight_kg, length_cm, width_cm, height_cm, chargeable_weight_kg,
            declared_value, shipping_cost, insurance_cost, total_cost,
            payment_status, channel, created_by, created_at, version, deleted_at, deleted_by, package_type
        )
        SELECT
            m.new_code, s.current_status, s.current_location, s.updated_at,
            s.sender_name, s.sender_phone, s.sender_address,
            s.origin_city_id, s.origin_hub_id, s.origin_district_id, s.origin_village_id, s.origin_rt, s.origin_rw, s.origin_postal_code,
            s.receiver_name, s.receiver_phone, s.receiver_address,
            s.dest_city_id, s.dest_hub_id, s.dest_district_id, s.dest_village_id, s.dest_rt, s.dest_rw, s.dest_postal_code,
            s.service_code, s.weight_kg, s.length_cm, s.width_cm, s.height_cm, s.chargeable_weight_kg,
            s.declared_value, s.shipping_cost, s.insurance_cost, s.total_cost,
            s.payment_status, s.channel, s.created_by, s.created_at, s.version, s.deleted_at, s.deleted_by, m.pkg_type
        FROM shipments s
        JOIN tmp_resi_map m ON m.old_code = s.code;

        -- Pindahkan semua FK dari kode lama ke kode baru
        UPDATE tracking_events te
           SET shipment_code = m.new_code
          FROM tmp_resi_map m
         WHERE te.shipment_code = m.old_code;

        UPDATE shipment_assignments sa
           SET shipment_code = m.new_code
          FROM tmp_resi_map m
         WHERE sa.shipment_code = m.old_code;

        UPDATE proofs p
           SET shipment_code = m.new_code
          FROM tmp_resi_map m
         WHERE p.shipment_code = m.old_code;

        UPDATE audit_log al
           SET target_id = m.new_code
          FROM tmp_resi_map m
         WHERE al.target_type = 'shipment' AND al.target_id = m.old_code;

        -- Hapus baris shipments lama (LOG-*)
        DELETE FROM shipments s
         USING tmp_resi_map m
         WHERE s.code = m.old_code;
    END IF;
END $$;

COMMIT;
