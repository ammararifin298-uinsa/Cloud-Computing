# PERTEMUAN 3 — Stress Test (k6), Load Balancing, dan Uji Failover HA

Dokumen ini menjadi panduan sekaligus dasar penyusunan laporan **Pertemuan 3** pada arsitektur **7-container HA** (`lacakin-lb-1`, `lacakin-lb-2`, `lacakin-api-1`, `lacakin-api-2`, `lacakin-db-primary`, `lacakin-db-standby`, dan `lacakin-backup`).

---

## 1. Alur Pengujian (Workflow)

```
k6 (10 -> 100 -> 500 -> 1000 VU)
   -> lacakin-lb-1 (alias: lb, port 80 internal)
      -> Round-Robin + proxy_next_upstream
         -> api-1 / api-2 (FastAPI + uvicorn, non-root)
            -> db-primary (read-write) -> WAL streaming -> db-standby
```

Urutan menjalankan pengujian manual di PowerShell:
1. **Uji Cepat (`smoke`, ~30 detik):** memastikan jalur jaringan `k6 -> lb-1 -> api -> db-primary` bekerja tanpa error.
2. **Skenario Baseline (1 Node API):** mematikan `api-2` lalu menjalankan beban bertahap `10 -> 100 -> 500 -> 1000 VU` untuk mencari titik jenuh (*bottleneck*).
3. **Skenario HA 2 Node / Autoscaling:** menyalakan `api-2` (atau menjalankan `autoscaler.ps1`) lalu menjalankan beban yang sama untuk mengukur peningkatan throughput dan penurunan latency.
4. **Uji Failover Live (Opsional):** menghentikan `api-1` di tengah tes berjalan untuk membuktikan `lb-1` otomatis mengalihkan trafik ke `api-2`.
5. **Pembersihan Data Uji:** menghapus resi dummy `LOAD-*` dari `lacakin-db-primary`.

---

## 2. Perintah Running Manual (PowerShell)

Pastikan seluruh 7 container sudah berstatus `Up (healthy)` (`docker compose ps`).

### A. Uji Cepat (`smoke`)
```powershell
.\loadtest\run-test.ps1 -Name smoke -Hold 10s -Ramp 5s
```
Selama tes berlangsung, buka **`http://localhost:5665`** di browser untuk melihat **Live Web Dashboard**.

### B. Skenario 1 — Baseline (1 Node: `api-1` saja)
```powershell
docker compose stop api-2
.\loadtest\run-test.ps1 -Name baseline
```

### C. Skenario 2 — HA 2 Node atau Autoscaler (`api-1` + `api-2`)
- **Mode 2 Node Aktif Penuh:**
  ```powershell
  docker compose start api-2
  .\loadtest\run-test.ps1 -Name ha-2node
  ```
- **Mode Autoscaler Otomatis (2 Terminal):**
  - Terminal 1: `.\loadtest\autoscaler.ps1`
  - Terminal 2: `.\loadtest\run-test.ps1 -Name autoscale`

### D. Skenario 3 — Uji Failover Live Saat Tes Berjalan
Saat `k6` sedang menembak 2 node aktif, hentikan `api-1` di terminal lain:
```powershell
docker compose stop api-1
```
Amati di `http://localhost:5665`: trafik otomatis berpindah ke `api-2`. Setelah selesai mengamati, nyalakan kembali:
```powershell
docker compose start api-1
```

### E. Bersihkan Data Uji Dummy (`LOAD-*`)
```powershell
docker exec lacakin-db-primary psql -U logistik -d logistik -c "DELETE FROM tracking_events WHERE shipment_code LIKE 'LOAD-%'; DELETE FROM shipments WHERE code LIKE 'LOAD-%';"
```

---

## 3. Penjelasan Kode yang Dipakai

### A. Skenario Beban (`loadtest/stress.js`)
- **Tahapan Beban (`stages`):** naik bertahap `10 -> 100 -> 500 -> 1000` Virtual Users (VU); setiap tahap naik selama `RAMP` (default `20s`) dan ditahan selama `HOLD` (default `2m`), total durasi ±9 menit 40 detik.
- **Distribusi Trafik per VU:**
  - **50%** `GET /api/dashboard` — simulasi dashboard operasional (query agregasi berat).
  - **30%** `POST /api/events` — simulasi kurir/operator mencatat checkpoint resi `LOAD-0` s.d. `LOAD-199`.
  - **20%** `GET /api/shipments` — simulasi daftar pengiriman.
- **Ambang Batas SLA (`thresholds`):**
  - `http_req_failed: ['rate<0.05']` — error rate wajib di bawah `5%`.
  - `http_req_duration: ['p(95)<1500']` — 95% request wajib selesai di bawah `1.500 ms` (`1,5 detik`).
