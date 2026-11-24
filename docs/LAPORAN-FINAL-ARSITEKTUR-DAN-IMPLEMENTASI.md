# Laporan Final Arsitektur, Implementasi, dan Keamanan — LacakIn v2 (`logistik-dr`)

> **Tagline Resmi:** *"LacakIn: PastiIn Sampainya, TenangIn Hatinya."*  
> **Mata Kuliah:** Cloud Computing (Tugas Terstruktur — Kelompok 6)  
> **Dosen Pengampu:** Dr. Moch Yasin, S.Kom., M.Kom., M.B.A., MTCNA., CDCP  
> **Cakupan Sistem:** Sistem Logistik dan Pelacakan Paket High Availability (38 Kabupaten/Kota, 32 Hub Jawa Timur)

---

## 1. Ringkasan Eksekutif

**LacakIn v2** dibangun dengan arsitektur **Stateless Microservices**, **Database Read/Write Splitting**, **Edge CDN Proxy Cache**, dan **Disaster Recovery (DR)** di atas Docker (18 container aktif). Seluruh layanan didesain agar mampu melayani trafik tinggi, melakukan *failover* otomatis saat terjadi kegagalan node, serta menjaga integritas data dan keamanan informasi pegawai sesuai prinsip **UU PDP**.

---

## 2. Arsitektur Backend dan Infrastruktur (18 Container)

| Tier | Service / Container | Jumlah | Peran Utama |
| :--- | :--- | :---: | :--- |
| **Gateway & CDN** | `lacakin-lb-1` (`:8000`), `lacakin-lb-2` (`:8001`) | 2 | Load Balancer Nginx aktif-aktif, Rate Limiting (`429`), Micro-Cache, Security Headers (`server_tokens off`), Failover |
| **Edge Static & Media** | `lacakin-cdn` (`:8080`) | 1 | Menyajikan SPA React (`frontend/dist`) dan Nginx `proxy_cache` (`MISS` -> `HIT`) di depan MinIO |
| **Stateless API** | `auth-service`, `tracking-service`, `media-service` | 6 (2x3) | Node.js 22 + Express.js (`appuser` non-root, `read_only: true`, `cap_drop: ALL`) |
| **Connection Pool** | `lacakin-pgbouncer-rw`, `lacakin-pgbouncer-ro` | 2 | Transaction pooling & pemisahan jalur tulis (`rw`) dan baca (`ro`) |
| **DB Read Balancer** | `lacakin-haproxy-db` (`:5432`) | 1 | L4 `leastconn` balancing ke seluruh PostgreSQL Read Replicas |
| **Database Tier** | `lacakin-db-primary`, `db-replica-1`, `db-replica-2` | 3 | PostgreSQL 16 dengan WAL Streaming Replication |
| **Storage, DR & Self-Heal** | `lacakin-minio`, `lacakin-backup`, `lacakin-autoheal` | 3 | Penyimpanan objek media (`lacakin-media`), backup `pg_dump` terjadwal + SHA-256, dan auto-restart container `unhealthy` |

---

## 3. Skema Database dan Kelengkapan Data Terbaru

Seluruh skema dan migrasi berada di folder `db/` (`01-init.sql` s.d. `14-fill-all-missing-fields.sql`):
- **Referensi Wilayah & Tarif Jawa Timur:** 38 Kabupaten/Kota, kecamatan, kelurahan/desa, kode pos, 32 titik Hub aktif, 4 layanan (`REG`, `EXP`, `SDY`, `KRG`), dan 31 model kendaraan (`Sepeda Motor`, `Mobil Van / Blind Van`, `Pick Up / Box`).
- **Format Resi Otomatis (`LCK-{LAYANAN}-YYMMDD-NNNNNC`):** Dihasilkan deterministik oleh `ResiGenerator` di server menggunakan counter harian `resi_counters` dan 1 digit Luhn check digit, dilengkapi kolom `package_type` (`Umum`, `Dokumen`, `Elektronik`, `Pakaian`, `Makanan`, `Pecah Belah`).
- **Data Operasional Terkini:** 81 paket pengiriman (termasuk 50 paket sebaran 7 hari terakhir `2026-11-17` s.d. `2026-11-23` dengan variasi layanan, asuransi, COD/PAID/UNPAID, dan riwayat `tracking_events`) serta 23 akun pegawai/kurir dengan profil kepegawaian lengkap.

