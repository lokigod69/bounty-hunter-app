import assert from 'node:assert/strict';

export async function run020({ sql, read, check, as, truth, denied, q, user, task, sid, op }) {
  sql(read('db/proposals/020_native_push.up.sql'));
  const login = (n=1,s=n) => `${as('authenticated',user(n))} SELECT set_config('request.jwt.claims',${q(JSON.stringify({role:'authenticated',sub:user(n),session_id:sid(s),email:`${user(n)}@example.invalid`}))},true);`;
  const register = (n=1,token=String(n).repeat(64)) => `SELECT public.register_push_device('${op(n)}','${token}','production');`;
  const enabled = 'RESET ROLE; UPDATE bounty_private.push_settings SET enabled=true;';
  const device = `${enabled}${login()}${register()}${as()}`;
  // Task 1 is user 1's mission for user 2 in the baseline fixture.
  const event = `SELECT bounty_private.enqueue_push('mission_submitted','${task(1)}','${user(2)}','${user(1)}');`;
  const queued = `${device} RESET ROLE; UPDATE tasks SET status='review' WHERE id='${task(1)}'; ${as()}`;
  const claim = 'CREATE TEMP TABLE claimed AS SELECT * FROM public.claim_push_deliveries();';
  const prepare = 'public.prepare_push_delivery((SELECT id FROM claimed LIMIT 1),(SELECT lease FROM claimed LIMIT 1))';
  const finish = outcome => `SELECT public.finish_push_delivery((SELECT id FROM claimed LIMIT 1),(SELECT lease FROM claimed LIMIT 1),'${outcome}',now());`;
  const count = n => truth(`(SELECT count(*) FROM bounty_private.push_deliveries)=${n}`,'queue count');
  check('push defaults disabled',`${login()}${denied(register())}`,'authenticated');
  for (const role of ['anon','authenticated']) {
    check(`${role} cannot read tokens/queue/settings or operate dispatcher`,
      ['push_devices','push_deliveries','push_settings'].map(t=>denied(`SELECT * FROM bounty_private.${t}`)).join('')
      +denied('SELECT * FROM claim_push_deliveries()')+denied(`SELECT * FROM prepare_push_delivery('${op(1)}','${op(2)}')`)
      +denied(`SELECT finish_push_delivery('${op(1)}','${op(2)}','accepted')`)
      +denied(event),role);
  }
  check('missing and another users session cannot register',`${enabled}${as('authenticated')}${denied(register())}${login(1,2)}${denied(register())}`);
  check('expired session cannot register',`${enabled} UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id='${sid(1)}'; ${login()}${denied(register())}`);
  check('registration derives account and preserves same-session pending notifications',`${queued}${login()}${register()}${as()}${count(1)}${truth(`(SELECT user_id='${user(1)}' AND session_id='${sid(1)}' FROM bounty_private.push_devices)`,'derived owner')}`);
  check('account switch cancels previous owners queue',`${queued}${login(2)} SELECT register_push_device('${op(1)}','${'1'.repeat(64)}','production');${as()}${count(0)}${truth(`(SELECT user_id='${user(2)}' FROM bounty_private.push_devices)`,'new owner')}`);
  check('wrong account cannot revoke installation',`${queued}${login(2)} SELECT revoke_push_device('${op(1)}');${as()}${count(1)}`);
  check('owner revoke cascades pending deliveries',`${queued}${login()} SELECT revoke_push_device('${op(1)}');${as()}${count(0)}`);
  check('session removal cancels devices and queue',`${queued} RESET ROLE; DELETE FROM auth.sessions WHERE id='${sid(1)}';${as()}${count(0)}${truth('(SELECT count(*) FROM bounty_private.push_devices)=0','tokens removed')}`);
  check('actor transaction rollback also rolls back its notification',`${device} SAVEPOINT mutation; RESET ROLE; UPDATE tasks SET status='review' WHERE id='${task(1)}'; ROLLBACK TO mutation;${as()}${count(0)}`);
  check('status retries coalesce rather than queue duplicates',`${queued} RESET ROLE;${event}${as()}${count(1)}`);
  check('leases prevent concurrent double claim and expose only valid delivery',`${queued}${claim}${truth('(SELECT count(*) FROM claim_push_deliveries())=0','leased once')}${truth(`(SELECT count(*) FROM ${prepare})=1`,'prepared')}`);
  check('forged lease cannot prepare or acknowledge',`${queued}${claim}${truth(`NOT EXISTS(SELECT 1 FROM prepare_push_delivery((SELECT id FROM claimed),'${op(8)}'))`,'lease checked')} SELECT finish_push_delivery((SELECT id FROM claimed),'${op(8)}','accepted');${count(1)}`);
  check('acknowledgement removes accepted delivery and is idempotent',`${queued}${claim}${finish('accepted')}${finish('accepted')}${count(0)}`);
  check('transient error reschedules and cannot immediately claim again',`${queued}${claim}${finish('retry')}${truth('(SELECT count(*) FROM claim_push_deliveries())=0','retry delay')}${truth('(SELECT attempts=1 AND lease IS NULL AND next_attempt>now() FROM bounty_private.push_deliveries)','retry bounded')}`);
  check('invalid token removes only its current registration',`${queued}${claim}${finish('invalid_token')}${count(0)}${truth('(SELECT count(*) FROM bounty_private.push_devices)=0','invalid token removed')}`);
  check('stale acknowledgement cannot remove replacement device',`${queued}${claim}${login()} SELECT register_push_device('${op(1)}','${'a'.repeat(64)}','production');${as()}${finish('invalid_token')}${truth('(SELECT count(*) FROM bounty_private.push_devices)=1','replacement retained')}`);
  check('410 timestamp preserves a newer registration of the same token',`${queued} UPDATE bounty_private.push_devices SET updated_at=now()-interval '2 minutes';${claim}${login()}${register()}${as()} SELECT finish_push_delivery((SELECT id FROM claimed),(SELECT lease FROM claimed),'invalid_token',now()-interval '1 minute');${truth('(SELECT count(*) FROM bounty_private.push_devices)=1','fresh same token retained')}${count(0)}`);
  check('block after claim prevents final preparation',`${queued}${claim}${login()} SELECT set_person_block('${user(2)}',true);${as()}${truth(`NOT EXISTS(SELECT 1 FROM ${prepare})`,'block rechecked')}${finish('retry')}${count(0)}`);
  check('resource reassignment invalidates old notification',`${queued}${claim} RESET ROLE; UPDATE tasks SET assigned_to='${user(3)}' WHERE id='${task(1)}';${as()}${truth(`NOT EXISTS(SELECT 1 FROM ${prepare})`,'recipient rechecked')}`);
  check('server disable stops both claiming and final preparation',`${queued}${claim} UPDATE bounty_private.push_settings SET enabled=false;${truth(`NOT EXISTS(SELECT 1 FROM ${prepare})`,'gate rechecked')}${truth('NOT EXISTS(SELECT 1 FROM claim_push_deliveries())','no claim')}`);
  check('account deletion freezes registration and final send',`${queued}${claim} SELECT begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}');${truth(`NOT EXISTS(SELECT 1 FROM ${prepare})`,'freeze rechecked')}${login()}${denied(register())}`);
  check('account cleanup cascades all tokens and queued relationships',`${queued} SELECT begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}'); DELETE FROM storage.objects WHERE name<>'${user(2)}/keep.webp'; SELECT cleanup_account_data('${user(1)}','${op(1)}');${count(0)}${truth('(SELECT count(*) FROM bounty_private.push_devices)=0','cleanup removed tokens')}`);
  check('Auth can revoke a frozen session without a service JWT',`${queued} SELECT begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}'); RESET ROLE; SELECT set_config('request.jwt.claims','{}',true); DELETE FROM auth.sessions WHERE id='${sid(1)}'; ${count(0)}${truth('(SELECT count(*) FROM bounty_private.push_devices)=0','Auth cascade during freeze')}`);
  sql('CREATE TABLE bounty_private.future_push_link(id uuid REFERENCES bounty_private.push_devices);');
  assert.match(sql('SELECT bounty_private.assert_deletion_schema();',false).stderr,/deletion_schema_changed/);
  sql('DROP TABLE bounty_private.future_push_link;');
  console.log('PASS future incoming push FK requires deletion review');
}
