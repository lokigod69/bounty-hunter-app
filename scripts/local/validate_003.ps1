param(
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort    = 55432,
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres"
)
$queries = @'
-- RLS state
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='collected_rewards';

-- Policies
select polname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='collected_rewards'
order by polname;

-- Unique constraint
select conname
from pg_constraint
where conrelid='public.collected_rewards'::regclass
and conname='collected_rewards_unique_claim';
'@
if (-not $env:PGPASSWORD) {
  $env:PGPASSWORD = Read-Host "Enter LOCAL Postgres password" -AsSecureString | %{ [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }
}
$psqlPath = "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe"
$queries | & $psqlPath "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName"
$env:PGPASSWORD = $null
