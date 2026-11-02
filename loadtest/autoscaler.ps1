# Autoscaler sederhana untuk Docker Compose (Compose tidak punya autoscaling bawaan).
# Setiap INTERVAL detik: ukur rata-rata CPU semua replika `api`, lalu scale up/down.
#   CPU rata-rata > UpCpu   -> tambah replika (maks Max)
#   CPU rata-rata < DownCpu selama DownCycles siklus berturut-turut -> kurangi (min Min)
# Log: loadtest/results/autoscale.csv  (timestamp,replicas,avg_cpu,action)
param(
  [int]$Min = 1, [int]$Max = 5,
  [double]$UpCpu = 70, [double]$DownCpu = 20,
  [int]$Interval = 5, [int]$DownCycles = 6
)
$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force loadtest/results | Out-Null
$log = 'loadtest/results/autoscale.csv'
'timestamp,replicas,avg_cpu,action' | Set-Content $log
$low = 0
Write-Host "Autoscaler aktif (min=$Min max=$Max up>$UpCpu% down<$DownCpu%). Ctrl+C untuk berhenti."

while ($true) {
  $ids = @(docker compose ps -q api 2>$null | Where-Object { $_ })
  $n = $ids.Count
  if ($n -eq 0) { Start-Sleep $Interval; continue }
  $cpus = @(docker stats --no-stream --format '{{.CPUPerc}}' $ids 2>$null |
            ForEach-Object { [double]($_ -replace '%','') })
  if ($cpus.Count -eq 0) { Start-Sleep $Interval; continue }
  $avg = [math]::Round(($cpus | Measure-Object -Average).Average, 1)
  $action = 'hold'

  if ($avg -gt $UpCpu -and $n -lt $Max) {
    $new = [math]::Min($Max, $n + $(if ($avg -gt 150) { 2 } else { 1 }))
    docker compose up -d --no-recreate --no-deps --scale api=$new api 2>&1 | Out-Null
    $action = "scale_up $n->$new"; $low = 0
  } elseif ($avg -lt $DownCpu -and $n -gt $Min) {
    $low++
    if ($low -ge $DownCycles) {
      $new = $n - 1
      docker compose up -d --no-recreate --no-deps --scale api=$new api 2>&1 | Out-Null
      $action = "scale_down $n->$new"; $low = 0
    }
  } else { $low = 0 }

  $ts = Get-Date -Format 'HH:mm:ss'
  "$ts,$n,$avg,$action" | Add-Content $log
  Write-Host "[$ts] replicas=$n avg_cpu=$avg% -> $action"
  Start-Sleep $Interval
}
