-- ==========================================================================
-- LacakIn v2 - Dummy Data 7 Hari Terakhir (Pegawai, Kurir, & 50 Paket)
-- Catatan: Semua kolom dokumen dibiarkan NULL sesuai permintaan.
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

BEGIN;

-- 1. PEGAWAI OPERASIONAL (Admin, Supervisor, Operator) & KURIR (Motor & Mobil)
-- Password hash mengikuti akun demo bawaan (sandi sama dengan akun demo 'kurir')
DO $$
DECLARE
    v_pwd_hash TEXT;
    v_admin_id INTEGER;
BEGIN
    SELECT password_hash INTO v_pwd_hash FROM users WHERE username = 'kurir' LIMIT 1;
    IF v_pwd_hash IS NULL THEN
        v_pwd_hash := 'pbkdf2_sha256$120000$6263a854f93b6ff3fb04aec4775cebef$7f7487fa56f935f9d75897017a13498d0e40ce113f816405e407fcae94880581';
    END IF;
    SELECT id INTO v_admin_id FROM users WHERE role IN ('superadmin', 'admin') ORDER BY id LIMIT 1;

    -- Admin Operasional
    INSERT INTO users (
        employee_code, username, password_hash, full_name, nik, phone, email, station, role,
        is_active, hub_id, city_id, review_status, reviewed_by, reviewed_at,
        birth_place, birth_date, gender, address_domicile, department, job_title,
        employment_status, join_date, education_last,
        emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        npwp, bpjs_kes, bpjs_tk, bank_name, bank_account, bank_holder
    ) VALUES
    (
        'ADM-0002', 'admin_ops1', v_pwd_hash, 'Raka Pratama', '3578021204920001', '081234001001', 'raka.pratama@lacakin.id',
        'DC Rungkut, Surabaya', 'admin', TRUE, 32, 37, 'approved', v_admin_id, NOW() - INTERVAL '60 days',
        'Surabaya', '1992-04-12', 'L', 'Jl. Rungkut Asri Timur No. 18, Surabaya', 'Operasional Pusat', 'Admin Operasional Wilayah',
        'PKWTT', '2022-03-01', 'S1 Manajemen Logistik',
        'Dewi Pratama', 'Istri', '081234009001',
        '45.120.331.2-615.000', '0001458890123', '220014589012', 'BCA', '0881234501', 'Raka Pratama'
    ),
    (
        'ADM-0003', 'admin_ops2', v_pwd_hash, 'Nadia Kusuma', '3573045508940002', '081234001002', 'nadia.kusuma@lacakin.id',
        'Hub Regional Singosari, Malang', 'admin', TRUE, 1, 7, 'approved', v_admin_id, NOW() - INTERVAL '45 days',
        'Malang', '1994-08-15', 'P', 'Jl. Soekarno Hatta No. 42, Lowokwaru, Malang', 'Operasional Regional', 'Admin Operasional Malang Raya',
        'PKWTT', '2023-01-10', 'S1 Teknik Industri',
        'Bambang Kusuma', 'Ayah', '081234009002',
        '48.210.442.1-652.000', '0001458890124', '230014589013', 'Mandiri', '1440012345601', 'Nadia Kusuma'
    ),
    -- Supervisor
    (
        'SPV-0002', 'spv_sby', v_pwd_hash, 'Budi Santoso', '3578051903900003', '081234002001', 'budi.santoso@lacakin.id',
        'DC Rungkut, Surabaya', 'supervisor', TRUE, 32, 37, 'approved', v_admin_id, NOW() - INTERVAL '90 days',
        'Sidoarjo', '1990-03-19', 'L', 'Jl. Kutisari Indah Utara No. 7, Surabaya', 'Distribusi Surabaya', 'Supervisor Hub Surabaya',
        'PKWTT', '2021-06-15', 'S1 Sistem Informasi',
        'Sri Wahyuni', 'Istri', '081234009003',
        '39.880.112.4-615.000', '0001458890125', '210014589014', 'BRI', '009801002345501', 'Budi Santoso'
    ),
    (
        'SPV-0003', 'spv_mlg', v_pwd_hash, 'Citra Dewi Lestari', '3573026107930004', '081234002002', 'citra.lestari@lacakin.id',
        'Hub Regional Singosari, Malang', 'supervisor', TRUE, 1, 7, 'approved', v_admin_id, NOW() - INTERVAL '75 days',
        'Malang', '1993-07-21', 'P', 'Jl. Perusahaan Raya No. 25, Singosari, Malang', 'Distribusi Malang', 'Supervisor Hub Malang',
        'PKWTT', '2022-02-01', 'S1 Administrasi Bisnis',
        'Andi Lestari', 'Suami', '081234009004',
        '44.550.221.9-652.000', '0001458890126', '220014589015', 'BNI', '0321456789', 'Citra Dewi Lestari'
    ),
    (
        'SPV-0004', 'spv_jbr', v_pwd_hash, 'Hendra Wijaya', '3509191109910005', '081234002003', 'hendra.wijaya@lacakin.id',
        'Hub Regional Jember', 'supervisor', TRUE, 3, 9, 'approved', v_admin_id, NOW() - INTERVAL '50 days',
        'Jember', '1991-09-11', 'L', 'Jl. Kalimantan No. 88, Sumbersari, Jember', 'Distribusi Tapal Kuda', 'Supervisor Hub Jember',
        'PKWTT', '2022-08-01', 'D4 Manajemen Transportasi',
        'Rini Wijaya', 'Istri', '081234009005',
        '46.770.331.8-626.000', '0001458890127', '220014589016', 'BCA', '0241234567', 'Hendra Wijaya'
    ),
    -- Operator Loket & Gudang
    (
        'OPR-0002', 'op_gubeng', v_pwd_hash, 'Siti Aminah', '3578085402970006', '081234003001', 'siti.aminah@lacakin.id',
        'Loket Gubeng, Surabaya', 'operator', TRUE, 30, 37, 'approved', v_admin_id, NOW() - INTERVAL '30 days',
        'Surabaya', '1997-02-14', 'P', 'Jl. Dharmawangsa Dalam No. 11, Gubeng, Surabaya', 'Pelayanan Loket', 'Operator Loket Gubeng',
        'PKWTT', '2023-05-01', 'D3 Administrasi Perkantoran',
        'Ahmad Fauzi', 'Kakak', '081234009006',
        '51.120.883.1-606.000', '0001458890128', '230014589017', 'Mandiri', '1420098765432', 'Siti Aminah'
    ),
    (
        'OPR-0003', 'op_sda', v_pwd_hash, 'Dimas Saputra', '3515080911960007', '081234003002', 'dimas.saputra@lacakin.id',
        'Loket Sidoarjo Kota', 'operator', TRUE, 9, 15, 'approved', v_admin_id, NOW() - INTERVAL '28 days',
        'Sidoarjo', '1996-11-09', 'L', 'Perum Taman Pinang Indah Blok C4, Sidoarjo', 'Pelayanan Loket', 'Operator Loket Sidoarjo',
        'PKWT', '2024-01-15', 'SMA IPS',
        'Sutrisno', 'Ayah', '081234009007',
        '52.330.774.2-603.000', '0001458890129', '240014589018', 'BRI', '008601003456502', 'Dimas Saputra'
    ),
    (
        'OPR-0004', 'op_mlg', v_pwd_hash, 'Rina Oktaviani', '3573056210980008', '081234003003', 'rina.oktaviani@lacakin.id',
        'Loket Lowokwaru, Malang', 'operator', TRUE, 21, 32, 'approved', v_admin_id, NOW() - INTERVAL '25 days',
        'Batu', '1998-10-22', 'P', 'Jl. MT Haryono Gg. 8 No. 14, Malang', 'Pelayanan Loket', 'Operator Loket Malang',
        'PKWT', '2024-03-01', 'SMK Akuntansi',
        'Yanti', 'Ibu', '081234009008',
        '53.440.665.3-652.000', '0001458890130', '240014589019', 'BCA', '0119876543', 'Rina Oktaviani'
    ),
    (
        'OPR-0005', 'op_kdr', v_pwd_hash, 'Fajar Nugroho', '3571011805950009', '081234003004', 'fajar.nugroho@lacakin.id',
        'Loket Kediri Kota', 'operator', TRUE, 18, 30, 'approved', v_admin_id, NOW() - INTERVAL '20 days',
        'Kediri', '1995-05-18', 'L', 'Jl. Joyoboyo No. 33, Kota Kediri', 'Gudang & Sortir', 'Operator Gudang Kediri',
        'PKWTT', '2023-09-01', 'SMA IPA',
        'Wulandari', 'Istri', '081234009009',
        '50.210.554.4-622.000', '0001458890131', '230014589020', 'BNI', '0456789123', 'Fajar Nugroho'
    )
    ON CONFLICT (username) DO NOTHING;

    -- Kurir Motor (5 orang) & Kurir Mobil Van / Pick Up Box (4 orang) - tanpa kolom dokumen
    INSERT INTO users (
        employee_code, username, password_hash, full_name, nik, phone, email, station, role,
        is_active, hub_id, city_id, vehicle_type, vehicle_model_id, vehicle_year, plate_number, sim_number,
        review_status, reviewed_by, reviewed_at,
        birth_place, birth_date, gender, address_domicile, department, job_title,
        employment_status, join_date, education_last,
        emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        npwp, bpjs_kes, bpjs_tk, bank_name, bank_account, bank_holder
    ) VALUES
    (
        'KUR-0002', 'kurir_mtr1', v_pwd_hash, 'Agus Setiawan', '3578010506940011', '081330110001', 'agus.setiawan@lacakin.id',
        'Hub Kurir Surabaya Selatan', 'kurir', TRUE, 27, 37,
        'Sepeda Motor', 2, 2021, 'L 4521 AB', '940635780112',
        'approved', v_admin_id, NOW() - INTERVAL '20 days',
        'Surabaya', '1994-06-05', 'L', 'Jl. Wonokromo Tengah No. 21, Surabaya', 'Last-Mile Delivery', 'Kurir Motor Surabaya Selatan',
        'PKWT', '2023-04-10', 'SMK Otomotif',
        'Siti Nurhaliza', 'Istri', '081330990001',
        '54.111.222.1-609.000', '0001458890201', '230014589201', 'BRI', '009801004561501', 'Agus Setiawan'
    ),
    (
        'KUR-0003', 'kurir_mtr2', v_pwd_hash, 'Bayu Krisna', '3578111408960012', '081330110002', 'bayu.krisna@lacakin.id',
        'Hub Kurir Surabaya Utara', 'kurir', TRUE, 26, 37,
        'Sepeda Motor', 9, 2022, 'L 6188 XY', '960835780223',
        'approved', v_admin_id, NOW() - INTERVAL '18 days',
        'Surabaya', '1996-08-14', 'L', 'Jl. Kenjeran No. 102, Surabaya', 'Last-Mile Delivery', 'Kurir Motor Surabaya Utara',
        'PKWT', '2023-07-01', 'SMA IPS',
        'Endang', 'Ibu', '081330990002',
        '55.222.333.2-613.000', '0001458890202', '230014589202', 'BCA', '0885544331', 'Bayu Krisna'
    ),
    (
        'KUR-0004', 'kurir_mtr3', v_pwd_hash, 'Eko Wahyudi', '3515132201950013', '081330110003', 'eko.wahyudi@lacakin.id',
        'Hub Kurir Sidoarjo', 'kurir', TRUE, 8, 15,
        'Sepeda Motor', 1, 2020, 'W 3309 PQ', '950135150334',
        'approved', v_admin_id, NOW() - INTERVAL '15 days',
        'Sidoarjo', '1995-01-22', 'L', 'Jl. Raya Waru No. 55, Sidoarjo', 'Last-Mile Delivery', 'Kurir Motor Sidoarjo',
        'PKWT', '2023-11-01', 'SMK TKJ',
        'Lestari', 'Istri', '081330990003',
        '56.333.444.3-603.000', '0001458890203', '230014589203', 'Mandiri', '1410077889901', 'Eko Wahyudi'
    ),
    (
        'KUR-0005', 'kurir_mtr4', v_pwd_hash, 'Rizky Ramadhan', '3573010312970014', '081330110004', 'rizky.ramadhan@lacakin.id',
        'Hub Kurir Malang Kota', 'kurir', TRUE, 20, 32,
        'Sepeda Motor', 3, 2023, 'N 5412 KL', '971235730445',
        'approved', v_admin_id, NOW() - INTERVAL '12 days',
        'Malang', '1997-12-03', 'L', 'Jl. Bendungan Sutami No. 19, Malang', 'Last-Mile Delivery', 'Kurir Motor Malang Kota',
        'PKWT', '2024-02-01', 'SMA IPA',
        'Hadi', 'Ayah', '081330990004',
        '57.444.555.4-652.000', '0001458890204', '240014589204', 'BNI', '0556677889', 'Rizky Ramadhan'
    ),
    (
        'KUR-0006', 'kurir_mtr5', v_pwd_hash, 'Taufik Hidayat', '3571022704960015', '081330110005', 'taufik.hidayat@lacakin.id',
        'Hub Regional Kediri', 'kurir', TRUE, 19, 30,
        'Sepeda Motor', 12, 2022, 'AG 2910 MN', '960435710556',
        'approved', v_admin_id, NOW() - INTERVAL '10 days',
        'Kediri', '1996-04-27', 'L', 'Jl. Ahmad Yani No. 72, Kediri', 'Last-Mile Delivery', 'Kurir Motor Kediri',
        'PKWT', '2024-04-15', 'SMK Pemasaran',
        'Mulyani', 'Ibu', '081330990005',
        '58.555.666.5-622.000', '0001458890205', '240014589205', 'BRI', '003301007788501', 'Taufik Hidayat'
    ),
    (
        'KUR-0007', 'kurir_van1', v_pwd_hash, 'Slamet Riyadi', '3578041007890016', '081330110006', 'slamet.riyadi@lacakin.id',
        'DC Rungkut, Surabaya', 'kurir', TRUE, 32, 37,
        'Mobil Van / Blind Van', 18, 2021, 'L 9012 CD', '890735780667',
        'approved', v_admin_id, NOW() - INTERVAL '25 days',
        'Surabaya', '1989-07-10', 'L', 'Jl. Rungkut Kidul Industri No. 9, Surabaya', 'Line-Haul & Van', 'Kurir Mobil Van Surabaya',
        'PKWTT', '2021-09-01', 'SMK Otomotif',
        'Sumarni', 'Istri', '081330990006',
        '42.666.777.6-615.000', '0001458890206', '210014589206', 'BCA', '0887766554', 'Slamet Riyadi'
    ),
    (
        'KUR-0008', 'kurir_van2', v_pwd_hash, 'Hendro Wibowo', '3515071802910017', '081330110007', 'hendro.wibowo@lacakin.id',
        'Hub Kurir Sidoarjo', 'kurir', TRUE, 8, 15,
        'Mobil Van / Blind Van', 19, 2020, 'W 8821 EF', '910235150778',
        'approved', v_admin_id, NOW() - INTERVAL '22 days',
        'Sidoarjo', '1991-02-18', 'L', 'Jl. Gedangan Permai Blok B12, Sidoarjo', 'Line-Haul & Van', 'Kurir Mobil Van Sidoarjo',
        'PKWTT', '2022-05-01', 'SMA IPS',
        'Ratna', 'Istri', '081330990007',
        '43.777.888.7-603.000', '0001458890207', '220014589207', 'Mandiri', '1410099112233', 'Hendro Wibowo'
    ),
    (
        'KUR-0009', 'kurir_box1', v_pwd_hash, 'Joko Susilo', '3578092509880018', '081330110008', 'joko.susilo@lacakin.id',
        'Terminal Kargo Tanjung Perak', 'kurir', TRUE, 31, 37,
        'Pick Up / Box', 28, 2020, 'L 9411 GH', '880935780889',
        'approved', v_admin_id, NOW() - INTERVAL '30 days',
        'Gresik', '1988-09-25', 'L', 'Jl. Perak Barat No. 88, Surabaya', 'Kargo & Armada Berat', 'Kurir Mobil Box Tanjung Perak',
        'PKWTT', '2020-11-01', 'SMA IPA',
        'Kartini', 'Istri', '081330990008',
        '40.888.999.8-613.000', '0001458890208', '200014589208', 'BRI', '009801009911501', 'Joko Susilo'
    ),
    (
        'KUR-0010', 'kurir_box2', v_pwd_hash, 'Wahyu Utomo', '3507180803920019', '081330110009', 'wahyu.utomo@lacakin.id',
        'Hub Regional Singosari, Malang', 'kurir', TRUE, 1, 7,
        'Pick Up / Box', 30, 2022, 'N 8145 IJ', '920335070990',
        'approved', v_admin_id, NOW() - INTERVAL '19 days',
        'Malang', '1992-03-08', 'L', 'Jl. Raya Randuagung No. 40, Singosari, Malang', 'Kargo & Armada Berat', 'Kurir Mobil Box Malang',
        'PKWTT', '2022-10-01', 'SMK Teknik Mesin',
        'Suryani', 'Istri', '081330990009',
        '47.999.111.9-652.000', '0001458890209', '220014589209', 'BNI', '0667788990', 'Wahyu Utomo'
    )
    ON CONFLICT (username) DO NOTHING;
