import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

export async function run019({ sql, read, check, as, truth, denied, q, user, task, reward, sid, op, port, root, scratch }) {
  sql('GRANT SELECT(email) ON profiles TO authenticated; CREATE ROLE inherited_directory; GRANT SELECT(role) ON profiles TO inherited_directory; GRANT inherited_directory TO authenticated;');
  assert.match(sql(read('db/proposals/019_contact_safety.up.sql'),false).stderr,/inherited profile read privilege/);
  sql('REVOKE inherited_directory FROM authenticated; DROP OWNED BY inherited_directory; DROP ROLE inherited_directory;');
  sql(read('db/proposals/019_contact_safety.up.sql'));
  const invite = JSON.parse(read('docs/release/live-functions.json')).find(f => f.proname === 'redeem_invite');
  assert(invite);
  sql(`${invite.definition}; REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated; UPDATE public.invites SET token='019-test-invite' WHERE inviter_id='${user(1)}';`);
  const { checkBackup } = await import('./backup-cases.mjs');
  checkBackup({ root, scratch, port, sql });
  sql(read('db/proposals/019_contact_safety.up.sql'));
  sql(read('db/proposals/019_validation.sql'));
  check('019 repeated apply retains the complete deletion guard', 'RESET ROLE; SELECT bounty_private.assert_deletion_schema();');
  check('email and SELECT star unavailable even to the owner', denied('SELECT email FROM profiles') + denied('SELECT * FROM profiles'), 'authenticated');
  check('safe self and historical identity joins remain visible', truth(`(SELECT count(*) FROM profiles WHERE id IN('${user(1)}','${user(2)}'))=2`, 'self and counterpart'), 'authenticated');
  check('unrelated profiles cannot be enumerated', truth(`(SELECT count(*) FROM profiles WHERE id='${user(9)}')=0`, 'unrelated hidden'), 'authenticated');
  check('extra permissive profile policy cannot widen contact visibility', `RESET ROLE; CREATE POLICY future_directory ON profiles FOR SELECT TO authenticated USING(true); ${as('authenticated')} ${truth(`NOT EXISTS(SELECT 1 FROM profiles WHERE id='${user(9)}')`,'restrictive directory boundary')}`, 'authenticated');
  check('own settings update works with explicit projection', `UPDATE profiles SET display_name='Changed',avatar_url=NULL WHERE id=auth.uid() RETURNING id,display_name,avatar_url,theme,onboarding_completed;`, 'authenticated');
  check('verified email change can sync without SELECT email permission', `SELECT set_config('request.jwt.claims',${q(JSON.stringify({role:'authenticated',sub:user(1),email:'verified-new@example.invalid'}))},true); UPDATE profiles SET email='verified-new@example.invalid',display_name='New name' WHERE id=auth.uid() RETURNING id,display_name,avatar_url,theme,onboarding_completed;`, 'authenticated');
  for (const role of ['anon','authenticated']) {
    check(`${role} cannot enumerate blocks, reports or budgets`, ['user_blocks','user_reports','safety_budgets'].map(t => denied(`SELECT * FROM bounty_private.${t}`)).join(''), role);
    check(`${role} cannot inspect arbitrary block pairs`, denied(`SELECT bounty_private.pair_allowed('${user(2)}','${user(3)}')`), role);
  }
  check('anonymous lookup and reporting unavailable', denied("SELECT * FROM lookup_contacts('Alex')") + denied(`SELECT report_person('${user(2)}','spam','')`), 'anon');
  check('lookup returns literal prefixes and hides current contacts', `RESET ROLE; UPDATE profiles SET display_name='Alex'||right(id::text,1); ${as('authenticated')} ${truth("(SELECT count(*) FROM lookup_contacts('Ale'))=5", 'bounded result')} ${truth(`NOT EXISTS(SELECT 1 FROM lookup_contacts('Alex2'))`, 'exclude contact')} ${truth("NOT EXISTS(SELECT 1 FROM lookup_contacts('%%%'))", 'literal wildcard')}`, 'authenticated');
  for (const value of ['', 'aa', 'a'.repeat(65)]) {
    const result = sql(`BEGIN; ${as('authenticated')} SELECT * FROM lookup_contacts(${q(value)});`, false);
    assert.match(result.stderr,/invalid_query/);
  }
  check('lookup budget enforced in the database', `DO $$ BEGIN FOR i IN 1..30 LOOP PERFORM public.lookup_contacts('Alex'); END LOOP; BEGIN PERFORM public.lookup_contacts('Alex'); RAISE EXCEPTION 'budget failed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'rate_limited' THEN RAISE; END IF; END; END $$;`, 'authenticated');
  const block = `SELECT public.set_person_block('${user(2)}',true);`;
  check('block removes connection without changing balances', `${block} ${truth('(SELECT count(*) FROM friendships)=0','connection removed')} ${truth('(SELECT balance FROM user_credits WHERE user_id=auth.uid())=10','balance retained')} ${truth('(SELECT count(*) FROM list_blocked_people())=1','own block list')}`, 'authenticated');
  for (const actor of [1,2]) {
    check(`block hides missions, rewards and proofs in direction ${actor}`, `${as('authenticated')}${block}${as('authenticated',user(actor))}${truth(`NOT EXISTS(SELECT 1 FROM tasks WHERE id='${task(1)}') AND NOT EXISTS(SELECT 1 FROM rewards_store WHERE id='${reward(1)}') AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE name='proofs/${task(1).toUpperCase()}/proof.pdf')`,'content hidden')}`, 'authenticated');
    for (const [name, statement] of [
      ['known mission UUID', `UPDATE tasks SET title='Bypass' WHERE id='${task(1)}'`],
      ['new mission', `INSERT INTO tasks(created_by,assigned_to,title) VALUES('${user(actor)}','${user(actor===1?2:1)}','Bypass')`],
      ['reward edit', `UPDATE rewards_store SET name='Bypass' WHERE id='${reward(1)}'`],
      ['connection/invite promotion', `INSERT INTO friendships(user1_id,user2_id,requested_by,status) VALUES('${user(1)}','${user(2)}','${user(actor)}','accepted')`],
      ['proof upload', `INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('bounty-proofs','proofs/${task(1)}/new.pdf','${user(actor)}')`],
      ['credit award', `INSERT INTO credit_transactions(user_id,task_id,amount,transaction_type) VALUES('${user(actor)}','${task(1)}',5,'earned')`],
    ]) check(`block guards definer ${name}, direction ${actor}`, `${as('authenticated')}${block}${as('authenticated',user(actor))}${denied(`SELECT test.mutate(${q(statement)})`)}`, 'authenticated');
  }
  check('known reward purchase cannot debit through a block', `${block} ${denied(`SELECT public.purchase_reward('${reward(2)}','${user(1)}')`)} ${truth('(SELECT balance FROM user_credits WHERE user_id=auth.uid())=10','no debit')}`, 'authenticated');
  check('actual saved invitation RPC cannot reconnect after a block', `${block}${as('authenticated',user(2))}${denied("SELECT public.redeem_invite('019-test-invite')")}`, 'authenticated');
  check('unblock needs a new connection and never removes the other persons block', `${block}${as('authenticated',user(2))} SELECT public.set_person_block('${user(1)}',true); ${as('authenticated')} SELECT public.set_person_block('${user(2)}',false); ${truth('(SELECT count(*) FROM friendships)=0 AND (SELECT count(*) FROM list_blocked_people())=0','no reconnection')} ${truth(`NOT EXISTS(SELECT 1 FROM tasks WHERE id='${task(1)}')`,'other block persists')}`, 'authenticated');
  check('report succeeds after blocking but cannot be read back', `${block} ${truth(`public.report_person('${user(2)}','harassment','Unwanted messages') IS NOT NULL`,'receipt returned')} ${denied('SELECT * FROM bounty_private.user_reports')}`, 'authenticated');
  check('report budget cannot be bypassed by changing reason', `DO $$ BEGIN FOR i IN 1..5 LOOP PERFORM public.report_person('${user(2)}','spam',''); END LOOP; BEGIN PERFORM public.report_person('${user(2)}','other',''); RAISE EXCEPTION 'budget failed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'rate_limited' THEN RAISE; END IF; END; END $$;`, 'authenticated');
  check('unrelated person cannot be reported or blocked', denied(`SELECT public.report_person('${user(9)}','spam','')`) + denied(`SELECT public.set_person_block('${user(9)}',true)`), 'authenticated');
  check('reassignment does not invent a relationship between old/new recipients', `INSERT INTO bounty_private.user_blocks(blocker_id,blocked_id) VALUES('${user(2)}','${user(3)}'); UPDATE tasks SET assigned_to='${user(3)}' WHERE id='${task(1)}'; ${truth(`(SELECT assigned_to='${user(3)}' FROM tasks WHERE id='${task(1)}')`,'valid reassignment')}`);
  check('new profile insertion returns only safe client fields', `RESET ROLE; INSERT INTO auth.users(id,email) VALUES('${user(10)}','new@example.invalid'); ${as('authenticated',user(10))} SELECT set_config('request.jwt.claims',${q(JSON.stringify({role:'authenticated',sub:user(10),email:'new@example.invalid'}))},true); INSERT INTO profiles(id,email,display_name,avatar_url) VALUES('${user(10)}','new@example.invalid','New',NULL) RETURNING id,display_name,avatar_url,theme,onboarding_completed;`, 'authenticated');
  check('notifications are denied after a block', `${as('authenticated')}${block}${as()} ${truth(`NOT public.notification_pair_allowed('${user(1)}','${user(2)}')`,'mail suppressed')}`);
  check('report and block are frozen during account deletion', `SELECT public.begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}'); ${as('authenticated',user(2))} ${denied(`SELECT report_person('${user(1)}','spam','')`)} ${denied(`SELECT set_person_block('${user(1)}',true)`)}`);
  for (const statement of [
    `INSERT INTO bounty_private.user_blocks(blocker_id,blocked_id) VALUES('${user(2)}','${user(1)}')`,
    `INSERT INTO bounty_private.safety_budgets(user_id,kind,started_at,used) VALUES('${user(1)}','lookup',now(),1)`,
    `INSERT INTO bounty_private.user_reports(reporter_id,subject_id,reason,details) VALUES('${user(2)}','${user(1)}','spam','')`,
  ]) check('service safety writes cannot link a frozen account', `SELECT public.begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}'); ${denied(statement)}`);
  check('deletion cleans safety records and preserves other peoples ledger', `${as('authenticated')}${block} SELECT report_person('${user(2)}','spam',''); ${as()} SELECT public.begin_account_deletion('${user(1)}','${sid(1)}','${op(1)}'); DELETE FROM storage.objects WHERE name<>'${user(2)}/keep.webp'; SELECT public.cleanup_account_data('${user(1)}','${op(1)}'); ${truth('(SELECT count(*) FROM bounty_private.user_blocks)=0 AND (SELECT count(*) FROM bounty_private.user_reports)=0 AND (SELECT count(*) FROM bounty_private.safety_budgets)=0','safety data erased')}`);

  const connection = label => {
    const child = spawn(process.platform==='win32'?'psql.exe':'psql',['-X','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-qAt'],{cwd:root,windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG'))),PGAPPNAME:label},stdio:['pipe','pipe','pipe']});
    let stdout='',stderr=''; child.stdout.on('data',x=>stdout+=x); child.stderr.on('data',x=>stderr+=x);
    return {child,output:()=>stdout,done:new Promise(resolve=>child.on('close',code=>resolve({code,stdout,stderr})))};
  };
  const until = async predicate => {const end=Date.now()+10000;while(!predicate()){assert(Date.now()<end,'019 race handshake timed out');await new Promise(r=>setTimeout(r,20));}};
  const holder=connection('019-block-holder');
  holder.child.stdin.write(`BEGIN; ${as('authenticated')}${block} SELECT 'READY';\n`);
  await until(()=>holder.output().includes('READY'));
  const waiting=connection('019-invite-waiter');
  waiting.child.stdin.end(`BEGIN; ${as('authenticated',user(2))} SELECT test.mutate(${q(`INSERT INTO friendships(user1_id,user2_id,requested_by,status) VALUES('${user(1)}','${user(2)}','${user(2)}','accepted')`)}); COMMIT;\n`);
  await until(()=>sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='019-invite-waiter' AND wait_event='advisory'").stdout.trim()==='1');
  holder.child.stdin.end('COMMIT;\n'); assert.equal((await holder.done).code,0);
  const result=await waiting.done; assert.notEqual(result.code,0); assert.match(result.stderr,/interaction_unavailable/);
  console.log('PASS block wins a real concurrent invite write; fresh snapshot rejects it');
  // Restore the original fixture for the full 018 regression suite.
  sql(`DELETE FROM bounty_private.user_blocks; INSERT INTO friendships(user1_id,user2_id,requested_by,status) VALUES('${user(1)}','${user(2)}','${user(2)}','accepted');`);
}