---

## 4. Fitur Utama Aplikasi dan RBAC 5 Peran

1. **Akses Publik (`/beranda`, `/layanan`, `/tarif`, `/lacak`, `/kirim`, `/register`):**
   - Kalkulator tarif real-time, pemesanan online, pendaftaran kurir mandiri (upload 4 dokumen), pelacakan resi publik (*zero PII* via `public_tracking_view`) lengkap dengan **Foto Bukti Terkini**, tombol **Lihat Foto Bukti** di timeline, lightbox pratinjau, dan **Cetak Resi Thermal Lengkap** (`105mm x 148mm`).
2. **Operasional Internal & Laporan per Role (`/dashboard`, `/checkpoint`, `/pengiriman`, `/laporan`):**
   - **Input Checkpoint Wajib Foto Bukti:** Tervalidasi di frontend (`CheckpointPage.jsx`) dan backend (`POST /api/events`).
   - **Daftar Pengiriman (`/pengiriman`):** Penugasan kurir, filter status/layanan, **Ekspor CSV (UTF-8 BOM)** terstruktur, dan **Cetak PDF Laporan A4 Landscape**.
   - **Laporan Rekapitulasi per Role (`/laporan`):**
     - **Kurir:** Paket ditugaskan, tingkat keberhasilan, setoran **COD terkumpul vs tertunda**, estimasi insentif antar, daftar paket COD, dan riwayat pengantaran.
     - **Operator:** Rekap tutup kasir loket (`PAID`, `COD`, `UNPAID`), kanal `LOKET` vs `ONLINE`, dan total berat.
     - **Supervisor:** Monitoring SLA hub, rasio gagal kirim/retur, dan rapor kinerja per kurir.
     - **Admin & Superadmin:** Rekap omzet ongkir murni, premi asuransi, SLA Jawa Timur, dan perbandingan seluruh hub.
3. **Administrasi Kepegawaian & Profil (`/pegawai`, `/pengajuan-kurir`, `/profil`, `/backup`):**
   - Pemisahan manajemen pegawai internal dan verifikasi kurir, perlindungan field sensitif UU PDP (`admin`/`superadmin`), serta **Unduh Kartu Pegawai (PNG)** resolusi tinggi bersudut melengkung (`1012 x 638 px`).
   - Fitur **Ingat Saya** (`localStorage` vs `sessionStorage`) dan **Lupa Password?** mandiri dengan verifikasi NIK/email.

---

## 5. Ringkasan Audit Keamanan & Hardening (`SECURITY.md`)

Audit White-Box + Black-Box lokal memastikan kontrol berikut aktif:
1. **Autentikasi & Anti Brute-Force:** Hashing `PBKDF2-SHA256` (260.000 iterasi), JWT `HS256` dengan pencabutan sesi via `token_version`, serta lockout 15 menit (5x gagal) dan rate limit ketat di Nginx untuk `/api/auth/login`, `/api/auth/register`, dan `/api/auth/forgot-password` (disertai pesan error seragam anti-enumerasi).
2. **Otorisasi & Anti-IDOR:** Seluruh endpoint internal wajib Bearer JWT dan melewati `requireRoles` + `applyActorScope` sesuai peran dan `hub_id`.
3. **Hardening HTTP & Container:** `server_tokens off`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, validasi *magic bytes* upload media, serta container non-root `read_only` dengan `cap_drop: ALL`.

---

## 6. Panduan Singkat Demo ke Dosen

1. Cek seluruh 18 container sehat: `docker compose ps`.
2. Tunjukkan pemisahan akses dan **Laporan per Role** di `http://localhost:8000/laporan` (login sebagai `kurir`, `operator`, `supervisor`, atau `admin`).
3. Tunjukkan fitur **Buat Pesanan** (`/kirim`) menghasilkan resi otomatis `LCK-{LAYANAN}-YYMMDD-NNNNNC` + **Cetak Resi Lengkap**, lalu **Input Checkpoint** (`/checkpoint`) wajib foto bukti, dan cek hasilnya di **Lacak Resi** (`/lacak`) lengkap dengan **Foto Bukti Terkini**.
4. Jalankan uji unit backend (`npm --prefix backend test`) dan simulasi DR (`.\backup\dr-test.ps1`) sesuai prosedur pada [README.md](../README.md).
