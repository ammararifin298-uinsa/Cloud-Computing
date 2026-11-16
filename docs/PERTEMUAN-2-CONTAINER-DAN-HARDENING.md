# PERTEMUAN 2 — Containerization, High Availability, Backup Terverifikasi, dan Security Hardening

Dokumen ini menjadi dasar penyusunan laporan **Pertemuan 2** untuk sistem **Lacakin Logistik HA/DR** (`logistik-dr`), yang mengubah prototipe single-container menjadi arsitektur **7-container High Availability (HA)** dengan **PostgreSQL WAL Streaming Replication**, **Backup terverifikasi (`pg_restore --list` dan `SHA-256`)**, serta **Security Hardening** menyeluruh. *(Integrasi Cloud Object Storage / MinIO S3 dijadwalkan pada Pertemuan 5.)*

---

## 1. Ringkasan Perubahan Arsitektur (Sebelum vs Sesudah)

| Komponen | Sebelum (Single-Node) | Sesudah (Tahap 2 — HA + DR + Hardening) |
|---|---|---|
| Load Balancer | 1 Nginx (`lb`) memproksi ke `api:8000` | 2 Nginx (`lb-1` di port `8000` dengan alias `lb`, dan `lb-2` di port `8001`) + `resolver 127.0.0.11` + `proxy_next_upstream` |
| Backend API | 1 container (`api`) berjalan sebagai `root` | 2 container stateless (`api-1`, `api-2`) berjalan sebagai non-root `appuser`, `psycopg_pool` multi-host failover + `check_connection` |
| Database | 1 PostgreSQL (`db`) tanpa replikasi | 2 PostgreSQL 16 (`db-primary` + `db-standby` WAL streaming replication dengan `replicator` dan `scram-sha-256`) |
| Backup dan DR | 1 container `backup` lokal (`pg_dump` tanpa validasi) | Container `backup` dengan `pg_dump -Fc -Z 6`, validasi `pg_restore --list`, checksum `SHA-256`, atomic rename, dan retensi lokal 24 jam (siap sinkronisasi Cloud S3 di Pertemuan 5) |
| Jaringan | 1 network default | Isolasi 2 network: `frontend_net` (publik) dan `backend_net` (`internal: true`, tanpa akses internet keluar) |
| Kredensial | Hardcoded di `docker-compose.yml` | Dipindahkan ke `.env` (ter-ignore Git) dan template `.env.example` |

---

## 2. Daftar 7 Container Aktif (`docker-compose.yml`)

1. **`lacakin-lb-1` (`nginx:1.27-alpine`)** — Load balancer utama pada `localhost:8000` (terhubung ke `frontend_net` dan `backend_net`, memiliki network alias `lb` agar kompatibel dengan skrip stress test Pertemuan 3).
2. **`lacakin-lb-2` (`nginx:1.27-alpine`)** — Load balancer cadangan (active-active) pada `localhost:8001`.
3. **`lacakin-api-1` (`api/Dockerfile`)** — Worker FastAPI node 1 (`APP_NODE=api-1`) dengan header respons `X-App-Node: api-1`.
4. **`lacakin-api-2` (`api/Dockerfile`)** — Worker FastAPI node 2 (`APP_NODE=api-2`) dengan header respons `X-App-Node: api-2`.
5. **`lacakin-db-primary` (`postgres:16-alpine`)** — Database utama (`read-write`) yang mengaktifkan `wal_level=replica`, `max_wal_senders=10`, dan `wal_keep_size=64MB`.
6. **`lacakin-db-standby` (`postgres:16-alpine`)** — Database replika (`hot_standby=on`) yang melakukan inisialisasi otomatis via `pg_basebackup` dari `db-primary` dan menerima WAL stream secara real-time.
7. **`lacakin-backup` (`backup/Dockerfile`)** — Scheduler backup otomatis berbasis `postgres:16-alpine` yang menjalankan dump, verifikasi `pg_restore --list`, dan checksum `SHA-256`.

---

## 3. Implementasi High Availability dan Failover

### A. Load Balancer Layer (`nginx/nginx.conf`)
- Menggunakan `resolver 127.0.0.11 valid=5s ipv6=off;` agar Nginx me-resolve ulang IP container Docker secara dinamis saat terjadi restart/failover.
- Upstream `api_cluster` mengarahkan trafik secara round-robin ke `api-1:8000` dan `api-2:8000` dengan `max_fails=2 fail_timeout=5s`.
- Direktif `proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;` memastikan request otomatis dialihkan ke node API yang sehat jika salah satu node gagal.

### B. Application Layer (`api/main.py`)
- Menggunakan **multi-host libpq connection string**:
  `host=db-primary,db-standby port=5432 ... target_session_attrs=read-write`
  sehingga pool koneksi otomatis memilih node yang berstatus `read-write`.
- Mengaktifkan `check=ConnectionPool.check_connection` pada `psycopg_pool.ConnectionPool` untuk mendeteksi dan membuang koneksi stale sebelum dipakai endpoint.
- Middleware `add_node_header` menyisipkan header HTTP `X-App-Node` pada setiap respons untuk membuktikan distribusi beban antara `api-1` dan `api-2`.

