// Authorized release acceptance. Creates only disposable, confirmed test accounts;
// sends no email. Credentials stay in memory. Cleanup is restricted to recorded IDs.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const project = 'mvbmpcmexkgfairnthux';
const url = `https://${project}.supabase.co`;
const testMail = process.argv.includes('--test-mail-simulator');
if (!process.argv.includes('--run-disposable-accounts')) throw new Error('Use --run-disposable-accounts to run hosted acceptance.');
const cli = spawnSync(process.platform === 'win32' ? 'supabase.exe' : 'supabase',
  ['projects', 'api-keys', '--project-ref', project, '--dns-resolver', 'https', '--output', 'json'], { encoding: 'utf8', windowsHide: true });
assert.equal(cli.status, 0, 'Authenticated Supabase CLI key retrieval failed');
const keys = JSON.parse(cli.stdout);
cli.stdout = '';
const anon = keys.find(k => k.name === 'anon')?.api_key;
const service = keys.find(k => k.name === 'service_role')?.api_key;
assert(anon && service, 'Expected project keys unavailable');
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, service, options);
const anonymous = createClient(url, anon, options);
const run = randomUUID();
const users = [];
const report = { project, run, mailSimulator: testMail, startedAt: new Date().toISOString(), checks: [], cleanup: [] };
await mkdir('supabase/backups', { recursive: true });
async function save() {
  await writeFile(`supabase/backups/acceptance-${run}.json`, JSON.stringify({ run, users: users.map(({ id, email, operation }) => ({ id, email, operation })) }, null, 2));
  await writeFile(`docs/release/verification/${testMail ? 'mail' : 'hosted'}-acceptance.json`, JSON.stringify(report, null, 2) + '\n');
}
async function check(name, body) {
  try { await body(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (e) { report.checks.push({ name, passed: false, message: String(e.message).slice(0, 500) }); throw e; }
  finally { await save(); }
}
function ok(result) { assert(!result.error, result.error?.message); return result.data; }
function success(result) { const data = ok(result); assert.equal(data?.success, true, JSON.stringify(data)); return data; }
function denied(result) { assert(result.error || result.data?.success === false || Array.isArray(result.data) && result.data.length === 0, 'Expected denial'); }
async function edge(token, body) {
  const response = await fetch(`${url}/functions/v1/delete-account`, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function account(label) {
  // Resend's documented sink simulates delivery; no human inbox receives mail.
  const email = testMail && label === 'a' ? `delivered+release-${run}@resend.dev` : `release-${run}-${label}@example.invalid`;
  const password = `${randomUUID()}aA!7`;
  const created = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Release ${run.slice(0, 8)} ${label}` } }));
  const user = { id: created.user.id, email, password, operation: randomUUID(), client: createClient(url, anon, options), token: null, deleted: false };
  users.push(user); await save();
  const auth = ok(await user.client.auth.signInWithPassword({ email, password })); user.token = auth.session.access_token;
  const profile = ok(await user.client.from('profiles').select('id').eq('id', user.id));
  if (!profile.length) ok(await user.client.from('profiles').insert({ id: user.id, email, display_name: `Release ${run.slice(0, 8)} ${label}` }).select('id,display_name,avatar_url,theme,onboarding_completed').single());
  else ok(await user.client.from('profiles').update({ display_name: `Release ${run.slice(0, 8)} ${label}` }).eq('id', user.id).select('id').single());
  return user;
}
async function remove(user) {
  if (user.deleted) return;
  if (!user.token) user.token = ok(await user.client.auth.signInWithPassword({ email: user.email, password: user.password })).session.access_token;
  const result = await edge(user.token, { operation_id: user.operation, confirm: true });
  assert.equal(result.status, 200, JSON.stringify(result)); assert.equal(result.body.code, 'deleted');
  const gone = await admin.auth.admin.getUserById(user.id);
  assert(gone.error && !gone.data.user, 'Test Auth account still exists');
  user.deleted = true;
}

let failure;
try {
  let a, b, c;
  await check('real confirmed Auth sessions and safe profile bootstrap', async () => { a = await account('a'); b = await account('b'); c = await account('c'); });
  await check('anonymous/private profile reads and role writes denied', async () => {
    denied(await anonymous.from('profiles').select('id'));
    denied(await a.client.from('profiles').select('*'));
    denied(await a.client.from('profiles').select('email'));
    denied(await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id));
    assert.equal(ok(await a.client.from('profiles').select('id').eq('id', b.id)).length, 0);
    ok(await a.client.from('profiles').update({ display_name: `Release ${run.slice(0,8)} a` }).eq('id', a.id).select('id,display_name').single());
  });
  let connection;
  await check('recipient consent cannot be self-approved or endpoint-rewritten', async () => {
    denied(await a.client.rpc('create_task', { p_title: 'Release check', p_assigned_to: b.id }));
    connection = ok(await a.client.from('friendships').insert({ user1_id: a.id, user2_id: b.id, requested_by: a.id, status: 'pending' }).select('id').single()).id;
    denied(await a.client.from('friendships').update({ status: 'accepted' }).eq('id', connection).select('id'));
    denied(await b.client.from('friendships').update({ user1_id: c.id }).eq('id', connection).select('id'));
    ok(await b.client.from('friendships').update({ status: 'accepted' }).eq('id', connection).select('id').single());
    assert.equal(ok(await a.client.from('profiles').select('id').eq('id', b.id)).length, 1);
  });
  let mission, proof, reward, collection, balance;
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg==', 'base64');
  await check('mission lifecycle authorizes the correct actor', async () => {
    mission = success(await a.client.rpc('create_task', { p_title: 'Disposable release acceptance', p_assigned_to: b.id, p_reward_type: 'credit', p_reward_text: '5', p_proof_required: true })).task_id;
    denied(await c.client.rpc('set_task_status', { p_task_id: mission, p_status: 'in_progress' }));
    success(await b.client.rpc('set_task_status', { p_task_id: mission, p_status: 'in_progress' }));
  });
  await check('private proof upload/download works only for mission participants', async () => {
    proof = `proofs/${mission.toUpperCase()}/release.png`;
    ok(await b.client.storage.from('bounty-proofs').upload(proof, pixel, { contentType: 'image/png' }));
    ok(await a.client.storage.from('bounty-proofs').download(proof));
    ok(await b.client.storage.from('bounty-proofs').download(proof));
    assert((await c.client.storage.from('bounty-proofs').download(proof)).error);
    assert((await anonymous.storage.from('bounty-proofs').download(proof)).error);
    assert((await c.client.storage.from('bounty-proofs').upload(`proofs/${mission}/intrusion.png`, pixel, { contentType: 'image/png' })).error);
  });
  await check('approval credits once and duplicate approval cannot pay again', async () => {
    success(await b.client.rpc('submit_proof', { p_task_id: mission, p_proof_url: proof, p_proof_type: 'image', p_proof_description: 'Disposable verification image' }));
    denied(await b.client.rpc('approve_task', { p_task_id: mission }));
    success(await a.client.rpc('approve_task', { p_task_id: mission }));
    balance = ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance;
    assert.equal(balance, 5);
    await a.client.rpc('approve_task', { p_task_id: mission });
    assert.equal(ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance, balance);
  });
  await check('purchase debits once; collected reward supports used and undo', async () => {
    reward = success(await a.client.rpc('create_reward_store_item', { p_name: 'Disposable release reward', p_description: 'Acceptance fixture', p_credit_cost: 3, p_image_url: '', p_assigned_to: b.id })).reward_id;
    denied(await c.client.rpc('purchase_reward', { p_reward_id: reward, p_collector_id: b.id }));
    denied(await c.client.rpc('purchase_reward', { p_reward_id: reward, p_collector_id: c.id }));
    collection = success(await b.client.rpc('purchase_reward', { p_reward_id: reward, p_collector_id: b.id })).collection_id;
    balance = ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance;
    assert.equal(balance, 2);
    denied(await b.client.rpc('purchase_reward', { p_reward_id: reward, p_collector_id: b.id }));
    assert.equal(ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance, 2);
    success(await b.client.rpc('mark_reward_redeemed', { p_collection_id: collection, p_redeemed: true }));
    success(await b.client.rpc('mark_reward_redeemed', { p_collection_id: collection, p_redeemed: false }));
  });
  if (testMail) await check('Auth SMTP and reward notifier accept the provider simulation sink; forged collector denied', async () => {
    report.simulatorRecipient = a.email;
    ok(await anonymous.auth.signInWithOtp({ email: a.email, options: { shouldCreateUser: false, emailRedirectTo: 'https://www.bountyhunter.xyz/login' } }));
    const send = user => user.client.functions.invoke('notify-reward-creator', { body: { reward_id: reward, collector_id: b.id } });
    assert((await send(c)).error, 'Unrelated actor must not send mail for collector');
    assert.equal(ok(await send(b)).message, 'Notification processed.');
    assert.equal(ok(await send(b)).message, 'Notification processed.');
    report.providerIdempotencyKey = `reward-collected/${collection}`;
  });
  await check('lookup is literal, bounded and private reports are not exposed', async () => {
    assert.equal(ok(await a.client.rpc('lookup_contacts', { p_query: '%%%' })).length, 0);
    denied(await a.client.rpc('lookup_contacts', { p_query: 'aa' }));
    const found = ok(await a.client.rpc('lookup_contacts', { p_query: `Release ${run.slice(0,8)}` }));
    assert(found.some(p => p.id === c.id)); assert(found.every(p => Object.keys(p).sort().join(',') === 'avatar_url,display_name,id'));
    const receipt = ok(await a.client.rpc('report_person', { p_person: b.id, p_reason: 'other', p_details: 'Disposable acceptance test, not an actual safety report.' }));
    assert.match(receipt, /^[0-9a-f-]{36}$/);
    assert((await a.client.schema('bounty_private').from('user_reports').select('*')).error);
  });
  await check('block hides content both ways and rejects saved invitation and proof access', async () => {
    const invite = success(await a.client.rpc('get_or_create_invite'));
    assert.equal(ok(await a.client.rpc('set_person_block', { p_person: b.id, p_blocked: true })), true);
    for (const user of [a,b]) {
      assert.equal(ok(await user.client.from('tasks').select('id').eq('id', mission)).length, 0);
      assert.equal(ok(await user.client.from('rewards_store').select('id').eq('id', reward)).length, 0);
      const cached = await fetch(`${url}/storage/v1/object/bounty-proofs/${proof}`, { headers: { apikey: anon, Authorization: `Bearer ${user.token}` } });
      const fresh = await fetch(`${url}/storage/v1/object/bounty-proofs/${proof}?cacheNonce=${randomUUID()}`, { headers: { apikey: anon, Authorization: `Bearer ${user.token}`, 'Cache-Control': 'no-cache' } });
      report.storageBlock = [...(report.storageBlock ?? []), { cachedStatus: cached.status, cachedCf: cached.headers.get('cf-cache-status'), cacheControl: cached.headers.get('cache-control'), freshStatus: fresh.status, freshCf: fresh.headers.get('cf-cache-status') }];
      await cached.body?.cancel(); await fresh.body?.cancel();
      assert([400,401,403,404].includes(fresh.status), 'Fresh authenticated proof download must be denied by origin');
      assert((await user.client.storage.from('bounty-proofs').createSignedUrl(proof, 30)).error, 'Blocked actor obtained a new signed URL');
    }
    denied(await b.client.rpc('redeem_invite', { p_token: invite.token }));
    denied(await b.client.rpc('purchase_reward', { p_reward_id: reward, p_collector_id: b.id }));
    assert.equal(ok(await admin.rpc('notification_pair_allowed', { p_actor: a.id, p_recipient: b.id })), false);
    if (testMail) assert((await b.client.functions.invoke('notify-reward-creator', { body: { reward_id: reward, collector_id: b.id } })).error, 'Blocked pair must not trigger a notification');
    assert.equal(ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance, 2);
    assert.equal(ok(await a.client.rpc('set_person_block', { p_person: b.id, p_blocked: false })), true);
    assert.equal(ok(await a.client.from('friendships').select('id').eq('id', connection)).length, 0);
  });
  await check('deletion endpoint denies anonymous and forged credentials', async () => {
    assert.equal((await edge(anon, { operation_id: randomUUID(), confirm: true })).status, 401);
    assert.equal((await edge('forged-token', { operation_id: randomUUID(), confirm: true })).status, 401);
  });
  await check('account deletion removes Storage, shared content and Auth; preserves counterpart balance', async () => {
    ok(await a.client.storage.from('avatars').upload(`${a.id}/release.png`, pixel, { contentType: 'image/png' }));
    const beforeHistory = ok(await admin.from('credit_transactions').select('id,amount').eq('user_id', b.id).order('id'));
    await remove(a);
    assert.equal(ok(await admin.from('profiles').select('id').eq('id', a.id)).length, 0);
    assert.equal(ok(await admin.from('tasks').select('id').eq('id', mission)).length, 0);
    assert((await admin.storage.from('bounty-proofs').download(proof)).error);
    assert((await admin.storage.from('avatars').download(`${a.id}/release.png`)).error);
    const remainingBalance = ok(await b.client.from('user_credits').select('balance').eq('user_id', b.id).single()).balance;
    const history = ok(await b.client.from('credit_transactions').select('amount,task_id').eq('user_id', b.id));
    const retainedHistory = ok(await admin.from('credit_transactions').select('id,amount,task_id').eq('user_id', b.id).order('id'));
    report.retention = { remainingBalance, clientLedger: history, serviceLedger: retainedHistory };
    assert.equal(remainingBalance, 2, 'Counterpart balance must survive deletion');
    assert.deepEqual(retainedHistory.map(({ id,amount }) => ({ id,amount })), beforeHistory, 'Existing counterpart ledger must survive deletion');
    assert(retainedHistory.every(row => row.task_id === null), 'Erased mission links must be detached');
    assert.equal((await edge(anon, { operation_id: a.operation, receipt_user_id: a.id, receipt: true })).body.code, 'deleted');
    assert.equal((await edge(a.token, { operation_id: randomUUID(), confirm: true })).status, 401);
  });
} catch (error) {
  failure = error; console.error(String(error.message).slice(0, 500));
} finally {
  for (const user of users) {
    try { await remove(user); report.cleanup.push({ account: user.email.split('-').at(-1), removed: true }); }
    catch (error) { report.cleanup.push({ account: user.email.split('-').at(-1), removed: false, message: String(error.message).slice(0, 300) }); console.error('Disposable account cleanup needs retry; see ignored acceptance manifest.'); failure ??= error; }
  }
  report.finishedAt = new Date().toISOString(); report.passed = !failure; await save();
}
if (failure) process.exitCode = 1;
