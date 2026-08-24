$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "apps\systems\aione\backend"

function Resolve-Exe([string]$name, [string[]]$fallbacks) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($candidate in $fallbacks) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  return $null
}

$nodeFallbacks = @(
  (Join-Path $env:ProgramFiles "nodejs\node.exe"),
  $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe" }),
  (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
)
$npmFallbacks = @(
  (Join-Path $env:ProgramFiles "nodejs\npm.cmd"),
  $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd" }),
  (Join-Path $env:LOCALAPPDATA "Programs\nodejs\npm.cmd")
)

$nodeExe = Resolve-Exe "node.exe" $nodeFallbacks
$npmCmd = Resolve-Exe "npm.cmd" $npmFallbacks
if (-not $nodeExe -or -not $npmCmd) {
  Write-Host "[AIONE] Node.js LTS / npm was not found." -ForegroundColor Red
  Write-Host "[AIONE] Run SETUP_NODE_LTS.cmd, then try again." -ForegroundColor Yellow
  exit 2
}
if (-not (Test-Path $backendDir)) {
  Write-Host "[AIONE] Backend folder was not found: $backendDir" -ForegroundColor Red
  exit 3
}

Set-Location $backendDir
$env:AIONE_AI_MODE = "preview"
$env:AIONE_ALLOW_PREVIEW_ACTOR = "true"
$env:PORT = "8080"

Write-Host "[AIONE] Node: $nodeExe" -ForegroundColor Cyan
& $nodeExe --version
& $npmCmd --version

if (-not (Test-Path (Join-Path $backendDir "node_modules\express\package.json"))) {
  Write-Host "[AIONE] First run: installing backend dependencies..." -ForegroundColor Cyan
  & $npmCmd install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[AIONE] npm install failed. Check network / npm access." -ForegroundColor Red
    exit 4
  }
}

Write-Host "[AIONE] Starting MIWA AI Preview Backend on http://127.0.0.1:8080" -ForegroundColor Green
& $npmCmd start
$rc = $LASTEXITCODE
if ($rc -ne 0) {
  Write-Host "[AIONE] Backend exited with code $rc." -ForegroundColor Red
}
exit $rc