END $$;

-- 2. 50 PAKET PENGIRIMAN BARU DALAM RENTANG 7 HARI TERAKHIR (H-6 s.d. HARI INI)
-- Mencakup REG, EXP, SDY, KRG; rute Jawa Timur; dengan & tanpa asuransi;
-- status bervariasi (BOOKED, DITERIMA, DISIMPAN, DALAM_PERJALANAN, DIKIRIM, GAGAL_KIRIM, SELESAI)
-- beserta tracking_events dan shipment_assignments ke kurir motor & mobil.
DO $$
DECLARE
    v_op_ids     INTEGER[];
    v_kurir_mtr  INTEGER[];
    v_kurir_mbl  INTEGER[];
    v_orig_cities INTEGER[] := ARRAY[37, 37, 37, 37, 37, 37, 15, 32,  7, 15, 37, 37, 37, 14, 33];
    v_orig_hubs   INTEGER[] := ARRAY[32, 30, 27, 32, 32, 31,  9, 21,  1,  8, 28, 29, 32,  7, 22];
    v_dest_cities INTEGER[] := ARRAY[15, 32, 25, 30,  9, 10, 37, 37, 30, 16, 36, 28, 22, 37,  9];
    v_dest_hubs   INTEGER[] := ARRAY[ 8, 20, 14, 19,  3,  6, 27, 32, 19, 11, 25, 17, 13, 32,  3];
    v_services   TEXT[] := ARRAY['REG', 'EXP', 'SDY', 'KRG'];
    v_statuses   TEXT[] := ARRAY['SELESAI', 'SELESAI', 'DIKIRIM', 'DALAM_PERJALANAN', 'DISIMPAN', 'DITERIMA', 'BOOKED', 'GAGAL_KIRIM'];
    v_payments   TEXT[] := ARRAY['PAID', 'COD', 'UNPAID'];
    v_channels   TEXT[] := ARRAY['LOKET', 'ONLINE'];
    v_senders    TEXT[] := ARRAY[
        'Toko Jaya Abadi', 'CV Sumber Makmur', 'UD Berkah Sentosa', 'PT Nusantara Jaya',
        'Andi Wijaya', 'Rina Hartono', 'Surya Elektronik', 'Boutique Melati',
        'Kopi Nusantara', 'Apotek Sehat Sentosa', 'Bintang Teknik', 'Dapur Ibu Sari'
    ];
    v_receivers  TEXT[] := ARRAY[
        'Budi Santoso', 'Siti Rahmawati', 'Ahmad Fauzi', 'Dewi Anggraini',
        'Hendra Gunawan', 'Putri Maharani', 'Rizky Pratama', 'Yuniarti',
        'Dian Permata', 'Fajar Kurniawan', 'Nia Ramadhani', 'Bagus Setiawan'
    ];
    v_streets    TEXT[] := ARRAY[
        'Jl. Basuki Rahmat No. 45', 'Jl. Ahmad Yani No. 112', 'Jl. Diponegoro No. 28',
        'Jl. Pahlawan No. 19', 'Jl. Sudirman No. 88', 'Jl. Pemuda No. 64',
        'Jl. Soekarno Hatta No. 31', 'Jl. Gajah Mada No. 73', 'Jl. Veteran No. 15',
        'Jl. Majapahit No. 52'
    ];

    i            INTEGER;
    v_r_idx      INTEGER;
    v_day_offset INTEGER;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
    v_code       TEXT;
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
    v_len        NUMERIC(8,2);
    v_wid        NUMERIC(8,2);
    v_hei        NUMERIC(8,2);
    v_div        INTEGER;
    v_vol_w      INTEGER;
    v_chg_w      INTEGER;
    v_base_p     INTEGER;
    v_per_kg     INTEGER;
    v_ins_rate   NUMERIC(6,4);
    v_declared   INTEGER;
    v_ship_cost  INTEGER;
    v_ins_cost   INTEGER;
    v_total_cost INTEGER;
    v_status     TEXT;
    v_payment    TEXT;
    v_channel    TEXT;
    v_op_id      INTEGER;
    v_courier_id INTEGER;
    v_orig_hub_name TEXT;
    v_dest_hub_name TEXT;
    v_curr_loc   TEXT;
    v_orig_zone  INTEGER;
    v_dest_zone  INTEGER;
