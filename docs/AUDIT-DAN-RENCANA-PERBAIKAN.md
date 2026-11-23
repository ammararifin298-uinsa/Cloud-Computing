# Audit Mendalam dan Rencana Perbaikan LacakIn (`logistik-dr`)

Dokumen ini menyimpan hasil audit lintas disiplin (**BDL — Basis Data Lanjut**, **PBO — Pemrograman Berorientasi Objek**, dan **CC — Cloud Computing**) sebagai acuan resmi perbaikan aplikasi dan infrastruktur sebelum demo/pengujian ulang.

---

## Bagian A: Audit 12 Alur Bisnis (BDL, PBO, dan CC)

| # | Alur Bisnis | Masalah Utama Saat Ini | Solusi Inti (BDL / PBO / CC) |
| :-: | :--- | :--- | :--- |
| **1** | **Pemesanan & Penerimaan Paket** | Belum ada intake; `shipments` tanpa pengirim, penerima, berat, tarif, atau pembayaran. | Perluas tabel `shipments` + FK `cities`/`hubs`; `OrderService` + DTO Pydantic; transaksi tunggal; `/api/orders` jadi target uji beban. |
| **2** | **Penerbitan Resi** | `generateResi()` di browser pakai `Math.random()`, rawan tabrakan & menimpa resi lain (`ON CONFLICT DO UPDATE`). | `ResiGenerator` di server + counter atomik DB (`RETURNING`) + `UNIQUE(resi)` + check digit; `POST /api/events` harus menolak resi tak dikenal (`404`). |
| **3** | **Hitung Tarif** | Belum ada kalkulasi tarif; lokasi masih teks bebas & hardcode `LOCATIONS` di JS. | Tabel referensi `cities`, `zones`, `hubs`, `tariffs`, `services`; pola **Strategy** `TariffCalculator`; cache data referensi & hitung ulang di server. |
| **4** | **Siklus Status** | Transisi status tidak divalidasi (`SELESAI` bisa balik ke `DITERIMA`), tanpa status `booked`/`gagal`/`retur`/`batal`. | Tabel `allowed_transitions`, `SELECT ... FOR UPDATE` + optimistic lock (`version`); pola **State** + `InvalidTransition`. |
| **5** | **Checkpoint & Bukti Foto** | Foto wajib hanya di UI, tidak terikat ke event; gagal kamera diganti kanvas palsu; tombol scan tidak memindai. | Tabel `proofs` (`event_id` FK, `sha256`, `mime`, `size`); interface `StorageBackend` (MinIO/Local); whitelist MIME + magic bytes + `nosniff`; hapus kanvas palsu. |
| **6** | **Penugasan Kurir & Lokasi** | Kurir melihat semua paket aktif; `station` tidak dipakai & bisa diubah sendiri. | Tabel `shipment_assignments` + `users.hub_id` FK; kelas `Permission` per role; batasi di API. |
| **7** | **Audit & Penghapusan** | `tracking_events` tanpa `actor_id`; hapus bersifat permanen; perubahan role/setting tidak tercatat; `access_log off`. | `actor_id`, tabel `audit_log` append-only, `deleted_at` (soft delete); pola **Observer**; aktifkan `access_log` JSON & ikut ter-backup. |
| **8** | **Akses & Akun** | `/api/events`, `/api/uploads`, `/api/shipments`, `/api/dashboard` bisa diakses tanpa login; self-register bisa pilih `supervisor`; `add_event` tidak cek DB. | Wajib `Depends(get_current_user)` & `require_roles` di semua endpoint internal; `token_version` untuk revocation; secret wajib dari `.env`; pesan login generik. |
| **9** | **Pelacakan Publik** | Semua resi & bukti bisa dienumerasi; toggle `public_tracking` bisa dilewati dengan header `Bearer x`. | DTO `PublicTrackingView` tanpa PII; wajib validasi token asli untuk melewati toggle; rate limit per IP (+ opsi verifikasi 4 digit HP). |
| **10** | **Laporan & Dashboard** | Periode kosong tampilkan semua data; terpotong 500 baris; `.xls` sebenarnya HTML; tanpa paginasi. | Agregasi server-side, indeks `(status, updated_at)`, keyset pagination, `ReportGenerator`; arahkan query berat ke `read-replica`. |
| **11** | **Reliabilitas** | Klik ganda/retry menggandakan data; saat DB primary mati semuanya `503`. | Tabel `idempotency_keys` (`Idempotency-Key` header) + `@idempotent`; mode degradasi (baca dari replica, tulis tolak `503` + `Retry-After`). |
| **12** | **DR & Dokumentasi** | `cloud-s3` & `sync-gdrive.ps1` tidak ada; D2 hanya restart primary; RTO diukur sampai `/health` OK; `run.ps1` usang. | Jujurkan klaim DRP/RTO (ukur sampai `POST` berhasil atau terapkan `pg_promote`/PITR), selaraskan `README`, `docs/`, `run.ps1`, dan `docker-compose.yml`. |

