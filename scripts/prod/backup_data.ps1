param(
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres"
)

# backup_schema.ps1 is --schema-only. Before a data wipe that is worse than
# useless: it succeeds, it looks like a backup, and it contains not one row of
# what is about to be destroyed. This dumps the DATA.
#
# 2026-07-30: this script used to pass `--schema=public --table=auth.users` to a
# SINGLE pg_dump. In pg_dump, --table NARROWS the selection; --schema does not
# add the public tables back. The result was a "successful" backup containing
# only auth.users and not one row of public - and the old guard (">= 1 INSERT")
# passed, because auth.users supplied three. That is precisely the failure this
# file exists to prevent, so the dump is now two invocations and the guard now
# compares the dump against live row counts table by table.

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$pgBin   = "C:\Users\micha\scoop\apps\postgresql\current\bin"
$pgDump  = Join-Path $pgBin "pg_dump.exe"
$psqlExe = Join-Path $pgBin "psql.exe"
if (-not (Test-Path $pgDump))  { throw "pg_dump not found at $pgDump" }
if (-not (Test-Path $psqlExe)) { throw "psql not found at $psqlExe" }

$conn = "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "supabase\data_backup_$ts.sql"
$partPublic = "supabase\.data_backup_${ts}_public.part"
$partAuth   = "supabase\.data_backup_${ts}_auth.part"

# Every table the wipe scripts can destroy, plus profiles and auth.users.
# The dump is verified against the live count of each of these.
$tables = @(
  "public.tasks", "public.rewards_store", "public.collected_rewards",
  "public.user_credits", "public.credit_transactions",
  "public.daily_mission_streaks", "public.friendships", "public.invites",
  "public.profiles", "auth.users"
)

try {
  # --- Live counts BEFORE the dump, so the dump can be checked against them ---
  $countSql = ($tables | ForEach-Object { "SELECT '$_' AS t, count(*) AS n FROM $_" }) -join " UNION ALL "
  $countOut = & $psqlExe $conn -t -A -F "|" -c $countSql
  if ($LASTEXITCODE -ne 0) { throw "Could not read live row counts (psql exit $LASTEXITCODE). Refusing to take an unverifiable backup." }

  $live = @{}
  foreach ($line in $countOut) {
    if ($line -match '^\s*([^|]+)\|(\d+)\s*$') { $live[$Matches[1].Trim()] = [int]$Matches[2] }
  }
  if ($live.Count -ne $tables.Count) { throw "Expected $($tables.Count) row counts, parsed $($live.Count). Refusing to continue." }

  # --- Dump 1: the whole public schema ---
  & $pgDump --data-only --column-inserts --no-owner --no-privileges `
    --schema=public `
    --host $DbHost --port $DbPort --username $DbUser --dbname $DbName `
    -f $partPublic
  if ($LASTEXITCODE -ne 0) { throw "DATA BACKUP FAILED: public-schema dump exited $LASTEXITCODE. Do NOT wipe anything." }

  # --- Dump 2: auth.users, which --schema=public cannot reach ---
  & $pgDump --data-only --column-inserts --no-owner --no-privileges `
    --table=auth.users `
    --host $DbHost --port $DbPort --username $DbUser --dbname $DbName `
    -f $partAuth
  if ($LASTEXITCODE -ne 0) { throw "DATA BACKUP FAILED: auth.users dump exited $LASTEXITCODE. Do NOT wipe anything." }

  if (-not (Test-Path $partPublic)) { throw "DATA BACKUP FAILED: $partPublic was never written." }
  if (-not (Test-Path $partAuth))   { throw "DATA BACKUP FAILED: $partAuth was never written." }

  # Concatenate at the BYTE level. Get-Content/Set-Content would round-trip the
  # dump through PowerShell 5.1's encoding layer and can corrupt non-ASCII data
  # (display names, contract titles) or prepend a BOM that psql then chokes on.
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $partPublic)) +
           [System.IO.File]::ReadAllBytes((Resolve-Path $partAuth))
  [System.IO.File]::WriteAllBytes((Join-Path (Get-Location) $backupPath), $bytes)
} finally {
  Remove-Item $partPublic, $partAuth -ErrorAction SilentlyContinue
  $env:PGPASSWORD = $null
}

# Same rule as backup_schema.ps1, and it matters more here: a backup that did
# not happen is worse than no backup, because it authorizes a destructive run.
if (-not (Test-Path $backupPath)) { throw "DATA BACKUP FAILED: $backupPath was never written. Do NOT wipe anything." }
$size = (Get-Item $backupPath).Length
if ($size -lt 1000) { throw "DATA BACKUP SUSPECT: $backupPath is only $size bytes. Do NOT wipe anything." }

# Per-table verification. "At least one INSERT somewhere" is not a backup check
# - it is how a dump of the wrong schema gets green-lit. Every table that has
# live rows must have exactly that many INSERT statements in the dump.
$dumpLines = Get-Content $backupPath -Encoding UTF8
$problems = @()
$total = 0
foreach ($t in $tables) {
  $n = @($dumpLines | Where-Object { $_.StartsWith("INSERT INTO $t ") }).Count
  $total += $n
  $expected = $live[$t]
  $mark = if ($n -eq $expected) { "ok" } else { "MISMATCH" }
  Write-Host ("  {0,-32} live={1,-6} dumped={2,-6} {3}" -f $t, $expected, $n, $mark)
  if ($n -ne $expected) { $problems += "$t : live=$expected dumped=$n" }
}

if ($problems.Count -gt 0) {
  throw ("DATA BACKUP INCOMPLETE - do NOT wipe anything. The dump does not match the live database:`n  " + ($problems -join "`n  "))
}

Write-Host "Data backup written: $backupPath ($size bytes, $total INSERT statements, all tables verified against live counts)" -ForegroundColor Green
if ($total -eq 0) {
  Write-Host "NOTE: every table is empty, so the dump legitimately contains no rows - and there is nothing to wipe either." -ForegroundColor Yellow
}
