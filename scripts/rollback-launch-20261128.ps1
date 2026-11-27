param([ValidateSet('ERP','Frontend','Backend')][string]$Component, [switch]$Apply)
$ErrorActionPreference = 'Stop'
# Code-only rollback. Never restore databases, product folders, permissions or sync configuration.
switch ($Component) {
  'ERP' {
    $repo = 'D:\MIWA-ERP\dev\miwa-erpnext'
    $plan = 'D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261128-launch-final\intake-plan.json'
    $p = Get-Content -LiteralPath $plan -Raw | ConvertFrom-Json
    if ($p.files.Count -ne 1 -or $p.files[0].remote -ne '/home/frappe/frappe-bench/apps/miwa_ai/miwa_ai/selection_product_intake.py') { throw 'Unexpected rollback scope' }
    if ((Get-FileHash -LiteralPath $p.files[0].target).Hash.ToLower() -ne $p.files[0].after) { throw 'Runtime drift; stop' }
    $backup = [IO.Path]::ChangeExtension($plan, 'backup')
    if ((Get-FileHash -LiteralPath (Join-Path $backup '0')).Hash.ToLower() -ne $p.files[0].before) { throw 'Backup mismatch' }
    Write-Output 'Verified one-file ERP rollback; database and auxiliary field remain intact.'
    if ($Apply) {
      $docker = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
      & py -3.13 -B (Join-Path $repo 'scripts/deploy-existing.py') --docker $docker --container miwa-erp-dev-backend-1 --repo $repo --plan $plan --rollback
      if ($LASTEXITCODE) { throw 'Rollback failed' }
      if ((Invoke-RestMethod http://127.0.0.1:8081/api/method/ping).message -ne 'pong') { throw 'ERP health check failed' }
    }
  }
  'Backend' {
    Write-Output 'Cloud Run code rollback target: aione-backend-current-00311-qav; no environment or database changes.'
    if ($Apply) {
      & gcloud run services update-traffic aione-backend-current --project=miwa-aione --region=asia-northeast1 --to-revisions=aione-backend-current-00311-qav=100
      if ($LASTEXITCODE) { throw 'Cloud Run rollback failed' }
    }
  }
  'Frontend' {
    Write-Output 'Vercel code rollback target: dpl_5PL4Ycpp4myu8jJY6hZzx5p8B1wN; use authenticated existing team context.'
    if ($Apply) {
      & vercel rollback dpl_5PL4Ycpp4myu8jJY6hZzx5p8B1wN --scope info-64613987s-projects
      if ($LASTEXITCODE) { throw 'Vercel rollback failed' }
    }
  }
  default { throw 'Specify -Component ERP, Frontend or Backend. Default is validation/plan only; -Apply performs code rollback.' }
}
if (-not $Apply) { Write-Output 'PLAN ONLY: no production writes performed.' }
