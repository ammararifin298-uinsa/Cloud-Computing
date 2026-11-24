-- ==========================================================================
-- LacakIn v2 - Sinkronisasi Data Lama (Users id 1..5 & Legacy Shipments)
-- Memastikan akun demo awal & 29 resi lama terisi lengkap sesuai skema terbaru.
-- Catatan: Kolom dokumen tetap dibiarkan NULL. Idempotent.
-- ==========================================================================

BEGIN;

-- 1. Lengkapi data kepegawaian, UU PDP, hub, & kendaraan untuk 5 akun awal (id 1..5)
UPDATE users SET
    station = COALESCE(NULLIF(station, ''), 'DC Rungkut, Surabaya'),
    hub_id = COALESCE(hub_id, 32),
    city_id = COALESCE(city_id, 37),
    review_status = 'approved',
    birth_place = COALESCE(birth_place, 'Surabaya'),
    birth_date = COALESCE(birth_date, DATE '1988-01-15'),
    gender = COALESCE(gender, 'L'),
    address_domicile = COALESCE(address_domicile, 'Jl. Rungkut Industri Raya No. 1, Surabaya'),
    department = COALESCE(department, 'Infrastruktur & TI'),
    job_title = COALESCE(job_title, 'Superadmin Infrastruktur'),
    employment_status = COALESCE(employment_status, 'PKWTT'),
    join_date = COALESCE(join_date, DATE '2020-01-01'),
    education_last = COALESCE(education_last, 'S1 Teknik Informatika'),
    emergency_contact_name = COALESCE(emergency_contact_name, 'Ratna Dewi'),
    emergency_contact_relation = COALESCE(emergency_contact_relation, 'Istri'),
    emergency_contact_phone = COALESCE(emergency_contact_phone, '081230009001'),
    npwp = COALESCE(npwp, '35.100.001.1-615.000'),
    bpjs_kes = COALESCE(bpjs_kes, '0001000000001'),
    bpjs_tk = COALESCE(bpjs_tk, '200010000001'),
    bank_name = COALESCE(bank_name, 'BCA'),
    bank_account = COALESCE(bank_account, '0880001001'),
    bank_holder = COALESCE(bank_holder, 'Superadmin Infrastruktur')
WHERE id = 1;

UPDATE users SET
    station = COALESCE(NULLIF(station, ''), 'DC Rungkut, Surabaya'),
    hub_id = COALESCE(hub_id, 32),
    city_id = COALESCE(city_id, 37),
    review_status = 'approved',
    birth_place = COALESCE(birth_place, 'Sidoarjo'),
    birth_date = COALESCE(birth_date, DATE '1991-05-20'),
    gender = COALESCE(gender, 'L'),
    address_domicile = COALESCE(address_domicile, 'Jl. Ahmad Yani No. 101, Surabaya'),
    department = COALESCE(department, 'Operasional Pusat'),
    job_title = COALESCE(job_title, 'Admin Operasional'),
    employment_status = COALESCE(employment_status, 'PKWTT'),
    join_date = COALESCE(join_date, DATE '2021-02-01'),
    education_last = COALESCE(education_last, 'S1 Manajemen'),
    emergency_contact_name = COALESCE(emergency_contact_name, 'Surya Adi'),
    emergency_contact_relation = COALESCE(emergency_contact_relation, 'Kakak'),
    emergency_contact_phone = COALESCE(emergency_contact_phone, '081230009002'),
    npwp = COALESCE(npwp, '35.100.002.2-615.000'),
    bpjs_kes = COALESCE(bpjs_kes, '0001000000002'),
    bpjs_tk = COALESCE(bpjs_tk, '200010000002'),
    bank_name = COALESCE(bank_name, 'Mandiri'),
    bank_account = COALESCE(bank_account, '1410001002001'),
    bank_holder = COALESCE(bank_holder, 'Admin Operasional')
WHERE id = 2;

