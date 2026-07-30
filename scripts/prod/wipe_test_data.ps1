param(
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres",
  # Scope A by default. Pass -IncludeAccounts to also delete profiles and
  # auth.users, which forces everyone to sign up again.
  [switch]$IncludeAccounts
)

# This is the only script in scripts/prod that destroys DATA rather than
# replacing function bodies. The gates below are deliberately heavier than the
# migration scripts': a migration can be rolled back, this cannot.

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

# Gate 2: name the project out loud. The default DbUser encodes the project
# ref, so this makes "I ran it against the wrong database" require typing the
# right database's name by mistake.
$expected = "mvbmpcmexkgfairnthux"
if ($DbUser -notlike "*$expected*") {
  Write-Host "Target user is $DbUser, which is not the known live project ($expected)." -ForegroundColor Yellow
}
if ($env:WIPE_CONFIRM -ne $expected) {
  throw "Set WIPE_CONFIRM to the target project ref ('$expected') to confirm you know which database this is."
}

$Sql = if ($IncludeAccounts) {
  "db\maintenance\wipe_all_including_accounts.sql"
} else {
  "db\maintenance\wipe_test_data.sql"
}
if (-not (Test-Path $Sql)) { throw "Wipe script not found: $Sql" }

# Gate 3: refuse without a data backup taken TODAY. schema_backup_*.sql does
# not count - it is --schema-only and contains none of the rows at risk.
$today = Get-Date -Format "yyyyMMdd"
$backup = Get-ChildItem "supabase\data_backup_$today*.sql" -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $backup) {
  throw "No data backup from today found (supabase\data_backup_$today*.sql). Run scripts\prod\backup_data.ps1 first."
}
if ($backup.Length -lt 1000) {
  throw "Today's data backup $($backup.Name) is only $($backup.Length) bytes. Refusing to wipe against a suspect backup."
}
Write-Host "Using data backup: $($backup.Name) ($($backup.Length) bytes)" -ForegroundColor Cyan

if ($IncludeAccounts) {
  Write-Host "SCOPE B: this also deletes every profile and every auth account. Everyone must sign up again, and a public-schema restore will NOT bring accounts back." -ForegroundColor Red
} else {
  Write-Host "SCOPE A: app data only. Accounts and profiles are kept." -ForegroundColor Cyan
}

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -v ON_ERROR_STOP=1 -f $Sql
$exit = $LASTEXITCODE

$env:PGPASSWORD = $null

# 2026-07-28: every script in this folder reported success unconditionally, and
# a failed run printed "applied successfully" having done nothing. Never claim
# a prod write that did not happen - and never claim one that DID when it did not.
if ($exit -ne 0) { throw "WIPE FAILED (psql exit $exit). The transaction rolled back - nothing was deleted." }
Write-Host "Wipe complete. Compare the BEFORE/AFTER counts printed above." -ForegroundColor Green
Write-Host "Storage objects are NOT covered - empty the bounty-proofs bucket and reward images separately (see the runbook)." -ForegroundColor Yellow
