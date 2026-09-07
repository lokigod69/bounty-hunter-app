// Restore an actual schema/ACL archive and rehearse the release locally. Never
// accepts a database URL; external Auth/extension definitions are fixture-only.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pushOnly=process.argv[3]==='--push';
assert(process.argv.length===(pushOnly?4:3),'Supply the local backup manifest and optional --push');
const manifestPath=realpathSync(process.argv[2]);
assert(manifestPath.startsWith(realpathSync(path.join(root,'supabase/backups'))+path.sep));
const manifest=JSON.parse(readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));
assert.equal(path.basename(manifest.archive),manifest.archive);
const archive=path.join(path.dirname(manifestPath),manifest.archive);
assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex').toUpperCase(),manifest.sha256);
const scratch=path.join(root,'node_modules',`.rehearse-backup-${process.pid}`);
mkdirSync(scratch,{recursive:true});
const server=net.createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
await new Promise(resolve=>server.close(resolve));
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG'))),PGHOST:'127.0.0.1',PGPORT:String(port),PGUSER:'postgres',PGDATABASE:'postgres'};
function run(name,args,input) {
  const r=spawnSync(process.platform==='win32'?`${name}.exe`:name,args,{cwd:root,env,input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,...(name==='pg_ctl'?{stdio:'ignore'}:{})});
  assert.equal(r.status,0,`${name}: ${r.error??''}\n${r.stderr??''}\n${r.stdout??''}`);
  return r.stdout??'';
}
const sql=text=>run('psql',['-X','-v','ON_ERROR_STOP=1','-qAt'],text);
let started=false;
try {
  run('initdb',['-D',path.join(scratch,'data'),'-U','postgres','--auth=trust','--encoding=UTF8','--no-locale']);
  run('pg_ctl',['-D',path.join(scratch,'data'),'-l',path.join(scratch,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c wal_level=logical`,'-w','start']); started=true;
  sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE ROLE supabase_admin NOLOGIN; CREATE ROLE supabase_auth_admin NOLOGIN; CREATE ROLE supabase_storage_admin NOLOGIN; CREATE ROLE dashboard_user NOLOGIN;
    CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE EXTENSION "uuid-ossp" SCHEMA extensions; CREATE EXTENSION pgcrypto SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users ON DELETE CASCADE,created_at timestamptz,not_after timestamptz);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
    CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email' $$;
    GRANT USAGE ON SCHEMA auth,extensions TO anon,authenticated,service_role;
    DROP SCHEMA public;
    CREATE PUBLICATION supabase_realtime;`);
  run('pg_restore',['--exit-on-error','--single-transaction','--dbname','postgres',archive]);
  console.log('PASS actual public/storage schema and ACL archive restored; no application rows copied');
  const buckets=JSON.parse(readFileSync(path.join(root,'docs/release/verification/bucket-config-before-rollout.json'),'utf8').replace(/^\uFEFF/,''));
  // Bucket configuration is operational metadata omitted by a schema-only dump.
  // No Storage object, Auth identity or application record is copied.
  sql(`INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    SELECT id,name,public,file_size_limit,allowed_mime_types FROM jsonb_to_recordset('${JSON.stringify(buckets).replaceAll("'","''")}'::jsonb)
    AS b(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  const before=sql(`SELECT count(*) FROM pg_policies WHERE schemaname IN('public','storage');`).trim();
  const migrations=pushOnly?['020_native_push']:['016_profile_storage_repair','017_connection_consent','018_account_deletion','019_contact_safety'];
  for(const name of migrations) {
    sql(readFileSync(path.join(root,`db/proposals/${name}.up.sql`),'utf8'));
    sql(readFileSync(path.join(root,`db/proposals/${name.slice(0,3)}_validation.sql`),'utf8'));
    console.log(`PASS restored production schema: ${name} + validation`);
  }
  sql('SELECT bounty_private.assert_deletion_schema();');
  const report={verifiedAt:new Date().toISOString(),archive:manifest.archive,sha256:manifest.sha256,sourcePostgres:'17.6',localPostgres:sql("SHOW server_version;").trim(),policiesRestored:Number(before),bucketConfigsRestored:buckets.length,migrations,externalFixtures:['auth.users','auth.sessions','auth.uid/jwt/role/email','extensions.uuid-ossp/pgcrypto','Supabase roles','empty Realtime publication'],applicationRowsCopied:false};
  mkdirSync(path.join(root,'docs/release/verification'),{recursive:true});
  writeFileSync(path.join(root,`docs/release/verification/${pushOnly?'push':'rollout'}-rehearsal.json`),JSON.stringify(report,null,2)+'\n');
} finally {
  if(started) run('pg_ctl',['-D',path.join(scratch,'data'),'-m','immediate','-w','stop']);
  assert(scratch.startsWith(path.join(root,'node_modules')+path.sep) && path.basename(scratch).startsWith('.rehearse-backup-'));
  rmSync(scratch,{recursive:true,force:true});
}