UPDATE users SET
    station = COALESCE(NULLIF(station, ''), 'DC Rungkut, Surabaya'),
    hub_id = COALESCE(hub_id, 32),
    city_id = COALESCE(city_id, 37),
    review_status = 'approved',
    birth_place = COALESCE(birth_place, 'Malang'),
    birth_date = COALESCE(birth_date, DATE '1992-08-12'),
    gender = COALESCE(gender, 'L'),
    address_domicile = COALESCE(address_domicile, 'Jl. Jemursari No. 45, Surabaya'),
    department = COALESCE(department, 'Monitoring & Kualitas'),
    job_title = COALESCE(job_title, 'Supervisor Monitoring'),
    employment_status = COALESCE(employment_status, 'PKWTT'),
    join_date = COALESCE(join_date, DATE '2021-07-01'),
    education_last = COALESCE(education_last, 'S1 Teknik Industri'),
    emergency_contact_name = COALESCE(emergency_contact_name, 'Ningsih'),
    emergency_contact_relation = COALESCE(emergency_contact_relation, 'Istri'),
    emergency_contact_phone = COALESCE(emergency_contact_phone, '081230009003'),
    npwp = COALESCE(npwp, '35.100.003.3-615.000'),
    bpjs_kes = COALESCE(bpjs_kes, '0001000000003'),
    bpjs_tk = COALESCE(bpjs_tk, '200010000003'),
    bank_name = COALESCE(bank_name, 'BRI'),
    bank_account = COALESCE(bank_account, '009801000300501'),
    bank_holder = COALESCE(bank_holder, 'Supervisor Monitoring')
WHERE id = 3;

UPDATE users SET
    station = COALESCE(NULLIF(station, ''), 'DC Rungkut, Surabaya'),
    hub_id = COALESCE(hub_id, 32),
    city_id = COALESCE(city_id, 37),
    review_status = 'approved',
    birth_place = COALESCE(birth_place, 'Surabaya'),
    birth_date = COALESCE(birth_date, DATE '1996-03-10'),
    gender = COALESCE(gender, 'L'),
    address_domicile = COALESCE(address_domicile, 'Jl. Kali Rungkut No. 28, Surabaya'),
    department = COALESCE(department, 'Gudang & Sortir'),
    job_title = COALESCE(job_title, 'Operator Gudang'),
    employment_status = COALESCE(employment_status, 'PKWTT'),
    join_date = COALESCE(join_date, DATE '2022-04-01'),
    education_last = COALESCE(education_last, 'SMA IPA'),
    emergency_contact_name = COALESCE(emergency_contact_name, 'Sudirman'),
    emergency_contact_relation = COALESCE(emergency_contact_relation, 'Ayah'),
    emergency_contact_phone = COALESCE(emergency_contact_phone, '081230009004'),
    npwp = COALESCE(npwp, '35.100.004.4-615.000'),
    bpjs_kes = COALESCE(bpjs_kes, '0001000000004'),
    bpjs_tk = COALESCE(bpjs_tk, '200010000004'),
    bank_name = COALESCE(bank_name, 'BNI'),
    bank_account = COALESCE(bank_account, '0321000400'),
    bank_holder = COALESCE(bank_holder, 'Operator Gudang')
WHERE id = 4;

UPDATE users SET
    station = COALESCE(NULLIF(station, ''), 'Hub Kurir Surabaya Selatan'),
    hub_id = COALESCE(hub_id, 27),
    city_id = COALESCE(city_id, 37),
    vehicle_type = COALESCE(vehicle_type, 'Sepeda Motor'),
    vehicle_model_id = COALESCE(vehicle_model_id, 1),
    vehicle_year = COALESCE(vehicle_year, 2021),
    plate_number = COALESCE(plate_number, 'L 2104 XY'),
    sim_number = COALESCE(sim_number, '950435780001'),
    review_status = 'approved',
    birth_place = COALESCE(birth_place, 'Surabaya'),
    birth_date = COALESCE(birth_date, DATE '1995-04-22'),
    gender = COALESCE(gender, 'L'),
    address_domicile = COALESCE(address_domicile, 'Jl. Ketintang Baru No. 14, Surabaya'),
    department = COALESCE(department, 'Last-Mile Delivery'),
    job_title = COALESCE(job_title, 'Kurir Lapangan'),
    employment_status = COALESCE(employment_status, 'PKWT'),
    join_date = COALESCE(join_date, DATE '2023-01-15'),
    education_last = COALESCE(education_last, 'SMK Otomotif'),
    emergency_contact_name = COALESCE(emergency_contact_name, 'Yuniarti'),
    emergency_contact_relation = COALESCE(emergency_contact_relation, 'Istri'),
    emergency_contact_phone = COALESCE(emergency_contact_phone, '081230009005'),
    npwp = COALESCE(npwp, '35.100.005.5-609.000'),
    bpjs_kes = COALESCE(bpjs_kes, '0001000000005'),
    bpjs_tk = COALESCE(bpjs_tk, '200010000005'),
    bank_name = COALESCE(bank_name, 'BCA'),
    bank_account = COALESCE(bank_account, '0880005005'),
    bank_holder = COALESCE(bank_holder, 'Kurir Lapangan')
WHERE id = 5;

