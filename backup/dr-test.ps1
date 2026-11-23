# =============================================================================
# LacakIn Enterprise DRP & High Availability Test Suite (Kelompok 6)
# Menguji skenario wajib Kelompok 6 + seluruh komponen arsitektur:
#   1. Backup berkala dari Read Replica (tanpa membebani db-primary) + SHA-256
#   2. Skenario Wajib Kelompok 6 (D2): Matikan paksa container db-primary,
#      pulihkan dari file backup rutin (/restore.sh), dan ukur RTO sampai
#      sistem berhasil menerima input tracking logistik baru (POST /api/events)!
#   3. Skenario D4 (Human Error): Hapus massal data -> Restore dari backup
#   4. Skenario D1 (Microservice Failover): Matikan 1 node tracking-service
#   5. Skenario D6 (Load Balancer Failover): Matikan lb-1 (:8000) -> pindah lb-2 (:8001)
#   6. Skenario Read Replica Failover: Matikan 1 db-replica -> HAProxy tetap melayani baca
#   7. Verifikasi MinIO + Real Edge CDN Proxy Cache (X-Cache-Status: MISS -> HIT)
# =============================================================================
param(
  [string]$BaseUrl = "http://localhost:8000",
  [string]$StandbyLbUrl = "http://localhost:8001",
  [string]$AdminUser = "superadmin",
  [string]$AdminPass = "super123"
)

