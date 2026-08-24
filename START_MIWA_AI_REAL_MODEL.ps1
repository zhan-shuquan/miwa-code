$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "apps\systems\aione\backend"
$base = "http://127.0.0.1:8080"

function Resolve-Exe([string]$name, [string[]]$fallbacks) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($candidate in $fallbacks) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  return $null
}

try {
  $running = Invoke-RestMethod -Uri "$base/api/v1/ai-secretary/status" -Method Get -TimeoutSec 2
  if ($running.mode -eq "openai") {
    try {
      $sourceRuntime = Invoke-RestMethod -Uri "$base/api/v1/integrations/1688/status" -Method Get -TimeoutSec 2
      if ($sourceRuntime.integration -eq "1688" -and $sourceRuntime.configured) {
        Write-Host ("[AIONE] Real model Backend is already running: {0} / {1}" -f $running.provider, $running.model) -ForegroundColor Green
        Write-Host "[AIONE] 1688 source API is also configured in that Backend process." -ForegroundColor Green
        Write-Host "[AIONE] Keep that Backend window open and return to AIONE." -ForegroundColor Cyan
        exit 0
      }
      Write-Host "[AIONE] A Backend is already running, but 1688 credentials are not loaded in that process." -ForegroundColor Yellow
      Write-Host "[AIONE] Close the existing Backend window, then run this V1.9.18 launcher again." -ForegroundColor Yellow
      exit 11
    } catch {
      Write-Host "[AIONE] An older Backend is already running without the V1.9.18 1688 bridge." -ForegroundColor Yellow
      Write-Host "[AIONE] Close the existing Backend window, then run this V1.9.18 launcher again." -ForegroundColor Yellow
      exit 11
    }
  }
  Write-Host "[AIONE] Port 8080 is already occupied by the Preview Backend." -ForegroundColor Yellow
  Write-Host "[AIONE] Close the existing Preview Backend window, then run this file again." -ForegroundColor Yellow
  exit 10
} catch { }

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

if (-not $env:OPENAI_API_KEY) {
  Write-Host ""
  Write-Host "[AIONE] Enter the OpenAI API key for this local Backend session." -ForegroundColor Cyan
  Write-Host "[AIONE] The key is hidden while typing and is NOT written into AIONE files." -ForegroundColor DarkGreen
  $secureKey = Read-Host "OPENAI_API_KEY" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if (-not $plainKey) {
      Write-Host "[AIONE] API key was empty." -ForegroundColor Red
      exit 4
    }
    $env:OPENAI_API_KEY = $plainKey
  } finally {
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $plainKey = $null
  }
}

# Optional 1688 Open Platform bridge for source-product auto-fill.
# Secrets are held only in this Backend process unless the operator pre-configured environment variables.
$alibaba1688Configured = $false
if (-not $env:ALIBABA_1688_APP_KEY) {
  Write-Host ""
  Write-Host "[AIONE] 1688 product-source API is optional for this session." -ForegroundColor Cyan
  Write-Host "[AIONE] Enter the 1688 AppKey to test automatic product reading, or press Enter to skip." -ForegroundColor DarkGreen
  $appKeyInput = Read-Host "ALIBABA_1688_APP_KEY"
  if ($appKeyInput) { $env:ALIBABA_1688_APP_KEY = $appKeyInput.Trim() }
}
if ($env:ALIBABA_1688_APP_KEY -and -not $env:ALIBABA_1688_APP_SECRET) {
  Write-Host "[AIONE] Enter the 1688 AppSecret. It is hidden and is NOT written into AIONE files." -ForegroundColor DarkGreen
  $secure1688Secret = Read-Host "ALIBABA_1688_APP_SECRET" -AsSecureString
  $ptr1688 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure1688Secret)
  try {
    $plain1688Secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr1688)
    if ($plain1688Secret) { $env:ALIBABA_1688_APP_SECRET = $plain1688Secret }
  } finally {
    if ($ptr1688 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr1688) }
    $plain1688Secret = $null
  }
}
if ($env:ALIBABA_1688_APP_KEY -and $env:ALIBABA_1688_APP_SECRET -and -not $env:ALIBABA_1688_ACCESS_TOKEN) {
  Write-Host "[AIONE] Enter the permanent 1688 Access Token from 开发指引 -> 授权配置 -> 已授权Token." -ForegroundColor DarkGreen
  Write-Host "[AIONE] It is hidden and is NOT written into AIONE files." -ForegroundColor DarkGreen
  $secure1688Token = Read-Host "ALIBABA_1688_ACCESS_TOKEN" -AsSecureString
  $ptr1688Token = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure1688Token)
  try {
    $plain1688Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr1688Token)
    if ($plain1688Token) { $env:ALIBABA_1688_ACCESS_TOKEN = $plain1688Token }
  } finally {
    if ($ptr1688Token -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr1688Token) }
    $plain1688Token = $null
  }
}
if ($env:ALIBABA_1688_APP_KEY -and $env:ALIBABA_1688_APP_SECRET -and $env:ALIBABA_1688_ACCESS_TOKEN) {
  $env:ALIBABA_1688_TOKEN_MODE = "static"
  $alibaba1688Configured = $true
}

