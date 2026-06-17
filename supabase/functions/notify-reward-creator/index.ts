// supabase/functions/notify-reward-creator/index.ts
// Edge function to notify a reward creator when their reward is purchased from the store.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  reward_id: string;
  collector_id: string;
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

  if (!resendApiKey || !resendFromEmail) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    throw new Error(`EMAIL_SEND_FAILED: ${resendResponse.status} ${errorBody}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const accessToken = getBearerToken(req.headers.get('Authorization'));
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await requesterClient.auth.getUser();

    if (requesterError || !requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { reward_id, collector_id } = (await req.json()) as NotificationPayload;

    if (!reward_id || !collector_id) {
      return new Response(JSON.stringify({ error: 'Missing reward_id or collector_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requester.id !== collector_id) {
      return new Response(JSON.stringify({ error: 'collector_id must match the authenticated user.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: collectionRow, error: collectionError } = await supabaseAdmin
      .from('collected_rewards')
      .select('id')
      .eq('reward_id', reward_id)
      .eq('collector_id', collector_id)
      .maybeSingle();

    if (collectionError) {
      throw new Error(`Failed to verify reward collection: ${collectionError.message}`);
    }

    if (!collectionRow) {
      return new Response(JSON.stringify({ error: 'Reward purchase record not found.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: rewardData, error: rewardError } = await supabaseAdmin
      .from('rewards_store')
      .select('name, creator_id')
      .eq('id', reward_id)
      .single();

    if (rewardError || !rewardData) {
      throw new Error(`Reward not found or error fetching reward: ${rewardError?.message}`);
    }

    const { data: creatorUserData, error: creatorUserError } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name')
      .eq('id', rewardData.creator_id)
      .single();

    if (creatorUserError || !creatorUserData || !creatorUserData.email) {
      throw new Error(`Creator profile or email not found: ${creatorUserError?.message}`);
    }

    const { data: collectorProfileData, error: collectorProfileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', collector_id)
      .single();

    if (collectorProfileError || !collectorProfileData) {
      throw new Error(`Collector profile not found: ${collectorProfileError?.message}`);
    }

    const collectorName = collectorProfileData.display_name || 'A collector';
    const creatorName = creatorUserData.display_name || 'Reward Creator';

    const emailSubject = `🎉 Your Reward "${rewardData.name}" has been purchased!`;
    const emailBody = `
      <p>Hi ${creatorName},</p>
      <p>Great news! Your reward, <strong>${rewardData.name}</strong>, was just purchased by <strong>${collectorName}</strong>.</p>
      <p>Keep offering amazing rewards!</p>
      <p>Best,</p>
      <p>The Rewards Store Team</p>
    `;

    await sendEmail(creatorUserData.email, emailSubject, emailBody);

    return new Response(JSON.stringify({ message: 'Notification email processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = toErrorMessage(error);
    const status = errorMessage === 'EMAIL_PROVIDER_NOT_CONFIGURED' ? 503 : 500;

    console.error('Error in notify-reward-creator:', errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
