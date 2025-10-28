-- Proposal 007 - Option B: Drop pg_net Extension (If Unused)
-- Only use this if your app does NOT use pg_net for HTTP requests

BEGIN;

-- 1. Drop pg_net extension
DROP EXTENSION IF EXISTS pg_net CASCADE;

COMMIT;

-- IMPORTANT: Only run this if you verified:
-- 1. No functions use net.http_post() or net.http_get()
-- 2. No edge functions rely on pg_net
-- 3. No webhooks or external HTTP calls from database
--
-- Verification query:
-- SELECT proname, prosrc FROM pg_proc WHERE prosrc LIKE '%http_post%' OR prosrc LIKE '%http_get%';
