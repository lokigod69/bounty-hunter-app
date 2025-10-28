$env:PGPASSWORD = "postgres"

Write-Host "===== STEP 2: Loading schema_all.sql =====" -ForegroundColor Cyan
& "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres" -f "supabase\schema_all.sql"

Write-Host "`n===== STEP 3: Loading seed_minimal.sql =====" -ForegroundColor Cyan
& "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres" -f "db\seeds\seed_minimal.sql"

Write-Host "`n===== STEP 4: Applying Proposal 003 (UP) =====" -ForegroundColor Cyan
& "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres" -f "db\proposals\003_rls_collected_rewards.up.sql"

Write-Host "`n===== STEP 5: Validating Proposal 003 =====" -ForegroundColor Cyan
$queries = @'
-- RLS state
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='collected_rewards';

-- Policies
select polname, cmd, roles
from pg_policies
where schemaname='public' and tablename='collected_rewards'
order by polname;

-- Unique constraint
select conname
from pg_constraint
where conrelid='public.collected_rewards'::regclass
and conname='collected_rewards_unique_claim';
'@

$queries | & "C:\Users\micha\scoop\apps\postgresql\current\bin\psql.exe" "host=127.0.0.1 port=55432 user=postgres dbname=postgres"

$env:PGPASSWORD = $null
Write-Host "`n===== VALIDATION COMPLETE =====" -ForegroundColor Green
