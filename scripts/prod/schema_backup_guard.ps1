function Assert-SchemaArchive {
  param([Parameter(Mandatory)][string]$ArchivePath)
  if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'Backup archive is missing.' }
  $restoreCommand = (Get-Command pg_restore -ErrorAction Stop).Source
  $inventory = (& $restoreCommand --list $ArchivePath) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'Backup archive cannot be read by pg_restore.' }
  $inventory = $inventory.Replace('"', '')
  # Validate recoverable object kinds, not an arbitrary file-size threshold.
  foreach ($required in @('TABLE public profiles', 'TABLE public tasks', 'TABLE storage objects', 'POLICY public profiles', 'ACL public TABLE profiles')) {
    if ($inventory -notmatch [regex]::Escape($required)) { throw "Backup is missing required schema/ACL content: $required" }
  }
}

function Assert-SchemaBackup {
  param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [Parameter(Mandatory)][string]$DbHost,
    [Parameter(Mandatory)][int]$DbPort,
    [Parameter(Mandatory)][string]$DbUser,
    [Parameter(Mandatory)][string]$DbName
  )
  $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  if ($manifest.version -ne 1 -or $manifest.kind -ne 'schema-acl') { throw 'Unsupported backup manifest.' }
  if ($manifest.host -ne $DbHost -or $manifest.port -ne $DbPort -or $manifest.user -ne $DbUser -or $manifest.database -ne $DbName) { throw 'Backup belongs to a different database target.' }
  $age = [DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($manifest.createdAt)
  if ($age.TotalHours -gt 24 -or $age.TotalMinutes -lt -1) { throw 'Backup is stale or has a future timestamp.' }
  if (($manifest.schemas -join ',') -ne 'public,storage,bounty_private') { throw 'Backup schema scope is incomplete.' }
  if ([IO.Path]::GetFileName($manifest.archive) -ne $manifest.archive) { throw 'Backup archive must be beside its manifest.' }
  $archive = Join-Path (Split-Path -Parent (Resolve-Path -LiteralPath $ManifestPath)) $manifest.archive
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $manifest.sha256) { throw 'Backup archive changed after verification.' }
  Assert-SchemaArchive -ArchivePath $archive
  return $archive
}
