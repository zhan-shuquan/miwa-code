param([Parameter(Mandatory=$true)][string]$PrivateConfig)
$ErrorActionPreference = 'Stop'
$settings = Get-Content -LiteralPath $PrivateConfig -Raw | ConvertFrom-Json
if ($settings.cutoverApproved -ne $true) { throw 'Formal connection has not been approved.' }
if ($settings.origin -ne 'https://aione.miwa-happyhouse.com' -or $settings.container -ne 'miwa-erp-dev-backend-1' -or $settings.site -ne 'miwa-dev.localhost') { throw 'Production connection target mismatch.' }
$secret = Import-Clixml -LiteralPath $settings.tokenFile
if ($secret -isnot [System.Security.SecureString]) { throw 'Expected a Windows user-encrypted SecureString token.' }
$env:AIONE_PRODUCTION_CONNECTOR_TOKEN = [System.Net.NetworkCredential]::new('', $secret).Password
$env:AIONE_CONNECTOR_ENV = 'production'
$env:AIONE_PRODUCTION_CONNECTOR_APPROVED = '1'
$env:AIONE_CLOUD_URL = $settings.origin
$env:DOCKER_EXE = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
Remove-Item Env:AIONE_CONNECTOR_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:AIONE_CONNECTOR_ONCE -ErrorAction SilentlyContinue
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (!$nodePath) { $nodePath = Join-Path $env:ProgramFiles 'nodejs/node.exe' }
try {
    & $nodePath (Join-Path $PSScriptRoot 'local-erp-selection-connector.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Production connector stopped unexpectedly.' }
} finally {
    Remove-Item Env:AIONE_PRODUCTION_CONNECTOR_TOKEN -ErrorAction SilentlyContinue
}
