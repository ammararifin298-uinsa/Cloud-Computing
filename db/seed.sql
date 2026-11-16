-- Seed dummy shipments & tracking events (idempotent)
INSERT INTO shipments (code, current_status, current_location, updated_at) VALUES
  ('LOG-261116-K9M2', 'SELESAI', 'Penerima: Jl. Darmo Permai No. 18, Surabaya', now() - interval '2 hours'),
  ('LOG-261116-P4X7', 'DIKIRIM', 'Kurir Last-Mile Area Surabaya Selatan', now() - interval '45 minutes'),
  ('LOG-261116-R8N3', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '1 hour'),
  ('LOG-261116-T2V6', 'DISIMPAN', 'DC Rungkut, Surabaya', now() - interval '3 hours'),
  ('LOG-261116-W5J4', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '30 minutes'),
  ('LOG-261116-B7Q9', 'SELESAI', 'Penerima: Komplek Setiabudi Regency, Bandung', now() - interval '5 hours'),
  ('LOG-261116-C3H8', 'DIKIRIM', 'Kurir Last-Mile Area Jakarta Selatan', now() - interval '25 minutes'),
  ('LOG-261116-D6L5', 'DALAM_PERJALANAN', 'Terminal Kargo Juanda (SUB)', now() - interval '90 minutes'),
  ('LOG-261116-F9Z2', 'DISIMPAN', 'Hub Cross-Dock Kartasura, Solo', now() - interval '4 hours'),
  ('LOG-261116-G4Y7', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '15 minutes'),
  ('LOG-261116-H8K3', 'SELESAI', 'Penerima: Jl. Pandanaran No. 42, Semarang', now() - interval '6 hours'),
  ('LOG-261116-J2M6', 'DALAM_PERJALANAN', 'Terminal Kargo Soekarno-Hatta (CGK)', now() - interval '2 hours'),
  ('LOG-261116-M5N9', 'DIKIRIM', 'Kurir Last-Mile Area Sidoarjo Kota', now() - interval '35 minutes'),
  ('LOG-261116-N7P4', 'DISIMPAN', 'DC Gedebage, Bandung', now() - interval '3 hours'),
  ('LOG-261116-Q3R8', 'SELESAI', 'Penerima: Jl. Sudirman Kav. 52, Jakarta Pusat', now() - interval '8 hours'),
  ('LOG-261116-S6T2', 'DALAM_PERJALANAN', 'Hub Sortir Cilegon, Banten', now() - interval '2 hours'),
  ('LOG-261116-U9V5', 'DITERIMA', 'DC Marunda, Jakarta Utara', now() - interval '40 minutes'),
  ('LOG-261116-V4W7', 'DIKIRIM', 'Kurir Last-Mile Area Malang Kota', now() - interval '50 minutes'),
  ('LOG-261116-X8Y3', 'SELESAI', 'Penerima: Jl. Diponegoro No. 105, Yogyakarta', now() - interval '10 hours'),
  ('LOG-261116-Y2Z6', 'DALAM_PERJALANAN', 'Terminal Peti Kemas Tanjung Priok', now() - interval '4 hours'),
  ('LOG-261116-A5B8', 'DISIMPAN', 'DC Cakung, Jakarta Timur', now() - interval '5 hours'),
  ('LOG-261116-E7C4', 'SELESAI', 'Penerima: Jl. Ahmad Yani No. 210, Surabaya', now() - interval '12 hours'),
  ('LOG-261116-L3D9', 'DIKIRIM', 'Kurir Last-Mile Area Depok Timur', now() - interval '20 minutes'),
  ('LOG-261116-Z6F2', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '3 hours'),
  ('LOG-261116-K4G7', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '10 minutes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tracking_events (shipment_code, status, location, recorded_at)
SELECT v.code, v.status, v.location, v.recorded_at
FROM (VALUES
  ('LOG-261116-K9M2', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '28 hours'),
  ('LOG-261116-K9M2', 'DISIMPAN', 'DC Cakung, Jakarta Timur', now() - interval '24 hours'),
  ('LOG-261116-K9M2', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '14 hours'),
  ('LOG-261116-K9M2', 'DIKIRIM', 'DC Rungkut, Surabaya', now() - interval '5 hours'),
  ('LOG-261116-K9M2', 'SELESAI', 'Penerima: Jl. Darmo Permai No. 18, Surabaya', now() - interval '2 hours'),

  ('LOG-261116-P4X7', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '20 hours'),
  ('LOG-261116-P4X7', 'DISIMPAN', 'Terminal Kargo Soekarno-Hatta (CGK)', now() - interval '15 hours'),
  ('LOG-261116-P4X7', 'DALAM_PERJALANAN', 'Terminal Kargo Juanda (SUB)', now() - interval '6 hours'),
  ('LOG-261116-P4X7', 'DIKIRIM', 'Kurir Last-Mile Area Surabaya Selatan', now() - interval '45 minutes'),

  ('LOG-261116-R8N3', 'DITERIMA', 'DC Marunda, Jakarta Utara', now() - interval '16 hours'),
  ('LOG-261116-R8N3', 'DISIMPAN', 'DC Marunda, Jakarta Utara', now() - interval '12 hours'),
  ('LOG-261116-R8N3', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '1 hour'),

  ('LOG-261116-T2V6', 'DITERIMA', 'DC Gedebage, Bandung', now() - interval '18 hours'),
  ('LOG-261116-T2V6', 'DISIMPAN', 'DC Rungkut, Surabaya', now() - interval '3 hours'),

  ('LOG-261116-W5J4', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '30 minutes'),

  ('LOG-261116-B7Q9', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '30 hours'),
  ('LOG-261116-B7Q9', 'DALAM_PERJALANAN', 'Hub Cross-Dock Kartasura, Solo', now() - interval '18 hours'),
  ('LOG-261116-B7Q9', 'DIKIRIM', 'DC Gedebage, Bandung', now() - interval '8 hours'),
  ('LOG-261116-B7Q9', 'SELESAI', 'Penerima: Komplek Setiabudi Regency, Bandung', now() - interval '5 hours'),

  ('LOG-261116-C3H8', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '19 hours'),
  ('LOG-261116-C3H8', 'DALAM_PERJALANAN', 'Terminal Kargo Soekarno-Hatta (CGK)', now() - interval '7 hours'),
  ('LOG-261116-C3H8', 'DIKIRIM', 'Kurir Last-Mile Area Jakarta Selatan', now() - interval '25 minutes'),

  ('LOG-261116-D6L5', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '10 hours'),
  ('LOG-261116-D6L5', 'DALAM_PERJALANAN', 'Terminal Kargo Juanda (SUB)', now() - interval '90 minutes'),

  ('LOG-261116-F9Z2', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '11 hours'),
  ('LOG-261116-F9Z2', 'DISIMPAN', 'Hub Cross-Dock Kartasura, Solo', now() - interval '4 hours'),

  ('LOG-261116-G4Y7', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '15 minutes'),

  ('LOG-261116-H8K3', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '24 hours'),
  ('LOG-261116-H8K3', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '12 hours'),
  ('LOG-261116-H8K3', 'SELESAI', 'Penerima: Jl. Pandanaran No. 42, Semarang', now() - interval '6 hours'),

  ('LOG-261116-J2M6', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '8 hours'),
  ('LOG-261116-J2M6', 'DALAM_PERJALANAN', 'Terminal Kargo Soekarno-Hatta (CGK)', now() - interval '2 hours'),

  ('LOG-261116-M5N9', 'DITERIMA', 'DC Gedebage, Bandung', now() - interval '14 hours'),
  ('LOG-261116-M5N9', 'DALAM_PERJALANAN', 'DC Rungkut, Surabaya', now() - interval '4 hours'),
  ('LOG-261116-M5N9', 'DIKIRIM', 'Kurir Last-Mile Area Sidoarjo Kota', now() - interval '35 minutes'),

  ('LOG-261116-N7P4', 'DITERIMA', 'DC Marunda, Jakarta Utara', now() - interval '9 hours'),
  ('LOG-261116-N7P4', 'DISIMPAN', 'DC Gedebage, Bandung', now() - interval '3 hours'),

  ('LOG-261116-Q3R8', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '26 hours'),
  ('LOG-261116-Q3R8', 'DALAM_PERJALANAN', 'DC Cakung, Jakarta Timur', now() - interval '12 hours'),
  ('LOG-261116-Q3R8', 'SELESAI', 'Penerima: Jl. Sudirman Kav. 52, Jakarta Pusat', now() - interval '8 hours'),

  ('LOG-261116-S6T2', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '7 hours'),
  ('LOG-261116-S6T2', 'DALAM_PERJALANAN', 'Hub Sortir Cilegon, Banten', now() - interval '2 hours'),

  ('LOG-261116-U9V5', 'DITERIMA', 'DC Marunda, Jakarta Utara', now() - interval '40 minutes'),

  ('LOG-261116-V4W7', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '15 hours'),
  ('LOG-261116-V4W7', 'DALAM_PERJALANAN', 'DC Rungkut, Surabaya', now() - interval '4 hours'),
  ('LOG-261116-V4W7', 'DIKIRIM', 'Kurir Last-Mile Area Malang Kota', now() - interval '50 minutes'),

  ('LOG-261116-X8Y3', 'DITERIMA', 'DC Gedebage, Bandung', now() - interval '28 hours'),
  ('LOG-261116-X8Y3', 'DALAM_PERJALANAN', 'Hub Cross-Dock Kartasura, Solo', now() - interval '15 hours'),
  ('LOG-261116-X8Y3', 'SELESAI', 'Penerima: Jl. Diponegoro No. 105, Yogyakarta', now() - interval '10 hours'),

  ('LOG-261116-Y2Z6', 'DITERIMA', 'DC Marunda, Jakarta Utara', now() - interval '10 hours'),
  ('LOG-261116-Y2Z6', 'DALAM_PERJALANAN', 'Terminal Peti Kemas Tanjung Priok', now() - interval '4 hours'),

  ('LOG-261116-A5B8', 'DITERIMA', 'DC Cikarang, Bekasi', now() - interval '9 hours'),
  ('LOG-261116-A5B8', 'DISIMPAN', 'DC Cakung, Jakarta Timur', now() - interval '5 hours'),

  ('LOG-261116-E7C4', 'DITERIMA', 'DC Cakung, Jakarta Timur', now() - interval '32 hours'),
  ('LOG-261116-E7C4', 'DALAM_PERJALANAN', 'Terminal Kargo Juanda (SUB)', now() - interval '18 hours'),
  ('LOG-261116-E7C4', 'SELESAI', 'Penerima: Jl. Ahmad Yani No. 210, Surabaya', now() - interval '12 hours'),

  ('LOG-261116-L3D9', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '16 hours'),
  ('LOG-261116-L3D9', 'DALAM_PERJALANAN', 'DC Cakung, Jakarta Timur', now() - interval '4 hours'),
  ('LOG-261116-L3D9', 'DIKIRIM', 'Kurir Last-Mile Area Depok Timur', now() - interval '20 minutes'),

  ('LOG-261116-Z6F2', 'DITERIMA', 'DC Gedebage, Bandung', now() - interval '11 hours'),
  ('LOG-261116-Z6F2', 'DALAM_PERJALANAN', 'Hub Transit Banyumanik, Semarang', now() - interval '3 hours'),

  ('LOG-261116-K4G7', 'DITERIMA', 'DC Rungkut, Surabaya', now() - interval '10 minutes')
) AS v(code, status, location, recorded_at)
WHERE NOT EXISTS (
  SELECT 1 FROM tracking_events te WHERE te.shipment_code = v.code
);

