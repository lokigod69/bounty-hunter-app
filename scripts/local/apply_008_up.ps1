param(
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort    = 55432,
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres",
  [string]$Sql  = "db\proposals\008_atomic_purchase.up.sql"
)
if (-not (Test-Path $Sql)) { throw "Migration not found: $Sql" }
if (-not $env:PGPASSWORD) {
  $env:PGPASSWORD = Read-Host "Enter LOCAL Postgres password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }
}
$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
& $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName" -f $Sql
$env:PGPASSWORD = $null
