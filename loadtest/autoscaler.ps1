# Autoscaler Horizontal Otomatis untuk:
#   1. Microservices Express.js (tracking-service, auth-service, media-service): 2..10 node
#   2. Database Read Replica (db-replica @ 256m, belakang HAProxy): 2..20 node
# Memantau CPU container tiap Interval detik via docker stats:
#   - Rata-rata CPU > UpCpu%   -> Scale Up (+1 node)
#   - Rata-rata CPU < DownCpu% selama DownCycles berturut-turut -> Scale Down (-1 node)
# Log CSV: loadtest/results/autoscale.csv
param(
  [int]$AppMin = 2,
  [int]$AppMax = 10,
  [int]$DbMin = 2,
  [int]$DbMax = 20,
  [double]$UpCpu = 65,
  [double]$DownCpu = 20,
  [int]$Interval = 5,
  [int]$DownCycles = 4
)

$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force loadtest/results | Out-Null
$log = 'loadtest/results/autoscale.csv'
'timestamp,service,replicas,avg_cpu,action' | Set-Content $log

$targets = @(
  @{ name = 'tracking-service'; min = $AppMin; max = $AppMax },
  @{ name = 'auth-service';     min = $AppMin; max = $AppMax },
  @{ name = 'media-service';    min = $AppMin; max = $AppMax },
  @{ name = 'db-replica';       min = $DbMin;  max = $DbMax  }
)

$lowCounters = @{}
foreach ($t in $targets) { $lowCounters[$t.name] = 0 }

Write-Host "=== LacakIn Full-Stack Autoscaler (App $AppMin..$AppMax | DB Replica $DbMin..$DbMax | Up>$UpCpu% | Down<$DownCpu%) ==="
Write-Host "Tekan Ctrl+C untuk berhenti."

while ($true) {
  foreach ($t in $targets) {
    $svc = $t.name
    $ids = @(docker compose ps -q $svc 2>$null | Where-Object { $_ })
    $n = $ids.Count
    if ($n -eq 0) { continue }

    $cpus = @(docker stats --no-stream --format '{{.CPUPerc}}' $ids 2>$null |
              ForEach-Object {
                $val = ($_ -replace '%', '').Trim()
                $num = 0.0
                if ([double]::TryParse($val, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$num)) { $num }
              })
    if ($cpus.Count -eq 0) { continue }

    $avg = [math]::Round(($cpus | Measure-Object -Average).Average, 1)
    $action = 'hold'

    if ($avg -gt $UpCpu -and $n -lt $t.max) {
      $next = [math]::Min($n + 1, $t.max)
      docker compose up -d --no-recreate --scale "${svc}=${next}" $svc 2>&1 | Out-Null
      $action = "scale_up ${n}->${next}"
      $lowCounters[$svc] = 0
    } elseif ($avg -lt $DownCpu -and $n -gt $t.min) {
      $lowCounters[$svc]++
      if ($lowCounters[$svc] -ge $DownCycles) {
        $next = [math]::Max($n - 1, $t.min)
        docker compose up -d --no-recreate --scale "${svc}=${next}" $svc 2>&1 | Out-Null
        $action = "scale_down ${n}->${next}"
        $lowCounters[$svc] = 0
      }
    } else {
      $lowCounters[$svc] = 0
    }

    $ts = Get-Date -Format 'HH:mm:ss'
    "$ts,$svc,$n,$avg,$action" | Add-Content $log
    Write-Host "[$ts] [$svc] nodes=$n avg_cpu=$avg% -> $action"
  }
  Start-Sleep $Interval
}
