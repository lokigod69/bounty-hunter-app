-- Rollback Proposal 007 - Option B: Restore pg_net Extension

BEGIN;

-- 1. Re-create pg_net extension in public schema
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA public;

COMMIT;

-- Note: This restores pg_net to public schema
-- If you had previously moved it to net schema, use Option A migration instead
