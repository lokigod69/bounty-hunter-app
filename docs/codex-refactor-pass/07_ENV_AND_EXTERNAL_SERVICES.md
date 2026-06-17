# Env And External Services

## Required Client Env

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

If either is missing, `src/lib/supabase.ts` throws and the app cannot start.

## Optional / Server-Side Env

Set these in Supabase Edge Function secrets, not in the browser:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
SUPABASE_SERVICE_ROLE_KEY=
DAILY_TASKS_SECRET=
SITE_URL=
```

Legacy Gmail notification functions may require:

```env
GMAIL_USER=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

## Providers

| Provider | Used For | Required? | Missing Behavior |
|---|---|---|---|
| Supabase Auth | Login/signup/session | yes | App unusable. |
| Supabase Postgres | tasks, rewards, credits, profiles | yes | App unusable. |
| Supabase Storage | avatars, proof, reward images | yes for upload flows | Upload features fail. |
| Supabase Realtime | friends/tasks refresh | optional | App still works with manual refresh/refetch. |
| Resend | reward-creator notification | optional | Function returns provider/config error or notification silently fails from caller. |
| Gmail OAuth | legacy notifications | optional/legacy | Legacy functions fail if invoked. |
| Payments | none | no | No real payment system exists. |
| AI/model provider | none in app runtime | no | No AI feature breaks. |

## Ports

- Frontend dev port assigned by Saya: `6075`.
- Separate backend port: none. There is no separate Node/API server.
- Supabase local API in `supabase/config.toml`: `55321`.
- Supabase local DB: `55432`.
- Supabase Studio: `55323`.
- Inbucket email UI: `55324`.

Run frontend locally with:

```powershell
npm run dev -- --host 127.0.0.1 --port 6075
```

## Mock / Fallback Mode

There is no complete offline mock mode. Some UI states are placeholders, but the core app requires Supabase.