$env:AIONE_AI_MODE = "live"
$env:AIONE_AI_PROVIDER = "openai"
if (-not $env:AIONE_AI_MODEL) { $env:AIONE_AI_MODEL = "gpt-5.6-sol" }
$env:AIONE_ALLOW_PREVIEW_ACTOR = "true"
$env:AIONE_ALLOW_LOCAL_WRITE_FALLBACK = "true"
$env:PORT = "8080"

Set-Location $backendDir
Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "AIONE MIWA AI - REAL MODEL BACKEND" -ForegroundColor Green
Write-Host ("Provider : {0}" -f $env:AIONE_AI_PROVIDER) -ForegroundColor Green
Write-Host ("Model    : {0}" -f $env:AIONE_AI_MODEL) -ForegroundColor Green
Write-Host "Secret   : Backend process memory only" -ForegroundColor Green
Write-Host ("1688    : {0}" -f $(if ($alibaba1688Configured) { "AppKey/AppSecret/Access Token loaded; permanent-token direct mode" } else { "skipped for this session" })) -ForegroundColor Green
Write-Host "Write    : Database first; local AIONE fallback enabled for this test" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor DarkGreen

if (-not (Test-Path (Join-Path $backendDir "node_modules\express\package.json"))) {
  Write-Host "[AIONE] First run: installing backend dependencies..." -ForegroundColor Cyan
  & $npmCmd install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[AIONE] npm install failed. Check network / npm access." -ForegroundColor Red
    exit 5
  }
}

Write-Host "[AIONE] Starting real-model Backend on http://127.0.0.1:8080" -ForegroundColor Cyan
Write-Host "[AIONE] THIS is the Backend window. Keep it open while using MIWA AI." -ForegroundColor Yellow
Write-Host "[AIONE] If the server stops, this launcher will remain open and show the exit reason." -ForegroundColor DarkYellow
try {
  & $nodeExe (Join-Path $backendDir "server.js")
  $rc = $LASTEXITCODE
  Write-Host "" 
  Write-Host ("[AIONE] Backend process exited with code {0}." -f $rc) -ForegroundColor Red
} catch {
  $rc = 90
  Write-Host ""
  Write-Host "[AIONE] Backend process threw an exception:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
}
$env:OPENAI_API_KEY = $null
$env:ALIBABA_1688_APP_KEY = $null
$env:ALIBABA_1688_APP_SECRET = $null
$env:ALIBABA_1688_ACCESS_TOKEN = $null
$env:ALIBABA_1688_REFRESH_TOKEN = $null
$env:ALIBABA_1688_REDIRECT_URI = $null
exit $rc
