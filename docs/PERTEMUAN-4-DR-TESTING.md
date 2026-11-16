# Laporan Pertemuan 4 — Eksekusi dan Pengujian Disaster Recovery (DR)

Dokumen ini berisi bukti implementasi otomatisasi backup, skrip pemulihan (`restore`), serta **Laporan Insiden Disaster Recovery (DR)** dari pengujian skenario bencana nyata terhadap arsitektur High Availability **LacakIn** (`logistik-dr`).

---

## 1. Otomatisasi Backup dan Pemulihan Database

### A. Skrip Backup Berkala (`backup/backup.sh`)
Container `lacakin-backup` menjalankan `backup/backup.sh` secara otomatis setiap **900 detik (15 menit)** untuk menjaga **RPO maksimal 15 menit**:
- Mengambil snapshot terkompresi (`pg_dump -Fc -Z 6`) dari `db-primary` (atau `db-standby` jika primary tidak tersedia).
- Memvalidasi integritas arsip dengan `pg_restore --list` sebelum menyimpan file `.dump` final.
- Menghasilkan checksum `sha256sum` (`.dump.sha256`) dan melakukan retensi lokal otomatis 24 jam (`-mmin +1440`).

Contoh log eksekusi otomatis `lacakin-backup` yang teramati:
```text
[backup] started: interval=900s, db=logistik
[backup] dumping from db-primary at 20261115T223500Z...
[backup] OK dan verified: /backups/logistik_20261115T223500Z.dump (16.0K) from db-primary
[backup] dumping from db-primary at 20261115T225000Z...
[backup] OK dan verified: /backups/logistik_20261115T225000Z.dump (24.0K) from db-primary
[backup] dumping from db-primary at 20261115T230500Z...
[backup] OK dan verified: /backups/logistik_20261115T230500Z.dump (24.0K) from db-primary
[backup] dumping from db-primary at 20261115T232000Z...
[backup] OK dan verified: /backups/logistik_20261115T232000Z.dump (52.0K) from db-primary
[backup] dumping from db-primary at 20261115T233501Z...
[backup] OK dan verified: /backups/logistik_20261115T233501Z.dump (228.0K) from db-primary
```

### B. Skrip Pemulihan Terstandar (`backup/restore.sh`)
Untuk mempercepat proses pemulihan saat bencana, disediakan `backup/restore.sh` di dalam container `lacakin-backup`:
1. Memilih file `.dump` target (atau arsip terbaru secara otomatis).
2. Memverifikasi checksum `sha256sum -c` dan struktur arsip dengan `pg_restore --list`.
3. Menunggu `db-primary` siap (`pg_isready`), lalu menjalankan `pg_restore --clean --if-exists --no-owner --no-privileges`.

---

## 2. Pengujian Skenario Bencana Nyata (`backup/dr-test.ps1`)

Sebelum pengujian dimulai, dibuat 3 data resi uji (`DR-RESI-001`, `DR-RESI-002`, `DR-RESI-003`) dan snapshot terverifikasi `/backups/logistik_20261115T235052Z.dump`. Kondisi awal tercatat **Primary `(3 shipments, 3 events)`** dan **Standby `(3 shipments, 3 events)`**.

### Skenario 1 (D1): Kegagalan Node Aplikasi (`lacakin-api-1` Mati)
- **T0 (`06:50:53.860`):** Container `lacakin-api-1` dihentikan paksa (`docker stop lacakin-api-1`).
- **Dampak dan Failover (`06:50:57.735`):** Load balancer Nginx `lacakin-lb-1` otomatis mengalihkan request ke `lacakin-api-2`. Endpoint `/health` merespons `{"status":"ok","database":"up"}` dan `/api/dashboard` tetap normal dalam **3.018 ms**.
- **Pemulihan (`06:50:58.035`):** `lacakin-api-1` dinyalakan kembali (`docker start lacakin-api-1`); total waktu pemulihan penuh **4,18 detik** tanpa kehilangan data (**RPO = 0 detik**).

