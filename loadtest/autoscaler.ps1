# Autoscaler sederhana untuk arsitektur HA Docker Compose (api-1 dan api-2).
# Setiap INTERVAL detik: ukur rata-rata CPU node API yang aktif, lalu aktifkan/matikan api-2.
#   CPU rata-rata > UpCpu   -> aktifkan api-2 (scale up 1 -> 2)
#   CPU rata-rata < DownCpu selama DownCycles siklus berturut-turut -> matikan api-2 (scale down 2 -> 1)
# Log: loadtest/results/autoscale.csv  (timestamp,replicas,avg_cpu,action)
param(
  [double]$UpCpu = 70, [double]$DownCpu = 20,
  [int]$Interval = 5, [int]$DownCycles = 6
)
$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force loadtest/results | Out-Null
$log = 'loadtest/results/autoscale.csv'
'timestamp,replicas,avg_cpu,action' | Set-Content $log
$low = 0
Write-Host "Autoscaler HA aktif (api-1 -> api-2, up>$UpCpu% down<$DownCpu%). Ctrl+C untuk berhenti."

while ($true) {
  $ids = @(docker compose ps -q api-1 api-2 2>$null | Where-Object { $_ })
  $n = $ids.Count
  if ($n -eq 0) { Start-Sleep $Interval; continue }
  $cpus = @(docker stats --no-stream --format '{{.CPUPerc}}' $ids 2>$null |
            ForEach-Object { [double]($_ -replace '%','') })
  if ($cpus.Count -eq 0) { Start-Sleep $Interval; continue }
  $avg = [math]::Round(($cpus | Measure-Object -Average).Average, 1)
  $action = 'hold'

  if ($avg -gt $UpCpu -and $n -lt 2) {
    docker compose start api-2 2>&1 | Out-Null
    $action = "scale_up 1->2"; $low = 0
  } elseif ($avg -lt $DownCpu -and $n -gt 1) {
    $low++
    if ($low -ge $DownCycles) {
      docker compose stop api-2 2>&1 | Out-Null
      $action = "scale_down 2->1"; $low = 0
    }
  } else { $low = 0 }

  $ts = Get-Date -Format 'HH:mm:ss'
  "$ts,$n,$avg,$action" | Add-Content $log
  Write-Host "[$ts] active_nodes=$n avg_cpu=$avg% -> $action"
  Start-Sleep $Interval
}
