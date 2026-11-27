param([Parameter(Mandatory=$true)][string]$ConfigPath, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if (-not $cfg.enabled -and -not $DryRun) { throw 'Product Drive copy is not enabled.' }
if (-not $cfg.desktopProductSyncDisabled -and -not $DryRun) { throw 'Disable only the Drive Desktop product mapping before enabling one-way copy.' }
$root = [IO.Path]::GetFullPath($cfg.localRoot).TrimEnd('\')
if ($root -ne 'D:\产品(Products)' -or -not (Test-Path -LiteralPath $root -PathType Container)) { throw 'Unexpected or unavailable product root.' }
if ($cfg.remote -ne 'miwa-products:') { throw 'Unexpected product remote.' }
$stateDir = Split-Path -Parent $ConfigPath
$mutex = New-Object Threading.Mutex($false, 'Local\MIWAProductDriveCopy')
if (-not $mutex.WaitOne(0)) { exit 0 }
$run = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$status = @{ startedAt = [DateTime]::UtcNow.ToString('o'); status = 'running'; direction = 'local-to-drive'; deletes = $false; dryRun = [bool]$DryRun }
try {
  $status | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateDir 'latest-copy.json') -Encoding UTF8
  # Independent local recovery copy: outside both collaboration roots, never mirror deletes.
  $backupRoot = [IO.Path]::GetFullPath($cfg.localBackupRoot).TrimEnd('\')
  if ($backupRoot -ne 'D:\MIWA-ERP\backups\product-files') { throw 'Unexpected independent backup root.' }
  $backupArgs = @('copy', $root, (Join-Path $backupRoot 'current'), '--config', $cfg.rcloneConfig,
    '--backup-dir', (Join-Path $backupRoot ('versions\' + $run)), '--checksum', '--min-age', '2m',
    '--exclude', '~$*', '--exclude', '*.tmp', '--exclude', '*.part', '--transfers', '2', '--checkers', '4',
    '--log-file', (Join-Path $stateDir ('backup-' + $run + '.log')), '--log-level', 'INFO')
  if ($DryRun) { $backupArgs += '--dry-run' }
  & $cfg.rcloneExe @backupArgs
  if ($LASTEXITCODE -ne 0) { throw 'Independent product backup failed; cloud copy not started.' }
  $status.localBackup = $(if ($DryRun) { 'dry-run-complete' } else { 'copy-complete' })
  $argsList = @('copy', $root, $cfg.remote, '--config', $cfg.rcloneConfig,
    '--backup-dir', ($cfg.remote + '_MIWA_BACKUP_VERSIONS/' + $run),
    '--exclude', '/_MIWA_BACKUP_VERSIONS/**', '--exclude', '~$*', '--exclude', '*.tmp', '--exclude', '*.part',
    '--min-age', '2m', '--checksum', '--transfers', '2', '--checkers', '4',
    '--retries', '3', '--retries-sleep', '30s', '--low-level-retries', '3', '--contimeout', '20s', '--timeout', '2m',
    '--log-file', (Join-Path $stateDir ('copy-' + $run + '.log')), '--log-level', 'INFO', '--stats', '1m')
  if ($DryRun) { $argsList += '--dry-run' }
  & $cfg.rcloneExe @argsList
  if ($LASTEXITCODE -ne 0) { throw ('rclone copy failed with exit code ' + $LASTEXITCODE + '; see the run log. The next scheduled run retries; no destination deletion is performed.') }
  $status.status = $(if ($DryRun) { 'dry-run-complete' } else { 'copy-complete' })
  # rclone can return success while skipping historical duplicate names.
  # Preserve those files and expose the warning rather than claiming full parity.
  $warningCount = 0
  foreach ($logKind in @('backup', 'copy')) {
    $runLog = Join-Path $stateDir ($logKind + '-' + $run + '.log')
    if (Test-Path -LiteralPath $runLog) {
      $warningCount += @(Select-String -LiteralPath $runLog -Pattern 'Duplicate (object|directory)|WARNING|ERROR').Count
    }
  }
  $status.warningCount = $warningCount
  if ($warningCount -gt 0 -and -not $DryRun) { $status.status = 'copy-complete-with-warnings' }
} catch {
  $status.status = 'failed'; $status.error = $_.Exception.Message
  throw
} finally {
  $status.finishedAt = [DateTime]::UtcNow.ToString('o')
  $status | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateDir 'latest-copy.json') -Encoding UTF8
  $mutex.ReleaseMutex(); $mutex.Dispose()
}
