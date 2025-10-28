param(
  [string]$DbHost = "aws-0-us-east-2.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.tsnjpylkgsovjujoczll",
  [string]$DbName = "postgres",
  [string]$Sql  = "db\proposals\008_validation.sql"
)

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not (Test-Path $Sql)) { throw "Validation queries not found: $Sql" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -f $Sql

$env:PGPASSWORD = $null
Write-Host "Validation complete" -ForegroundColor Green
