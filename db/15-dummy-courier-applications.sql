-- ==========================================================================
-- LacakIn v2 - Dummy Pengajuan Kurir Beragam Status Review (pending, revision, rejected)
-- Catatan: Kolom dokumen dibiarkan NULL sesuai permintaan. Idempotent.
-- ==========================================================================

BEGIN;

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

    -- 1. Menunggu Verifikasi (pending, is_active = FALSE)
    INSERT INTO users (
        employee_code, username, password_hash, full_name, nik, phone, email, station, role,
        is_active, hub_id, city_id, vehicle_type, vehicle_model_id, vehicle_year, plate_number, sim_number,
        review_status, review_note,
        birth_place, birth_date, gender, address_domicile, department, job_title,
        employment_status, join_date, education_last,
        emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        bank_name, bank_account, bank_holder
    ) VALUES
    (
        'KUR-0011', 'calon_kurir1', v_pwd_hash, 'Bagas Adriansyah', '3578061405980021', '081330220001', 'bagas.adriansyah@gmail.com',
        'Hub Kurir Surabaya Selatan', 'kurir', FALSE, 27, 37,
        'Sepeda Motor', 2, 2022, 'L 5120 GH', '980535780111',
        'pending', NULL,
        'Surabaya', '1998-05-14', 'L', 'Jl. Karah Agung No. 18, Jambangan, Surabaya', 'Last-Mile Delivery', 'Calon Kurir Motor',
        'PKWT', CURRENT_DATE, 'SMK Otomotif',
        'Suharto', 'Ayah', '081330880001',
        'BCA', '0884433221', 'Bagas Adriansyah'
    ),
    (
        'KUR-0012', 'calon_kurir2', v_pwd_hash, 'Rendy Kurniawan', '3515092208970022', '081330220002', 'rendy.kurniawan@gmail.com',
        'Hub Kurir Sidoarjo', 'kurir', FALSE, 8, 15,
        'Mobil Van / Blind Van', 18, 2021, 'W 8412 KL', '970835150222',
        'pending', NULL,
        'Sidoarjo', '1997-08-22', 'L', 'Jl. Pahlawan No. 74, Sidoarjo', 'Line-Haul & Van', 'Calon Kurir Van',
        'PKWT', CURRENT_DATE, 'SMA IPS',
        'Mardiana', 'Ibu', '081330880002',
        'Mandiri', '1410088776655', 'Rendy Kurniawan'
    ),
    -- 2. Perlu Perbaikan / Revisi (revision, is_active = FALSE)
    (
        'KUR-0013', 'calon_kurir3', v_pwd_hash, 'Dodi Firmansyah', '3573031911950023', '081330220003', 'dodi.firmansyah@gmail.com',
        'Hub Kurir Malang Kota', 'kurir', FALSE, 20, 32,
        'Sepeda Motor', 9, 2020, 'N 4019 MN', '951135730333',
        'revision', 'Foto SIM C buram dan masa berlaku STNK perlu diperbarui dengan foto yang lebih jelas.',
        'Malang', '1995-11-19', 'L', 'Jl. Gajayana No. 12, Lowokwaru, Malang', 'Last-Mile Delivery', 'Calon Kurir Motor',
        'PKWT', CURRENT_DATE - INTERVAL '2 days', 'SMK TKJ',
        'Risma', 'Istri', '081330880003',
        'BRI', '005101008899501', 'Dodi Firmansyah'
    ),
    (
        'KUR-0014', 'calon_kurir4', v_pwd_hash, 'Ilham Maulana', '3578100304990024', '081330220004', 'ilham.maulana@gmail.com',
        'Hub Kurir Surabaya Utara', 'kurir', FALSE, 26, 37,
        'Sepeda Motor', 1, 2021, 'L 3877 OP', '990435780444',
        'revision', 'Mohon unggah ulang swafoto dengan e-KTP asli tanpa terpotong.',
        'Surabaya', '1999-04-03', 'L', 'Jl. Pogot Baru No. 9, Kenjeran, Surabaya', 'Last-Mile Delivery', 'Calon Kurir Motor',
        'PKWT', CURRENT_DATE - INTERVAL '1 day', 'SMA IPA',
        'Hasan', 'Ayah', '081330880004',
        'BNI', '0778899001', 'Ilham Maulana'
    ),
    -- 3. Ditolak (rejected, is_active = FALSE)
    (
        'KUR-0015', 'calon_kurir5', v_pwd_hash, 'Galih Permana', '3525122802930025', '081330220005', 'galih.permana@gmail.com',
        'Loket Gresik Kota', 'kurir', FALSE, 14, 25,
        'Pick Up / Box', 23, 2013, 'W 9102 QR', '930235250555',
        'rejected', 'Tahun kendaraan (2013) berada di bawah batas minimal operasional LacakIn (2015).',
        'Gresik', '1993-02-28', 'L', 'Jl. Dr. Wahidin Sudirohusodo No. 50, Gresik', 'Kargo & Armada Berat', 'Calon Kurir Pick Up',
        'PKWT', CURRENT_DATE - INTERVAL '4 days', 'SMK Otomotif',
        'Wati', 'Istri', '081330880005',
        'BCA', '0883322110', 'Galih Permana'
    )
    ON CONFLICT (username) DO NOTHING;

    UPDATE users
       SET reviewed_by = v_admin_id,
           reviewed_at = NOW() - INTERVAL '1 day'
     WHERE username IN ('calon_kurir3', 'calon_kurir4', 'calon_kurir5')
       AND reviewed_by IS NULL;
END $$;

COMMIT;