-- 2. Lengkapi 29 resi lama (LOG-261116-*) yang kolom rute, layanan, & tarifnya masih kosong/nol
DO $$
DECLARE
    rec          RECORD;
    v_orig_cities INTEGER[] := ARRAY[37, 37, 37, 15, 32, 37, 15, 37,  9, 30];
    v_orig_hubs   INTEGER[] := ARRAY[32, 30, 27,  9, 20, 31,  8, 28,  3, 19];
    v_dest_cities INTEGER[] := ARRAY[15, 32, 25, 37, 37, 10, 16, 30, 37, 32];
    v_dest_hubs   INTEGER[] := ARRAY[ 8, 20, 14, 32, 32,  6, 11, 19, 32, 20];
    v_senders    TEXT[] := ARRAY['CV Maju Bersama', 'Toko Sinar Jatim', 'UD Karya Mandiri', 'Andi Kurniawan', 'Dewi Sartika'];
    v_receivers  TEXT[] := ARRAY['Bambang Pamungkas', 'Rina Susanti', 'Hendra Kusuma', 'Sari Indah', 'Tono Wijaya'];
    v_streets    TEXT[] := ARRAY['Jl. Pemuda No. 12', 'Jl. Basuki Rahmat No. 34', 'Jl. Ahmad Yani No. 78', 'Jl. Diponegoro No. 56', 'Jl. Veteran No. 90'];

    i            INTEGER := 0;
    v_idx        INTEGER;
    v_orig_city  INTEGER;
    v_orig_hub   INTEGER;
    v_dest_city  INTEGER;
    v_dest_hub   INTEGER;
    v_orig_dist  INTEGER;
    v_orig_vill  INTEGER;
    v_orig_pos   TEXT;
    v_dest_dist  INTEGER;
    v_dest_vill  INTEGER;
    v_dest_pos   TEXT;
    v_svc        TEXT;
    v_weight     NUMERIC(8,2);
    v_chg_w      INTEGER;
    v_orig_zone  INTEGER;
    v_dest_zone  INTEGER;
    v_base_p     INTEGER;
    v_per_kg     INTEGER;
    v_ins_rate   NUMERIC(6,4);
    v_declared   INTEGER;
    v_ship_cost  INTEGER;
    v_ins_cost   INTEGER;
    v_total_cost INTEGER;
    v_kurir_mtr  INTEGER[];
    v_kurir_mbl  INTEGER[];
    v_courier_id INTEGER;
