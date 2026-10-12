# AIONE local image sync v0.1: dry-run by default. Never deletes/moves/renames files.
# Usage: .\SYNC_AIONE_PRODUCT_IMAGES.ps1 -Folder 'C:\Products\zjl238' -ProductId 'prd_<uuid>'
# Live (explicit): $env:AIONE_GOOGLE_ID_TOKEN=...; .\SYNC_AIONE_PRODUCT_IMAGES.ps1 -Folder ... -ProductId ... -ApiBase 'https://YOUR-APPROVED-BACKEND' -Upload
param(
  [Parameter(Mandatory=$true)][string]$Folder,
  [Parameter(Mandatory=$true)][string]$ProductId,
  [string]$ApiBase = '',
  [switch]$Upload
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $Folder -PathType Container)) { throw 'Folder does not exist.' }
$code = Split-Path -Leaf (Resolve-Path -LiteralPath $Folder).Path
if ($code -notmatch '^[A-Za-z0-9-]{2,80}$') { throw 'Folder name must equal the product localCode.' }
if ($ProductId -notmatch '^(prd_)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') { throw 'Invalid Product ID.' }
$pattern = '^' + [regex]::Escape($code) + '_(c)?([0-9]{2,4})\.(jpg|jpeg|png|webp)$'
$files = @(Get-ChildItem -LiteralPath $Folder -File | Where-Object {
  if ($_.Name -notmatch $pattern) { return $false }
  $n = [int]$Matches[2]
  return ($n -ge 1 -and $n -le 999)
} | Sort-Object Name)
if ($files.Count -gt 60) { throw 'At most 60 images per operation; divide the batch.' }
$record = @()
foreach ($f in $files) {
  if ($f.Length -lt 16 -or $f.Length -gt 2097152) {
    $record += [pscustomobject]@{ name=$f.Name; size=$f.Length; state='invalid_size'; sha256=$null }; continue
  }
  $sha = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $record += [pscustomobject]@{ name=$f.Name; size=$f.Length; state='pending'; sha256=$sha }
}
Write-Host "Product: $code | Files: $($files.Count) | Mode: $(if($Upload){'UPLOAD'}else{'DRY-RUN'})"
if (!$Upload) {
  $record | Format-Table -AutoSize
  Write-Host 'DRY-RUN ONLY. No network write, local file mutation or Rakuten operation.'
  return
}
if (!$ApiBase -or $ApiBase -notmatch '^https://[^/?#]+$') { throw 'HTTPS ApiBase required; do not append a path.' }
if (!$env:AIONE_GOOGLE_ID_TOKEN) { throw 'Missing current Google ID token in AIONE_GOOGLE_ID_TOKEN environment variable.' }
$headers = @{ Authorization="Bearer $env:AIONE_GOOGLE_ID_TOKEN"; 'x-aione-source-system'='aione-windows-local-sync-v1' }
$base = $ApiBase.TrimEnd('/')
$success = 0; $reused=0; $blocked=0; $failed=0
foreach ($row in $record) {
  if ($row.state -eq 'invalid_size') { $failed++; continue }
  $file = $files | Where-Object { $_.Name -eq $row.name } | Select-Object -First 1
  try {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    if ($bytes.Length -ne $row.size) { throw 'File changed while scanning; skipped.' }
    if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256) {
      throw 'File hash changed while scanning; skipped.'
    }
    $body = @{ fileName=$row.name; base64=[Convert]::ToBase64String($bytes) } | ConvertTo-Json -Compress
    $url = "$base/api/v1/product-assets/products/$([uri]::EscapeDataString($ProductId))/local-image"
    $reply = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Headers $headers -Body $body -TimeoutSec 45
    if (!$reply.ok -or !$reply.verified -or !$reply.assetId) { throw 'Backend did not confirm asset verification.' }
    if ($reply.reused) { $reused++; $row.state='reused' } else { $success++; $row.state='created' }
  } catch {
    $status=0
    if ($_.Exception.Response) { $status=[int]$_.Exception.Response.StatusCode }
    if ($status -eq 409) { $blocked++; $row.state='conflict' } else { $failed++; $row.state='failed' }
    Write-Warning "$($row.name): $($row.state) (HTTP $status)"
  }
}
$record | Format-Table -AutoSize
Write-Host "Created=$success Reused=$reused Conflicts=$blocked Failed=$failed"
Write-Host 'Local originals preserved. No Rakuten API calls.'
if ($blocked -gt 0 -or $failed -gt 0) { exit 2 }