- **Jeda Acak (`sleep`):** tiap VU menunggu `0,1 - 0,6 detik` antar request agar menyerupai perilaku pengguna nyata.

### B. Runner (`loadtest/run-test.ps1`)
- Mendeteksi network `logistik-dr_backend_net` dari container `lacakin-lb-1`, lalu menjalankan `grafana/k6:latest` di jaringan internal tersebut dengan target `BASE_URL=http://lb`.
- Mengaktifkan `K6_WEB_DASHBOARD=true` pada `0.0.0.0:5665` (live dashboard) dan mengekspor hasil akhir ke:
  - `loadtest/results/<nama>-report.html` (grafik interaktif)
  - `loadtest/results/<nama>-summary.json` (ringkasan angka metrik)
  - `loadtest/results/<nama>-raw.csv` (data mentah)

### C. Autoscaler (`loadtest/autoscaler.ps1`)
- Memantau pemakaian CPU `api-1` dan `api-2` tiap `5 detik` melalui `docker stats`.
- Jika rata-rata CPU `> 70%`, otomatis menyalakan `api-2` (`docker compose start api-2`). Jika CPU turun `< 20%` selama 6 siklus berturut-turut, mematikan `api-2` kembali dan mencatat setiap kejadian ke `loadtest/results/autoscale.csv`.

---

## 4. Cara Membaca Grafik Dashboard k6 (`*-report.html` / `localhost:5665`)

Saat membuka `baseline-report.html` atau `ha-2node-report.html` di browser, perhatikan 4 grafik utama:

1. **Virtual Users (`vus`):**
   - Menunjukkan jumlah pengguna simulasi yang aktif seiring waktu (bentuk tangga `10 -> 100 -> 500 -> 1000`).
2. **HTTP Request Rate / Throughput (`http_reqs` per detik):**
   - Menunjukkan berapa banyak request yang berhasil diselesaikan server tiap detik (`req/s`).
   - **Cara membacanya:** Semakin tinggi garisnya saat VU naik, semakin besar kapasitas server. Jika garis ini **mendatar (flat)** walau VU terus naik (misal dari 500 ke 1000 VU), artinya server sudah mencapai **titik jenuh (saturasi)**.
3. **HTTP Request Duration (`avg`, `med`, `p95`, `p99`):**
   - Menunjukkan waktu tunggu pengguna (dalam `ms` atau `s`).
   - **`med` (median):** pengalaman rata-rata mayoritas pengguna.
   - **`p95`:** 95% request lebih cepat dari angka ini (dipakai sebagai batas SLA `< 1,5 s`). Jika grafik `p95` melonjak tajam melewati `1.500 ms`, berarti antrean di CPU API/DB sudah menumpuk.
4. **HTTP Request Failed (`http_req_failed`):**
   - Persentase error (`502`, `503`, `500`, atau timeout). Nilai **`0%`** menandakan tidak ada request yang gagal/drop meskipun latency melambat.

---

## 5. Hasil Uji Aktual dan Analisis Bottleneck

Pengujian dilakukan menggunakan `k6` (`10 -> 100 -> 500 -> 1000 VU`) terhadap arsitektur HA 7-container Pertemuan 2 (`lacakin-lb-1`, `lacakin-lb-2`, `lacakin-api-1`, `lacakin-api-2`, `lacakin-db-primary`, `lacakin-db-standby`, `lacakin-backup`) di mana setiap node API dibatasi `cpus: 0.75` dan `mem_limit: 384m`.

### A. Perbandingan Hasil Smoke, Baseline (1 Node), dan Autoscale (1 -> 2 Node)

| Metrik | Smoke (Hold 10s, 2 Node) | Baseline (Hold 2m, 1 Node `api-1`) | Autoscale (Hold 2m, `1 -> 2` Node) | Perubahan (Autoscale vs Baseline) |
|---|---|---|---|---|
| Total request (`http_reqs`) | 6.564 | 40.232 | 49.137 | +8.905 (+22,1%) |
| Throughput | 92,60 req/s | 69,17 req/s | 84,35 req/s | +15,18 req/s (+21,9%) |
| Response time avg | 3,94 s | 5,35 s | 4,33 s | -1,02 s (-19,1%) |
| Response time median | 3,30 s | 5,54 s | 3,67 s | -1,87 s (-33,8%) |
| p90 | - | 11,43 s | 13,79 s | +2,36 s |
| p95 | 9,52 s | 11,69 s | 14,82 s | +3,13 s |
| p99 | 13,07 s | 12,17 s | 17,92 s | +5,75 s |
| Error rate (`http_req_failed`) | 0,02% (1 gagal) | 0,02% (9 gagal) | 0,00% (3 gagal) | Tetap sangat rendah (99,99% sukses) |
| Data diterima (`data_received`) | - | 281 MB | 347 MB | +66 MB |
| Threshold `http_req_failed < 5%` | Lulus | Lulus | Lulus | Lulus |
| Threshold `p95 < 1,5 s` | Gagal | Gagal | Gagal | Butuh optimasi lanjutan |

