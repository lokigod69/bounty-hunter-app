# Reward notification delivery — staged design, 2026-09-07

The immediate email endpoint is now bounded and tested locally. It verifies the caller's actual purchase, derives the confirmed recipient from Auth, sends generic content, rejects events older than one hour and supplies one stable collection-based Resend key. No new SQL or provider deployment was performed. The root agent's authenticated CLI inventory confirms no Edge Functions are currently deployed in this Supabase project, so reward email is not live functionality yet.

This is enough to remove the old arbitrary destination and unbounded old-purchase replay behavior, but it cannot retry a notification missed during a longer outage, report durable delivery state, or limit many distinct valid events. It relies on the deployed provider honoring its documented 24-hour idempotency window; tests verify our key and age checks, not Resend's remote behavior. [Provider contract](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Small durable extension

1. Add a server-only `notification_events` table with `id`, unique `(event_type, collection_id)`, `recipient_id`, `status`, `created_at`, `first_attempt_at`, `next_attempt_at`, `attempt_count`, `locked_until`, `provider_message_id` and `last_error_code`. RLS on; no anon/authenticated table writes or reads. Error codes must be a small non-sensitive enum. Do not store access tokens, provider secrets, proof content or email bodies.
2. Insert exactly one `reward_collected` event inside the successful purchase transaction, deriving both collection and recipient from committed rows. Do not let the browser submit an arbitrary event or recipient. Make the uniqueness constraint authoritative under concurrent purchase/retry requests.
3. A server-only worker claims a bounded batch atomically, with a lease and retry time. Resolve the recipient's current confirmed Auth email immediately before delivery; skip deleted accounts. Use generic stable content and event ID as the provider idempotency key. Remove events and registered delivery addresses as part of account deletion.
4. Track pending/sent/failed/unknown outcomes durably. Retry transient failures with bounded backoff and an attempt ceiling. Limit accepted events per recipient/time bucket server-side. A malicious client cannot reset counters or replay a completed event.
5. Treat the send/record gap honestly: a crash after provider acceptance but before marking sent requires reconciling the original provider message/key. Retry within provider key retention; after the window, an uncertain send becomes `unknown` for reconciliation rather than blindly sending again. A database row alone cannot guarantee exactly-once delivery across an external provider boundary.
6. Once the worker is deployed and verified, remove the browser-triggered direct-send path entirely. Purchase success should not wait for email. This simplifies the client and makes offline/retry behavior a server concern.

## Validation and deployment gates

- Isolated DB tests: anonymous/authenticated callers cannot forge, read or update events; purchase rollback creates no event; repeated/concurrent purchase calls create at most the intended event; recipient derives from the reward owner.
- Worker tests: concurrent claim exclusion, lease expiry, provider timeout, 429/5xx backoff, definitive 4xx failure, deleted/unconfirmed recipient, repeat invocation after sent, notification preference changes, and a crash between send acceptance and database acknowledgement.
- Staging provider evidence: verify one message for concurrent identical requests; verify stable recipient/content handling; simulate ambiguous failure and prove no blind resend outside provider retention.
- Concrete reviewed migration/rollback, backup and explicit production SQL approval remain required by project protocol. First repair the current profile/task/Storage authorization findings; do not build event trust on a mutable client timestamp or creator field.
- Required service settings: existing Supabase service role available only to the Edge Function, `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL`, and deployed worker configuration. Owner access is only needed when those services/domain controls are unavailable to the agent. Never use a `VITE_` prefix for these secrets.

This proposal is not deployed functionality, and it does not add a second email provider or a scheduling framework.