---

## Bagian B: Temuan Audit Mendalam (5 Kategori Teknis)

### 0. Ketidaksesuaian Spesifikasi Tugas vs Kondisi Repo Awal
- `PgBouncer` (transaction pooling & R/W split): belum ada.
- `MinIO` untuk media: belum ada (masih volume lokal `cdn_uploads`).
- `Autoscaling 1–10`: masih 2 node statis (`api-1`, `api-2`).
- `Real Edge CDN`: Nginx statis dengan header `X-CDN-Cache` di-hardcode, belum `proxy_cache` / Cloudflare.
- `pytest`, CI, `.dockerignore`: belum ada.
- `Observability`: `access_log off`, tanpa `X-Request-ID`, tanpa log JSON, tanpa `/metrics`.
- `Off-site backup / PITR`: belum ada sync S3/GDrive atau WAL archiving.

### 1. Keamanan Aplikasi & API (OWASP)
- **[1.1][KRITIS]** Endpoint tulis/hapus (`/api/events`, `/api/uploads`) & daftar internal (`/api/shipments`, `/api/dashboard`) terbuka tanpa autentikasi.
- **[1.2][KRITIS]** Stored XSS via upload `.svg`/`.html` *same-origin* — wajib whitelist ekstensi + **magic bytes**, tolak/sanitasi SVG, ganti nama file ke `uuid4().hex`, pasang `nosniff` & CSP.
- **[1.3][KRITIS]** Default `JWT_SECRET` dan password DB tertulis di `main.py` / `docker-compose.yml` — wajib `${VAR:?wajib diisi}` di produksi & seed default hanya di `APP_ENV=dev`.
- **[1.4][KRITIS]** Self-register langsung aktif untuk `operator`/`supervisor` — wajib `pending` (`is_active=false`) atau batasi role publik ke `kurir` tanpa langsung menerbitkan token.
- **[1.5][TINGGI]** Login masih loop `all_hashes` (DoS CPU & oracle) — ganti dummy hash konstan, pesan generik `"Identitas atau kata sandi salah"`, rate limit `5 r/m` + lockout akun.
- **[1.6][TINGGI]** Tidak ada `token_version` revocation & `add_event` hanya `decode_jwt` tanpa cek status aktif DB.
- **[1.7][TINGGI]** Belum ada security header (`X-Content-Type-Options`, `X-Frame-Options`, `CSP`, `HSTS`) & `CORSMiddleware`.
- **[1.8][TINGGI]** Upload JSON Base64 `25 MB` berisiko OOM di container `384 MB` — ganti multipart streaming atau presigned PUT ke MinIO (maks `5 MB`).
- **[1.9][TINGGI]** Kebocoran PII (NIK, HP, email) di `/api/auth/login`, `/api/users`, & `localStorage` — lakukan masking NIK dan simpan data minimal di `localStorage`.
- **[1.10][TINGGI]** Manajemen role: cegah superadmin mengunci diri sendiri (`SELECT ... FOR UPDATE` cek minimal 1 superadmin aktif), batasi admin agar tidak menyentuh superadmin, dan catat di `audit_log`.
- **[1.11][SEDANG]** `authorization.startswith("Bearer ")` tanpa verifikasi token bisa melewati toggle `public_tracking`.
- **[1.12][SEDANG]** PBKDF2 120k iterasi (OWASP 2023 sarankan ≥ 600k / Argon2id), JWT tanpa `iat`/`jti`, dan error 422 memantulkan input.
- **[1.13][RENDAH]** `confirmDialog` di `app.js` sebaiknya pakai `textContent`, dan token jangka panjang lebih aman di cookie `HttpOnly`.

