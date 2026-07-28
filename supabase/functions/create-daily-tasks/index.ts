// supabase/functions/create-daily-tasks/index.ts
// V1 disabled: recurring-template scheduling is not part of the launch path, and the
// tables this function targeted (recurring_contract_templates/_instances) do not exist
// in the current schema. Kept as a fail-closed stub; safe to delete entirely.
// Original implementation archived at _archive/supabse/functions/create-daily-tasks/.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      error:
        'create-daily-tasks is disabled for V1. Its target tables were removed from the schema; recurring scheduling must be redesigned before this endpoint returns.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
