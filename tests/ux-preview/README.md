# Offline workflow preview

Run `npm run dev:preview`, then open `http://127.0.0.1:6076/`.

The real app components use fictional Michael/Alex/Sam data through a dev-only Supabase adapter. No credentials, live requests, or real invitations are used. The preview is visibly labelled. Data resets on reload.

- `/?scenario=signed-out` — email-first login (form layout only; no email is sent).
- `/` — populated received/sent missions, people, rewards, profile and styles.
- `/?scenario=empty` — established account with no missions or people.
- `/?scenario=new` — first-run introduction (complete onboarding is cached for the fixture user; use Profile → restart onboarding to repeat).
- `/invite/sample-invite?scenario=invite-retry` — the first redemption fails, the Retry action succeeds.

Supports the displayed mission lifecycle and profile/people UI operations; it does not emulate authorization, Storage, push delivery or real multi-client Realtime. Those require the live/device checks in the release report. This config is not used by `npm run build`.

For stable compiled assets after dependency updates, build with `npx vite build --config tests/ux-preview/vite.config.ts --outDir node_modules/.ux-preview-dist`, then serve with `npx vite preview --outDir node_modules/.ux-preview-dist --host 127.0.0.1 --port 6077`.
