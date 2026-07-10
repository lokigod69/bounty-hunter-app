-- Proposal 011 validation queries (read-only; safe to run anytime).

-- 1. The five new RPCs exist, are SECURITY DEFINER, and pin search_path.
SELECT p.proname,
       p.prosecdef                          AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.proconfig                          AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('submit_proof', 'reject_task', 'set_task_status',
                    'archive_task', 'delete_task')
ORDER BY p.proname;
-- Expect: 5 rows, security_definer = t, config contains search_path=public.

-- 2. EXECUTE is granted to authenticated only (not PUBLIC/anon).
SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated']) AS rolname) r
WHERE n.nspname = 'public'
  AND p.proname IN ('submit_proof', 'reject_task', 'set_task_status',
                    'archive_task', 'delete_task')
ORDER BY p.proname, r.rolname;
-- Expect: authenticated = t, anon = f for all five.

-- 3. PRE-FLIGHT (run BEFORE applying): does the legacy double-credit trigger exist?
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.tasks'::regclass AND NOT tgisinternal;
-- If award_credits_on_completion appears, the up.sql DROP TRIGGER is load-bearing.

-- 4. PRE-FLIGHT (run BEFORE applying): live UPDATE policies on tasks —
--    confirm the names the up.sql drops actually match.
SELECT polname, polcmd,
       pg_get_expr(polqual, polrelid)      AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.tasks'::regclass
ORDER BY polname;
-- After apply: the assignee-side UPDATE policies are gone; creator-side
-- "Users can update own created tasks" (and INSERT/SELECT/DELETE policies) remain.

-- 5. proof_type CHECK constraint (Open Point A — decided: image/video/document/text).
--    PRE-FLIGHT: records the old definition. AFTER APPLY: expect the new set.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass AND contype = 'c'
ORDER BY conname;

-- 5b. PRE-FLIGHT: any existing rows outside the new proof_type set would make
--     the ADD CONSTRAINT in up.sql section 0.5 fail — expect zero rows here.
SELECT proof_type, count(*)
FROM public.tasks
WHERE proof_type IS NOT NULL
  AND proof_type NOT IN ('image', 'video', 'document', 'text')
GROUP BY proof_type;
