# ==========================================================
# SKRIP KONTROL PROYEK LACAKIN (KELOMPOK 6 - CLOUD COMPUTING)
# ==========================================================

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SISTEM KONTROL CLOUD COMPUTING LACAKIN v2 (KELOMPOK 6) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. Nyalakan Semua Sistem (2 LB + 3 Microservices + PgBouncer + HAProxy + DB + MinIO + CDN + Backup + Autoheal)"
Write-Host "2. Scale Database Read Replica (contoh: 3, 19 [20 DB total], atau 29 [30 DB total])"
Write-Host "3. Jalankan Uji Otomatis Disaster Recovery Kelompok 6 (backup/dr-test.ps1)"
Write-Host "4. Jalankan Pengawas Auto-Scaler Microservices 1..10 Node (loadtest/autoscaler.ps1)"
Write-Host "5. Uji Stress Test k6 — Tracking Microservice (stress.js)"
Write-Host "6. Uji Stress Test k6 — Auth Microservice & Rate Limit 429 (auth-stress.js)"
Write-Host "7. Uji Stress Test k6 — Edge CDN & MinIO Proxy Cache (cdn-stress.js)"
Write-Host "8. Buka Aplikasi (:8000), Standby LB (:8001), CDN (:8080), & MinIO Console (:9001)"
Write-Host "9. Bersihkan Data Uji Dummy (LOAD-*) dari Database"
Write-Host "10. Matikan Seluruh Sistem (docker compose down)"
Write-Host "0. Keluar"
Write-Host "==========================================================" -ForegroundColor Cyan

$pilihan = Read-Host "Pilih menu [0-10]"

switch ($pilihan) {
    "1" {
        Write-Host "`nMembangun frontend React & menyalakan seluruh container..." -ForegroundColor Yellow
        npm --prefix frontend run build
        docker compose up -d --build
        docker compose ps
    }
    "2" {
        $n = Read-Host "Masukkan jumlah db-replica (contoh: 3, 19 untuk 20 DB total, 29 untuk 30 DB total)"
        if (-not $n) { $n = 3 }
        Write-Host "`nMenskalakan db-replica menjadi $n container..." -ForegroundColor Yellow
        docker compose up -d --no-recreate --scale "db-replica=$n" db-replica
        docker compose ps
    }
    "3" {
        Write-Host "`nMenjalankan Simulasi & Pengukuran Disaster Recovery Kelompok 6..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\backup\dr-test.ps1
    }
    "4" {
        Write-Host "`nMenjalankan Auto-Scaler Microservices (1..10 Node)..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\autoscaler.ps1
    }
    "5" {
        Write-Host "`nMenjalankan Stress Test k6 — Tracking Service..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\run-test.ps1 -Name tracking-stress -Script stress.js -Hold 10s -Ramp 5s
    }
    "6" {
        Write-Host "`nMenjalankan Stress Test k6 — Auth Service & Rate Limit 429..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\run-test.ps1 -Name auth-stress -Script auth-stress.js -Hold 10s -Ramp 5s
    }
    "7" {
        Write-Host "`nMenjalankan Stress Test k6 — Edge CDN & MinIO Cache..." -ForegroundColor Yellow
        powershell -ExecutionPolicy Bypass -File .\loadtest\run-test.ps1 -Name cdn-after -Script cdn-stress.js -Hold 10s -Ramp 5s
    }
    "8" {
        Write-Host "`nMembuka LacakIn (:8000), Standby LB (:8001), CDN (:8080), & MinIO (:9001)..." -ForegroundColor Green
        Start-Process "http://localhost:8000"
        Start-Process "http://localhost:8080/cdn-health"
        Start-Process "http://localhost:9001"
    }
    "9" {
        Write-Host "`nMembersihkan data uji dummy dari database..." -ForegroundColor Yellow
        docker exec lacakin-db-primary psql -U logistik -d logistik -c "DELETE FROM tracking_events WHERE shipment_code LIKE 'LOAD-%'; DELETE FROM shipments WHERE code LIKE 'LOAD-%';"
        docker compose up -d --no-recreate --scale tracking-service=1 tracking-service
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
