param(
  [Parameter(Mandatory)][string]$Sql,
  [Parameter(Mandatory)][string]$BackupManifest,
  [string]$DbHost = 'aws-1-ap-south-1.pooler.supabase.com',
  [int]$DbPort = 5432,
  [string]$DbUser = 'postgres.mvbmpcmexkgfairnthux',
  [string]$DbName = 'postgres',
  [string]$DbRole = ''
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/schema_backup_guard.ps1"
if ($env:PROD_CONFIRM -ne 'YES') { throw 'Explicit review/go is required. Set PROD_CONFIRM=YES only after approval.' }
if (-not (Test-Path -LiteralPath $Sql -PathType Leaf)) { throw "Migration not found: $Sql" }
$archive = Assert-SchemaBackup -ManifestPath $BackupManifest -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbRole $DbRole
Write-Host "Verified schema/ACL backup: $archive" -ForegroundColor Cyan
Write-Host "Applying reviewed SQL: $Sql" -ForegroundColor Cyan
$priorSslMode = $env:PGSSLMODE
try {
  if (-not $env:PGSSLMODE) { $env:PGSSLMODE = 'require' }
  $psqlCommand = (Get-Command psql -ErrorAction Stop).Source
  # psql uses pgpass/PGPASSWORD or its own private password prompt.
  # Each reviewed proposal owns its transaction and assertion guards.
  $roleArguments = @()
  if ($DbRole) {
    if ($DbRole -notmatch '^[a-zA-Z_][a-zA-Z0-9_]*$') { throw 'Invalid database role.' }
    $roleArguments = @('-c', ('SET ROLE "' + $DbRole + '"'))
  }
  # Poolers may ignore startup PGOPTIONS. Switch role explicitly on this same
  # connection, as the provider's pg_dump plan does, before executing the file.
  & $psqlCommand --host $DbHost --port $DbPort --username $DbUser --dbname $DbName -X -v ON_ERROR_STOP=1 @roleArguments -f $Sql
  if ($LASTEXITCODE -ne 0) { throw 'Apply failed. Inspect the transaction result before retrying; do not assume no statements ran.' }
  Write-Host 'SQL completed. Run matching validation and hosted authorization checks.' -ForegroundColor Green
} finally {
  $env:PGSSLMODE = $priorSslMode
}
