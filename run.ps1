# ==========================================================
# SKRIP KONTROL PROYEK LOGISTIK-DR (KELOMPOK 6)
# ==========================================================

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     SISTEM KONTROL CLOUD COMPUTING (LOGISTIKPRO)         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. Nyalakan Semua Sistem (App + DB + Backup + Cloud Vault)"
Write-Host "2. Jalankan Uji Otomatis Disaster Recovery (D1, D2 & Cloud)"
Write-Host "3. Buka Halaman Backup & Cloud Vault (:8000/backup & :9000)"
Write-Host "4. Sinkronisasi Backup ke Google Drive (via rclone)"
Write-Host "5. Uji Cepat k6 (Smoke Test ~1 Menit)"
Write-Host "6. Jalankan Pengawas Auto-Scaler (CPU Trigger > 70%)"
Write-Host "7. Jalankan Stress Test Penuh 1.000 VU k6 (10 Menit)"
Write-Host "8. Buka Dashboard Hasil Stress Test (loadtest/results/index.html)"
Write-Host "9. Bersihkan Data Uji Dummy (LOAD-*) dari Database"
Write-Host "10. Matikan Seluruh Sistem (docker compose down)"
Write-Host "0. Keluar"
Write-Host "==========================================================" -ForegroundColor Cyan

$pilihan = Read-Host "Pilih menu [0-10]"

switch ($pilihan) {
    "1" {
        Write-Host "`nMenyalakan seluruh container (termasuk Cloud Backup Vault)..." -ForegroundColor Yellow
        docker compose up -d --build
        docker compose ps
        Write-Host "`nMembuka aplikasi utama & halaman Backup..." -ForegroundColor Green
        Start-Process "http://localhost:8000"
        Start-Process "http://localhost:8000/backup"
        Start-Process "http://localhost:9000"
    }
    "2" {
        Write-Host "`nMenjalankan Simulasi & Pengukuran Disaster Recovery Otomatis..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\backup\dr-test.ps1
    }
    "3" {
        Write-Host "`nMembuka Pusat Kendali Backup & Cloud Vault..." -ForegroundColor Green
        Start-Process "http://localhost:8000/backup"
        Start-Process "http://localhost:9000"
    }
    "4" {
        Write-Host "`nMenjalankan Sinkronisasi Google Drive..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\backup\sync-gdrive.ps1 -Action sync
    }
    "5" {
        Write-Host "`nMenjalankan Smoke Test k6..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\run-test.ps1 -Name demo-smoke -Hold 10s -Ramp 5s
    }
    "6" {
        Write-Host "`nMenjalankan Auto Scaler (Pantau CPU)..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\autoscaler.ps1
    }
    "7" {
        Write-Host "`nMenjalankan Stress Test 1.000 VU (k6)..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\run-test.ps1 -Name autoscale
    }
    "8" {
        Write-Host "`nMembuka Dashboard Hasil Laporan Stress Test..." -ForegroundColor Green
        Start-Process ".\loadtest\results\index.html"
    }
    "9" {
        Write-Host "`nMembersihkan data uji dummy dari database..." -ForegroundColor Yellow
        docker exec warehouse-db psql -U logistik -c "DELETE FROM tracking_events WHERE shipment_code LIKE 'LOAD-%'; DELETE FROM shipments WHERE code LIKE 'LOAD-%';"
        docker compose up -d --scale api=1
        Write-Host "Data uji berhasil dibersihkan!" -ForegroundColor Green
    }
    "10" {
        Write-Host "`nMematikan seluruh kontainer..." -ForegroundColor Red
        docker compose down
        Write-Host "Semua sistem telah dimatikan." -ForegroundColor Green
    }
    Default {
        Write-Host "`nKeluar." -ForegroundColor Gray
    }
}

