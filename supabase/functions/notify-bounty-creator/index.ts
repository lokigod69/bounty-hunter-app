// supabase/functions/notify-bounty-creator/index.ts
// Edge function to notify a bounty creator when their bounty is collected.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Notify Bounty Creator Edge Function starting up');

// Basic email sending function (placeholder - replace with actual implementation)
// This might use Supabase's built-in emailer if possible for transactional, or a third-party service.
async function sendEmail(to: string, subject: string, body: string) {
  console.log(`Simulating email send:\nTo: ${to}\nSubject: ${subject}\nBody: ${body}`);
  // In a real scenario, you'd integrate with an email provider here.
  // For example, using fetch to call a service like Resend, SendGrid, or Mailgun.
  // Supabase's built-in email sending is primarily for auth events, but you might be able to trigger custom emails
  // via pg_net or by calling another function that has those capabilities if direct SMTP isn't exposed easily.

  // For now, this is a mock. If Supabase allows invoking auth email templates for custom purposes, that's an option.
  // Otherwise, a service like Resend is straightforward: 
  /* 
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Bounty Hunter <noreply@yourdomain.com>', // Replace with your verified sender
      to: [to],
      subject: subject,
      html: body, 
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${errorBody}`);
  }
  console.log('Email sent successfully via Resend (simulated actual call).');
  */
  return { success: true, message: 'Email sent (simulated).' };
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function via a POST request.
  // For invocation from an RPC, the Supabase client within the RPC will directly call the function.
  // However, standard Edge Functions are typically invoked via HTTP.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Use anon key for client, service_role for admin tasks
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    // Create a Supabase client with the service_role key to bypass RLS if needed for admin tasks
    // For reading user emails, service_role might be necessary.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { bounty_id, collector_id } = await req.json();

    if (!bounty_id || !collector_id) {
      return new Response(JSON.stringify({ error: 'Missing bounty_id or collector_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch bounty details to get creator_id and bounty_name
    const { data: bountyData, error: bountyError } = await supabaseAdmin
      .from('bounties')
      .select('name, creator_id')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bountyData) {
      throw new Error(`Bounty not found or error fetching bounty: ${bountyError?.message}`);
    }

    // 2. Fetch creator's email from auth.users table
    // Note: Accessing auth.users directly might require service_role or specific grants.
    // If profiles table stores emails and is preferred, query that instead.
    const { data: creatorUserData, error: creatorUserError } = await supabaseAdmin
      .from('profiles') // Assuming a 'profiles' table linked to auth.users by 'id'
      .select('email, username') // And that it contains an 'email' and 'username' field
      .eq('id', bountyData.creator_id)
      .single();

    if (creatorUserError || !creatorUserData || !creatorUserData.email) {
      throw new Error(`Creator profile or email not found: ${creatorUserError?.message}`);
    }

    // 3. Fetch collector's username/display name
    const { data: collectorProfileData, error: collectorProfileError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', collector_id)
      .single();
    
    if (collectorProfileError || !collectorProfileData) {
      console.warn(`Collector profile not found: ${collectorProfileError?.message}`);
      // Decide if this is critical. Email can still be sent without collector's name.
    }
    const collectorName = collectorProfileData?.username || 'An adventurous user';

    // 4. Construct and send email
    const emailSubject = `🎉 Your Bounty "${bountyData.name}" has been collected!`;
    const emailBody = `
      <p>Hi ${creatorUserData.username || 'Bounty Creator'},</p>
      <p>Great news! Your bounty, <strong>${bountyData.name}</strong>, was just collected by <strong>${collectorName}</strong>.</p>
      <p>Keep creating amazing bounties!</p>
      <p>Best,</p>
      <p>The Bounty Hunter Team</p>
    `;

    await sendEmail(creatorUserData.email, emailSubject, emailBody);

    return new Response(JSON.stringify({ message: 'Notification email processed.' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/* 
Supabase CLI commands for local development and deployment:

1. Ensure Supabase CLI is installed and you are logged in.
2. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
3. Start local Supabase services (if not already running for other backend dev):
   `supabase start`
4. Serve the function locally:
   `supabase functions serve notify-bounty-creator --no-verify-jwt --env-file ./supabase/.env.local`
   (Create .env.local with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY if using Resend)
5. Test invocation (e.g., using curl or Postman):
   curl -i --location --request POST 'http://localhost:54321/functions/v1/notify-bounty-creator' \
   --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
   --header 'Content-Type: application/json' \
   --data '{
     "bounty_id": "your-bounty-uuid",
     "collector_id": "collector-user-uuid"
   }'
6. Deploy the function:
   `supabase functions deploy notify-bounty-creator --no-verify-jwt`

Invocation from RPC (purchase_bounty):

  -- Inside your plpgsql function, after successful purchase:
  PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-bounty-creator',
      headers := '{"Authorization": "Bearer " || supabase_anon_key, "Content-Type": "application/json"}',
      body := jsonb_build_object(
          'bounty_id', p_bounty_id::text, 
          'collector_id', p_collector_id::text
      )
  );
  -- Ensure pg_net extension is enabled in Supabase.
  -- supabase_url and supabase_anon_key would need to be available to the RPC, 
  -- perhaps via custom config settings or passed in if secure.
  -- Alternatively, Supabase client libraries can invoke functions directly from server-side code if running in a trusted environment.
  -- For RPCs, a direct function invocation using the Supabase JS client within another Edge Function (if RPC is complex) 
  -- or a direct call from a trusted backend service is more common than http_post from PL/pgSQL for invoking other Edge Functions.
  -- However, Supabase is adding more direct plpgsql to edge function invocation methods. 
  -- The most robust way from PL/pgSQL might be to use `supabase.functions.invoke` if you were writing JS/TS logic that calls the RPC.
  -- For now, let's assume the RPC `purchase_bounty` will be updated to call this function. 
  -- The direct invocation from JS client is: `await supabase.functions.invoke('notify-bounty-creator', { body: { bounty_id, collector_id } })`
*/
