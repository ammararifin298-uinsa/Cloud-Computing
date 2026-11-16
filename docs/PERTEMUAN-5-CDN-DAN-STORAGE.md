# Laporan Pertemuan 5 — File Management dan Content Delivery Network (CDN) Berbasis Docker

Dokumen ini mendokumentasikan pemisahan layanan file statis dari server aplikasi FastAPI (`api-1` dan `api-2`), penerapan container mandiri **Edge CDN dan File Storage (`lacakin-cdn`)**, integrasi fitur **Upload/Download Bukti Pengiriman dan Scan Resi** pada antarmuka web, serta hasil perbandingan *stress test* `k6` sebelum dan sesudah menggunakan CDN.

---

## 1. Arsitektur CDN dan File Storage Mandiri

### A. Pemisahan Tugas (Separation of Concerns)
1. **App Server (`lacakin-api-1` dan `lacakin-api-2`):** Dikonfigurasi dengan `SERVE_STATIC=0` sehingga **tidak lagi melayani file statis** (`/static/*` maupun halaman HTML). App server murni memproses transaksi API (`/api/*` dan `/health`).
2. **Edge CDN dan File Storage (`lacakin-cdn`, Port `:8080`):** Container mandiri berbasis `nginx:1.27-alpine` dengan optimasi kernel (`sendfile on`, `tcp_nopush on`, `gzip on`, `open_file_cache max=2000`, `Cache-Control: public, max-age=86400, immutable`) yang melayani:
   - Seluruh aset statis UI (`/static/app.css`, `/static/app.js`, `/static/logo.svg`, dan halaman HTML) dengan header `X-Served-By: lacakin-cdn` dan `X-CDN-Cache: HIT-EDGE-STATIC`.
   - Seluruh file bukti pengiriman dan dokumen yang diunggah pengguna (`/uploads/*`) dari volume terdedikasi `cdn_uploads` dengan header `X-Served-By: lacakin-cdn` dan `X-CDN-Cache: HIT-EDGE-STORAGE`.
3. **Load Balancer (`lacakin-lb-1` dan `lacakin-lb-2`):** Meneruskan trafik `/api/` dan `/health` ke `api_cluster` (`api-1`, `api-2`), sedangkan seluruh permintaan aset statis dan unduhan (`/static/`, `/uploads/`, dan halaman web) langsung diarahkan ke `cdn_cluster` (`lacakin-cdn`) tanpa membebani server FastAPI.

### B. Integrasi Fitur UI (Upload Bukti Wajib, Kamera Langsung, Scan Resi, Laporan, dan Profil)
- **Halaman Catat Checkpoint (`/checkpoint`):**
  - **Scan Barcode / QR Resi:** Tombol *full-width* rata tengah dengan kamera langsung (`getUserMedia`) dan pilihan cepat kode resi.
  - **Bukti Foto Pengiriman Wajib (`*Wajib`):** Petugas wajib melampirkan bukti pengiriman sebelum menyimpan checkpoint, baik melalui **Pilih File Foto** maupun **Ambil dari Kamera** langsung, dilengkapi tombol **Hapus Foto** sebelum simpan.
  - **Paket Tugas Pengiriman Aktif:** Menampilkan daftar paket aktif yang siap dipilih dalam 1 klik oleh kurir/operator.
  - **Laporan Operasional (Harian, Mingguan, Bulanan):** Ekspor ke **Excel (`.xls`)** atau **Cetak PDF** khusus untuk **Operator, Supervisor, Admin, dan Superadmin** (otomatis dihapus untuk role Kurir).
  - **Tabel Lampiran Bukti Pengiriman:** Menampilkan daftar file bukti resi (otomatis memfilter file `avatar_*`) dengan tombol **Lihat**, **Unduh**, serta **Hapus** (khusus Admin dan Superadmin).
- **Halaman Lacak Pengiriman (`/lacak`):**
  - **Scan Resi dengan Kamera:** Tombol **Scan Resi** langsung menyalakan kamera perangkat untuk memindai barcode/QR resi.
  - **Lampiran Bukti Pengiriman:** Menampilkan bukti pengiriman milik resi terkait beserta tombol **Lihat Bukti** dan **Unduh Bukti**.
- **Halaman Profil dan Informasi Akun (`/profil`):**
  - Tersedia untuk seluruh role (`kurir`, `operator`, `supervisor`, `admin`, `superadmin`) guna melihat identitas lengkap akun sendiri, memperbarui data diri/kata sandi, serta mengunggah, mengambil dari kamera, atau menghapus **Foto Profil** yang langsung tersimpan otomatis.

---

