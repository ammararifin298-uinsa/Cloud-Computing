-- ==========================================================================
-- LacakIn v2 - Dummy Pegawai Internal Tambahan (Aktif, Nonaktif, PKWTT, PKWT, Magang)
-- Catatan: Kolom dokumen (doc_*) dibiarkan NULL sesuai permintaan. Idempotent.
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

    INSERT INTO users (
        employee_code, username, password_hash, full_name, nik, phone, email, station, role,
        is_active, hub_id, city_id, district_id, village_id, street_address, rt, rw, postal_code,
        review_status, reviewed_by, reviewed_at,
        birth_place, birth_date, gender, address_domicile, department, job_title,
        employment_status, join_date, contract_end_date, education_last,
        emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        npwp, bpjs_kes, bpjs_tk, bank_name, bank_account, bank_holder
    ) VALUES
    -- Operator Aktif (PKWT & Magang)
    (
        'OPR-0006', 'op_jbr', v_pwd_hash, 'Nanda Putri Rahayu', '3509195204000031', '081234003006', 'nanda.rahayu@lacakin.id',
        'Loket Jember Kota', 'operator', TRUE, 2, 9,
        (SELECT d.id FROM districts d WHERE d.city_id = 9 ORDER BY d.id LIMIT 1),
        (SELECT v.id FROM villages v JOIN districts d ON d.id = v.district_id WHERE d.city_id = 9 ORDER BY v.id LIMIT 1),
        'Jl. Gajah Mada No. 115, Jember', '002', '004', '68131',
        'approved', v_admin_id, NOW() - INTERVAL '14 days',
        'Jember', '2000-04-12', 'P', 'Jl. Gajah Mada No. 115, Jember', 'Pelayanan Loket', 'Operator Loket Jember',
        'PKWT', DATE '2025-02-01', DATE '2027-02-01', 'D3 Manajemen Pemasaran',
        'Slamet', 'Ayah', '081234009011',
        '59.101.202.3-626.000', '0001458890301', '250014589301', 'BCA', '0249988771', 'Nanda Putri Rahayu'
    ),
    (
        'OPR-0007', 'op_magang1', v_pwd_hash, 'Bagus Prakoso', '3578031108030032', '081234003007', 'bagus.prakoso@lacakin.id',
        'Loket Tandes, Surabaya', 'operator', TRUE, 28, 37,
        (SELECT d.id FROM districts d WHERE d.city_id = 37 ORDER BY d.id LIMIT 1),
        (SELECT v.id FROM villages v JOIN districts d ON d.id = v.district_id WHERE d.city_id = 37 ORDER BY v.id LIMIT 1),
        'Jl. Manukan Tama No. 22, Tandes, Surabaya', '001', '003', '60185',
        'approved', v_admin_id, NOW() - INTERVAL '7 days',
        'Surabaya', '2003-08-11', 'L', 'Jl. Manukan Tama No. 22, Tandes, Surabaya', 'Gudang & Sortir', 'Staf Sortir Magang',
        'MAGANG', DATE '2026-09-01', DATE '2027-03-01', 'SMK Teknik Komputer',
        'Sulastri', 'Ibu', '081234009012',
        NULL, '0001458890302', '260014589302', 'BRI', '009801009876501', 'Bagus Prakoso'
    ),
    -- Supervisor Aktif tambahan
    (
        'SPV-0005', 'spv_kdr', v_pwd_hash, 'Yusuf Hidayatullah', '3571010506890033', '081234002005', 'yusuf.hidayatullah@lacakin.id',
        'Hub Regional Kediri', 'supervisor', TRUE, 19, 30,
        (SELECT d.id FROM districts d WHERE d.city_id = 30 ORDER BY d.id LIMIT 1),
        (SELECT v.id FROM villages v JOIN districts d ON d.id = v.district_id WHERE d.city_id = 30 ORDER BY v.id LIMIT 1),
        'Jl. Dhoho No. 60, Kota Kediri', '003', '001', '64121',
        'approved', v_admin_id, NOW() - INTERVAL '40 days',
        'Kediri', '1989-06-05', 'L', 'Jl. Dhoho No. 60, Kota Kediri', 'Distribusi Matraman', 'Supervisor Hub Kediri',
        'PKWTT', DATE '2021-11-01', NULL, 'S1 Teknik Logistik',
        'Farida', 'Istri', '081234009013',
        '41.222.333.4-622.000', '0001458890303', '210014589303', 'Mandiri', '1710055443322', 'Yusuf Hidayatullah'
    ),
    -- Pegawai Nonaktif (is_active = FALSE) untuk demo filter Nonaktif / Resign / Cuti Panjang
    (
        'OPR-0008', 'op_nonaktif1', v_pwd_hash, 'Teguh Santosa', '3515081909930034', '081234003008', 'teguh.santosa@lacakin.id',
        'Hub Kurir Sidoarjo', 'operator', FALSE, 8, 15,
        (SELECT d.id FROM districts d WHERE d.city_id = 15 ORDER BY d.id LIMIT 1),
        (SELECT v.id FROM villages v JOIN districts d ON d.id = v.district_id WHERE d.city_id = 15 ORDER BY v.id LIMIT 1),
        'Jl. Diponegoro No. 89, Sidoarjo', '004', '002', '61213',
        'approved', v_admin_id, NOW() - INTERVAL '120 days',
        'Sidoarjo', '1993-09-19', 'L', 'Jl. Diponegoro No. 89, Sidoarjo', 'Gudang & Sortir', 'Operator Gudang Sidoarjo',
        'PKWT', DATE '2023-03-01', DATE '2025-03-01', 'SMA IPS',
        'Mariana', 'Istri', '081234009014',
        '49.333.444.5-603.000', '0001458890304', '230014589304', 'BNI', '0887766112', 'Teguh Santosa'
    ),
    (
        'ADM-0004', 'admin_nonaktif1', v_pwd_hash, 'Larasati Wulandari', '3578056501910035', '081234001004', 'larasati.wulandari@lacakin.id',
        'Loket Wonokromo, Surabaya', 'admin', FALSE, 29, 37,
        (SELECT d.id FROM districts d WHERE d.city_id = 37 ORDER BY d.id LIMIT 1),
        (SELECT v.id FROM villages v JOIN districts d ON d.id = v.district_id WHERE d.city_id = 37 ORDER BY v.id LIMIT 1),
        'Jl. Raya Darmo No. 132, Surabaya', '001', '005', '60241',
        'approved', v_admin_id, NOW() - INTERVAL '180 days',
        'Surabaya', '1991-01-25', 'P', 'Jl. Raya Darmo No. 132, Surabaya', 'Keuangan & Administrasi', 'Admin Administrasi',
        'PKWTT', DATE '2021-04-01', NULL, 'S1 Akuntansi',
        'Bima', 'Suami', '081234009015',
        '43.444.555.6-609.000', '0001458890305', '210014589305', 'BCA', '0881122993', 'Larasati Wulandari'
    )
    ON CONFLICT (username) DO NOTHING;
END $$;

COMMIT;
