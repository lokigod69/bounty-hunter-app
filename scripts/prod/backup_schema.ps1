param(
  [string]$DbHost = 'aws-1-ap-south-1.pooler.supabase.com',
  [int]$DbPort = 5432,
  [string]$DbUser = 'postgres.mvbmpcmexkgfairnthux',
  [string]$DbName = 'postgres',
  [string]$DbRole = '',
  [switch]$NoPrompt,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../../supabase/backups')
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/schema_backup_guard.ps1"

# A read-only backup is never permission to apply a migration.
$backupDirectory = $OutputDirectory
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss_fff'
$archivePath = Join-Path $backupDirectory "schema_acl_$stamp.backup"
$manifestPath = "$archivePath.json"
$priorPassword = $env:PGPASSWORD
$priorSslMode = $env:PGSSLMODE
try {
  if (-not $env:PGSSLMODE) { $env:PGSSLMODE = 'require' }
  $pgpass = if ($env:PGPASSFILE) { $env:PGPASSFILE } elseif ($env:APPDATA) { Join-Path $env:APPDATA 'postgresql/pgpass.conf' } else { Join-Path $env:HOME '.pgpass' }
  if (-not $env:PGPASSWORD -and -not (Test-Path -LiteralPath $pgpass)) {
    if ($NoPrompt) { throw 'No secure database password/pgpass is configured. No backup or migration was performed.' }
    $securePassword = Read-Host 'Database password (hidden; never paste it into chat)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try { $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  }
  $dumpCommand = (Get-Command pg_dump -ErrorAction Stop).Source
  # Preserve owners, grants and policies. The old --no-privileges erased the
  # permissions these releases repair. No Auth rows or Storage bytes are dumped.
  $roleArguments = @()
  if ($DbRole) {
    if ($DbRole -notmatch '^[a-zA-Z_][a-zA-Z0-9_]*$') { throw 'Invalid database role.' }
    $roleArguments = @('--role', $DbRole)
  }
  & $dumpCommand --host $DbHost --port $DbPort --username $DbUser --dbname $DbName @roleArguments --no-password --format=custom --schema-only --schema=public --schema=storage --schema=bounty_private --quote-all-identifiers --file $archivePath
  if ($LASTEXITCODE -ne 0) { throw 'Schema/ACL dump failed. No verified backup was recorded.' }
  Assert-SchemaArchive -ArchivePath $archivePath
  [ordered]@{
    version = 1; kind = 'schema-acl'; createdAt = [DateTimeOffset]::UtcNow.ToString('o')
    host = $DbHost; port = $DbPort; user = $DbUser; database = $DbName; role = $DbRole
    schemas = @('public', 'storage', 'bounty_private'); archive = [IO.Path]::GetFileName($archivePath)
    sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
  } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
  Write-Host "Verified schema/ACL archive: $archivePath" -ForegroundColor Green
  Write-Host "Manifest for the reviewed apply: $manifestPath"
  Write-Host 'Schema/permissions only. Data or object deletion needs a separate data/object backup.'
} finally {
  $env:PGPASSWORD = $priorPassword
  $env:PGSSLMODE = $priorSslMode
}
