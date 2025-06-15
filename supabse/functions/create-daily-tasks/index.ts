// supabase/functions/create-daily-tasks/index.ts
// This function runs on a schedule to create daily task instances from active recurring templates.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Booting up create-daily-tasks function...');

// The main function that will be executed when the edge function is invoked
serve(async (req) => {
  // This function is designed to be called by a cron job, not a direct request.
  // We can add a security check here to ensure it's triggered by a trusted source.
  // For example, checking for a specific 'Authorization' header or a secret query parameter.
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // 1. Fetch all active recurring templates
    const { data: templates, error: templatesError } = await supabase
      .from('recurring_contract_templates')
      .select('*')
      .eq('is_active', true);

    if (templatesError) {
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active templates found. Nothing to do.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let createdCount = 0;
    const errors: string[] = [];

    // 2. For each template, check if an instance for today already exists.
    for (const template of templates) {
      try {
        // Find the most recent assignee for this template
        const { data: lastInstance, error: lastInstanceError } = await supabase
          .from('recurring_contract_instances')
          .select('assigned_to')
          .eq('template_id', template.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastInstanceError && lastInstanceError.code !== 'PGRST116') { // Ignore 'No rows found' error
          throw new Error(`Error fetching last assignee for template ${template.id}: ${lastInstanceError.message}`);
        }

        const assigneeId = lastInstance?.assigned_to || template.initial_assignee_id;
        if (!assigneeId) {
          console.warn(`Template ${template.id} has no initial or subsequent assignee. Skipping.`);
          continue;
        }

        // Check if a task for this template and date already exists
        const { data: existingInstance, error: existingError } = await supabase
          .from('recurring_contract_instances')
          .select('id')
          .eq('template_id', template.id)
          .eq('scheduled_date', today)
          .limit(1)
          .single();

        if (existingError && existingError.code !== 'PGRST116') { // Ignore 'No rows found' error
          throw new Error(`Error checking for existing instance for template ${template.id}: ${existingError.message}`);
        }

        // 3. If no instance exists for today, create one.
        if (!existingInstance) {
          const { error: insertError } = await supabase
            .from('recurring_contract_instances')
            .insert({
              template_id: template.id,
              assigned_to: assigneeId,
              scheduled_date: today,
              status: 'pending', // Default status for new instances
            });

          if (insertError) {
            throw new Error(`Failed to create instance for template ${template.id}: ${insertError.message}`);
          }
          createdCount++;
        }
      } catch (innerError) {
        console.error(innerError);
        errors.push(innerError.message);
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ message: `Completed with ${errors.length} errors.`, created: createdCount, errors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Daily task creation completed successfully.', created: createdCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
