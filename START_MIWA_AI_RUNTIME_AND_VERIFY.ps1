$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = "http://127.0.0.1:8080"
$statusUri = "$base/api/v1/ai-secretary/status"
$backendScript = Join-Path $root "START_AI_SECRETARY_PREVIEW.ps1"
$verifyScript = Join-Path $root "VERIFY_MIWA_AI_RUNTIME.ps1"

Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "AIONE MIWA AI Runtime Start + Verification" -ForegroundColor Green
Write-Host "STATUS -> EXECUTE -> HUMAN CONFIRM -> WRITE/PREVIEW" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor DarkGreen

$running = $false
try {
  $null = Invoke-RestMethod -Uri $statusUri -Method Get -TimeoutSec 2
  $running = $true
} catch {
  $running = $false
}

if (-not $running) {
  Write-Host "[AIONE] Backend is not running. Starting it in a new PowerShell window..." -ForegroundColor Cyan
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $backendScript + '"'))
  Start-Process -FilePath "powershell.exe" -ArgumentList $args -WorkingDirectory $root | Out-Null
} else {
  Write-Host "[AIONE] Backend is already running on $base" -ForegroundColor Green
}

Write-Host "[AIONE] Running end-to-end verification..." -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript
$rc = $LASTEXITCODE
if ($rc -eq 0) {
  Write-Host "[AIONE] Verification passed. Keep the Backend window open while using MIWA AI." -ForegroundColor Green
} else {
  Write-Host "[AIONE] Verification failed with code $rc." -ForegroundColor Red
  Write-Host "[AIONE] Keep the Backend window open and send its last error lines for diagnosis." -ForegroundColor Yellow
}
exit $rc
