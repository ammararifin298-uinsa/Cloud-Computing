-- ==========================================================================
-- LacakIn v2 - Aktivasi Layanan Kargo (KRG) di Seluruh Zona Jawa Timur
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

INSERT INTO services (code, name, volumetric_divisor, insurance_rate, max_weight_kg)
VALUES ('KRG', 'Kargo', 6000, 0.0020, 200)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  volumetric_divisor = EXCLUDED.volumetric_divisor,
  insurance_rate = EXCLUDED.insurance_rate,
  max_weight_kg = EXCLUDED.max_weight_kg;

-- Matriks Tarif Kargo 5x5 Zona Jawa Timur (ekonomis untuk barang berat hingga 200 kg)
WITH k(o, d, base_price, per_kg, eta_min, eta_max) AS (VALUES
  (1, 1, 25000, 3500, 1, 2),
  (1, 2, 28000, 4000, 2, 3),
  (1, 3, 32000, 4500, 2, 3),
  (1, 4, 36000, 5000, 2, 4),
  (1, 5, 40000, 5500, 3, 5),

  (2, 1, 28000, 4000, 2, 3),
  (2, 2, 26000, 3800, 1, 2),
  (2, 3, 32000, 4500, 2, 3),
  (2, 4, 35000, 4800, 2, 4),
  (2, 5, 40000, 5500, 3, 5),

  (3, 1, 32000, 4500, 2, 3),
  (3, 2, 32000, 4500, 2, 3),
  (3, 3, 27000, 3800, 1, 2),
  (3, 4, 36000, 5000, 2, 4),
  (3, 5, 38000, 5200, 2, 4),

  (4, 1, 36000, 5000, 2, 4),
  (4, 2, 35000, 4800, 2, 4),
  (4, 3, 36000, 5000, 2, 4),
  (4, 4, 28000, 4000, 1, 2),
  (4, 5, 44000, 6000, 3, 5),

  (5, 1, 40000, 5500, 3, 5),
  (5, 2, 40000, 5500, 3, 5),
  (5, 3, 38000, 5200, 2, 4),
  (5, 4, 44000, 6000, 3, 5),
  (5, 5, 30000, 4200, 1, 3)
)
INSERT INTO tariffs (origin_zone_id, dest_zone_id, service_code, base_price, per_kg, eta_min_days, eta_max_days)
SELECT k.o, k.d, 'KRG', k.base_price, k.per_kg, k.eta_min, k.eta_max FROM k
ON CONFLICT (origin_zone_id, dest_zone_id, service_code) DO UPDATE SET
  base_price = EXCLUDED.base_price,
  per_kg = EXCLUDED.per_kg,
  eta_min_days = EXCLUDED.eta_min_days,
  eta_max_days = EXCLUDED.eta_max_days;
