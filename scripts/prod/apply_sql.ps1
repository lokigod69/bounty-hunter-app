param(
  [Parameter(Mandatory = $true)][string]$Sql,
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres"
)

# Generic apply, same gates as apply_011/012/013_up.ps1 but with -Sql required
# rather than defaulted. Added 2026-07-30 for proposals 014 and 015 - copying
# apply_013_up.ps1 once per proposal is how the "reports success unconditionally"
# bug came to exist in twelve places at once.
#
# Read-only validation should go through psql directly; this script is for
# writes and says so.

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not (Test-Path $Sql)) { throw "Migration not found: $Sql" }

# A same-day schema backup is required. An apply authorised by a backup that
# does not exist is the failure mode this folder keeps rediscovering.
$today = Get-Date -Format "yyyyMMdd"
$backup = Get-ChildItem "supabase\schema_backup_$today*.sql" -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $backup) {
  throw "No schema backup from today found (supabase\schema_backup_$today*.sql). Run scripts\prod\backup_schema.ps1 first."
}
if ($backup.Length -lt 50000) {
  throw "Today's schema backup $($backup.Name) is only $($backup.Length) bytes. Refusing to apply against a suspect backup."
}
Write-Host "Using schema backup: $($backup.Name) ($($backup.Length) bytes)" -ForegroundColor Cyan
Write-Host "Applying: $Sql" -ForegroundColor Cyan

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -v ON_ERROR_STOP=1 -f $Sql
$exit = $LASTEXITCODE

$env:PGPASSWORD = $null

# Never claim a prod write that did not happen (2026-07-28: a password-auth
# failure was reported as a successful migration by every script in this folder).
if ($exit -ne 0) { throw "APPLY FAILED (psql exit $exit). Nothing was applied." }
Write-Host "Applied successfully: $Sql" -ForegroundColor Green
Write-Host "Now re-run the matching validation file and compare against the BEFORE run." -ForegroundColor Yellow
