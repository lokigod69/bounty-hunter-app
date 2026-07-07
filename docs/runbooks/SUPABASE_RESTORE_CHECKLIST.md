# Supabase Restore Checklist

Written 2026-07-07 after the Supabase project was found paused (login fails
with "Failed to fetch" — the API host is unreachable, so every auth call dies
before it starts; Vercel redeploys cannot fix this).

**Critical fact:** `supabase/migrations/` has NO base-schema migration — the
earliest files are RPC/policy tweaks. The core tables (tasks, profiles,
rewards_store, collected_rewards, user_credits, …) were created in the
dashboard and exist ONLY inside the paused project. A fresh Supabase project
cannot be rebuilt from this repo alone. Even though the data is disposable
test data, the SCHEMA is not.

## Step 0 — Do this first, regardless of path
Download the backup the dashboard is offering ("restore dashboard backup" /
Database → Backups → download). That file contains the schema. Keep it even
if Option A works — it doubles as the schema source-of-truth we've never had
(memory/STATE.md open question #2).

## Option A — Restore in place (RECOMMENDED, try first)
1. Supabase dashboard → the paused project → **Restore project**.
2. Wait until the project shows healthy (can take several minutes).
3. Nothing else to reconfigure: project URL, anon key, auth settings, storage
   buckets, RLS policies, and data all come back exactly as they were.
4. Test login on the Vercel prod URL. If the Vercel deploy is current, no
   redeploy is needed (env vars didn't change).
5. Prevention: free-tier projects pause after ~7 days of inactivity. Either
   log into the app weekly, or add a trivial keep-alive (e.g. a scheduled
   ping hitting the REST endpoint), or upgrade the project.

## Option B — New project (only if restore is impossible)
1. Create the new Supabase project.
2. Restore the Step-0 backup into it (SQL editor or `psql`/`pg_restore`
   against the new connection string). This recreates schema + policies.
3. Apply anything in `supabase/migrations/` newer than the backup (likely
   none — check timestamps).
4. Auth settings (dashboard → Authentication):
   - Enable the Email provider (magic link / OTP; the login form also uses
     password sign-in — enable email+password too).
   - Site URL = the Vercel production URL.
   - Additional redirect URLs: the Vercel URL(s) + `http://127.0.0.1:6075`
     and `http://localhost:6075` for local dev.
5. Storage: verify the `bounty-proofs` bucket exists (the backup should have
   recreated it; if not, run `supabase/migrations/20260611120000_storage_buckets_and_policies.sql`).
6. New credentials into the app:
   - Vercel → project → Settings → Environment Variables:
     `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → redeploy.
   - Local: same two keys in `.env.local`.
7. Edge functions (only if/when used): re-set secrets per `.env.example`
   (`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …). The legacy Gmail
   functions stay undeployed.

## Option C — Pivot away from Supabase (NOT recommended now)
The app leans on Supabase auth + RLS + realtime + storage; SQLite or a plain
Postgres on the Hetzner box means rebuilding all four. Self-hosting Supabase
on Hetzner is possible but is real ops work (Docker stack, SMTP for magic
links, backups, TLS). Revisit only if the pause/free-tier friction keeps
hurting after A/B.
