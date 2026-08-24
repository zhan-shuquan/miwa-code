$ErrorActionPreference = "Stop"
Write-Host "[AIONE] Node.js LTS setup helper" -ForegroundColor Cyan
$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if ($winget) {
  Write-Host "[AIONE] Installing Node.js LTS with Windows Package Manager..." -ForegroundColor Cyan
  & $winget.Source install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[AIONE] Node.js LTS installation command completed." -ForegroundColor Green
    exit 0
  }
}
Write-Host "[AIONE] Automatic setup was not available or did not complete." -ForegroundColor Yellow
Write-Host "[AIONE] Opening the official Node.js download page." -ForegroundColor Yellow
Start-Process "https://nodejs.org/en/download"
exit 1
