# Menjalankan k6 (via Docker, tidak perlu install) di jaringan compose.
#   .\loadtest\run-test.ps1 -Name baseline            # 1 node (api-2 di-stop dulu)
#   .\loadtest\run-test.ps1 -Name autoscale           # jalankan autoscaler.ps1 di terminal lain (atau dengan 2 node)
#   .\loadtest\run-test.ps1 -Name smoke -Hold 10s -Ramp 5s   # uji cepat
param(
  [string]$Name = 'baseline',
  [string]$Hold = '2m',
  [string]$Ramp = '20s',
  [string]$Script = 'stress.js'
)
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force loadtest/results | Out-Null

$net = docker inspect lacakin-lb-1 --format "{{range `$k, `$v := .NetworkSettings.Networks}}{{println `$k}}{{end}}" 2>$null |
  Where-Object { $_ -match 'frontend_net' } |
  Select-Object -First 1
if (-not $net) { $net = 'logistik-dr_frontend_net' }
$net = $net.Trim()

Write-Host "Network: $net | Test: $Name | Script: $Script | Hold: $Hold | Live Dashboard: http://localhost:5665"
docker run --rm -i --network $net -p 5665:5665 `
  -v "${PWD}/loadtest:/work" -w /work `
  -e BASE_URL=http://lacakin-lb-1 -e HOLD=$Hold -e RAMP=$Ramp `
  -e K6_WEB_DASHBOARD=true -e K6_WEB_DASHBOARD_HOST=0.0.0.0 -e K6_WEB_DASHBOARD_EXPORT="results/$Name-report.html" `
  grafana/k6:latest run `
  --out "csv=results/$Name-raw.csv" `
  --summary-export "results/$Name-summary.json" `
  $Script
