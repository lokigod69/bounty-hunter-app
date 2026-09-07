-- 2026-09-07: narrowly reviewed repair for Supabase's documented cloned CLI role.
-- BEFORE running: preserve pg_roles (no passwords), pg_auth_members (including
-- grantor), pg_shdepend, pg_db_role_setting, comments and session count locally.
-- This fixes access for the real schema/ACL backup; it changes no application
-- table, policy, function, file or account. Do not broaden on any error.
-- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore#cli_login_postgres-role-issues-after-cloning
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
DO $repair$
DECLARE target oid;
BEGIN
  IF current_database()<>'postgres' OR current_user<>'postgres' OR
     NOT EXISTS(SELECT FROM pg_roles WHERE rolname=current_user AND rolcreaterole) THEN
    RAISE EXCEPTION 'Unexpected database/current role';
  END IF;
  SELECT oid INTO target FROM pg_roles WHERE rolname='cli_login_postgres'
    AND NOT rolsuper AND NOT rolcanlogin AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolbypassrls AND NOT rolreplication AND rolinherit
    AND rolconnlimit=-1 AND rolconfig IS NULL AND rolvaliduntil IS NULL;
  IF target IS NULL THEN RAISE EXCEPTION 'CLI role does not match saved preflight'; END IF;
  IF (SELECT count(*) FROM pg_auth_members WHERE roleid=target OR member=target OR grantor=target)<>1
     OR NOT EXISTS(SELECT FROM pg_auth_members m JOIN pg_roles c ON c.oid=m.member
       JOIN pg_roles g ON g.oid=m.grantor WHERE m.roleid=target AND c.rolname='postgres'
       AND g.rolname='supabase_admin' AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option) THEN
    RAISE EXCEPTION 'Unexpected role membership';
  END IF;
  IF EXISTS(SELECT FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=target)
     OR EXISTS(SELECT FROM pg_db_role_setting WHERE setrole=target)
     OR EXISTS(SELECT FROM pg_stat_activity WHERE usename='cli_login_postgres')
     OR shobj_description(target,'pg_authid') IS NOT NULL THEN
    RAISE EXCEPTION 'Role has dependencies, settings, sessions or a comment';
  END IF;
  -- Ordinary DROP refuses any remaining dependency. No CASCADE, DROP OWNED,
  -- ownership reassignment, manual postgres grant or password change.
  DROP ROLE cli_login_postgres;
END $repair$;
SELECT NOT EXISTS(SELECT FROM pg_roles WHERE rolname='cli_login_postgres') AS broken_cli_role_removed;
COMMIT;
