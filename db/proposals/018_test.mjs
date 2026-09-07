// Real PostgreSQL authorization tests; no production connection input is accepted.
// Requires initdb, pg_ctl and psql on PATH. No npm dependency or Docker daemon.
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const include020 = process.argv.slice(2).includes('--include-020');
const include019 = include020 || process.argv.slice(2).includes('--include-019');
assert(process.argv.slice(2).every(arg => ['--include-019','--include-020'].includes(arg)), 'Only local suite flags accepted; no database input');
const scratchParent = path.join(root, 'node_modules');
const scratch = path.join(scratchParent, `.security-db-018-${process.pid}`);
const dataDir = path.join(scratch, 'data');
const executable = name => process.platform === 'win32' ? `${name}.exe` : name;
const server = net.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
mkdirSync(scratch, { recursive: true });
const read = relative => readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, '');
const run = (name, args, input) => {
  const result = spawnSync(executable(name), args, {
    cwd: root, input, encoding: 'utf8', windowsHide: true,
    // On Windows the detached postgres server can inherit pipe handles even with
    // pg_ctl -l, keeping spawnSync open after pg_ctl exits. Log file is authoritative.
    ...(name === 'pg_ctl' ? { stdio: 'ignore' } : {}),
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('PG'))),
      PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'postgres', PGDATABASE: 'postgres' },
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
};
const sql = (input, expectedSuccess = true) => {
  const result = run('psql', ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'], input);
  assert.equal(result.status === 0, expectedSuccess, `${result.stderr}\n${result.stdout}`);
  return result;
};

const q = value => `'${value.replaceAll("'", "''")}'`;
const ident = value => `"${value.replaceAll('"', '""')}"`;
const user = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const op = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const task = n => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const reward = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const as = (role = 'service_role', uid = user(1)) => `SET LOCAL ROLE ${ident(role)}; SELECT set_config('request.jwt.claims',${q(JSON.stringify({ role, sub: uid, email: `${uid}@example.invalid` }))},true);`;
const begin = (u = 1, s = u, o = u) => `public.begin_account_deletion('${user(u)}','${sid(s)}','${op(o)}')`;
const truth = (condition, label) => `SELECT test.assert_true((${condition}),${q(label)});`;
let checks = 0;
const check = (name, statement, role = 'service_role', uid = user(1)) => {
  sql(`BEGIN; ${as(role, uid)} ${statement} ROLLBACK;`);
  console.log(`PASS ${name}`); checks++;
};
const denied = statement => `SELECT test.denied(${q(statement)});`;
let started = false;
try {
  let result = run('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  assert.equal(result.status, 0, result.stderr);
  result = run('pg_ctl', ['-D', dataDir, '-l', path.join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c wal_level=logical`, '-w', 'start']);
  assert.equal(result.status, 0, result.stderr); started = true;
  sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions; CREATE SCHEMA test;
    GRANT USAGE ON SCHEMA public,auth,storage,extensions,test TO anon,authenticated,service_role;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE FUNCTION extensions.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users ON DELETE CASCADE,created_at timestamptz,not_after timestamptz);
    CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets,name text NOT NULL,
      owner uuid,owner_id text,metadata jsonb DEFAULT '{}',UNIQUE(bucket_id,name));
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON storage.objects TO anon,authenticated,service_role;
    CREATE PUBLICATION supabase_realtime;
    CREATE FUNCTION test.assert_true(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label; END IF; END $$;
    CREATE FUNCTION test.denied(statement text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RETURN; END; RAISE EXCEPTION 'Expected denial: %',statement; END $$;`);
  const dump = read('supabase/schema_backup_20260730_185314.sql');
  const tables = [...dump.matchAll(/CREATE TABLE "public"\."([^"]+)" \([\s\S]*?\r?\n\);/g)];
  assert.equal(tables.length, 9, 'Review new public tables before changing cleanup');
  sql(tables.map(([statement, name]) => `${statement}
    ALTER TABLE public.${ident(name)} ADD PRIMARY KEY(${name === 'user_credits' ? 'user_id' : 'id'});
    ALTER TABLE public.${ident(name)} ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.${ident(name)} TO anon,authenticated,service_role;`).join('\n'));
  sql('ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;');
  const snapshot = JSON.parse(read('docs/release/live-safety-snapshot.json'));
  sql(snapshot.foreign_keys.map(f => `ALTER TABLE public.${ident(f.child)} ADD CONSTRAINT ${ident(f.conname)} ${f.definition};`).join('\n'));
  sql(snapshot.policies.filter(p => p.schemaname === 'public' || p.schemaname === 'storage' && p.tablename === 'objects').map(p =>
    `CREATE POLICY ${ident(p.policyname)} ON ${ident(p.schemaname)}.${ident(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(ident).join(',')}${p.qual ? ` USING (${p.qual})` : ''}${p.with_check ? ` WITH CHECK (${p.with_check})` : ''};`).join('\n'));
  sql(`INSERT INTO auth.users(id,email) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'account'||n||'@example.invalid' FROM generate_series(1,9)n;
    INSERT INTO public.profiles(id,email) SELECT id,id::text||'@example.invalid' FROM auth.users;
    INSERT INTO auth.sessions(id,user_id,created_at) SELECT ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now() FROM generate_series(1,9)n;
    INSERT INTO storage.buckets(id,public) VALUES('avatars',true),('reward-images',true),('bounty-proofs',false);
    INSERT INTO tasks(id,created_by,assigned_to,title) VALUES('${task(1)}','${user(1)}','${user(2)}','Departing creator'),('${task(2)}','${user(2)}','${user(1)}','Departing recipient'),('${task(3)}','${user(2)}','${user(3)}','Retain mission');
    INSERT INTO rewards_store(id,creator_id,assigned_to,name,credit_cost) VALUES('${reward(1)}','${user(1)}','${user(2)}','Remove reward',5),('${reward(2)}','${user(2)}','${user(1)}','Private surviving reward',5);
    INSERT INTO collected_rewards(reward_id,collector_id) VALUES('${reward(1)}','${user(2)}'),('${reward(2)}','${user(1)}');
    INSERT INTO friendships(user1_id,user2_id,requested_by,status) VALUES('${user(1)}','${user(2)}','${user(2)}','accepted');
    INSERT INTO invites(inviter_id) VALUES('${user(1)}');
    INSERT INTO user_credits(user_id,balance,total_earned) VALUES('${user(1)}',10,20),('${user(2)}',30,40);
    INSERT INTO credit_transactions(user_id,task_id,amount,transaction_type) VALUES('${user(1)}','${task(1)}',5,'earned'),('${user(2)}','${task(1)}',7,'earned'),('${user(2)}','${task(3)}',9,'earned');
    INSERT INTO daily_mission_streaks(contract_id,user_id,last_completion_date) VALUES('${task(1)}','${user(2)}',current_date);
    UPDATE profiles SET partner_user_id='${user(1)}' WHERE id='${user(2)}';
    INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES
      ('avatars','${user(1)}/avatar.webp','${user(9)}'),('reward-images','rewards/${user(1)}/reward.webp','${user(9)}'),
      ('bounty-proofs','proofs/${task(1).toUpperCase()}/proof.pdf','${user(2)}'),('bounty-proofs','proofs/${task(2)}/proof.pdf','${user(2)}'),
      ('avatars','legacy-private.webp','${user(1)}'),('avatars','${user(2)}/keep.webp','${user(2)}');`);
  sql(read('db/proposals/016_profile_storage_repair.up.sql'));
  sql(read('db/proposals/017_connection_consent.up.sql'));
  sql(read('db/proposals/018_account_deletion.up.sql'));
  sql(read('db/proposals/018_account_deletion.up.sql'));
  sql(`BEGIN READ ONLY; ${read('db/proposals/018_validation.sql')} COMMIT;`);
  check('full snapshot FK guard and ordered/repeated 018 apply', `SELECT ${begin()};`);
  check('service-only deletion APIs cannot be invoked by authenticated callers', denied(`SELECT ${begin()}`), 'authenticated');
  check('anonymous receipt RPC unavailable', denied(`SELECT public.account_deletion_receipt('${user(1)}','${op(1)}')`), 'anon');
  check('marker cannot be read directly by authenticated clients', denied('SELECT * FROM bounty_private.account_deletions'), 'authenticated');
  check('valid fresh session starts operation', truth(`${begin()}->>'phase'='storage'`, 'fresh session'));
  check('another users session never qualifies', truth(`${begin(1,2)}->>'error'='reauth_required'`, 'bound user/session'));
  sql(`UPDATE auth.sessions SET created_at=now()-interval '1 hour' WHERE id='${sid(4)}'; UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id='${sid(5)}';`);
  check('refreshing token cannot make an old session fresh', truth(`${begin(4)}->>'error'='reauth_required'`, 'old created_at'));
  check('expired not_after session refused', truth(`${begin(5)}->>'error'='reauth_required'`, 'expired session'));
  check('different operation cannot replace pending deletion', `SELECT ${begin()}; ${truth(`${begin(1,1,2)}->>'error'='deletion_in_progress'`, 'stable receipt')}`);
  check('manifest includes canonical service-owned artwork, participant proofs and legacy owned files', `SELECT ${begin()}; ${truth(`jsonb_array_length(public.account_deletion_files('${user(1)}','${op(1)}'))=5`, 'five private files')}`);
  check('storage bytes must be removed before relational cleanup', `SELECT ${begin()}; ${truth(`public.cleanup_account_data('${user(1)}','${op(1)}')->>'error'='storage_remaining'`, 'storage remains')} ${truth(`EXISTS(SELECT 1 FROM profiles WHERE id='${user(1)}')`, 'profile intact')}`);
  check('receipt cannot claim success while Auth exists', `SELECT ${begin()}; ${truth(`NOT public.complete_account_deletion('${user(1)}','${op(1)}')`, 'auth remains')} ${truth(`NOT public.account_deletion_receipt('${user(1)}','${op(1)}')`, 'no false receipt')}`);
  // Deliberately broad fixture helper tests the trigger even inside owner-rights
  // RPCs. It is never deployed; real client table ACL/RLS is also retained above.
  sql(`CREATE FUNCTION test.mutate(statement text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE statement; END $$; GRANT EXECUTE ON FUNCTION test.mutate(text) TO authenticated;`);
  if (include019) {
    const { run019 } = await import('../../tests/security-db/019-cases.mjs');
    await run019({ sql, read, check, as, truth, denied, q, user, task, reward, sid, op, port, root, scratch });
  }
  if (include020) {
    const { run020 } = await import('../../tests/security-db/020-cases.mjs');
    await run020({ sql, read, check, as, truth, denied, q, user, task, reward, sid, op });
  }
  sql(`BEGIN; ${as()} SELECT ${begin()}; COMMIT;`);
  sql(`UPDATE auth.sessions SET created_at=now()-interval '1 hour' WHERE id='${sid(1)}';`);
  check('same operation/session resumes beyond initial freshness window', truth(`${begin()}->>'phase'='storage'`, 'resume old session'));
  sql(`BEGIN; DELETE FROM auth.sessions WHERE id='${sid(1)}'; ${as()} ${truth(`${begin()}->>'error'='reauth_required'`, 'revoked retry refused')} ROLLBACK;`);
  console.log('PASS revoked session cannot resume a pending operation'); checks++;
  for (const [name, statement] of [
    ['departing actor', `UPDATE profiles SET display_name='retry write' WHERE id='${user(1)}'`],
    ['counterpart mission', `UPDATE tasks SET title='late edit' WHERE id='${task(1)}'`],
    ['service-owned canonical avatar', `UPDATE storage.objects SET metadata='{}' WHERE name='${user(1)}/avatar.webp'`],
    ['service-owned canonical reward art', `UPDATE storage.objects SET metadata='{}' WHERE name='rewards/${user(1)}/reward.webp'`],
    ['counterpart proof with uppercase UUID', `INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('bounty-proofs','proofs/${task(1).toUpperCase()}/late.pdf','${user(2)}')`],
    ['new reward assignment', `UPDATE rewards_store SET assigned_to='${user(1)}' WHERE id='${reward(2)}'`],
  ]) check(`freeze blocks ${name}`, denied(`SELECT test.mutate(${q(statement)})`), 'authenticated', user(2));
  check('ordinary service upload cannot recreate frozen canonical artwork', denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','${user(1)}/service-late.webp')`));
  check('ordinary service upload cannot recreate another participants frozen proof', denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('bounty-proofs','proofs/${task(1).toUpperCase()}/service-late.pdf')`));
  check('frozen actor cannot read via lingering JWT', truth('(SELECT count(*) FROM profiles)=0', 'no profile read'), 'authenticated');
  // Test-only metadata removal simulates successful Storage API deletion; this
  // line must never be copied to a production runbook or migration.
  sql(`BEGIN; ${as()} DELETE FROM storage.objects WHERE name<>'${user(2)}/keep.webp'; SELECT public.cleanup_account_data('${user(1)}','${op(1)}'); COMMIT;`);
  check('cleanup removes profile, owned rewards, shared missions/collections and personal ledger', truth(`NOT EXISTS(SELECT 1 FROM profiles WHERE id='${user(1)}') AND (SELECT count(*) FROM tasks)=1 AND (SELECT count(*) FROM rewards_store)=1 AND (SELECT count(*) FROM collected_rewards)=0 AND (SELECT count(*) FROM credit_transactions WHERE user_id='${user(1)}')=0`, 'cleaned data'));
  check('other peoples balances and amounts survive without deleted mission links', truth(`(SELECT balance=30 AND total_earned=40 FROM user_credits WHERE user_id='${user(2)}') AND (SELECT amount=7 AND task_id IS NULL FROM credit_transactions WHERE amount=7) AND (SELECT task_id='${task(3)}' FROM credit_transactions WHERE amount=9)`, 'credit preservation'));
  check('other creators reward remains theirs, inactive with cleared assignment', truth(`(SELECT creator_id='${user(2)}' AND assigned_to IS NULL AND NOT is_active FROM rewards_store WHERE id='${reward(2)}')`, 'private reward preserved'));
  check('unassigned surviving reward stays hidden from unrelated account', truth(`(SELECT count(*) FROM rewards_store)=0`, 'unassigned reward private'), 'authenticated', user(3));
  check('even reactivated detached reward cannot be purchased by known UUID', `UPDATE rewards_store SET is_active=true WHERE id='${reward(2)}'; ${as('authenticated',user(3))} ${truth(`public.purchase_reward('${reward(2)}','${user(3)}')->>'error'='NOT_RECIPIENT'`, 'purchase private')}`);
  check('cleanup retry is idempotent', truth(`public.cleanup_account_data('${user(1)}','${op(1)}')->>'phase'='auth'`, 'idempotent'));
  sql(`DELETE FROM auth.users WHERE id='${user(1)}';`); // Test only: Auth API represented by FK-enforced row removal.
  check('lost Auth response can be confirmed without final phase update', truth(`public.account_deletion_receipt('${user(1)}','${op(1)}')`, 'actual identity absent'));
  check('completion is repeatable and receipt cannot be reused with another account', truth(`public.complete_account_deletion('${user(1)}','${op(1)}') AND public.complete_account_deletion('${user(1)}','${op(1)}') AND NOT public.account_deletion_receipt('${user(2)}','${op(1)}')`, 'scoped receipt'));
  check('old JWT cannot recreate profile after Auth removal', denied(`INSERT INTO profiles(id,email) VALUES('${user(1)}','${user(1)}@example.invalid')`), 'authenticated');
  sql('CREATE SCHEMA future_feature; CREATE TABLE future_feature.new_personal_data(id uuid REFERENCES public.profiles);');
  assert.match(sql(`BEGIN; ${as()} SELECT ${begin(6)};`, false).stderr, /deletion_schema_changed/);
  sql('DROP TABLE future_feature.new_personal_data; CREATE TABLE future_feature.reward_audit(id uuid REFERENCES public.collected_rewards);');
  assert.match(sql(`BEGIN; ${as()} SELECT ${begin(6)};`, false).stderr, /deletion_schema_changed/);
  sql('DROP TABLE future_feature.reward_audit; DROP SCHEMA future_feature;'); console.log('PASS unknown incoming FKs to profile and deleted collection abort before freeze/storage'); checks++;
  sql('CREATE TABLE public.new_unlinked_data(id uuid);');
  assert.match(sql(`BEGIN; ${as()} SELECT ${begin(6)};`, false).stderr, /deletion_table_inventory_changed/);
  sql('DROP TABLE public.new_unlinked_data;'); console.log('PASS new public table requires deletion-scope review even without FK'); checks++;
  sql('CREATE POLICY unexpected_public_rewards ON rewards_store FOR SELECT TO authenticated USING(true);');
  assert.match(sql(`BEGIN; ${as()} SELECT ${begin(6)};`, false).stderr, /deletion_reward_privacy_changed/);
  sql('DROP POLICY unexpected_public_rewards ON rewards_store;'); console.log('PASS widened reward visibility aborts deletion'); checks++;
  sql('ALTER FUNCTION public.purchase_reward(uuid,uuid) SECURITY INVOKER;');
  assert.match(sql(`BEGIN; ${as()} SELECT ${begin(6)};`, false).stderr, /deletion_purchase_boundary_changed/);
  sql('ALTER FUNCTION public.purchase_reward(uuid,uuid) SECURITY DEFINER;'); console.log('PASS purchase function drift aborts deletion'); checks++;

  // Two real database sessions: a mutation starts before the deletion marker is
  // committed, blocks on its lock, then must reject using the fresh snapshot.
  const connection = label => {
    const child = spawn(executable('psql'), ['-X','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-qAt'], {
      cwd: root, windowsHide: true, env: { ...process.env, PGAPPNAME: label }, stdio: ['pipe','pipe','pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    const done = new Promise(resolve => child.on('close', code => resolve({ code, stdout, stderr })));
    return { child, done, output: () => stdout };
  };
  const until = async predicate => {
    const end = Date.now()+10000;
    while (!predicate()) { assert(Date.now()<end,'Concurrency handshake timed out'); await new Promise(resolve => setTimeout(resolve,20)); }
  };
  const first = connection('018-deletion-holder');
  first.child.stdin.write(`BEGIN; ${as()} SELECT ${begin(6)}; SELECT 'READY';\n`);
  await until(() => first.output().includes('READY'));
  const second = connection('018-waiting-mutation');
  second.child.stdin.end(`BEGIN; ${as('authenticated',user(2))} SELECT test.mutate('INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES(''avatars'',''${user(6)}/raced.webp'',''${user(9)}'')'); COMMIT;\n`);
  await until(() => sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='018-waiting-mutation' AND wait_event='advisory';").stdout.trim()==='1');
  first.child.stdin.end('COMMIT;\n');
  assert.equal((await first.done).code,0);
  const waited = await second.done;
  assert.notEqual(waited.code,0); assert.match(waited.stderr,/account_inactive/);
  sql(truth(`NOT EXISTS(SELECT 1 FROM storage.objects WHERE name='${user(6)}/raced.webp')`, 'raced object rejected'));
  console.log('PASS real concurrent pre-existing mutation rechecks after deletion commits'); checks++;
  const mutationFirst = connection('018-mutation-holder');
  mutationFirst.child.stdin.write(`BEGIN; ${as('authenticated',user(2))} SELECT test.mutate('INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES(''avatars'',''${user(7)}/before-delete.webp'',''${user(9)}'')'); SELECT 'READY';\n`);
  await until(() => mutationFirst.output().includes('READY'));
  const deletionSecond = connection('018-waiting-deletion');
  deletionSecond.child.stdin.end(`BEGIN; ${as()} SELECT ${begin(7)}; COMMIT;\n`);
  await until(() => sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='018-waiting-deletion' AND wait_event='advisory';").stdout.trim()==='1');
  mutationFirst.child.stdin.end('COMMIT;\n');
  assert.equal((await mutationFirst.done).code,0);
  const deletedAfterWrite = await deletionSecond.done;
  assert.equal(deletedAfterWrite.code,0,deletedAfterWrite.stderr); assert.match(deletedAfterWrite.stdout,/storage/);
  check('winning concurrent upload is present in deletion manifest', truth(`jsonb_array_length(public.account_deletion_files('${user(7)}','${op(7)}'))=1`, 'previously committed upload inventoried'));
  console.log(`\n${checks} PostgreSQL account deletion checks passed. No production connection used.`);
} finally {
  if (started) {
    const result = run('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
    if (result.status !== 0) throw new Error(`Local DB stop failed; preserve ${scratch} for cleanup: ${result.stderr}`);
  }
  // This is a generated test-only child of node_modules, verified before deletion.
  if (path.dirname(path.resolve(scratch)) !== path.resolve(scratchParent)
    || !path.basename(scratch).startsWith('.security-db-018-')) throw new Error('Unsafe scratch cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