## 2. Verifikasi Header dan Endpoint CDN

Hasil verifikasi langsung terhadap endpoint aset statis dan file bukti yang diunggah:
```text
UPLOAD RESULT: {"status":"uploaded","key":"DR-RESI-001_bukti-serah-terima.svg","size_bytes":226,"content_type":"image/svg+xml","cdn_url":"http://localhost:8080/uploads/DR-RESI-001_bukti-serah-terima.svg","lb_url":"/uploads/DR-RESI-001_bukti-serah-terima.svg"}
STATIC HEADERS: X-Served-By=lacakin-cdn | X-CDN-Cache=HIT-EDGE-STATIC
UPLOAD CDN HEADERS: HTTP 200 | X-Served-By=lacakin-cdn | X-CDN-Cache=HIT-EDGE-STORAGE
```

---

## 3. Hasil Stress Test URL Aset File: Sebelum vs Sesudah CDN

Pengujian dilakukan menggunakan `k6` (`loadtest/cdn-stress.js`, skenario `10 -> 100 -> 500 -> 1000 VU`, durasi `1m05s`) khusus terhadap URL aset statis (`/static/app.css`, `/static/app.js`, `/static/logo.svg`, dan `/lacak`).

| Metrik | Sebelum CDN (`cdn-before`, via FastAPI) | Sesudah CDN (`cdn-after`, via `lacakin-cdn`) | Peningkatan Performa |
|---|---|---|---|
| Total request (`http_reqs`) | 16.498 | 61.235 | **+44.737 (+271,2% / 3,71x lipat)** |
| Throughput | 251,98 req/s | 939,82 req/s | **+687,84 req/s (+273,0% / 3,73x lipat)** |
| Response time avg | 1.370 ms (1,37 s) | 246,63 ms | **-82,0% (5,5x lebih cepat)** |
| Response time median | 1.290 ms (1,29 s) | 194,03 ms | **-85,0% (6,6x lebih cepat)** |
| Response time min | 2,15 ms | 0,69 ms (694,61 µs) | **-67,7%** |
| p90 | 3.230 ms (3,23 s) | 523,46 ms | **-83,8%** |
| p95 | 3.510 ms (3,51 s) | 623,95 ms | **-82,2%** |
| p99 | 4.470 ms (4,47 s) | 863,85 ms | **-80,7%** |
| Data terkirim (`data_received`) | 215 MB (3,3 MB/s) | 807 MB (12,0 MB/s) | **+592 MB (+275,3%)** |
| Error rate (`http_req_failed`) | 0,00% (100% sukses) | 0,00% (100% sukses) | **0% error pada kedua pengujian** |

### Analisis Perbandingan
1. **Lonjakan Throughput +273%:** Ketika file statis dilayani langsung oleh Python FastAPI (`cdn-before`), *event loop* Uvicorn harus memproses pembacaan file sekaligus menangani koneksi konkuren, sehingga tertahan di `251,98 req/s`. Setelah dipindah ke `lacakin-cdn` (`cdn-after`) dengan `sendfile`, `open_file_cache`, dan kompresi `gzip`, throughput melonjak menjadi **`939,82 req/s`** (`61.235` request dalam 65 detik).
2. **Penurunan Latency Drastis (-82% sampai -85%):** Median waktu respons turun dari **`1.290 ms`** menjadi **`194,03 ms`**, dan `p95` turun dari **`3.510 ms`** menjadi **`623,95 ms`** pada beban puncak 1.000 pengguna simultan.
3. **Beban App Server Hilang:** Selama `cdn-after` berjalan pada 1.000 VU, CPU `lacakin-api-1` dan `lacakin-api-2` tetap mendekati `0%` karena seluruh trafik statis ditangani sepenuhnya oleh `lacakin-cdn`.

---

## 4. Artefak dan Cara Menjalankan Ulang

- Konfigurasi final Docker Compose (8 container HA + Backup + CDN): `docker-compose.yml`
- Konfigurasi Edge CDN dan File Storage: `nginx/cdn.conf`
- Skrip benchmark aset CDN: `loadtest/cdn-stress.js`
- Laporan HTML interaktif k6:
  - Sebelum CDN: `loadtest/results/cdn-before-report.html` (`loadtest/results/cdn-before-summary.json`)
  - Sesudah CDN: `loadtest/results/cdn-after-report.html` (`loadtest/results/cdn-after-summary.json`)
- Perintah menjalankan ulang benchmark CDN:
  ```powershell
  .\loadtest\run-test.ps1 -Name cdn-after -Script cdn-stress.js -Hold 10s -Ramp 5s
  ```

