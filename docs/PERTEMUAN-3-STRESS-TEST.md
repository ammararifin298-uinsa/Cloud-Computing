# Pertemuan 3 – Stress Test (k6) + Auto Scaling

## Arsitektur
```
k6 (1–1000 VU) → nginx LB (:8000) → api x N (1..5, FastAPI) → PostgreSQL
                                     ↑
                     autoscaler.ps1 (CPU rata-rata > 70% → scale up)
```
Docker Compose tidak punya autoscaling bawaan, jadi `loadtest/autoscaler.ps1`
memantau `docker stats` replika `api` dan memanggil `docker compose up --scale api=N`.

## Cara menjalankan
```powershell
docker compose up -d --build

# A. Baseline: 1 replika, tanpa autoscaling (cari titik gagal)
docker compose up -d --scale api=1
.\loadtest\run-test.ps1 -Name baseline            # ±10 menit

# B. Dengan autoscaling (terminal 1 = autoscaler, terminal 2 = k6)
.\loadtest\autoscaler.ps1
.\loadtest\run-test.ps1 -Name autoscale
```
Uji cepat: `.\loadtest\run-test.ps1 -Name smoke -Hold 10s -Ramp 5s`

## Output (`loadtest/results/`)
- `<nama>-report.html` – grafik throughput, response time, error rate (buka di browser)
- `<nama>-summary.json`, `<nama>-raw.csv` – data mentah
- `autoscale.csv` – log jumlah replika & CPU dari autoscaler

## Bersihkan data uji
```powershell
docker exec warehouse-db psql -U logistik -c "DELETE FROM tracking_events WHERE shipment_code LIKE 'LOAD-%'; DELETE FROM shipments WHERE code LIKE 'LOAD-%';"
```

## Hasil smoke test (1 replika, 100→1000 VU singkat)
10.295 request, error 0%, throughput ±149 req/s, p95 5,54 s → **bottleneck sudah
terasa di sisi latency pada 1 replika** (threshold p95<1,5 s gagal), terutama
`/api/dashboard` dan `/api/shipments` (query agregasi + 1 proses uvicorn).
Isi tabel hasil akhir (baseline vs autoscale) dari report HTML setelah uji penuh.

## Hasil uji penuh (10â†’100â†’500â†’1000 VU, tahan 2 menit/tahap, total 9m40s)

| Metrik | Baseline (1 replika) | Autoscaling (1â†’5 replika) |
|---|---|---|
| Total request | 72.951 | 107.347 |
| Throughput | 125,7 req/s | 185,0 req/s (+47%) |
| Response time avg | 2,76 s | 1,76 s |
| Response time median | 2,65 s | 0,70 s |
| p95 | 6,69 s | 6,28 s |
| p99 | 7,27 s | 8,95 s |
| Error rate | 0% | 0% |
| Threshold p95 < 1,5 s | Gagal | Gagal |

Grafik: `loadtest/results/baseline-report.html` dan `autoscale-report.html`.

### Log autoscaler (`autoscale.csv`)
- 07:56:34 CPU 133% â†’ 1â†’2 replika; 07:56:43 â†’ 3; 07:56:53 â†’ 4; 07:58:23 â†’ 5 (maks).
- Setelah beban selesai, scale down bertahap 5â†’4â†’3â†’2â†’1 (08:04â€“08:06).

### Analisis bottleneck
1. **Titik gagal:** tidak ada error 500/timeout sampai 1000 VU. Yang gagal adalah SLA latency: p95 melewati 1,5 s sejak tahap 500 VU dan menjadi Â±6â€“7 s pada 1000 VU.
2. **Bottleneck utama (1 replika):** satu proses uvicorn dengan CPU jenuh (>130%). Request antre sehingga latency naik, tetapi throughput datar di Â±125 req/s.
3. **Efek autoscaling:** throughput naik 47% dan median turun dari 2,65 s ke 0,70 s. Namun p95/p99 tetap tinggi karena (a) replika baru butuh waktu start, sehingga tail latency tinggi saat lonjakan, dan (b) peningkatan tidak linear (5x replika â†’ 1,47x throughput).
4. **Bottleneck berikutnya:** PostgreSQL (satu instance) dan CPU/RAM laptop yang dipakai bersama k6, nginx, API, dan DB. Query `GET /api/dashboard` (agregasi) dan `GET /api/shipments` (JOIN + GROUP BY) berat pada tabel yang terus membesar.
5. **Saran perbaikan:** cache hasil dashboard, indeks `tracking_events(shipment_code, recorded_at)`, tabel ringkasan/materialized view, uvicorn multi-worker, read replica, dan scale up lebih agresif (ambang CPU lebih rendah).
