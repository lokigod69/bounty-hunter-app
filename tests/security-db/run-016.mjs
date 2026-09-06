// Real PostgreSQL authorization tests; no production connection input is accepted.
// Requires initdb, pg_ctl and psql on PATH. No npm dependency or Docker daemon.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.argv.slice(2).every(arg => arg === '--include-017'), 'Only --include-017 is accepted; this runner never connects to a supplied database');
const scratchParent = path.join(root, 'node_modules');
const scratch = path.join(scratchParent, `.security-db-016-${process.pid}`);
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
const user = n => `00000000-0000-4000-8000-00000000000${n}`;
const mission = '10000000-0000-4000-8000-000000000001';
let checks = 0;
const check = (label, statement, role = 'authenticated', uid = user(1)) => {
  sql(`BEGIN; SET LOCAL ROLE ${ident(role)}; SELECT set_config('request.jwt.claim.sub', ${q(uid)}, true), set_config('request.jwt.claim.email', ${q(`${uid}@example.invalid`)}, true); ${statement}; ROLLBACK;`);
  checks++;
  console.log(`PASS ${label}`);
};
const denied = statement => `SELECT test.denied(${q(statement)})`;
const truth = (condition, label) => `SELECT test.assert_true((${condition}), ${q(label)})`;
const noRows = (statement, label) => `WITH changed AS (${statement} RETURNING id) SELECT test.assert_true(count(*)=0, ${q(label)}) FROM changed`;
const objectCount = bucket => `(SELECT count(*) FROM storage.objects WHERE bucket_id = ${q(bucket)})`;
let started = false;
try {
  let result = run('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  assert.equal(result.status, 0, result.stderr);
  result = run('pg_ctl', ['-D', dataDir, '-l', path.join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c wal_level=logical`, '-w', 'start']);
  assert.equal(result.status, 0, result.stderr);
  started = true;
  sql(read('tests/security-db/016-fixture.sql'));
  const snapshot = JSON.parse(read('docs/release/live-safety-snapshot.json'));
  const policyTables = new Set(['public.profiles', 'public.tasks', 'public.friendships', 'public.user_credits', 'storage.objects']);
  sql(snapshot.policies.filter(p => policyTables.has(`${p.schemaname}.${p.tablename}`)).map(p =>
    `CREATE POLICY ${ident(p.policyname)} ON ${ident(p.schemaname)}.${ident(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(r => r === 'public' ? 'PUBLIC' : ident(r)).join(', ')}${p.qual ? ` USING (${p.qual})` : ''}${p.with_check ? ` WITH CHECK (${p.with_check})` : ''};`
  ).join('\n'));
  const functions = JSON.parse(read('docs/release/live-functions.json')).filter(f => ['create_task', 'update_task'].includes(f.proname));
  assert.equal(functions.length, 2);
  sql(functions.map(f => `${f.definition};`).join('\n') + `
    REVOKE ALL ON FUNCTION public.create_task(text,text,uuid,date,text,text,boolean,boolean), public.update_task(uuid,jsonb) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.create_task(text,text,uuid,date,text,text,boolean,boolean), public.update_task(uuid,jsonb) TO authenticated;`);

  // Reproduce the confirmed holes first, to show the fixture can detect the repair.
  check('baseline: anonymous proof exposure reproduced', truth(`${objectCount('bounty-proofs')} = 1`, 'baseline proof'), 'anon', '');
  check('baseline: client role escalation reproduced', `UPDATE profiles SET role = 'admin' WHERE id = ${q(user(1))}; ${truth("(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'", 'role update')}`);
  check('baseline: legacy admin can see unrelated task', truth('(SELECT count(*) FROM tasks) = 1', 'admin bypass'), 'authenticated', user(3));
  sql(read('db/proposals/016_preflight.sql'));

  const migration = read('db/proposals/016_profile_storage_repair.up.sql');
  sql('CREATE POLICY "unreviewed wide read" ON storage.objects FOR SELECT USING (true);');
  assert.match(sql(migration, false).stderr, /unexpected storage policies/);
  sql('DROP POLICY "unreviewed wide read" ON storage.objects;');
  checks++; console.log('PASS unfamiliar policy drift aborts before changing access');
  sql('CREATE ROLE inherited_writer; GRANT UPDATE(role) ON profiles TO inherited_writer; GRANT inherited_writer TO authenticated;');
  assert.match(sql(migration, false).stderr, /protected profile column role/);
  sql(`SELECT test.assert_true(NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass), 'failed migration rolled back'); REVOKE inherited_writer FROM authenticated; DROP OWNED BY inherited_writer; DROP ROLE inherited_writer;`);
  checks++; console.log('PASS inherited privilege bypass aborts and rolls back atomically');
  sql(migration);
  sql(migration);
  sql(`BEGIN READ ONLY; ${read('db/proposals/016_validation.sql')} COMMIT;`);
  checks++; console.log('PASS repair, repeat apply and read-only metadata verification');

  check('anonymous profiles unreadable', denied('SELECT * FROM profiles'), 'anon', '');
  check('anonymous profile insert denied', denied(`INSERT INTO profiles(id,email) VALUES (${q(user(4))}, 'new@example.invalid')`), 'anon', '');
  check('anonymous profile update denied', denied("UPDATE profiles SET display_name = 'attacker'"), 'anon', '');
  check('anonymous profile delete denied', denied('DELETE FROM profiles'), 'anon', '');
  check('anonymous profile truncate denied', denied('TRUNCATE profiles CASCADE'), 'anon', '');
  check('fresh profile bootstrap returns safe default', `INSERT INTO profiles(id,email,display_name,avatar_url) VALUES (${q(user(4))}, '${user(4)}@example.invalid', 'New hunter', null) RETURNING *; ${truth("(SELECT role FROM profiles WHERE id = auth.uid()) = 'user'", 'default role')}`, 'authenticated', user(4));
  check('bootstrap cannot supply admin role', denied(`INSERT INTO profiles(id,email,role) VALUES (${q(user(4))}, 'new@example.invalid', 'admin')`), 'authenticated', user(4));
  check('bootstrap cannot create another profile', denied(`INSERT INTO profiles(id,email) VALUES (${q(user(5))}, 'other@example.invalid')`), 'authenticated', user(4));
  check('existing profile upsert preserves role', `INSERT INTO profiles(id,email,display_name,avatar_url) VALUES (${q(user(1))}, '${user(1)}@example.invalid', 'Updated hunter', null) ON CONFLICT(id) DO UPDATE SET id = excluded.id, email = excluded.email, display_name = excluded.display_name, avatar_url = excluded.avatar_url RETURNING *; ${truth("(SELECT display_name FROM profiles WHERE id = auth.uid()) = 'Updated hunter'", 'upsert')}`);
  check('profile email cannot impersonate another auth identity', denied(`UPDATE profiles SET email='${user(2)}@example.invalid' WHERE id=auth.uid()`));
  check('fresh bootstrap cannot spoof profile email', denied(`INSERT INTO profiles(id,email) VALUES ('${user(4)}','${user(2)}@example.invalid')`), 'authenticated', user(4));
  check('verified auth email change can update profile', `SELECT set_config('request.jwt.claim.email','verified-new@example.invalid',true); UPDATE profiles SET email='verified-new@example.invalid' WHERE id=auth.uid(); ${truth("(SELECT email FROM profiles WHERE id=auth.uid())='verified-new@example.invalid'", 'verified email update')}`);
  check('stale JWT blocks mismatch until token refresh', `SELECT set_config('request.jwt.claim.email','old@example.invalid',true); ${denied(`UPDATE profiles SET email='${user(1)}@example.invalid',display_name='Refreshed' WHERE id=auth.uid()`)}; SELECT set_config('request.jwt.claim.email','${user(1)}@example.invalid',true); UPDATE profiles SET display_name='Refreshed' WHERE id=auth.uid(); ${truth("(SELECT display_name FROM profiles WHERE id=auth.uid())='Refreshed'", 'refreshed JWT')}`);
  check('palette and onboarding persist', `UPDATE profiles SET theme='couple', onboarding_completed=true WHERE id=auth.uid(); ${truth("(SELECT theme='couple' AND onboarding_completed FROM profiles WHERE id=auth.uid())", 'preferences')}`);
  check('existing role cannot change', denied("UPDATE profiles SET role='admin' WHERE id=auth.uid()"));
  check('timestamps cannot change', denied("UPDATE profiles SET created_at=now() WHERE id=auth.uid()"));
  check('legacy partner column cannot change', denied(`UPDATE profiles SET partner_user_id=${q(user(2))} WHERE id=auth.uid()`));
  check('cross-user profile write matches zero rows', noRows(`UPDATE profiles SET display_name='attacker' WHERE id=${q(user(2))}`, 'cross-user write'));
  check('changing profile id to another user denied', denied(`UPDATE profiles SET id=${q(user(4))} WHERE id=auth.uid()`));
  check('authenticated profile delete denied', denied('DELETE FROM profiles WHERE id=auth.uid()'));
  check('authenticated profile truncate denied', denied('TRUNCATE profiles CASCADE'));
  check('authenticated email lookup preserved', truth(`(SELECT count(*) FROM profiles WHERE email=${q(`${user(2)}@example.invalid`)}) = 1`, 'email lookup'));
  check('old admin value has no task bypass', truth('(SELECT count(*) FROM tasks)=0', 'no admin bypass'), 'authenticated', user(3));
  check('direct task creation denied', denied("INSERT INTO tasks(title,created_by) VALUES ('bypass',auth.uid())"));
  check('direct task approval denied', denied("UPDATE tasks SET status='completed'"));
  check('direct task deletion denied', denied('DELETE FROM tasks'));
  check('direct task truncate denied', denied('TRUNCATE tasks CASCADE'));
  check('real live create_task RPC still works', truth(`(public.create_task('RPC task', NULL, ${q(user(2))}::uuid)->>'success')::boolean`, 'create RPC'));
  check('real live update_task RPC still works', truth(`(public.update_task(${q(mission)}::uuid, '{"title":"Edited"}'::jsonb)->>'success')::boolean`, 'update RPC'));
  check('real update RPC still refuses outsider', truth(`public.update_task(${q(mission)}::uuid, '{"title":"Wrong"}'::jsonb)->>'error' = 'not_creator'`, 'update outsider'), 'authenticated', user(3));
  check('anonymous proofs cannot be listed', truth(`${objectCount('bounty-proofs')}=0`, 'private proofs'), 'anon', '');
  check('outsider proofs cannot be listed', truth(`${objectCount('bounty-proofs')}=0`, 'private proofs'), 'authenticated', user(3));
  check('creator reads proof', truth(`${objectCount('bounty-proofs')}=1`, 'creator reads'));
  check('assignee reads proof', truth(`${objectCount('bounty-proofs')}=1`, 'assignee reads'), 'authenticated', user(2));
  const proofInsert = `INSERT INTO storage.objects(bucket_id,name) VALUES ('bounty-proofs','proofs/${mission}/new.pdf')`;
  check('assignee uploads proof', proofInsert, 'authenticated', user(2));
  check('creator cannot impersonate assignee upload', denied(proofInsert));
  check('outsider cannot upload proof', denied(proofInsert), 'authenticated', user(3));
  check('wrong proof namespace denied', denied(`INSERT INTO storage.objects(bucket_id,name) VALUES ('bounty-proofs','${user(2)}/leak.pdf')`), 'authenticated', user(2));
  check('malformed proof UUID yields denial, not cast error', denied("INSERT INTO storage.objects(bucket_id,name) VALUES ('bounty-proofs','proofs/not-a-uuid/proof.pdf')"), 'authenticated', user(2));
  check('assignee replaces proof', `UPDATE storage.objects SET metadata='{"updated":true}' WHERE bucket_id='bounty-proofs'; ${truth("(SELECT metadata->>'updated' FROM storage.objects WHERE bucket_id='bounty-proofs')='true'", 'proof replace')}`, 'authenticated', user(2));
  check('creator cannot replace proof', noRows("UPDATE storage.objects SET metadata='{}' WHERE bucket_id='bounty-proofs'", 'proof creator update'));
  check('creator can remove proof', `DELETE FROM storage.objects WHERE bucket_id='bounty-proofs'; ${truth(`${objectCount('bounty-proofs')}=0`, 'proof delete')}`);
  check('outsider cannot remove proof', noRows("DELETE FROM storage.objects WHERE bucket_id='bounty-proofs'", 'outsider delete'), 'authenticated', user(3));
  for (const [bucket, ownPath, otherPath] of [
    ['avatars', `${user(1)}/new.webp`, `${user(2)}/new.webp`],
    ['reward-images', `rewards/${user(1)}/new.webp`, `rewards/${user(2)}/new.webp`],
  ]) {
    check(`${bucket}: public artwork remains readable`, truth(`${objectCount(bucket)}=1`, 'public artwork'), 'anon', '');
    check(`${bucket}: owner upload works`, `INSERT INTO storage.objects(bucket_id,name) VALUES (${q(bucket)},${q(ownPath)})`);
    check(`${bucket}: spoofed owner upload denied`, denied(`INSERT INTO storage.objects(bucket_id,name) VALUES (${q(bucket)},${q(otherPath)})`));
    check(`${bucket}: outsider edit matches zero rows`, noRows(`UPDATE storage.objects SET metadata='{}' WHERE bucket_id=${q(bucket)}`, 'outsider artwork edit'), 'authenticated', user(3));
    check(`${bucket}: outsider delete matches zero rows`, noRows(`DELETE FROM storage.objects WHERE bucket_id=${q(bucket)}`, 'outsider artwork delete'), 'authenticated', user(3));
    check(`${bucket}: owner cannot move file into another namespace`, denied(`UPDATE storage.objects SET name=${q(otherPath)} WHERE bucket_id=${q(bucket)}`));
  }
  check('service role access retained', truth('(SELECT count(*) FROM tasks)=1', 'service role'), 'service_role', '');
  if (process.argv.includes('--include-017')) {
    const { verifyConsent } = await import('./017-cases.mjs');
    await verifyConsent({ sql, read, check, denied, truth, noRows, user, mission, q });
  }
  console.log(`\n${checks} PostgreSQL checks passed. No production SQL was executed.`);
} finally {
  if (started) {
    const result = run('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
    if (result.status !== 0) throw new Error(`Local DB stop failed; preserve ${scratch} for cleanup: ${result.stderr}`);
  }
  // This is a generated test-only child of node_modules, verified before deletion.
  if (path.dirname(path.resolve(scratch)) !== path.resolve(scratchParent)
    || !path.basename(scratch).startsWith('.security-db-016-')) throw new Error('Unsafe scratch cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