### 2. Concurrency, Race Condition, PgBouncer, & Skema DB
- **[2.1][KRITIS]** `generateResi()` di browser + `ON CONFLICT DO UPDATE` diam-diam menimpa paket lain saat tabrakan.
- **[2.2][TINGGI]** Tidak ada state machine atau optimistic lock (`version`) saat update status.
- **[2.3][TINGGI]** `recorded_at DEFAULT now()` (waktu awal transaksi) dapat mengacak urutan timeline saat lock contention — gunakan `clock_timestamp()` dan urutkan `ORDER BY id DESC`.
- **[2.4][TINGGI]** Tidak ada `Idempotency-Key` pada `POST`.
- **[2.5][TINGGI]** Kompatibilitas `psycopg3` + `PgBouncer` transaction mode: wajib `prepare_threshold=None`, `pg_advisory_xact_lock`, dan pisah `pgbouncer-rw` + `pgbouncer-ro`.
- **[2.6][SEDANG]** TOCTOU di register/profil, DDL saat boot API (pindahkan ke Alembic/migrasi terpisah), dan `setval` yang bisa mundur.
- **[2.7][TINGGI]** Skema DB belum ternormalisasi penuh (`hubs`, `proof_files`, `shipment_status`, `created_by`, soft delete, pemisahan role DB `migrator`/`app_rw`/`app_ro`).
- **[2.8][SEDANG]** Query berat `/api/dashboard` (`count(*)`) & `list_shipments` tanpa cache (3–5 detik) serta index ekspresi `lower(username)` / `upper(employee_code)` untuk login.

### 3. Reliability, Observability, & Operasional Produksi
- **[3.1][KRITIS]** DRP harus jujur: tambahkan sync off-site nyata / WAL archiving (PITR) atau dokumentasikan batasan saat ini (RPO = 15 menit, D2 = restart primary kecuali ada Patroni/`pg_promote`), serta jangan `pg_restore --clean` langsung ke primary yang sedang melayani API tanpa isolasi.
- **[3.2][TINGGI]** Hasil stress test di JSON (`p95 = 11,7s` baseline, `14,8s` autoscale) gagal melewati threshold `< 1500 ms` — harus dilaporkan jujur di README/laporan, perbaiki bottleneck (`--workers 2`, `AsyncConnectionPool`, PgBouncer, cache dashboard), lalu uji ulang *stress-to-failure* hingga *breaking point*.
- **[3.3][TINGGI]** Pisahkan `/livez` (liveness container) dan `/readyz` (readiness DB untuk LB), serta pasang `willfarrell/autoheal` agar container `unhealthy` benar-benar di-restart.
- **[3.4][TINGGI]** Upstream Nginx statis (`api-1`, `api-2`) membuat LB gagal start jika `api-2` mati — ubah ke DNS dinamis `set $upstream http://api:8000; resolver 127.0.0.11 valid=5s;` untuk scale `1–10`.
- **[3.5][TINGGI]** Selaraskan rantai timeout (`DB < App < Nginx < Cloudflare/Client`), samakan `uvicorn --timeout-keep-alive 65` dengan Nginx `keepalive_timeout 55s`, dan petakan `PoolTimeout` ke `503 Retry-After`.
- **[3.6][TINGGI]** Tambahkan `X-Request-ID`, log JSON terstruktur di Nginx & FastAPI, serta `/metrics` Prometheus.
- **[3.7][SEDANG]** Tambahkan `--timeout-graceful-shutdown 25` + `stop_grace_period: 30s` + `/readyz -> 503` saat `SIGTERM`.
- **[3.8][TINGGI]** Hindari OOM upload Base64, tambahkan `pids_limit`, tuning `shared_buffers`/`work_mem` DB, dan monitoring disk.
- **[3.9][SEDANG]** Terapkan `proxy_cache` Nginx + Cloudflare Cache Rules asli dengan `X-Cache-Status: $upstream_cache_status` dan hash nama file statis.
- **[3.10][SEDANG]** Pindahkan media ke `minio` (khusus media, bukan backup), idealnya dengan presigned PUT & CDN di depannya.
- **[3.11][RENDAH]** Sinkronkan `run.ps1`, `loadtest/run-test.ps1`, `.env.example`, dan `README.md` dengan `docker-compose.yml` aktual.

