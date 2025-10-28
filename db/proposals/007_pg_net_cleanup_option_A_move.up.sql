-- Proposal 007 - Option A: Move pg_net Extension to net Schema
-- Supabase Advisor recommends pg_net extension NOT be in public schema
-- This migration creates 'net' schema and moves pg_net extension

BEGIN;

-- 1. Create net schema (if doesn't exist)
CREATE SCHEMA IF NOT EXISTS net;

-- 2. Move pg_net extension to net schema
ALTER EXTENSION pg_net SET SCHEMA net;

-- 3. Update search_path for functions that use pg_net (if any)
-- Note: If you have functions using net.http_post(), ensure they reference net.http_post() explicitly
-- or add net to their search_path

COMMIT;

-- After migration, references to pg_net functions must use:
-- - net.http_post() instead of http_post()
-- - net.http_get() instead of http_get()
--
-- Check for functions using pg_net:
-- SELECT proname FROM pg_proc WHERE prosrc LIKE '%http_post%';
