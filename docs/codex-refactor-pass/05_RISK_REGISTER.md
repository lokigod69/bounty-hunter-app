# Risk Register

## Could Break

- Credit balance display if production lacks a readable `user_credits` select policy.
- Reward purchase if `user_credits` rows are missing and purchase RPC does not create them.
- Collected rewards tab if RLS policy is absent in production.
- Proof uploads if storage buckets or policies are missing.
- Text/PDF proof if DB constraint only allows image/video proof types.
- Notification functions if required provider secrets are absent.
- Clean Supabase reset if recurring-task migration naming is still inconsistent.

## Must Be Manually Tested

- Auth login/signup with password, Google, and magic link.
- Friend request send/accept/reject/remove.
- Create mission, submit proof, approve, verify credits increase once.
- Create no-proof mission, submit for review, approve.
- Create reward for accepted friend, claim it, verify balance and collected tab.
- Avatar upload, reward image upload, proof upload.
- Mobile menu/modal flows on a phone-sized viewport.

## External Service Dependencies

- Supabase Auth, Postgres, Storage, Realtime, Edge Functions.
- Resend for `notify-reward-creator`.
- Gmail OAuth/nodemailer for legacy notification functions.
- Vercel/static host if deployed.
- Capacitor/iOS toolchain for native packaging.

## Requires Saya Review Before Touching

- Production SQL execution.
- Dropping legacy tables or triggers.
- Changing auth provider configuration.
- Making proof storage private.
- Payment/monetization implementation.
- Public launch or app-store preparation.
- Deleting archived docs or visual assets.
