param(
  [string]$DbHost = "aws-1-ap-south-1.pooler.supabase.com",
  [int]$DbPort    = 5432,
  [string]$DbUser = "postgres.mvbmpcmexkgfairnthux",
  [string]$DbName = "postgres",
  [string]$Sql  = "db\proposals\012_create_update_task_rpcs.up.sql"
)

if ($env:PROD_CONFIRM -ne "YES") { throw "Set PROD_CONFIRM=YES to allow prod actions." }

function Read-Plain([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not (Test-Path $Sql)) { throw "Migration not found: $Sql" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = Read-Plain "Enter PROD DB password" }

$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -v ON_ERROR_STOP=1 -f $Sql

$env:PGPASSWORD = $null
Write-Host "Migration applied successfully" -ForegroundColor Green
