import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createDeleteAccountHandler } from './handler.ts';

serve(createDeleteAccountHandler(() => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  const client = createClient(url,key,{ auth:{persistSession:false,autoRefreshToken:false} });
  const args = (user: string, operation: string) => ({p_user_id:user,p_operation_id:operation});
  return {
    getUser: token => client.auth.getUser(token),
    receipt: (user,operation) => client.rpc('account_deletion_receipt',args(user,operation)),
    begin: (user,session,operation) => client.rpc('begin_account_deletion',{...args(user,operation),p_session_id:session}),
    files: (user,operation) => client.rpc('account_deletion_files',args(user,operation)),
    removeFiles: (bucket,names) => client.storage.from(bucket).remove(names),
    cleanup: (user,operation) => client.rpc('cleanup_account_data',args(user,operation)),
    deleteUser: user => client.auth.admin.deleteUser(user,false),
    complete: (user,operation) => client.rpc('complete_account_deletion',args(user,operation)),
  };
}));