BEGIN
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_kurir_mtr
      FROM users WHERE role = 'kurir' AND is_active = TRUE AND COALESCE(vehicle_type, 'Sepeda Motor') = 'Sepeda Motor';
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_kurir_mbl
      FROM users WHERE role = 'kurir' AND is_active = TRUE AND vehicle_type IN ('Mobil Van / Blind Van', 'Pick Up / Box');

    FOR rec IN
        SELECT code, current_status, created_at
          FROM shipments
         WHERE origin_city_id IS NULL OR dest_city_id IS NULL OR service_code IS NULL OR total_cost = 0
         ORDER BY created_at ASC, code ASC
    LOOP
        i := i + 1;
        v_idx := 1 + ((i - 1) % ARRAY_LENGTH(v_orig_cities, 1));
        v_orig_city := v_orig_cities[v_idx];
        v_orig_hub  := v_orig_hubs[v_idx];
        v_dest_city := v_dest_cities[v_idx];
        v_dest_hub  := v_dest_hubs[v_idx];

        IF i % 5 = 0 THEN
            v_svc := 'KRG';
            v_weight := 18 + (i % 25);
        ELSIF i % 4 = 0 THEN
            v_orig_city := 37; v_orig_hub := 32;
            v_dest_city := 15; v_dest_hub := 8;
            v_svc := 'SDY';
            v_weight := 1 + (i % 3);
        ELSIF i % 2 = 0 THEN
            v_svc := 'EXP';
            v_weight := 1 + (i % 5);
        ELSE
            v_svc := 'REG';
            v_weight := 1 + (i % 6);
        END IF;
        v_chg_w := GREATEST(CEIL(v_weight)::INTEGER, 1);

        SELECT insurance_rate INTO v_ins_rate FROM services WHERE code = v_svc;
        SELECT zone_id INTO v_orig_zone FROM cities WHERE id = v_orig_city;
        SELECT zone_id INTO v_dest_zone FROM cities WHERE id = v_dest_city;
        SELECT base_price, per_kg INTO v_base_p, v_per_kg
          FROM tariffs
         WHERE origin_zone_id = v_orig_zone AND dest_zone_id = v_dest_zone AND service_code = v_svc
         LIMIT 1;
        IF v_base_p IS NULL THEN
            v_base_p := 12000; v_per_kg := 4000;
        END IF;

        v_ship_cost := v_base_p + GREATEST(v_chg_w - 1, 0) * v_per_kg;
        IF i % 2 = 0 THEN
            v_declared := (1 + (i % 6)) * 500000;
            v_ins_cost := GREATEST(ROUND(v_declared * v_ins_rate)::INTEGER, 2500);
        ELSE
            v_declared := 0;
            v_ins_cost := 0;
        END IF;
        v_total_cost := v_ship_cost + v_ins_cost;

        SELECT d.id, v.id, COALESCE(v.postal_code, '60293')
          INTO v_orig_dist, v_orig_vill, v_orig_pos
          FROM districts d JOIN villages v ON v.district_id = d.id
         WHERE d.city_id = v_orig_city ORDER BY d.id, v.id LIMIT 1;

        SELECT d.id, v.id, COALESCE(v.postal_code, '61211')
          INTO v_dest_dist, v_dest_vill, v_dest_pos
          FROM districts d JOIN villages v ON v.district_id = d.id
         WHERE d.city_id = v_dest_city ORDER BY d.id, v.id LIMIT 1;

        UPDATE shipments SET
            sender_name = COALESCE(NULLIF(sender_name, ''), v_senders[1 + (i % ARRAY_LENGTH(v_senders, 1))]),
            sender_phone = COALESCE(NULLIF(sender_phone, ''), '0812' || LPAD((44000000 + i * 111)::TEXT, 8, '0')),
            sender_address = COALESCE(NULLIF(sender_address, ''), v_streets[1 + (i % ARRAY_LENGTH(v_streets, 1))]),
            origin_city_id = v_orig_city,
            origin_hub_id = v_orig_hub,
            origin_district_id = COALESCE(origin_district_id, v_orig_dist),
            origin_village_id = COALESCE(origin_village_id, v_orig_vill),
            origin_rt = COALESCE(origin_rt, '001'),
            origin_rw = COALESCE(origin_rw, '002'),
            origin_postal_code = COALESCE(origin_postal_code, v_orig_pos),
            receiver_name = COALESCE(NULLIF(receiver_name, ''), v_receivers[1 + (i % ARRAY_LENGTH(v_receivers, 1))]),
            receiver_phone = COALESCE(NULLIF(receiver_phone, ''), '0857' || LPAD((66000000 + i * 222)::TEXT, 8, '0')),
            receiver_address = COALESCE(NULLIF(receiver_address, ''), v_streets[1 + ((i + 2) % ARRAY_LENGTH(v_streets, 1))]),
            dest_city_id = v_dest_city,
            dest_hub_id = v_dest_hub,
            dest_district_id = COALESCE(dest_district_id, v_dest_dist),
            dest_village_id = COALESCE(dest_village_id, v_dest_vill),
            dest_rt = COALESCE(dest_rt, '003'),
            dest_rw = COALESCE(dest_rw, '004'),
            dest_postal_code = COALESCE(dest_postal_code, v_dest_pos),
            service_code = v_svc,
            weight_kg = v_weight,
            length_cm = CASE WHEN v_svc = 'KRG' THEN 55 ELSE 25 END,
            width_cm = CASE WHEN v_svc = 'KRG' THEN 40 ELSE 18 END,
            height_cm = CASE WHEN v_svc = 'KRG' THEN 35 ELSE 12 END,
            chargeable_weight_kg = v_chg_w,
            declared_value = v_declared,
            shipping_cost = v_ship_cost,
            insurance_cost = v_ins_cost,
            total_cost = v_total_cost,
            payment_status = CASE WHEN i % 3 = 0 THEN 'COD' ELSE 'PAID' END,
            channel = CASE WHEN i % 2 = 0 THEN 'ONLINE' ELSE 'LOKET' END
        WHERE code = rec.code;

        IF rec.current_status IN ('DIKIRIM', 'GAGAL_KIRIM', 'SELESAI') THEN
            IF v_svc = 'KRG' THEN
                v_courier_id := v_kurir_mbl[1 + (i % ARRAY_LENGTH(v_kurir_mbl, 1))];
            ELSE
                v_courier_id := v_kurir_mtr[1 + (i % ARRAY_LENGTH(v_kurir_mtr, 1))];
            END IF;

            INSERT INTO shipment_assignments (shipment_code, courier_id, hub_id, assigned_by, assigned_at, is_active)
            VALUES (rec.code, v_courier_id, v_dest_hub, 4, rec.created_at + INTERVAL '1 hour', TRUE)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

COMMIT;
