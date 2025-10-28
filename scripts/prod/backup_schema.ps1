param(
  [string]$DbHost = "aws-0-us-east-2.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.tsnjpylkgsovjujoczll",
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

$env:PGPASSWORD = $null
Write-Host "Backup written: supabase\schema_backup_$ts.sql" -ForegroundColor Green