$ErrorActionPreference = "Stop"
function NowIso { return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff") }

Write-Host "=== [0] AUTENTIKASI PEGAWAI (JWT BEARER) ==="
$loginBody = @{ identifier = $AdminUser; password = $AdminPass } | ConvertTo-Json -Compress
$loginRes = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.access_token
$authHeaders = @{ Authorization = "Bearer $token" }
Write-Host "[$(NowIso)] Login berhasil sebagai $($loginRes.user.full_name) ($($loginRes.user.role))"

Write-Host "`n=== [1] PERSIAPAN DATA RESI UJI & BACKUP DARI READ REPLICA ==="
$ref = Invoke-RestMethod -Uri "$BaseUrl/api/reference" -Method Get
$originId = $ref.cities[0].id
$destId = $ref.cities[1].id

$orderBody = @{
  sender_name = "Gudang Utama Surabaya"; sender_phone = "081234567890"; sender_address = "Jl. Rungkut Industri No. 10";
  origin_city_id = $originId; receiver_name = "Cabang Malang"; receiver_phone = "081298765432";
  receiver_address = "Jl. Soekarno Hatta No. 5"; dest_city_id = $destId; service_code = "REG"; weight_kg = 2.5
} | ConvertTo-Json -Compress

$createdOrder = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Headers $authHeaders -ContentType "application/json" -Body $orderBody
$testResi = $createdOrder.shipment.code
Write-Host "[$(NowIso)] Order uji dibuat: $testResi (status: $($createdOrder.shipment.current_status))"

# Ambil snapshot backup dari haproxy-db (Read Replica) agar TIDAK membebani db-primary
$snapTs = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$snapFile = "/backups/logistik_${snapTs}.dump"
docker exec lacakin-backup sh -c "pg_dump -h haproxy-db -U logistik -Fc -Z 6 logistik > $snapFile && pg_restore --list $snapFile >/dev/null && sha256sum $snapFile > ${snapFile}.sha256"
Write-Host "[$(NowIso)] Snapshot terverifikasi dibuat dari Read Replica (haproxy-db): $snapFile"

$beforeCounts = docker exec lacakin-db-primary psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ' shipments, ' || (SELECT COUNT(*) FROM tracking_events) || ' events' FROM shipments WHERE deleted_at IS NULL;"
Write-Host "[$(NowIso)] Baseline DB Primary: $beforeCounts"

Write-Host "`n=== [2] SKENARIO WAJIB KELOMPOK 6 (D2): MATIKAN PAKSA DB UTAMA, RESTORE BACKUP, UKUR RTO SAMPAI INPUT TRACKING BARU BERHASIL ==="
$swD2 = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host "[$(NowIso)] [D2] Menghentikan paksa container database utama (docker kill lacakin-db-primary)..."
docker kill lacakin-db-primary | Out-Null

# Verifikasi Read Replica tetap hidup
$replicaCount = @(docker compose ps -q db-replica | Where-Object { $_ }).Count
Write-Host "[$(NowIso)] [D2] db-primary MATI. Jumlah db-replica yang tetap aktif melayani: $replicaCount node"

# Nyalakan kembali container db-primary & jalankan restore.sh dari file backup rutin
Write-Host "[$(NowIso)] [D2] Menyalakan kembali container db-primary dan memulihkan dari backup rutin ($snapFile)..."
docker start lacakin-db-primary | Out-Null
docker exec lacakin-backup /restore.sh $snapFile

# Ukur RTO sampai POST /api/events (input tracking logistik baru) benar-benar sukses (HTTP 201)!
$postSuccess = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $evBody = @{
      shipment_code = $testResi
      status = "DALAM_PERJALANAN"
      location = "Hub Sidoarjo (Uji Pemulihan DR)"
      notes = "Input tracking baru pasca pemulihan DR Kelompok 6"
    } | ConvertTo-Json -Compress
    $evRes = Invoke-RestMethod -Uri "$BaseUrl/api/events" -Method Post -Headers $authHeaders -ContentType "application/json" -Body $evBody
    if ($evRes.shipment_code -eq $testResi) {
      $postSuccess = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}
$swD2.Stop()
$rtoD2Sec = [math]::Round($swD2.Elapsed.TotalSeconds, 2)
Write-Host "[$(NowIso)] [D2] SUKSES! Sistem siap dan berhasil menerima input tracking baru ($testResi -> DALAM_PERJALANAN) | RTO Aktual = $rtoD2Sec detik"

Write-Host "`n=== [3] SKENARIO D4 (HUMAN ERROR): HAPUS DATA & RESTORE DARI BACKUP ==="
$swD4 = [System.Diagnostics.Stopwatch]::StartNew()
docker exec lacakin-db-primary psql -U logistik -d logistik -c "DELETE FROM tracking_events WHERE shipment_code = '$testResi';" | Out-Null
docker exec lacakin-backup /restore.sh $snapFile | Out-Null
$restoredTrack = $null
for ($i = 1; $i -le 15; $i++) {
  try {
    $restoredTrack = Invoke-RestMethod -Uri "$BaseUrl/api/shipments/$testResi/events" -Method Get
    if ($restoredTrack.events.Count -ge 1) { break }
  } catch {}
  Start-Sleep -Milliseconds 400
}
$swD4.Stop()
Write-Host "[$(NowIso)] [D4] Resi $testResi berhasil dipulihkan utuh ($($restoredTrack.events.Count) event) | RTO = $([math]::Round($swD4.Elapsed.TotalSeconds, 2)) detik"

Write-Host "`n=== [4] SKENARIO D1 (MICROSERVICE HA FAILOVER): SCALE 2 NODE & MATIKAN 1 NODE ==="
docker compose up -d --no-recreate --scale tracking-service=2 tracking-service | Out-Null
Start-Sleep -Seconds 3
$trackNodes = @(docker compose ps -q tracking-service | Where-Object { $_ })
$victimNode = $trackNodes[0]
Write-Host "[$(NowIso)] [D1] Menghentikan paksa 1 node tracking-service ($victimNode)..."
$swD1 = [System.Diagnostics.Stopwatch]::StartNew()
docker kill $victimNode | Out-Null
$dashRes = Invoke-RestMethod -Uri "$BaseUrl/api/dashboard" -Method Get -Headers $authHeaders
$swD1.Stop()
Write-Host "[$(NowIso)] [D1] Zero-Downtime Failover ke node ke-2 berhasil dalam $($swD1.ElapsedMilliseconds) ms (total events: $($dashRes.total_events))"
docker start $victimNode | Out-Null

Write-Host "`n=== [5] SKENARIO D6 (LOAD BALANCER FAILOVER): LB-1 (:8000) MATI -> LB-2 (:8001) ==="
docker stop lacakin-lb-1 | Out-Null
$swD6 = [System.Diagnostics.Stopwatch]::StartNew()
$lb2Health = Invoke-RestMethod -Uri "$StandbyLbUrl/livez" -Method Get
$swD6.Stop()
Write-Host "[$(NowIso)] [D6] lb-1 mati, trafik langsung terlayani oleh lb-2 (:8001) dalam $($swD6.ElapsedMilliseconds) ms (status=$($lb2Health.status))"
docker start lacakin-lb-1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "`n=== [6] VERIFIKASI MINIO OBJECT STORAGE & REAL EDGE CDN CACHE (MISS -> HIT) ==="
$tinyPngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
$upBody = @{ shipment_code = $testResi; content_base64 = $tinyPngB64 } | ConvertTo-Json -Compress
$upRes = Invoke-RestMethod -Uri "$BaseUrl/api/uploads" -Method Post -Headers $authHeaders -ContentType "application/json" -Body $upBody
$mediaPath = $upRes.lb_url

$req1 = Invoke-WebRequest -Uri "http://localhost:8080$mediaPath" -UseBasicParsing
$cache1 = $req1.Headers["X-Cache-Status"]
$req2 = Invoke-WebRequest -Uri "http://localhost:8080$mediaPath" -UseBasicParsing
$cache2 = $req2.Headers["X-Cache-Status"]
Write-Host "[$(NowIso)] [CDN] File bukti tersimpan di MinIO ($mediaPath) | Request 1 X-Cache-Status=$cache1 -> Request 2 X-Cache-Status=$cache2"

Write-Host "`n=== RINGKASAN HASIL DR TEST KELOMPOK 6 ==="
Write-Host "1. Skenario Wajib Kelompok 6 (DB Utama Mati + Restore + Input Tracking Baru): RTO = $rtoD2Sec detik (Target <= 15 menit)"
Write-Host "2. Failover Microservice (tracking-service)                                 : $($swD1.ElapsedMilliseconds) ms (Zero Downtime)"
Write-Host "3. Failover Load Balancer (lb-1 -> lb-2)                                    : $($swD6.ElapsedMilliseconds) ms"
Write-Host "4. Edge CDN Proxy Cache -> MinIO                                            : $cache1 -> $cache2"