### 4. Frontend, UX, & Aksesibilitas
- **[4.1][TINGGI]** Scanner kamera belum punya decoder nyata — gunakan `BarcodeDetector` API (fallback `html5-qrcode` lokal).
- **[4.2][TINGGI]** Hapus kanvas palsu di `checkpoint.html` (`captureNowBtn`) dan wajibkan foto nyata.
- **[4.3][TINGGI]** Tambahkan `AbortController` timeout `10s` di `api()`, klasifikasi error offline/timeout/5xx, dan mode degradasi UI.
- **[4.4][SEDANG]** Sinkronkan validasi pola resi & NIK di client-server dan tampilkan error per field dari `detail[].loc`.
- **[4.5][SEDANG]** Paginasi keyset + pencarian/filter server-side untuk `/pengiriman`.
- **[4.6][RENDAH]** Aksesibilitas modal (`aria-labelledby`, focus trap) dan toast (`aria-live="polite"`).

### 5. Testing, Struktur PBO, & Hardening Docker
- **[5.1][KRITIS]** Buat suite `pytest` (`unit/` & `integration/`): state machine, resi generator, RBAC matrix, concurrency, keamanan upload (tolak SVG/magic bytes palsu), idempotency, dan PgBouncer `prepare_threshold=None`.
- **[5.2][TINGGI]** Pecah monolit `api/main.py` ke struktur clean architecture (`routers/`, `services/`, `domain/`, `repositories/`, `infra/`, `schemas/`, `core/`) dengan pola **State**, **Strategy**, **Observer**, dan **Dependency Inversion**.
- **[5.3][SEDANG]** Hardening container (`read_only: true` + `tmpfs: /tmp`, `cap_drop: [ALL]`, `.dockerignore`, pin image `k6`, amankan `init-primary.sh` & `pg_hba.conf`, dan sesuaikan skrip `k6`/`dr-test.ps1` dengan token login).

---

## Prioritas Eksekusi yang Disarankan
1. **Tutup lubang keamanan kritis:** Auth wajib semua endpoint internal (`1.1`), anti-XSS upload & magic bytes (`1.2`), secret env tanpa default (`1.3`), batasi self-register (`1.4`), dan server-side `ResiGenerator` (`2.1`).
2. **Perkuat infrastruktur CC:** `PgBouncer` (`rw`/`ro`, `prepare_threshold=None`), `HAProxy` + `db-replica` (`256 MB`/DB), `MinIO` khusus media, `Nginx proxy_cache` + `Cloudflare`, `autoheal`, `/livez` & `/readyz`, dynamic upstream `1–10`, serta `lacakin-backup` terpisah (`./backups` + `rclone`).
3. **Refaktor PBO & Skema BDL:** Pecah struktur folder OOP, terapkan State Machine (`allowed_transitions` + `SELECT ... FOR UPDATE`), `Idempotency-Key`, dan `audit_log`.
4. **Perbaiki Frontend & Testing:** Hapus kanvas palsu & decoder scanner nyata, `pytest` otomatis, lalu jalankan ulang **`k6` per API sampai breaking point** dan **`dr-test.ps1`** dengan pelaporan angka yang 100% jujur.
