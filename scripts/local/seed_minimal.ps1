param(
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort    = 55432,
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres",
  [string]$Seed = "db\seeds\seed_minimal.sql"
)
if (-not (Test-Path $Seed)) { throw "Seed file not found: $Seed" }
if (-not $env:PGPASSWORD) {
  $env:PGPASSWORD = Read-Host "Enter LOCAL Postgres password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }
}
$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -f $Seed
$env:PGPASSWORD = $null
