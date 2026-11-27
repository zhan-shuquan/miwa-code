param([Parameter(Mandatory=$true)][string]$PrivateConfig)
$ErrorActionPreference = 'Stop'
$configPath = (Resolve-Path -LiteralPath $PrivateConfig).Path
$scriptPath = Join-Path $PSScriptRoot 'start-production-connector.ps1'
$taskName = 'MIWA-AIONE-ERP8081-ProductionConnector'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Existing task found; inspect before updating it.' }
$shellPath = Join-Path $PSHOME 'powershell.exe'
if (!(Test-Path -LiteralPath $shellPath)) { $shellPath = Join-Path $PSHOME 'pwsh.exe' }
$action = New-ScheduledTaskAction -Execute $shellPath -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -PrivateConfig "{1}"' -f $scriptPath,$configPath) -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings
$task.Settings.Enabled = $false
Register-ScheduledTask -TaskName $taskName -InputObject $task | Out-Null
Write-Output 'Registered DISABLED. Enable/start only after approved production cutover. No ERP port is exposed.'
