-- Validation Queries for Proposal 004
-- These queries verify search_path hardening was applied successfully

-- 1. Verify all SECURITY DEFINER functions have search_path set
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_mode,
  pg_get_functiondef(p.oid) LIKE '%SET search_path%' AS has_search_path_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true  -- Only SECURITY DEFINER functions
ORDER BY p.proname;

-- Expected output: All 5 functions should have has_search_path_set = true:
-- 1. create_reward_store_item
-- 2. delete_reward_store_item
-- 3. handle_new_user
-- 4. increment_user_credits
-- 5. update_reward_store_item

-- 2. Extract exact search_path configuration for each function
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- Expected: Each function definition should contain "SET search_path = public, pg_temp"

-- 3. Verify function execution still works (test with real call)
-- Test create_reward_store_item still functions correctly
-- Note: This will fail if you don't have a friend relationship set up
-- It's just to verify the function exists and is callable
SELECT
  json_extract_path_text(
    create_reward_store_item(
      'Test Reward',
      'Test Description',
      'https://example.com/image.png',
      100,
      auth.uid()
    )::json,
    'success'
  ) AS test_result;

-- Expected: 'false' (because no friend relationship) OR 'true' (if friend exists)
-- Important: Function should NOT error with "function does not exist"

-- 4. Count total SECURITY DEFINER functions
SELECT COUNT(*) AS total_security_definer_functions
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true;

-- Expected: 5 (or more if additional SECURITY DEFINER functions exist)
