-- Rollback Proposal 007 - Option A: Move pg_net Back to public Schema

BEGIN;

-- 1. Move pg_net extension back to public schema
ALTER EXTENSION pg_net SET SCHEMA public;

-- 2. Drop net schema if empty (optional)
DROP SCHEMA IF EXISTS net;

COMMIT;

-- Note: This restores pg_net to public schema (original state)
-- If you had updated function references to net.http_post(), revert to http_post()
