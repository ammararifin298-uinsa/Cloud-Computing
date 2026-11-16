$ErrorActionPreference = "Stop"

function NowIso { return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff") }

Write-Host "=== PERSIAPAN DATA & SNAPSHOT BERSIH ==="
$seed = @(
    @{ shipment_code = "DR-RESI-001"; status = "DITERIMA"; location = "Hub Jakarta Pusat" },
    @{ shipment_code = "DR-RESI-002"; status = "DALAM_PERJALANAN"; location = "Tol Cipali KM 102" },
    @{ shipment_code = "DR-RESI-003"; status = "DIKIRIM"; location = "Hub Surabaya Barat" }
)
foreach ($item in $seed) {
    $json = $item | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "http://localhost:8000/api/events" -Method Post -ContentType "application/json" -Body $json
    Write-Host "[$(NowIso)] Seeded $($item.shipment_code) -> status $($item.status)"
}

$snapTs = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$snapFile = "/backups/logistik_${snapTs}.dump"
docker exec lacakin-backup sh -c "pg_dump -h db-primary -U logistik -Fc -Z 6 logistik > $snapFile && pg_restore --list $snapFile >/dev/null && sha256sum $snapFile > ${snapFile}.sha256"
Write-Host "[$(NowIso)] Verified snapshot created: $snapFile"

$beforeDb = docker exec lacakin-db-primary psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ',' || (SELECT COUNT(*) FROM tracking_events) FROM shipments;"
$beforeStandby = docker exec lacakin-db-standby psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ',' || (SELECT COUNT(*) FROM tracking_events) FROM shipments;"
Write-Host "[$(NowIso)] Before DR - Primary (shipments,events)=$beforeDb | Standby=$beforeStandby"

Write-Host "`n=== SKENARIO 1 (D1): CONTAINER API-1 MATI / FAILOVER KE API-2 ==="
$t0 = Get-Date
Write-Host "[$(NowIso)] [D1] Stopping lacakin-api-1..."
docker stop lacakin-api-1 | Out-Null
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$healthD1 = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
$dashD1 = Invoke-RestMethod -Uri "http://localhost:8000/api/dashboard" -Method Get
$sw.Stop()
Write-Host "[$(NowIso)] [D1] Failover via lacakin-api-2 OK in $($sw.ElapsedMilliseconds) ms | /health=$($healthD1 | ConvertTo-Json -Compress)"
docker start lacakin-api-1 | Out-Null
$t1 = Get-Date
Write-Host "[$(NowIso)] [D1] lacakin-api-1 restarted. Total recovery: $([math]::Round(($t1 - $t0).TotalSeconds, 2)) s"

Write-Host "`n=== SKENARIO 2 (D4): HUMAN ERROR (HAPUS DATA MASSAL) & RESTORE ==="
$t0 = Get-Date
Write-Host "[$(NowIso)] [D4] T0 - Simulating accidental mass DELETE..."
docker exec lacakin-db-primary psql -U logistik -d logistik -c "DELETE FROM tracking_events; DELETE FROM shipments;"
$duringDb = docker exec lacakin-db-primary psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ',' || (SELECT COUNT(*) FROM tracking_events) FROM shipments;"
$duringApi = (Invoke-RestMethod -Uri "http://localhost:8000/api/shipments" -Method Get).Count
Write-Host "[$(NowIso)] [D4] During incident - Primary (shipments,events)=$duringDb | API /api/shipments count=$duringApi"

Write-Host "[$(NowIso)] [D4] Running /restore.sh $snapFile..."
docker exec lacakin-backup /restore.sh $snapFile
$t1 = Get-Date
$afterDb = docker exec lacakin-db-primary psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ',' || (SELECT COUNT(*) FROM tracking_events) FROM shipments;"
$afterStandby = docker exec lacakin-db-standby psql -U logistik -d logistik -t -A -c "SELECT COUNT(*) || ',' || (SELECT COUNT(*) FROM tracking_events) FROM shipments;"
$afterApi = (Invoke-RestMethod -Uri "http://localhost:8000/api/shipments" -Method Get).Count
$rtoD4 = [math]::Round(($t1 - $t0).TotalSeconds, 2)
Write-Host "[$(NowIso)] [D4] T1 - Restored! Primary=$afterDb | Standby=$afterStandby | API /api/shipments count=$afterApi | RTO=$rtoD4 s"

Write-Host "`n=== SKENARIO 3 (D2): CONTAINER DB-PRIMARY MATI & PEMULIHAN ==="
$t0 = Get-Date
Write-Host "[$(NowIso)] [D2] T0 - Stopping lacakin-db-primary..."
docker stop lacakin-db-primary | Out-Null
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "[$(NowIso)] [D2] During outage /health HTTP $($r.StatusCode): $($r.Content)"
} catch {
    $resp = $_.Exception.Response
    $code = if ($resp) { [int]$resp.StatusCode } else { "ERR" }
    Write-Host "[$(NowIso)] [D2] During outage /health HTTP $code (DB unavailable as expected)"
}
$standbyAlive = docker exec lacakin-db-standby pg_isready -U logistik -d logistik
Write-Host "[$(NowIso)] [D2] Standby status during outage: $standbyAlive"

Write-Host "[$(NowIso)] [D2] Restarting lacakin-db-primary..."
docker start lacakin-db-primary | Out-Null
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $h = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
        if ($h.status -eq "ok") { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
$t1 = Get-Date
$rtoD2 = [math]::Round(($t1 - $t0).TotalSeconds, 2)
$repl = docker exec lacakin-db-primary psql -U logistik -d logistik -t -A -c "SELECT client_addr || ':' || state || ':' || sync_state FROM pg_stat_replication;"
Write-Host "[$(NowIso)] [D2] T1 - Primary recovered & /health ok=$ready | Replication=$repl | RTO=$rtoD2 s"

