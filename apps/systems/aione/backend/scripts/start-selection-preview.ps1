$ErrorActionPreference = 'Stop'
$repoPath = (Resolve-Path (Join-Path $PSScriptRoot '../../../../..')).Path
$localPath = Join-Path $repoPath '.local'
$dockerPath = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
if (!(Test-Path -LiteralPath $dockerPath)) { $dockerPath = (Get-Command docker).Source }
$nodePath = (Get-Command node).Source
if (!(Test-Path -LiteralPath (Join-Path $localPath 'erp-snapshot.json'))) { throw 'Missing reviewed ERP snapshot: .local/erp-snapshot.json' }
# These containers were created solely for this development preview. Never touch ERP containers.
foreach ($containerName in @('aione-selection-db-20261125', 'aione-selection-cost-20261125')) {
    $running = & $dockerPath inspect --format '{{.State.Running}}' $containerName
    if ($LASTEXITCODE -ne 0) { throw "Missing isolated container: $containerName" }
    if ($running -ne 'true') { & $dockerPath start $containerName | Out-Null }
}
$env:AIONE_CONNECTOR_TOKEN = 'isolated-connector-test-only'
$env:DOCKER_EXE = $dockerPath
$env:AIONE_CLOUD_URL = 'http://127.0.0.1:8765'
Remove-Item Env:AIONE_CONNECTOR_ONCE -ErrorAction SilentlyContinue
function Start-PreviewWorker($Name, $File) {
    $pidFile = Join-Path $localPath ($Name + '.pid')
    if (Test-Path -LiteralPath $pidFile) {
        $savedId = [int](Get-Content -LiteralPath $pidFile -Raw)
        if (Get-Process -Id $savedId -ErrorAction SilentlyContinue) { return }
    }
    $worker = Start-Process -FilePath $nodePath -ArgumentList @($File) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localPath ($Name + '.log')) -RedirectStandardError (Join-Path $localPath ($Name + '.error.log'))
    Set-Content -LiteralPath $pidFile -Value $worker.Id
}
Start-PreviewWorker 'selection-preview' 'selection-preview-server.mjs'
Start-PreviewWorker 'selection-connector' 'local-erp-selection-connector.mjs'
Write-Output 'Local preview: http://127.0.0.1:8765/preview'
Write-Output 'The connector checks the 8081 ERP every 60 seconds. Logs and process IDs are in .local.'
