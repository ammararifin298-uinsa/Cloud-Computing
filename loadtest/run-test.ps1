# Menjalankan k6 (via Docker, tidak perlu install) di jaringan compose.
#   .\loadtest\run-test.ps1 -Name baseline            # 1 replika, tanpa autoscaling
#   .\loadtest\run-test.ps1 -Name autoscale           # jalankan autoscaler.ps1 di terminal lain
#   .\loadtest\run-test.ps1 -Name smoke -Hold 10s -Ramp 5s   # uji cepat
param([string]$Name = 'baseline', [string]$Hold = '2m', [string]$Ramp = '20s')
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force loadtest/results | Out-Null
$net = (docker compose ps -q lb | ForEach-Object { docker inspect $_ --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' })
Write-Host "Network: $net | Test: $Name | Hold: $Hold"
docker run --rm -i --network $net `
  -v "${PWD}/loadtest:/work" -w /work `
  -e BASE_URL=http://lb -e HOLD=$Hold -e RAMP=$Ramp `
  -e K6_WEB_DASHBOARD=true -e K6_WEB_DASHBOARD_EXPORT="results/$Name-report.html" `
  grafana/k6:latest run `
  --out "csv=results/$Name-raw.csv" `
  --summary-export "results/$Name-summary.json" `
  stress.js
