param([Parameter(Mandatory)][scriptblock]$Action)
$ErrorActionPreference = 'Stop'
# Use the already authenticated provider CLI to obtain its temporary login.
# Never execute the emitted shell script or print/persist its password.
$plan = (& npx --yes supabase@2.116.0 db dump --linked --schema public,storage,bounty_private --dry-run 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Supabase CLI could not prepare its temporary connection.' }
$connection = @{}
foreach ($match in [regex]::Matches($plan, '(?m)^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="([^"\r\n]*)"')) {
  $connection[$match.Groups[1].Value] = $match.Groups[2].Value
}
if ($connection.Count -ne 5 -or $connection.PGHOST -ne 'aws-1-ap-south-1.pooler.supabase.com' -or
    $connection.PGPORT -ne '5432' -or $connection.PGUSER -ne 'cli_login_postgres.mvbmpcmexkgfairnthux' -or
    $connection.PGDATABASE -ne 'postgres' -or $plan -notmatch '--role "postgres"') {
  throw 'CLI connection plan does not match Bounty Hunter.'
}
$prior = @{}
foreach ($key in @('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE')) {
  $prior[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
  foreach ($key in $connection.Keys) { [Environment]::SetEnvironmentVariable($key, $connection[$key], 'Process') }
  $env:PGSSLMODE = 'require'
  # Callers explicitly SET ROLE postgres / use pg_dump --role postgres. Poolers
  # need not honor startup PGOPTIONS; the backup manifest records the role.
  & $Action
} finally {
  foreach ($key in $prior.Keys) { [Environment]::SetEnvironmentVariable($key, $prior[$key], 'Process') }
  $connection.Clear()
  $plan = $null
}
