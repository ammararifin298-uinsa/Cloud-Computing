-- ==========================================================================
-- LacakIn v2 - Sinkronisasi Lokasi & Hub Jawa Timur (Hapus DC/Lokasi Lama)
-- Memastikan seluruh shipments.current_location dan tracking_events.location
-- akurat dan presisi sesuai origin_hub_id, dest_hub_id, dan dest_city_id.
-- ==========================================================================

BEGIN;

-- 1. Perbarui shipments.current_location yang masih memakai nama DC/kota lama
UPDATE shipments s
SET current_location = CASE s.current_status
        WHEN 'BOOKED'           THEN 'Pesanan Online Menunggu Pickup'
        WHEN 'DITERIMA'         THEN COALESCE(oh.name, 'DC Rungkut, Surabaya')
        WHEN 'DISIMPAN'         THEN COALESCE(oh.name, 'DC Rungkut, Surabaya')
        WHEN 'DALAM_PERJALANAN' THEN 'Transit Lintas Hub menuju ' || COALESCE(dh.name, 'DC Rungkut, Surabaya')
        WHEN 'DIKIRIM'          THEN 'Kurir Menuju Alamat Penerima (' || COALESCE(dh.name, 'DC Rungkut, Surabaya') || ')'
        WHEN 'GAGAL_KIRIM'      THEN 'Penerima Tidak di Tempat (' || COALESCE(dh.name, 'DC Rungkut, Surabaya') || ')'
        WHEN 'SELESAI'          THEN 'Diterima Penerima di ' || COALESCE(dc.name, 'Surabaya')
        ELSE COALESCE(oh.name, 'DC Rungkut, Surabaya')
    END
FROM hubs oh,
     hubs dh,
     cities dc
WHERE oh.id = COALESCE(s.origin_hub_id, 32)
  AND dh.id = COALESCE(s.dest_hub_id, 8)
  AND dc.id = COALESCE(s.dest_city_id, 15)
  AND (
      s.current_location ~* '(Cakung|Cikarang|Gedebage|Marunda|Banyumanik|Kartasura|Cilegon|Depok|Jakarta|Bandung|Semarang|Yogyakarta|Solo|Banten|Bekasi|Soekarno-Hatta|Tanjung Priok|Cipali|Hub Surabaya Barat|Last-Mile Area|Penerima:)'
      OR s.current_location IS NULL
  );

-- 2. Perbarui tracking_events.location & hub_id yang masih memakai nama DC/kota lama
UPDATE tracking_events te
SET location = CASE te.status
        WHEN 'BOOKED'           THEN 'Pesanan Online Menunggu Pickup'
        WHEN 'DITERIMA'         THEN COALESCE(oh.name, 'DC Rungkut, Surabaya')
        WHEN 'DISIMPAN'         THEN COALESCE(oh.name, 'DC Rungkut, Surabaya')
        WHEN 'DALAM_PERJALANAN' THEN 'Transit Lintas Hub menuju ' || COALESCE(dh.name, 'DC Rungkut, Surabaya')
        WHEN 'DIKIRIM'          THEN 'Kurir Menuju Alamat Penerima (' || COALESCE(dh.name, 'DC Rungkut, Surabaya') || ')'
        WHEN 'GAGAL_KIRIM'      THEN 'Penerima Tidak di Tempat (' || COALESCE(dh.name, 'DC Rungkut, Surabaya') || ')'
        WHEN 'SELESAI'          THEN 'Diterima Penerima di ' || COALESCE(dc.name, 'Surabaya')
        ELSE COALESCE(oh.name, 'DC Rungkut, Surabaya')
    END,
    hub_id = CASE
        WHEN te.status IN ('BOOKED', 'DITERIMA', 'DISIMPAN') THEN COALESCE(s.origin_hub_id, 32)
        ELSE COALESCE(s.dest_hub_id, 8)
    END
FROM shipments s
LEFT JOIN hubs oh ON oh.id = COALESCE(s.origin_hub_id, 32)
LEFT JOIN hubs dh ON dh.id = COALESCE(s.dest_hub_id, 8)
LEFT JOIN cities dc ON dc.id = COALESCE(s.dest_city_id, 15)
WHERE te.shipment_code = s.code
  AND (
      te.location ~* '(Cakung|Cikarang|Gedebage|Marunda|Banyumanik|Kartasura|Cilegon|Depok|Jakarta|Bandung|Semarang|Yogyakarta|Solo|Banten|Bekasi|Soekarno-Hatta|Tanjung Priok|Cipali|Hub Surabaya Barat|Last-Mile Area|Penerima:)'
      OR te.location IS NULL
  );

COMMIT;
