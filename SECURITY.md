# Security Policy & Threat Model — LacakIn v2

## 1. Versi dan Cakupan yang Didukung

| Komponen | Teknologi | Status Keamanan |
| --- | --- | --- |
| API Gateway / Load Balancer | Nginx 1.27 (`lb-1`, `lb-2`, `cdn`) | Didukung (Rate Limiting + Security Headers) |
| Microservices | Node.js 22 + Express (`auth`, `tracking`, `media`) | Didukung (Non-root, `read_only`, `cap_drop: ALL`) |
| Database Tier | PostgreSQL 16 + PgBouncer + HAProxy | Didukung (Parameterized SQL, Primary/Replica) |
| Object Storage | MinIO (`lacakin-media`) | Didukung (Magic-byte validation, UUID keys) |
| Frontend SPA | React 19 + Vite + Tailwind CSS v4 | Didukung (No PII in localStorage, CSP/Headers) |

---

## 2. Model Ancaman (Threat Model — STRIDE)

### Batas Kepercayaan (Trust Boundaries)
1. **Internet / Browser Klien -> Nginx Load Balancer (`8000`, `8001`, `8080`):**
   - Semua lalu lintas publik dan terotentikasi melewati Nginx terlebih dahulu.
   - Ancaman utama: Brute-force autentikasi, DoS endpoint publik (`/api/shipments/:code/events`, `/api/tariffs/quote`), XSS/Clickjacking, dan kebocoran versi server.
2. **Nginx -> Microservices (`backend_net` internal):**
   - Ancaman utama: IDOR lintas-hub atau lintas-kurir, eskalasi hak akses (RBAC bypass), SQL injection, dan kebocoran PII (NIK, NPWP, BPJS, rekening bank — kepatuhan UU PDP).
3. **Microservices -> PostgreSQL & MinIO (`backend_net` internal):**
   - Ancaman utama: Kredensial default pada mode non-dev, upload file berbahaya (SVG/HTML XSS atau polyglot), dan akses port internal dari host eksternal.

### Kontrol Keamanan Terpasang
- **Autentikasi & Kredensial:** Hashing kata sandi menggunakan `PBKDF2-SHA256` (260.000 iterasi + timing-safe comparison), JWT `HS256` dengan pencabutan sesi instan via `token_version`, serta lockout 15 menit setelah 5 percobaan gagal pada `/api/auth/login` dan `/api/auth/forgot-password`.
- **Otorisasi & Isolasi Scope (Anti-IDOR):** Middleware `requireRoles` + `applyActorScope` membatasi akses kurir (hanya paket yang ditugaskan kepadanya), operator/supervisor (hanya paket pada `hub_id` miliknya), dan admin/superadmin (seluruh Jawa Timur + pembukaan data sensitif UU PDP).
- **Validasi Input & Anti-SQLi:** Seluruh request divalidasi dengan `zod` dan seluruh query SQL menggunakan parameterized queries (`$1, $2, ...`).
- **Keamanan Upload Media:** Validasi magic bytes (`PNG`, `JPEG`, `WebP`, `PDF`), penamaan acak `UUID`, batas ukuran 5 MB, serta pemblokiran SVG/HTML.
- **Hardening Container:** Seluruh service Node.js berjalan sebagai user non-root (`appuser`), `read_only: true`, `cap_drop: ALL`, `no-new-privileges: true`, dengan batas CPU & RAM per container.

---

## 3. Pedoman Deployment Produksi

Sebelum menjalankan di lingkungan produksi (`APP_ENV=prod`):
1. Wajib menyetel `JWT_SECRET` acak minimal 32 karakter (service akan menolak start jika memakai secret default saat `APP_ENV != dev`).
2. Wajib mengganti `POSTGRES_PASSWORD`, `REPLICATOR_PASSWORD`, `MINIO_ACCESS_KEY`, dan `MINIO_SECRET_KEY` melalui file `.env` atau secret manager.
3. Batasi port MinIO (`9000`/`9001`) agar tidak terekspos ke jaringan publik dan aktifkan TLS/HTTPS di depan Load Balancer.

---

## 4. Pelaporan Kerentanan (Vulnerability Reporting)

Jika Anda menemukan celah keamanan pada LacakIn v2:
1. **Jangan** mengeksploitasi data pengguna atau melakukan pengujian destruktif pada lingkungan produksi.
2. Kirimkan laporan detail (endpoint terdampak, langkah reproduksi, dan estimasi dampak) ke tim keamanan internal LacakIn / Administrator Infrastruktur melalui saluran resmi.
3. Laporan akan ditinjau melalui 4 gerbang validasi dan ditindaklanjuti dalam waktu maksimal 2x24 jam untuk temuan tingkat High/Critical.
