$env:PGPASSWORD = "postgres"

Write-Host "===== RLS Status =====" -ForegroundColor Cyan
@"
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='collected_rewards';
"@ | & "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres"

Write-Host "`n===== Policies (count) =====" -ForegroundColor Cyan
@"
select count(*) as policy_count
from pg_policies
where schemaname='public' and tablename='collected_rewards';
"@ | & "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres"

Write-Host "`n===== Policies (list) =====" -ForegroundColor Cyan
@"
select policyname, cmd, roles
from pg_policies
where schemaname='public' and tablename='collected_rewards'
order by policyname;
"@ | & "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres"

Write-Host "`n===== Unique Constraint =====" -ForegroundColor Cyan
@"
select conname, contype
from pg_constraint
where conrelid='public.collected_rewards'::regclass
and conname='collected_rewards_unique_claim';
"@ | & "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres"

$env:PGPASSWORD = $null
