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

@"
-- RLS state
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='collected_rewards';

-- Policies present?
select count(*) as policy_count
from pg_policies
where schemaname='public' and tablename='collected_rewards';

-- Unique constraint
select conname
from pg_constraint
where conrelid='public.collected_rewards'::regclass
and conname='collected_rewards_unique_claim';
"@ | & psql "host=$DbHost port=$DbPort user=$DbUser dbname=$DbName"

$env:PGPASSWORD = $null
