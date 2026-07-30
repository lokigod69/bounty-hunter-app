param(
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres"
)

# backup_schema.ps1 is --schema-only. Before a data wipe that is worse than
# useless: it succeeds, it looks like a backup, and it contains not one row of
# what is about to be destroyed. This dumps the DATA.

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "supabase\data_backup_$ts.sql"

# --data-only over the public schema plus auth.users. Column inserts so the
# dump survives a later column reorder, and --no-owner so it can be replayed
# by a role other than the one that made it.
& pg_dump --data-only --column-inserts --no-owner --no-privileges `
  --schema=public --table=auth.users `
  --host $DbHost --port $DbPort --username $DbUser --dbname $DbName `
  -f $backupPath
$exit = $LASTEXITCODE

$env:PGPASSWORD = $null

# Same rule as backup_schema.ps1, and it matters more here: a backup that did
# not happen is worse than no backup, because it authorizes a destructive run.
if ($exit -ne 0) { throw "DATA BACKUP FAILED (pg_dump exit $exit). Do NOT wipe anything." }
if (-not (Test-Path $backupPath)) { throw "DATA BACKUP FAILED: $backupPath was never written. Do NOT wipe anything." }
$size = (Get-Item $backupPath).Length
if ($size -lt 1000) { throw "DATA BACKUP SUSPECT: $backupPath is only $size bytes. Do NOT wipe anything." }

# Prove the dump actually contains rows, not just a header. An empty database
# would legitimately produce a tiny file, but then there is nothing to wipe
# either - so demand at least one INSERT and let the operator decide.
$inserts = (Select-String -Path $backupPath -Pattern '^INSERT INTO' -AllMatches | Measure-Object).Count
Write-Host "Data backup written: $backupPath ($size bytes, $inserts INSERT statements)" -ForegroundColor Green
if ($inserts -eq 0) {
  Write-Host "WARNING: the dump contains no INSERT statements. Either the database is already empty, or the dump did not capture what you expect. Check before wiping." -ForegroundColor Yellow
}