### B. Ringkasan Log Autoscaler (`loadtest/results/autoscale.csv`)

- **06:34:50 – 06:37:18 (`1` replika `api-1`):** Pada fase awal `10 -> 100 VU`, beban CPU `api-1` berada di kisaran `0,2%` hingga `52,6%` (`action: hold`).
- **06:37:25 (Trigger Scale-Up):** Saat beban naik menuju fase `500 VU`, rata-rata CPU menyentuh **`74,6%`** (melewati ambang `> 70%`). `autoscaler.ps1` otomatis mengeksekusi **`scale_up 1->2`** dengan menyalakan `lacakin-api-2`.
- **06:37:33 – 06:44:44 (`2` replika `api-1` dan `api-2`):** Trafik dibagi dua oleh Nginx `lb-1`; rata-rata CPU kedua node stabil di kisaran **`42,5%–74,2%`** selama fase `500–1000 VU` hingga turun ke `0,2%` saat pengujian selesai.

### C. Analisis Bottleneck

1. **Dampak Resource Hardening (`cpus: 0.75`, `mem_limit: 384m`):** Pembatasan CPU dan memori dari Pertemuan 2 menjaga stabilitas host, namun membatasi kapasitas 1 node pada `69,17 req/s`. Ketika `autoscaler.ps1` mengaktifkan `api-2`, throughput naik **+21,9%** (`84,35 req/s`) dan median waktu respons membaik **-33,8%** (`5,54 s` menjadi `3,67 s`).
2. **Tail Latency (`p95` dan `p99`) di 1000 VU:** Meskipun tingkat keberhasilan request mencapai **99,99%** (hanya 3 gagal dari 49.137 request), lonjakan hingga 1000 VU konkuren membuat antrean request pada 2 node (`2 x 0.75` vCPU) dan satu titik tulis `db-primary` mendorong `p95` ke `14,82 s` dan `p99` ke `17,92 s`.
3. **Rekomendasi Optimasi Lanjutan:**
   - Memisahkan serving file statis dari app server ke layanan CDN/File Storage terpisah (**Pertemuan 5**).
   - Menambah caching untuk endpoint baca terberat (`GET /api/dashboard`, 50% bobot trafik) serta tuning koneksi/worker sesuai kapasitas CPU host.

### D. Artefak Hasil Pengujian

- Dashboard HTML interaktif: `loadtest/results/smoke-report.html`, `loadtest/results/baseline-report.html`, dan `loadtest/results/autoscale-report.html`.
- Ringkasan metrik JSON dan log autoscaler: `loadtest/results/smoke-summary.json`, `loadtest/results/baseline-summary.json`, `loadtest/results/autoscale-summary.json`, dan `loadtest/results/autoscale.csv`.

### Analisis Bottleneck untuk Pembahasan Laporan
1. **Titik Gagal (SLA vs Availability):** Error rate tetap **0%** hingga `1000 VU` (tidak ada crash/500), namun SLA latency (`p95 < 1,5 s`) mulai terlampaui pada tahap **500 VU** hingga mencapai ~6–7 detik di **1000 VU**.
2. **Bottleneck Utama pada 1 Node:** Satu proses `uvicorn` mengalami saturasi CPU (`>100%` di `docker stats`), sehingga request mengantre dan throughput tertahan di ~125 req/s.
3. **Dampak Load Balancing / Scaling:** Penambahan node API meningkatkan throughput (+47%) dan memangkas median latency dari `2,65 s` menjadi `0,70 s`.
4. **Bottleneck Lanjutan:** Pada beban 500–1000 VU, query agregasi `GET /api/dashboard` dan `GET /api/shipments` pada satu instance `db-primary` serta keterbatasan CPU/RAM host menjadi pembatas berikutnya. Rekomendasi optimasi produksi: *caching* endpoint dashboard, *read-splitting* query `GET` ke `db-standby`, dan *multi-worker uvicorn*.

---

## 6. Checklist Bukti Screenshot Pertemuan 3

1. Screenshot terminal saat `.\loadtest\run-test.ps1` berjalan (atau live dashboard `http://localhost:5665`).
2. Screenshot `loadtest/results/baseline-report.html` di browser.
3. Screenshot `loadtest/results/ha-2node-report.html` (atau `autoscale-report.html`) di browser.
4. Screenshot `docker stats --no-stream` saat beban puncak atau isi `loadtest/results/autoscale.csv`.
5. Screenshot hasil uji failover (`docker compose stop api-1` saat tes berjalan) dan pembersihan data `LOAD-*` pada `lacakin-db-primary`.
