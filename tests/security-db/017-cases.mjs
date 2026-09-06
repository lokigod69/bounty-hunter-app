import assert from 'node:assert/strict';

export async function verifyConsent({ sql, read, check, denied, truth, noRows, user, mission, q }) {
  const ab = '20000000-0000-4000-8000-000000000001';
  const ac = '20000000-0000-4000-8000-000000000002';
  sql(`
    ALTER TABLE friendships ADD COLUMN created_at timestamptz DEFAULT now();
    INSERT INTO friendships(id,user1_id,user2_id,requested_by,status) VALUES
      ('${ab}','${user(1)}','${user(2)}','${user(1)}','pending'),
      ('${ac}','${user(1)}','${user(3)}','${user(1)}','accepted');
    CREATE TABLE public.invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text, inviter_id uuid, revoked boolean DEFAULT false);
    INSERT INTO invites(token,inviter_id) VALUES ('local-test-invite','${user(1)}');
    ALTER TABLE user_credits ADD COLUMN balance integer DEFAULT 0, ADD COLUMN updated_at timestamptz DEFAULT now();
    INSERT INTO user_credits(user_id,balance) VALUES ('${user(2)}',100),('${user(3)}',100);
    CREATE TABLE rewards_store (id uuid PRIMARY KEY, creator_id uuid REFERENCES auth.users,
      assigned_to uuid REFERENCES profiles, name text NOT NULL, credit_cost integer NOT NULL,
      is_active boolean DEFAULT true, updated_at timestamptz DEFAULT now());
    CREATE TABLE collected_rewards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reward_id uuid REFERENCES rewards_store, collector_id uuid REFERENCES auth.users,
      UNIQUE(reward_id,collector_id));
    CREATE TABLE credit_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES profiles, task_id uuid REFERENCES tasks,
      amount integer NOT NULL, transaction_type text);
    ALTER TABLE rewards_store ENABLE ROW LEVEL SECURITY;
    ALTER TABLE collected_rewards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON rewards_store,collected_rewards,credit_transactions TO authenticated;
    CREATE POLICY rewards_store_select_private ON rewards_store FOR SELECT TO authenticated
      USING (creator_id=auth.uid() OR assigned_to=auth.uid());
    CREATE POLICY collected_rewards_own ON collected_rewards FOR SELECT TO authenticated USING (collector_id=auth.uid());
    INSERT INTO rewards_store(id,creator_id,assigned_to,name,credit_cost) VALUES
      ('30000000-0000-4000-8000-000000000001','${user(1)}','${user(2)}','Assigned reward',10),
      ('30000000-0000-4000-8000-000000000002','${user(1)}',NULL,'Retained creator-private reward',10);
  `);
  const invite = JSON.parse(read('docs/release/live-functions.json')).find(f => f.proname === 'redeem_invite');
  assert(invite);
  sql(`${invite.definition}; REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;`);
  const purchase = JSON.parse(read('docs/release/live-functions.json')).find(f => f.proname === 'purchase_reward');
  assert(purchase);
  sql(`${purchase.definition}; REVOKE ALL ON FUNCTION public.purchase_reward(uuid,uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.purchase_reward(uuid,uuid) TO authenticated;`);
  // Show that saved live policies/functions actually reproduce the consent defects.
  check('017 baseline: requester can accept own request', `UPDATE friendships SET status='accepted' WHERE id='${ab}'; ${truth(`(SELECT status FROM friendships WHERE id='${ab}')='accepted'`, 'self acceptance baseline')}`);
  check('017 baseline: new task can target unconnected account', truth(`(create_task('Unconnected',NULL,'${user(2)}')->>'success')::boolean`, 'unconnected baseline'));
  check('017 baseline: outsider purchases a hidden reward by UUID', truth(`(purchase_reward('30000000-0000-4000-8000-000000000001',auth.uid())->>'success')::boolean`, 'purchase bypass baseline'), 'authenticated', user(3));
  const migration = read('db/proposals/017_connection_consent.up.sql');
  sql('CREATE POLICY unknown_friendship_policy ON friendships FOR UPDATE USING (true);');
  assert.match(sql(migration, false).stderr, /unknown friendship policies/);
  sql('DROP POLICY unknown_friendship_policy ON friendships;');
  check('017 unknown policy abort left original request access intact', truth(`has_table_privilege('authenticated','friendships','UPDATE')`, 'drift rollback'));
  sql('CREATE ROLE inherited_friend_writer; GRANT UPDATE(requested_by) ON friendships TO inherited_friend_writer; GRANT inherited_friend_writer TO authenticated;');
  assert.match(sql(migration, false).stderr, /protected column requested_by/);
  sql(`SELECT test.assert_true(has_table_privilege('authenticated','friendships','UPDATE'), '017 failed transaction rolled back'); REVOKE inherited_friend_writer FROM authenticated; DROP OWNED BY inherited_friend_writer; DROP ROLE inherited_friend_writer;`);
  sql(migration);
  sql(migration);
  sql(`BEGIN READ ONLY; ${read('db/proposals/017_validation.sql')} COMMIT;`);
  const insert = (a, b, sender, status='pending') => `INSERT INTO friendships(user1_id,user2_id,requested_by,status) VALUES ('${user(a)}','${user(b)}','${user(sender)}','${status}') RETURNING *`;
  check('017 anonymous friendship read denied', denied('SELECT * FROM friendships'), 'anon', '');
  check('017 anonymous friendship write denied', denied(insert(1, 2, 1)), 'anon', '');
  check('017 pending self-sent request works', insert(2, 3, 2), 'authenticated', user(2));
  check('017 either endpoint ordering works', insert(3, 2, 2), 'authenticated', user(2));
  check('017 pre-accepted client request denied', denied(insert(2, 3, 2, 'accepted')), 'authenticated', user(2));
  check('017 requester spoof denied', denied(insert(2, 3, 3)), 'authenticated', user(2));
  check('017 third-party endpoints denied', denied(insert(1, 3, 2)), 'authenticated', user(2));
  check('017 self-friendship denied', denied(insert(2, 2, 2)), 'authenticated', user(2));
  check('017 invalid request status denied', denied(insert(2, 3, 2, 'whatever')), 'authenticated', user(2));
  check('017 requester cannot accept own request', noRows(`UPDATE friendships SET status='accepted' WHERE id='${ab}'`, 'sender cannot consent for recipient'));
  check('017 unrelated account cannot accept request', noRows(`UPDATE friendships SET status='accepted' WHERE id='${ab}'`, 'outsider cannot consent'), 'authenticated', user(3));
  check('017 recipient accepts pending request', `UPDATE friendships SET status='accepted' WHERE id='${ab}'; ${truth(`(SELECT status FROM friendships WHERE id='${ab}')='accepted'`, 'recipient consent')}`, 'authenticated', user(2));
  check('017 recipient cannot keep pending via update', denied(`UPDATE friendships SET status='pending' WHERE id='${ab}'`), 'authenticated', user(2));
  check('017 participants immutable', denied(`UPDATE friendships SET user2_id='${user(3)}',status='accepted' WHERE id='${ab}'`), 'authenticated', user(2));
  check('017 requester immutable', denied(`UPDATE friendships SET requested_by='${user(2)}' WHERE id='${ab}'`), 'authenticated', user(2));
  check('017 ids immutable', denied(`UPDATE friendships SET id=gen_random_uuid() WHERE id='${ab}'`), 'authenticated', user(2));
  check('017 created timestamp immutable', denied(`UPDATE friendships SET created_at=now() WHERE id='${ab}'`), 'authenticated', user(2));
  check('017 accepted connection cannot be reverted to pending', noRows(`UPDATE friendships SET status='pending' WHERE id='${ac}'`, 'accepted immutable'), 'authenticated', user(3));
  check('017 sender cancels pending request', `DELETE FROM friendships WHERE id='${ab}'; ${truth(`(SELECT count(*) FROM friendships WHERE id='${ab}')=0`, 'cancel')}`);
  check('017 recipient rejects pending request', `DELETE FROM friendships WHERE id='${ab}'; ${truth(`(SELECT count(*) FROM friendships WHERE id='${ab}')=0`, 'reject')}`, 'authenticated', user(2));
  check('017 either endpoint removes accepted connection', `DELETE FROM friendships WHERE id='${ac}'; ${truth(`(SELECT count(*) FROM friendships WHERE id='${ac}')=0`, 'remove')}`, 'authenticated', user(3));
  check('017 outsider cannot delete request', noRows(`DELETE FROM friendships WHERE id='${ab}'`, 'outsider request delete'), 'authenticated', user(3));
  check('017 friendship truncate denied', denied('TRUNCATE friendships'));
  check('017 pending contact cannot receive new task', truth(`create_task('No consent',NULL,'${user(2)}')->>'error'='recipient_not_connected'`, 'pending rejected'));
  check('017 accepted contact receives new task', truth(`(create_task('Connected',NULL,'${user(3)}')->>'success')::boolean`, 'accepted allowed'));
  check('017 connection lookup works in either ordering', truth(`(create_task('Reverse connection',NULL,'${user(1)}')->>'success')::boolean`, 'reverse accepted'), 'authenticated', user(3));
  check('017 outsider task creation blocked', truth(`create_task('No connection',NULL,'${user(2)}')->>'error'='recipient_not_connected'`, 'outsider rejected'), 'authenticated', user(3));
  check('017 existing self text mission preserved', truth(`(create_task('Personal favour',NULL,auth.uid(),NULL,'text','Rest')->>'success')::boolean`, 'self text'));
  check('017 self credit creation still blocked', truth(`create_task('Self credits',NULL,auth.uid(),NULL,'credit','5')->>'error'='self_assigned_credit_reward'`, 'self credit blocked'));
  check('017 unassigned draft still supported', truth(`(create_task('Draft')->>'success')::boolean`, 'draft'));
  check('017 connected reassignment succeeds', truth(`(update_task('${mission}','{"assigned_to":"${user(3)}"}')->>'success')::boolean`, 'reassignment'));
  check('017 unconnected reassignment blocked and original recipient remains', `${truth(`update_task('${mission}','{"assigned_to":"${user(4)}"}')->>'error'='recipient_not_connected'`, 'unconnected replacement')}; ${truth(`(SELECT assigned_to FROM tasks WHERE id='${mission}')='${user(2)}'::uuid`, 'recipient unchanged')}`);
  check('017 new unconnected assignee fails from unassigned draft', `DO $test$ DECLARE task_id uuid; result json; BEGIN SELECT (create_task('Draft')->>'task_id')::uuid INTO task_id; result := update_task(task_id,'{"assigned_to":"${user(2)}"}'); PERFORM test.assert_true(result->>'error'='recipient_not_connected','unconnected assignment'); PERFORM test.assert_true((SELECT assigned_to IS NULL FROM tasks WHERE id=task_id),'no mutation'); END $test$`);
  check('017 existing disconnected mission remains editable', truth(`(update_task('${mission}','{"title":"Edited existing mission"}')->>'success')::boolean`, 'existing task'));
  check('017 self credit update still blocked', truth(`update_task('${mission}','{"assigned_to":"${user(1)}","reward_type":"credit"}')->>'error'='self_assigned_credit_reward'`, 'self credit edit'));
  check('017 valid invite accepts existing pending request', `SELECT test.assert_true((redeem_invite('local-test-invite')->>'success')::boolean,'invite accepted'); ${truth(`(SELECT status FROM friendships WHERE id='${ab}')='accepted'`, 'invite row')}`, 'authenticated', user(2));
  check('017 valid invite creates an accepted connection', `DELETE FROM friendships WHERE id='${ac}'; SELECT test.assert_true((redeem_invite('local-test-invite')->>'success')::boolean,'invite created'); ${truth(`(SELECT status FROM friendships WHERE user2_id='${user(3)}')='accepted'`, 'invite new row')}`, 'authenticated', user(3));
  check('017 invalid invite cannot grant connection', truth(`redeem_invite('invalid-local-token')->>'error'='INVALID_INVITE'`, 'invalid token'), 'authenticated', user(2));
  check('017 self invite remains blocked', truth(`redeem_invite('local-test-invite')->>'error'='SELF_INVITE'`, 'self invite'));
  const reward = '30000000-0000-4000-8000-000000000001';
  const unassigned = '30000000-0000-4000-8000-000000000002';
  check('017 assigned recipient purchases without a current accepted friendship', `${truth(`(purchase_reward('${reward}',auth.uid())->>'success')::boolean`, 'assigned purchase')}; ${truth(`(SELECT balance FROM user_credits WHERE user_id=auth.uid())=90`, 'charged exactly once')}; ${truth(`(SELECT count(*) FROM collected_rewards WHERE reward_id='${reward}' AND collector_id=auth.uid())=1`, 'own collection')}; ${truth(`(SELECT is_active FROM rewards_store WHERE id='${reward}')=false`, 'reward consumed')}`, 'authenticated', user(2));
  check('017 outsider known-UUID purchase denied without charging', `${truth(`purchase_reward('${reward}',auth.uid())->>'error'='NOT_RECIPIENT'`, 'outside purchase denied')}; ${truth(`(SELECT balance FROM user_credits WHERE user_id=auth.uid())=100`, 'not charged')}; ${truth('(SELECT count(*) FROM collected_rewards)=0','no collection')}`, 'authenticated', user(3));
  check('017 retained unassigned reward cannot be purchased', `${truth(`purchase_reward('${unassigned}',auth.uid())->>'error'='NOT_RECIPIENT'`, 'unassigned reward private')}; ${truth(`(SELECT balance FROM user_credits WHERE user_id=auth.uid())=100`, 'not charged')}; ${truth('(SELECT count(*) FROM collected_rewards)=0','no collection')}`, 'authenticated', user(2));
  check('017 purchase cannot spoof collector identity', `${truth(`purchase_reward('${reward}','${user(2)}')->>'error'='FORBIDDEN'`, 'collector spoof denied')}; ${truth(`(SELECT balance FROM user_credits WHERE user_id=auth.uid())=100`, 'not charged')}`, 'authenticated', user(3));
  check('017 creator self-purchase remains blocked', truth(`purchase_reward('${reward}',auth.uid())->>'error'='SELF_PURCHASE'`, 'no self purchase'));
  check('017 anonymous purchase RPC denied', denied(`SELECT purchase_reward('${reward}','${user(2)}')`), 'anon', '');
  const fingerprint = sql("SELECT md5(pg_get_functiondef('public.purchase_reward(uuid,uuid)'::regprocedure));").stdout.trim();
  console.log(`Audited purchase_reward(uuid,uuid) function fingerprint: ${fingerprint}`);
}
