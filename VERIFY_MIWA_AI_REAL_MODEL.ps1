$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080"
Write-Host "[AIONE] Checking real model runtime..." -ForegroundColor Cyan
try {
  $status = Invoke-RestMethod -Uri "$base/api/v1/ai-secretary/status" -Method Get -TimeoutSec 5
} catch {
  Write-Host "[FAIL] Backend is not reachable on port 8080." -ForegroundColor Red
  exit 2
}
if ($status.mode -ne "openai" -or $status.provider -ne "openai") {
  Write-Host ("[FAIL] Backend is not in real model mode. mode={0} provider={1} fallback={2}" -f $status.mode,$status.provider,$status.fallbackReason) -ForegroundColor Red
  Write-Host "Run START_MIWA_AI_REAL_MODEL.cmd after closing the Preview Backend." -ForegroundColor Yellow
  exit 3
}
Write-Host ("[PASS] REAL MODEL STATUS  provider={0} model={1}" -f $status.provider,$status.model) -ForegroundColor Green
Write-Host "Return to AIONE and ask the same selection-workbench analysis question." -ForegroundColor Cyan
exit 0
