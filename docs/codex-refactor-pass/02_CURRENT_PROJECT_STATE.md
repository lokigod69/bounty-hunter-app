# Current Project State

Bounty Hunter is a React/Vite/Supabase app for trusted small groups to turn tasks into missions, submit proof, approve completion, earn credits, and spend those credits on custom rewards.

## Actually Implemented

- Auth-gated React SPA routes: `/login`, `/onboarding`, `/`, `/issued`, `/friends`, `/rewards-store`, `/my-rewards`, `/archive`, `/profile/edit`.
- Supabase Auth through Google OAuth, email/password, and magic link.
- Profile bootstrap/editing with avatar upload.
- Theme/mode language for guild/family/couple-style use.
- Friends and pending invite flows.
- Mission inbox and issued mission management.
- Proof submission with Supabase Storage.
- Server-side task approval via `approve_task` RPC.
- Rewards store CRUD and purchase via Supabase RPCs.
- Internal credit balance display.
- Supabase Edge Functions for reward/new-mission/proof email notifications.
- Capacitor/iOS scaffold.

## Mocked, Partial, Or Experimental

- `/my-rewards` is mostly a placeholder; collected rewards are visible inside the rewards-store tab.
- Daily missions/streaks have migrations/hooks/functions, but current approval RPC no longer writes streaks.
- `create-daily-tasks` uses recurring table names that do not clearly match migrations.
- Legacy Gmail notification functions exist and should be treated as unsafe until reviewed.
- Marketing images under `public/marketing` are assets, not app features.
- Reward image bucket setup is not fully represented in migrations.

## Fragile Areas

- Database truth is split between migrations, schema dumps, SQL proposals, and old docs.
- `src/types/database.ts` appears stale relative to newer RPCs and profile fields such as `partner_user_id`.
- Task lifecycle still has direct table update paths; `approve_task` is safer than other transitions.
- Proof UI/config and domain validation disagree: UI allows PDF, domain allows image/video.
- Supabase storage buckets and policies are not fully codified as migrations.
- Edge Function auth/validation is inconsistent across functions.
- Bundle size warning remains for the main JS chunk.
- No automated test suite is configured.

## Strong Areas

- Product loop is clear: create mission, submit proof, approve, award credits, claim reward.
- Strict TypeScript build is enabled and currently succeeds.
- The domain layer is moving sensitive operations toward RPCs.
- Newer reward purchase RPC uses row locks and returns structured responses.
- Documentation is extensive; the problem is organization and currentness, not absence.

## Current Verification Snapshot

- `npm run build`: passes with warnings.
- `npm run lint`: passes with 3 warnings and 0 errors.
- `npm audit --omit=dev`: passes with 0 vulnerabilities after `npm audit fix`.
- No `npm test` script exists.
