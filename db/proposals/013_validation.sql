-- Proposal 013 validation queries (read-only; safe to run anytime).
-- Run BEFORE apply (pre-flight) and AFTER apply (confirmation).

-- 1. PRE-FLIGHT (load-bearing): the three functions 013 replaces are live and
--    have the signatures the up.sql uses. Expect 3 rows, security_definer = t,
--    config containing search_path=public. If create_task/update_task are
--    MISSING, 012 was never applied and 013 must not run.
SELECT p.proname,
       p.prosecdef                               AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid)             AS returns,
       p.proconfig                               AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task', 'approve_task')
ORDER BY p.proname;

-- 2. PRE-FLIGHT: record the CURRENT function bodies so the rollback can be
--    verified against reality rather than against the repo's snapshot. Save
--    this output with the backup. (013's down.sql claims to restore the 012 /
--    V3 bodies verbatim — this is how that claim gets checked.)
SELECT p.proname, md5(pg_get_functiondef(p.oid)) AS body_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task', 'approve_task')
ORDER BY p.proname;

-- 3. AFTER APPLY: the guard is actually in the shipped bodies. Expect
--    self_assigned_credit_reward = t for create_task and update_task, and
--    self_assign_guard = t for approve_task.
SELECT p.proname,
       pg_get_functiondef(p.oid) LIKE '%self_assigned_credit_reward%' AS has_reward_guard,
       pg_get_functiondef(p.oid) LIKE '%assigned_to = v_task.created_by%' AS has_approve_guard
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task', 'approve_task')
ORDER BY p.proname;

-- 4. AFTER APPLY: EXECUTE still granted to authenticated (anon may show t due
--    to Supabase's platform default-privilege grant on public functions —
--    known + benign, same note as 011/012: auth.uid() is checked first).
SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated']) AS rolname) r
WHERE n.nspname = 'public'
  AND p.proname IN ('create_task', 'update_task', 'approve_task')
ORDER BY p.proname, r.rolname;

-- 5. PRE-FLIGHT (the exposure question): how much standing was ALREADY
--    self-minted before 013? Every completed, credit-rewarded contract whose
--    creator is also its assignee. 013 stops new ones; it does not claw back
--    these. Michael decides whether to reconcile (see open point C).
SELECT t.assigned_to                                   AS user_id,
       p.display_name,
       count(*)                                        AS self_minted_contracts,
       sum(COALESCE(NULLIF(btrim(t.reward_text), '')::integer, 0)) AS self_minted_credits
FROM public.tasks t
LEFT JOIN public.profiles p ON p.id = t.assigned_to
WHERE t.status = 'completed'
  AND t.reward_type = 'credit'
  AND t.assigned_to IS NOT NULL
  AND t.assigned_to = t.created_by
GROUP BY t.assigned_to, p.display_name
ORDER BY self_minted_credits DESC;

-- 6. PRE-FLIGHT: the same users' current standing, so query #5's numbers can be
--    read as a share of their total. Band thresholds (STANDING_THRESHOLDS in
--    src/core/credits/standing.domain.ts) are 0 / 120 / 600 / 2000 / 8000.
SELECT uc.user_id,
       p.display_name,
       uc.balance,
       uc.total_earned,
       CASE
         WHEN uc.total_earned >= 8000 THEN 4
         WHEN uc.total_earned >= 2000 THEN 3
         WHEN uc.total_earned >=  600 THEN 2
         WHEN uc.total_earned >=  120 THEN 1
         ELSE 0
       END AS standing_band
FROM public.user_credits uc
LEFT JOIN public.profiles p ON p.id = uc.user_id
ORDER BY uc.total_earned DESC;

-- 7. PRE-FLIGHT: how many OPEN (not yet completed) contracts would the new
--    guard have refused at creation? These stay in the table and remain
--    completable — they just will not pay. If this number is not 0, the
--    client needs the 'self_assigned_credit_reward' error surfaced nicely
--    AND ideally a one-off cleanup, because approving one will silently pay
--    nothing.
SELECT t.id, t.title, t.status, t.reward_text, t.assigned_to
FROM public.tasks t
WHERE t.status <> 'completed'
  AND t.reward_type = 'credit'
  AND t.assigned_to IS NOT NULL
  AND t.assigned_to = t.created_by
ORDER BY t.created_at DESC;

-- 8. PRE-FLIGHT: confirm increment_user_credits is still reachable ONLY from
--    SECURITY DEFINER functions (013's whole guarantee rests on approve_task
--    being the sole caller). Expect can_execute = f for both anon and
--    authenticated.
SELECT r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated']) AS rolname) r
WHERE n.nspname = 'public' AND p.proname = 'increment_user_credits'
ORDER BY r.rolname;

-- 9. PRE-FLIGHT: confirm the legacy double-credit trigger is still gone (011
--    dropped it). If it came back, it mints on ANY status->completed write and
--    bypasses approve_task entirely, which would defeat 013. Expect 0 rows.
SELECT tgname, tgrelid::regclass AS on_table, tgenabled
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid = 'public.tasks'::regclass
  AND tgname = 'award_credits_on_completion';

-- 10. PRE-FLIGHT: any OTHER non-internal trigger on tasks that could write
--     credits. Expect only the app's own known triggers (updated_at style).
--     Anything unfamiliar here is a finding, not noise.
SELECT tgname, tgrelid::regclass AS on_table, tgenabled,
       pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid = 'public.tasks'::regclass
ORDER BY tgname;
