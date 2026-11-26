$ErrorActionPreference = 'Stop'
$targets=Get-Content (Join-Path $PSScriptRoot '../config/erp-connector-targets.json') -Raw | ConvertFrom-Json
if ($targets.development.enabled -eq $false) { throw $targets.development.reason }
$repoPath = (Resolve-Path (Join-Path $PSScriptRoot '../../../../..')).Path
$localPath = Join-Path $repoPath '.local'
$dockerPath = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
if (!(Test-Path $dockerPath)) { $dockerPath = (Get-Command docker).Source }
$nodePath = (Get-Command node).Source
if (!(Test-Path (Join-Path $localPath 'erp-snapshot.json'))) { throw 'Reviewed ERP snapshot is required.' }
# Existing isolated PostgreSQL only; never inherit a production DATABASE_URL.
$exists = & $dockerPath exec aione-selection-db-20261125 psql -U aione_test -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='aione_employee_dev'"
if ($LASTEXITCODE -ne 0) { throw 'Existing development database container is unavailable.' }
if ($exists -ne '1') {
    & $dockerPath exec aione-selection-db-20261125 createdb -U aione_test aione_employee_dev
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize isolated employee development database.' }
}
$secretPath = Join-Path $localPath 'employee-connector-token'
if (!(Test-Path $secretPath)) {
    [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | Set-Content $secretPath
}
$env:AIONE_CONNECTOR_TOKEN = (Get-Content $secretPath -Raw).Trim()
$developmentConfig = Get-Content (Join-Path $PSScriptRoot '../config/local-development.json') -Raw | ConvertFrom-Json
$env:AIONE_CLOUD_URL = $developmentConfig.origin
$env:DOCKER_EXE = $dockerPath
Remove-Item Env:AIONE_CONNECTOR_ONCE -ErrorAction SilentlyContinue
foreach ($spec in @(@('employee-development','employee-development-server.mjs'),@('employee-connector','local-erp-selection-connector.mjs'))) {
    $pidFile=Join-Path $localPath ($spec[0]+'.pid')
    if (Test-Path $pidFile) {
        $workerId=[int](Get-Content $pidFile)
        $workerInfo=Get-CimInstance Win32_Process -Filter "ProcessId = $workerId"
        if ($workerInfo.Name -eq 'node.exe' -and $workerInfo.CommandLine.Contains($spec[1])) { continue }
        if ($workerInfo) { throw 'Saved process ID has been reused; inspect before starting.' }
    }
    $worker=Start-Process $nodePath -ArgumentList $spec[1] -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localPath ($spec[0]+'.log')) -RedirectStandardError (Join-Path $localPath ($spec[0]+'.error.log'))
    Set-Content $pidFile $worker.Id
}
Write-Output ('Authenticated development: ' + $developmentConfig.origin + '/login')
