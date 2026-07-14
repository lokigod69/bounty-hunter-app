-- Proposal 012 validation queries (read-only; safe to run anytime).
-- Run BEFORE apply (pre-flight) and AFTER apply (confirmation).

-- 1. The two new RPCs exist, are SECURITY DEFINER, and pin search_path.
--    PRE-FLIGHT: expect 0 rows. AFTER APPLY: expect 2 rows, security_definer
--    = t, config contains search_path=public.
SELECT p.proname,
       p.prosecdef                               AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.proconfig                               AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task')
ORDER BY p.proname;

-- 2. AFTER APPLY: EXECUTE granted to authenticated (anon may show t due to
--    Supabase's platform default-privilege grant on new public functions -
--    known + benign, same as the 011 RPCs: auth.uid() is checked first).
SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated']) AS rolname) r
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task')
ORDER BY p.proname, r.rolname;

-- 3. PRE-FLIGHT (load-bearing): live policies on tasks - confirm the three
--    names the up.sql drops actually match. Expect (post-011 state):
--    "Admins full access" (ALL), "Create tasks" (INSERT, a = insert),
--    "Users can delete own tasks" (DELETE, d), "Users can update own created
--    tasks" (UPDATE, w), "Users can view assigned tasks" (SELECT, r),
--    "View tasks" (SELECT, r).
--    AFTER APPLY: the INSERT/UPDATE/DELETE creator policies are gone; only
--    the two SELECT policies + "Admins full access" remain.
SELECT polname, polcmd,
       pg_get_expr(polqual, polrelid)      AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.tasks'::regclass
ORDER BY polname;

-- 4. PRE-FLIGHT: columns the RPCs write must exist on live (the repo
--    schema.sql snapshot predates is_daily). Expect all 8 rows.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
  AND column_name IN ('title', 'description', 'assigned_to', 'deadline',
                      'reward_type', 'reward_text', 'proof_required', 'is_daily')
ORDER BY column_name;

-- 5. PRE-FLIGHT: the 011 RPCs are live (012 assumes delete_task exists when
--    it drops the client DELETE policy). Expect 5 rows + approve_task.
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('submit_proof', 'reject_task', 'set_task_status',
                    'archive_task', 'delete_task', 'approve_task')
ORDER BY p.proname;
