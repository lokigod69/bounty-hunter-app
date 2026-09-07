import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// Called only by the isolated cluster runner; not a production backup command.
export function checkBackup({ root, scratch, port, sql }) {
  const backupDir=path.join(scratch,'backups');
  const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.toUpperCase().startsWith('PG'))),PGPASSWORD:'unused-local-trust-fixture',PGSSLMODE:'disable'};
  const run=(name,args,input)=>{
    const r=spawnSync(name,args,{cwd:root,env,input,encoding:'utf8',windowsHide:true});
    assert.equal(r.status,0,`${r.stderr}\n${r.stdout}`); return r.stdout;
  };
  const target=['-DbHost','127.0.0.1','-DbPort',String(port),'-DbUser','postgres','-DbName','postgres'];
  run('pwsh',['-NoProfile','-File','scripts/prod/backup_schema.ps1',...target,'-NoPrompt','-OutputDirectory',backupDir]);
  const manifest=path.join(backupDir,readdirSync(backupDir).find(f=>f.endsWith('.json')));
  const quote=s=>`'${s.replaceAll("'","''")}'`;
  run('pwsh',['-NoProfile','-Command',`
    $ErrorActionPreference='Stop'
    . ./scripts/prod/schema_backup_guard.ps1
    $targetArgs=@{ManifestPath=${quote(manifest)};DbHost='127.0.0.1';DbPort=${port};DbUser='postgres';DbName='postgres'}
    $archive=Assert-SchemaBackup @targetArgs
    function ExpectFailure([scriptblock]$action) { $failed=$false; try { & $action } catch { $failed=$true }; if (-not $failed) { throw 'Expected guard refusal' } }
    ExpectFailure { Assert-SchemaBackup @targetArgs -DbRole service_role }
    $original=Get-Content -LiteralPath ${quote(manifest)} -Raw
    $record=$original|ConvertFrom-Json
    $record.host='different-target'; $record|ConvertTo-Json|Set-Content -LiteralPath ${quote(manifest)}
    ExpectFailure { Assert-SchemaBackup @targetArgs }
    $record.host='127.0.0.1';$record.createdAt=[DateTimeOffset]::UtcNow.AddDays(-2).ToString('o');$record|ConvertTo-Json|Set-Content -LiteralPath ${quote(manifest)}
    ExpectFailure { Assert-SchemaBackup @targetArgs }
    $record=$original|ConvertFrom-Json;$record.sha256='tampered';$record|ConvertTo-Json|Set-Content -LiteralPath ${quote(manifest)}
    ExpectFailure { Assert-SchemaBackup @targetArgs }
    $record=$original|ConvertFrom-Json;$record.schemas=@('public','storage');$record|ConvertTo-Json|Set-Content -LiteralPath ${quote(manifest)}
    ExpectFailure { Assert-SchemaBackup @targetArgs }
    $original|Set-Content -LiteralPath ${quote(manifest)}
    $env:PROD_CONFIRM=''
    ExpectFailure { & ./scripts/prod/apply_sql.ps1 -Sql db/proposals/019_contact_safety.up.sql -BackupManifest ${quote(manifest)} -DbHost 127.0.0.1 -DbPort ${port} -DbUser postgres }
    pg_dump -h 127.0.0.1 -p ${port} -U postgres -d postgres --format=custom --schema-only --schema=public --schema=storage --no-privileges --file ${quote(path.join(backupDir,'no-acl.backup'))}
    if ($LASTEXITCODE -ne 0) {throw 'local negative fixture dump failed'}
    ExpectFailure { Assert-SchemaArchive ${quote(path.join(backupDir,'no-acl.backup'))} }
  `]);
  sql('CREATE DATABASE backup_restore_check;');
  const authSchema=run('pg_dump',['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','--schema-only','--schema=auth','--schema=extensions','--schema=test']);
  run('psql',['-X','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','backup_restore_check','-v','ON_ERROR_STOP=1'],'DROP SCHEMA public;\n'+authSchema);
  const archive=manifest.slice(0,-5);
  run('pg_restore',['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','backup_restore_check','--exit-on-error','--single-transaction',archive]);
  const restored=run('psql',['-X','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','backup_restore_check','-qAt','-c',`SELECT (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass) AND NOT has_column_privilege('authenticated','public.profiles','role','UPDATE') AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage') AND to_regclass('bounty_private.account_deletions') IS NOT NULL;`]);
  assert.equal(restored.trim(),'t');
  sql('DROP DATABASE backup_restore_check;');
  console.log('PASS schema/ACL backup restored into a second local database; missing ACL, wrong target, stale, tampered, incomplete and unapproved apply rejected');
}