### C. Database Layer (`db/init-primary.sh` dan `db/standby-entrypoint.sh`)
- **`db/init-primary.sh`** membuat role `replicator` dengan hak `REPLICATION LOGIN`, mengaktifkan parameter WAL di `postgresql.conf`, dan mengizinkan koneksi replikasi pada subnet Docker di `pg_hba.conf` menggunakan autentikasi `scram-sha-256`.
- **`db/standby-entrypoint.sh`** menunggu kesiapan `db-primary:5432`, menarik snapshot awal menggunakan `pg_basebackup -Fp -Xs -P -R`, menyesuaikan kepemilikan direktori `PGDATA` (`0700`), lalu menjalankan PostgreSQL dalam mode `hot_standby=on`.

---

## 4. Strategi Backup Terverifikasi (`backup/backup.sh`)

Alur eksekusi di dalam `backup/backup.sh`:
1. Memeriksa ketersediaan `db-primary`, atau fallback ke `db-standby` bila primary tidak terjangkau.
2. Menjalankan `pg_dump -Fc -Z 6` ke file sementara `.dump.part`.
3. Memvalidasi struktur arsip dengan `pg_restore --list` sebelum dipromosikan menjadi file `.dump` (atomic rename).
4. Menghasilkan hash `sha256sum` ke file `.dump.sha256` untuk validasi integritas.
5. Menjaga retensi arsip lokal selama 24 jam (`-mmin +1440`) dan menyediakan metadata untuk endpoint `GET /api/backups` serta UI `backup.html` (`superadmin`).

---

## 5. Daftar Kontrol Security Hardening

1. **Non-Root Container (`api/Dockerfile`):** Membuat user sistem `appuser` (`addgroup`/`adduser`) dan menjalankan `uvicorn` tanpa hak akses `root`.
2. **Secret Management (`.env` dan `.env.example`):** Kredensial database dan `JWT_SECRET` dipisah dari `docker-compose.yml` serta dikecualikan dari Git melalui `.gitignore`.
3. **Isolasi Jaringan (`backend_net` `internal: true`):** Container `api-1`, `api-2`, `db-primary`, `db-standby`, dan `backup` ditempatkan pada jaringan internal yang terputus dari akses internet langsung; hanya `lb-1` dan `lb-2` yang terhubung ke `frontend_net`.
4. **Least Privilege Volume Mount:** Volume `./backups` di-mount sebagai **read-only (`:ro`)** pada `api-1` dan `api-2` sehingga kompromi pada layer API tidak dapat mengubah atau menghapus arsip backup.
5. **Capability dan Privilege Restriction:** Seluruh container menggunakan `security_opt: ["no-new-privileges:true"]`.
6. **Resource Limits dan Log Rotation:** Setiap service dibatasi alokasi CPU dan RAM (`deploy.resources.limits` / `cpus` dan `mem_limit`) serta menggunakan driver logging `json-file` dengan `max-size: "10m"` dan `max-file: "3"` untuk mencegah disk exhaustion.

---

## 6. Perintah Uji dan Bukti Screenshot untuk Laporan

Jalankan perintah berikut di PowerShell pada root proyek (`logistik-dr`) untuk membangun stack dan mengambil bukti uji:

```powershell
# 1. Bersihkan stack lama beserta volume agar init-primary dan pg_basebackup berjalan bersih
docker compose down -v --remove-orphans

# 2. Build dan jalankan seluruh 7 container
docker compose up -d --build

# 3. Verifikasi status dan healthcheck seluruh 7 container
docker compose ps

# 4. Uji Security Hardening: pastikan API berjalan sebagai non-root (appuser)
docker exec lacakin-api-1 whoami

# 5. Uji PostgreSQL WAL Streaming Replication pada Primary
docker exec lacakin-db-primary psql -U logistik -d logistik -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"

# 6. Uji Load Balancing dan header X-App-Node antara api-1 dan api-2
1..6 | ForEach-Object { (Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing).Headers["X-App-Node"] }

# 7. Cek log backup (pg_dump, pg_restore --list, dan sha256)
docker logs lacakin-backup --tail 30
```

### Checklist Bukti Gambar (Screenshot) Pertemuan 2:
1. Output `docker compose ps` (7 container status `Up (healthy)`).
2. Output `docker exec lacakin-api-1 whoami` (`appuser`) dan `pg_stat_replication` (`streaming`).
3. Output header `X-App-Node` bergantian antara `api-1` dan `api-2`.
4. Output `docker logs lacakin-backup` yang menunjukkan validasi `pg_restore --list` dan checksum `.sha256`.
5. Tampilan halaman **Backup dan DR** (`http://localhost:8000/backup.html`, login sebagai `superadmin`) yang menampilkan Node API aktif, status klaster DB (`primary` + `1 standby`), serta daftar arsip backup beserta SHA-256.
