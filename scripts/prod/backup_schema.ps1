param(
  # Defaults updated 2026-07-10 to the CURRENT live project (mvbmpcmexkgfairnthux,
  # ap-south-1). The old paused project (tsnjpylkgsovjujoczll) needs explicit params.
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres"
)

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
& pg_dump --schema-only --no-owner --no-privileges --quote-all-identifiers --role=postgres `
  --host $DbHost --port $DbPort --username $DbUser --dbname $DbName `
  -f "supabase\schema_backup_$ts.sql"
$exit = $LASTEXITCODE

$env:PGPASSWORD = $null
# A backup that did not happen is worse than no backup: it authorizes an apply.
# 2026-07-28: an auth failure still printed "Backup written" for a file that did
# not exist. Verify the dump both exited clean AND produced a plausible file.
if ($exit -ne 0) { throw "BACKUP FAILED (pg_dump exit $exit). Do NOT apply any migration." }
$backupPath = "supabase\schema_backup_$ts.sql"
if (-not (Test-Path $backupPath)) { throw "BACKUP FAILED: $backupPath was never written. Do NOT apply any migration." }
$size = (Get-Item $backupPath).Length
if ($size -lt 50000) { throw "BACKUP SUSPECT: $backupPath is only $size bytes (expected >50 KB). Do NOT apply any migration." }
Write-Host "Backup written: $backupPath ($size bytes)" -ForegroundColor Green
