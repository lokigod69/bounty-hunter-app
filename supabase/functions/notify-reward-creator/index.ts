import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createRewardNotificationHandler } from './handler.ts';

serve(createRewardNotificationHandler({
  getClient: () => {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return null;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return {
      auth: client.auth,
      findCollection: (rewardId, collectorId) => client.from('collected_rewards')
        .select('id, collected_at').eq('reward_id', rewardId).eq('collector_id', collectorId).maybeSingle(),
      findReward: (rewardId) => client.from('rewards_store')
        .select('creator_id').eq('id', rewardId).maybeSingle(),
      pairAllowed: (actorId, recipientId) => client.rpc('notification_pair_allowed', { p_actor: actorId, p_recipient: recipientId }),
    };
  },
  getEnv: (name) => Deno.env.get(name),
  fetch,
}));
