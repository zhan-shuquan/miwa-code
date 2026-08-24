$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080"
$deadline = (Get-Date).AddSeconds(300)
$status = $null

Write-Host "[AIONE] Waiting for MIWA AI Backend..." -ForegroundColor Cyan
while ((Get-Date) -lt $deadline) {
  try {
    $status = Invoke-RestMethod -Uri "$base/api/v1/ai-secretary/status" -Method Get -TimeoutSec 3
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}

if ($null -eq $status) {
  Write-Host "[FAIL] Backend did not become ready within 300 seconds." -ForegroundColor Red
  Write-Host "Check the Backend window. Typical causes: Node/npm missing, npm install failed, or port 8080 is busy." -ForegroundColor Yellow
  exit 2
}

Write-Host ("[PASS] STATUS  mode={0} provider={1} writePolicy={2}" -f $status.mode, $status.provider, $status.writePolicy) -ForegroundColor Green

$headers = @{
  "x-aione-person-id" = "86000"
  "x-aione-source-system" = "aione-runtime-verifier"
  "Content-Type" = "application/json"
}

$context = @{
  currentTime = (Get-Date).ToString("o")
  user = @{
    personId = "86000"
    displayName = "MIWA AI local preview"
    primaryWorkIdentity = "management"
    positionGrade = "P9"
  }
  office = @{ code = "chairman"; name = "chairman-ai-office" }
  page = @{ routeId = "selection"; title = "selection-workbench"; hash = "#/selection" }
  work = @{ tasks = @(); suggestions = @() }
  calendar = @{ events = @() }
  notifications = @()
}

$objective = '"\u521b\u5efa\u5de5\u4f5c\uff1a\u7f8e\u548cAI\u6267\u884c\u94fe\u9a8c\u8bc1"' | ConvertFrom-Json
$executeBody = @{
  objective = $objective
  officeCode = "chairman"
  contextSnapshot = $context
} | ConvertTo-Json -Depth 12

try {
  $execute = Invoke-RestMethod -Uri "$base/api/v1/ai-secretary/execute" -Method Post -Headers $headers -Body $executeBody -ContentType "application/json" -TimeoutSec 20
} catch {
  Write-Host "[FAIL] EXECUTE request failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 3
}

if (-not $execute.executionId) {
  Write-Host "[FAIL] EXECUTE returned no executionId." -ForegroundColor Red
  exit 4
}
if (-not $execute.proposals -or $execute.proposals.Count -lt 1) {
  Write-Host "[FAIL] EXECUTE returned no human-confirmation proposal." -ForegroundColor Red
  Write-Host ($execute | ConvertTo-Json -Depth 8)
  exit 5
}
Write-Host ("[PASS] EXECUTE executionId={0} proposals={1}" -f $execute.executionId, $execute.proposals.Count) -ForegroundColor Green

$confirmBody = @{
  officeCode = "chairman"
  proposal = $execute.proposals[0]
  contextSnapshot = $context
} | ConvertTo-Json -Depth 12

try {
  $confirm = Invoke-RestMethod -Uri "$base/api/v1/ai-secretary/confirm" -Method Post -Headers $headers -Body $confirmBody -ContentType "application/json" -TimeoutSec 20
} catch {
  Write-Host "[FAIL] CONFIRM request failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 6
}

if (-not $confirm.message) {
  Write-Host "[FAIL] CONFIRM returned no confirmation message." -ForegroundColor Red
  exit 7
}

$writeResult = if ($confirm.persisted -eq $true) { "database persisted" } elseif ($confirm.previewLocalAction) { "preview local action" } else { "confirmed" }
Write-Host ("[PASS] CONFIRM {0}" -f $writeResult) -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "MIWA AI runtime chain verified." -ForegroundColor Green
Write-Host "STATUS -> EXECUTE -> HUMAN CONFIRM -> WRITE/PREVIEW ACTION" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "Return to AIONE and reopen MIWA AI." -ForegroundColor Cyan
exit 0