BEGIN
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_op_ids
      FROM users WHERE role IN ('operator', 'supervisor', 'admin') AND is_active = TRUE;
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_kurir_mtr
      FROM users WHERE role = 'kurir' AND is_active = TRUE AND COALESCE(vehicle_type, 'Sepeda Motor') = 'Sepeda Motor';
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_kurir_mbl
      FROM users WHERE role = 'kurir' AND is_active = TRUE AND vehicle_type IN ('Mobil Van / Blind Van', 'Pick Up / Box');

    FOR i IN 1..50 LOOP
        -- Rentang 7 hari terakhir (H-6 s.d. H-0)
        v_day_offset := (i - 1) % 7;
        v_created_at := (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Jakarta') - (v_day_offset || ' days')::INTERVAL
                        + ((8 + ((i * 3) % 10)) || ' hours')::INTERVAL
                        + (((i * 11) % 55) || ' minutes')::INTERVAL) AT TIME ZONE 'Asia/Jakarta';

        v_code := 'LOG-' || TO_CHAR(v_created_at AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-D7' || LPAD(i::TEXT, 2, '0');

        -- Pilih rute & pastikan SDY hanya untuk rute Surabaya Raya (Surabaya/Sidoarjo/Gresik)
        v_r_idx := 1 + ((i - 1) % ARRAY_LENGTH(v_orig_cities, 1));
        v_orig_city := v_orig_cities[v_r_idx];
        v_orig_hub  := v_orig_hubs[v_r_idx];
        v_dest_city := v_dest_cities[v_r_idx];
        v_dest_hub  := v_dest_hubs[v_r_idx];

        IF i % 6 = 0 THEN
            -- Paksa rute Surabaya Raya untuk Same Day
            v_orig_city := 37; v_orig_hub := 32;
            v_dest_city := CASE WHEN i % 12 = 0 THEN 25 ELSE 15 END;
            v_dest_hub  := CASE WHEN i % 12 = 0 THEN 14 ELSE 8 END;
            v_svc := 'SDY';
        ELSIF i % 5 = 0 THEN
            v_svc := 'KRG';
        ELSIF i % 3 = 0 THEN
            v_svc := 'EXP';
        ELSE
            v_svc := 'REG';
        END IF;

        -- Berat & dimensi realistis per layanan
        IF v_svc = 'KRG' THEN
            v_weight := 15 + ((i * 7) % 65);
            v_len := 60; v_wid := 45; v_hei := 40;
        ELSIF v_svc = 'SDY' THEN
            v_weight := 1 + (i % 5);
            v_len := 25; v_wid := 20; v_hei := 12;
        ELSIF v_svc = 'EXP' THEN
            v_weight := 1 + (i % 8);
            v_len := 30; v_wid := 22; v_hei := 15;
        ELSE
            v_weight := 1 + (i % 12);
            v_len := 28; v_wid := 20; v_hei := 14;
        END IF;

        SELECT volumetric_divisor, insurance_rate INTO v_div, v_ins_rate FROM services WHERE code = v_svc;
        v_vol_w := CEIL((v_len * v_wid * v_hei) / NULLIF(v_div, 0))::INTEGER;
        v_chg_w := GREATEST(CEIL(v_weight)::INTEGER, COALESCE(v_vol_w, 1), 1);

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

        -- Sebagian paket pakai asuransi (i genap), sebagian tidak (i ganjil)
        IF i % 2 = 0 THEN
            v_declared := (1 + (i % 10)) * 500000;
            v_ins_cost := GREATEST(ROUND(v_declared * v_ins_rate)::INTEGER, 2500);
        ELSE
            v_declared := 0;
            v_ins_cost := 0;
        END IF;
        v_total_cost := v_ship_cost + v_ins_cost;

        v_payment := v_payments[1 + (i % 3)];
        v_channel := v_channels[1 + (i % 2)];

        -- Paket hari lebih lama cenderung sudah SELESAI / DIKIRIM; hari ini (day 0) lebih bervariasi
        IF v_day_offset >= 3 THEN
            v_status := CASE WHEN i % 9 = 0 THEN 'GAGAL_KIRIM' ELSE 'SELESAI' END;
        ELSIF v_day_offset >= 1 THEN
            v_status := v_statuses[1 + (i % 6)];
        ELSE
            v_status := v_statuses[1 + (i % 7)];
        END IF;

        v_op_id := v_op_ids[1 + (i % ARRAY_LENGTH(v_op_ids, 1))];
        IF v_svc = 'KRG' OR v_chg_w >= 12 THEN
            v_courier_id := v_kurir_mbl[1 + (i % ARRAY_LENGTH(v_kurir_mbl, 1))];
        ELSE
            v_courier_id := v_kurir_mtr[1 + (i % ARRAY_LENGTH(v_kurir_mtr, 1))];
        END IF;

        -- Ambil district & village valid untuk origin dan destination
        SELECT d.id, v.id, COALESCE(v.postal_code, '60293')
          INTO v_orig_dist, v_orig_vill, v_orig_pos
          FROM districts d
          JOIN villages v ON v.district_id = d.id
         WHERE d.city_id = v_orig_city
         ORDER BY d.id, v.id
         OFFSET (i % 3) LIMIT 1;

        SELECT d.id, v.id, COALESCE(v.postal_code, '61211')
          INTO v_dest_dist, v_dest_vill, v_dest_pos
          FROM districts d
          JOIN villages v ON v.district_id = d.id
         WHERE d.city_id = v_dest_city
         ORDER BY d.id, v.id
         OFFSET (i % 3) LIMIT 1;

        SELECT name INTO v_orig_hub_name FROM hubs WHERE id = v_orig_hub;
        SELECT name INTO v_dest_hub_name FROM hubs WHERE id = v_dest_hub;

        v_curr_loc := CASE v_status
            WHEN 'BOOKED'           THEN 'Pesanan Online Menunggu Pickup'
            WHEN 'DITERIMA'         THEN v_orig_hub_name
            WHEN 'DISIMPAN'         THEN v_orig_hub_name
            WHEN 'DALAM_PERJALANAN' THEN 'Transit Lintas Hub menuju ' || v_dest_hub_name
            WHEN 'DIKIRIM'          THEN 'Kurir Menuju Alamat Penerima (' || v_dest_hub_name || ')'
            WHEN 'GAGAL_KIRIM'      THEN 'Penerima Tidak di Tempat (' || v_dest_hub_name || ')'
            WHEN 'SELESAI'          THEN 'Diterima Penerima di ' || (SELECT name FROM cities WHERE id = v_dest_city)
            ELSE v_orig_hub_name
        END;

        v_updated_at := LEAST(NOW(), v_created_at + INTERVAL '4 hours');

        INSERT INTO shipments (
            code, current_status, current_location, updated_at,
            sender_name, sender_phone, sender_address,
            origin_city_id, origin_hub_id, origin_district_id, origin_village_id, origin_rt, origin_rw, origin_postal_code,
            receiver_name, receiver_phone, receiver_address,
            dest_city_id, dest_hub_id, dest_district_id, dest_village_id, dest_rt, dest_rw, dest_postal_code,
            service_code, weight_kg, length_cm, width_cm, height_cm, chargeable_weight_kg,
            declared_value, shipping_cost, insurance_cost, total_cost,
            payment_status, channel, created_by, created_at
        ) VALUES (
            v_code, v_status, v_curr_loc, v_updated_at,
            v_senders[1 + (i % ARRAY_LENGTH(v_senders, 1))],
            '0812' || LPAD((55000000 + i * 123)::TEXT, 8, '0'),
            v_streets[1 + (i % ARRAY_LENGTH(v_streets, 1))],
            v_orig_city, v_orig_hub, v_orig_dist, v_orig_vill, '001', '002', v_orig_pos,
            v_receivers[1 + ((i + 3) % ARRAY_LENGTH(v_receivers, 1))],
            '0856' || LPAD((77000000 + i * 321)::TEXT, 8, '0'),
            v_streets[1 + ((i + 4) % ARRAY_LENGTH(v_streets, 1))],
            v_dest_city, v_dest_hub, v_dest_dist, v_dest_vill, '003', '004', v_dest_pos,
            v_svc, v_weight, v_len, v_wid, v_hei, v_chg_w,
            v_declared, v_ship_cost, v_ins_cost, v_total_cost,
            v_payment, v_channel, v_op_id, v_created_at
        )
        ON CONFLICT (code) DO NOTHING;

        -- Tracking events kronologis bila shipment baru dimasukkan
        IF FOUND THEN
            INSERT INTO tracking_events (shipment_code, status, location, recorded_at, occurred_at, actor_id, hub_id, proof_status, notes)
            VALUES (
                v_code,
                CASE WHEN v_channel = 'ONLINE' AND v_status = 'BOOKED' THEN 'BOOKED' ELSE 'DITERIMA' END,
                CASE WHEN v_channel = 'ONLINE' AND v_status = 'BOOKED' THEN 'Pesanan Online Menunggu Pickup' ELSE v_orig_hub_name END,
                v_created_at, v_created_at, v_op_id, v_orig_hub, 'NONE',
                'Paket terdaftar pada sistem LacakIn (' || v_svc || ')'
            );

            IF v_status IN ('DISIMPAN', 'DALAM_PERJALANAN', 'DIKIRIM', 'GAGAL_KIRIM', 'SELESAI') THEN
                INSERT INTO tracking_events (shipment_code, status, location, recorded_at, occurred_at, actor_id, hub_id, proof_status, notes)
                VALUES (
                    v_code, 'DISIMPAN', v_orig_hub_name,
                    LEAST(NOW(), v_created_at + INTERVAL '45 minutes'),
                    LEAST(NOW(), v_created_at + INTERVAL '45 minutes'),
                    v_op_id, v_orig_hub, 'NONE', 'Paket disortir dan disimpan di gudang asal'
                );
            END IF;

            IF v_status IN ('DALAM_PERJALANAN', 'DIKIRIM', 'GAGAL_KIRIM', 'SELESAI') THEN
                INSERT INTO tracking_events (shipment_code, status, location, recorded_at, occurred_at, actor_id, hub_id, proof_status, notes)
                VALUES (
                    v_code, 'DALAM_PERJALANAN', 'Transit Lintas Hub menuju ' || v_dest_hub_name,
                    LEAST(NOW(), v_created_at + INTERVAL '2 hours'),
                    LEAST(NOW(), v_created_at + INTERVAL '2 hours'),
                    v_op_id, v_dest_hub, 'NONE', 'Armada line-haul berangkat menuju hub tujuan'
                );
            END IF;

            IF v_status IN ('DIKIRIM', 'GAGAL_KIRIM', 'SELESAI') THEN
                INSERT INTO tracking_events (shipment_code, status, location, recorded_at, occurred_at, actor_id, hub_id, proof_status, notes)
                VALUES (
                    v_code, 'DIKIRIM', 'Kurir Menuju Alamat Penerima (' || v_dest_hub_name || ')',
                    LEAST(NOW(), v_created_at + INTERVAL '3 hours'),
                    LEAST(NOW(), v_created_at + INTERVAL '3 hours'),
                    v_courier_id, v_dest_hub, 'NONE', 'Paket dibawa oleh kurir untuk pengantaran'
                );

                INSERT INTO shipment_assignments (shipment_code, courier_id, hub_id, assigned_by, assigned_at, is_active)
                VALUES (
                    v_code, v_courier_id, v_dest_hub, v_op_id,
                    LEAST(NOW(), v_created_at + INTERVAL '3 hours'), TRUE
                )
                ON CONFLICT DO NOTHING;
            END IF;

            IF v_status IN ('GAGAL_KIRIM', 'SELESAI') THEN
                INSERT INTO tracking_events (shipment_code, status, location, recorded_at, occurred_at, actor_id, hub_id, proof_status, notes)
                VALUES (
                    v_code, v_status, v_curr_loc,
                    v_updated_at, v_updated_at, v_courier_id, v_dest_hub, 'NONE',
                    CASE WHEN v_status = 'SELESAI' THEN 'Paket diterima dengan baik oleh penerima' ELSE 'Rumah kosong, dijadwalkan ulang' END
                );
            END IF;
        END IF;
    END LOOP;
END $$;

COMMIT;