### Skenario 2 (D4): Human Error (Penghapusan Data Massal) dan Restore Snapshot
- **T0 (`06:50:58.072`):** Simulasi kesalahan manusia dengan menjalankan `DELETE FROM tracking_events; DELETE FROM shipments;` pada `lacakin-db-primary` (`DELETE 3`, `DELETE 3`).
- **Bukti Insiden (`06:50:58.446`):** Database primary menjadi kosong `(0, 0)` dan endpoint `GET /api/shipments` mengembalikan `0` data.
- **Proses Restore (`06:50:58.450`):** Menjalankan `docker exec lacakin-backup /restore.sh /backups/logistik_20261115T235052Z.dump`:
  ```text
  [restore] Verifying SHA-256 checksum (/backups/logistik_20261115T235052Z.dump.sha256)...
  /backups/logistik_20261115T235052Z.dump: OK
  [restore] Validating archive structure with pg_restore --list...
  [restore] Waiting for db-primary to accept connections...
  [restore] Restoring /backups/logistik_20261115T235052Z.dump into logistik on db-primary...
  [restore] Completed successfully from /backups/logistik_20261115T235052Z.dump
  ```
- **T1 (`06:50:59.603`):** Data pada Primary `(3, 3)`, Standby `(3, 3)`, dan API `GET /api/shipments` kembali menjadi `3` resi secara utuh. **RTO aktual = 0,99 detik**.

### Skenario 3 (D2): Kegagalan Container Database Primary (`lacakin-db-primary` Mati)
- **T0 (`06:50:59.607`):** Container `lacakin-db-primary` dihentikan paksa (`docker stop lacakin-db-primary`).
- **Bukti Insiden (`06:51:03.256`):** Endpoint `/health` mengembalikan **HTTP 502** karena database primary tidak tersedia, sementara `lacakin-db-standby` tetap aktif (`accepting connections`).
- **T1 (`06:51:03.444` sampai `06:51:04.985`):** `lacakin-db-primary` dinyalakan kembali dan `/health` kembali `ok=True` dalam **RTO aktual = 5,14 detik**. Replikasi WAL ke `lacakin-db-standby` terverifikasi kembali aktif (`state: streaming, sync_state: async`).

---

## 3. Validasi Target DRP (RTO dan RPO)

| Skenario Uji | Kode DRP | Target RTO | RTO Aktual | Target RPO | RPO Aktual | Status |
|---|---|---|---|---|---|---|
| `api-1` mati dan failover ke `api-2` | **D1** | <= 15 menit (< 5 detik) | **3,02 detik** (failover) / **4,18 detik** (full node) | 0 detik | **0 detik** | **Tercapai** |
| Penghapusan data massal dan `pg_restore` | **D4** | <= 15 menit (< 2 menit) | **0,99 detik** | <= 15 menit | **0 data hilang** (snapshot terbaru; jadwal 15 menit) | **Tercapai** |
| `db-primary` mati dan pemulihan layanan | **D2** | <= 15 menit (< 2 menit) | **5,14 detik** | ~0 detik (WAL standby) | **0 data hilang** | **Tercapai** |

---

## 4. Validasi Kondisi Akhir Sistem

Setelah seluruh skenario selesai dijalankan:
- Seluruh 7 container (`lacakin-lb-1`, `lacakin-lb-2`, `lacakin-api-1`, `lacakin-api-2`, `lacakin-db-primary`, `lacakin-db-standby`, `lacakin-backup`) berstatus `Up (healthy)`.
- Replikasi streaming PostgreSQL dari `lacakin-db-primary` ke `lacakin-db-standby` (`172.25.0.6`) kembali berstatus `streaming` (`async`).
- Untuk menjalankan ulang simulasi secara otomatis kapan saja, gunakan perintah: `.\backup\dr-test.ps1`.

