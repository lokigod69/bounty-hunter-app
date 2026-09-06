# Product review and release handoff

2026-09-07. Starting point: main at `14c92a0`. Implementation and push were explicitly authorized. No production SQL or live account mutations were performed.

## Product decision

Bounty Hunter is a private exchange between people who know each other: send a mission, complete it, review it, deliver the agreed reward. Use **one account and one People list** with partners, relatives, and friends together. Each mission selects its recipient. There is no workspace switch or relationship mode to learn.

This is the simplest model the existing backend actually supports. A relationship label would add a choice without changing a useful capability; separate dashboards would imply isolation, membership and administrative rules the app does not implement. Add households only when a concrete need appears, such as a parent administering child accounts or shared visibility for several people. Those would be real permission models, not color themes.

Existing theme IDs remain compatible with stored profiles. Their public names are **Mint, Gold, Rose**. They change appearance and rank flavor; they do not change recipients, currency, permissions or the main vocabulary. Existing partner metadata was left in the database but no longer restricts the interface.

## What changed

- Three persistent destinations: **Missions, Rewards, People**. Missions has **For you / Sent by you**, a New mission action and History. Profile, appearance, language, sound and progress live behind the avatar.
- Deleted the mobile menu, cursor trail, floating creation buttons, three-step onboarding components, partner-selection hook, mode-dependent recipient logic, repeated board statistics, empty secondary sections, and duplicated theme vocabulary.
- Replaced onboarding with a short explanation and a direct next action. Pending invitations are redeemed before onboarding, retained after failure, and explicitly retryable. A profile-load failure now has a retry instead of an endless spinner.
- People offers an invitation first, optional existing-user search, and a New mission shortcut for each connection. Search responses cannot overwrite a newer query.
- Mission creation starts with title, person and reward. Description, deadline and proof requirements are optional details. A people-list refresh no longer destroys a draft. Direct reward descriptions are visible on cards; accepted work is labelled In progress in its detail view.
- Reward image/emoji customization is collapsed until requested. Reward fields have accessible labels; creation no longer unnecessarily requires a description. Existing uploads, credit costs, claim and redeemed flows remain.
- Removed the archive credit total: it mixed rewards on sent and received missions and could misrepresent earnings. Real lifetime earnings remain available from the credit ledger.
- Private proof storage paths survive loading and are signed by the existing proof viewer. Previously the received-mission loader discarded those paths because they were not absolute URLs.
- Native invitation URLs require the public HTTPS web origin instead of sharing `capacitor://localhost`. Native sign-in handles both cold launches and already-open-app callbacks, deduplicating single-use code exchanges.
- Email is the main login route. Magic links and web Google sign-in are secondary options. Native v1 presents email authentication; social sign-in can return once its complete native flow and Apple requirements are satisfied.
- Compatible dependency updates applied, including React Router DOM 6.30.6. No forced major upgrades.

## Verification

- Baseline: 355 tests across 24 files. Final: **340 tests across 27 files**, all passing. Deleted tests asserted deleted mode/wizard behavior; new tests cover draft preservation, unrestricted recipients across appearances, private proof paths, invite retry under StrictMode, profile-error recovery and native cold/warm auth callbacks.
- App TypeScript and production build pass. ESLint has zero errors and the same three existing Fast Refresh warnings.
- Production main JS chunk approximately **352 kB**, versus the recorded baseline of about 401.5 kB. No claim about measured device performance.
- Browser walkthrough with an isolated sample-data adapter: desktop 1280×720; phones 390×844 and 360×740; landscape 844×390; German and English; appearance switching; People → preselected mission → create; proof display and approval; first-run → empty People; failed invitation → retry → connected person; reward form and Escape dismissal. Small-screen checks found no document horizontal overflow.
- Screenshots are in `design/verification/`; visual contract and the generated mockup are in `design/`. The sample-data adapter is explicitly labelled and is absent from the production build. It never forwards API requests to Supabase.
- Vite hot reload encountered stale dependency-cache errors during dependency replacement. A separately compiled sample-data build was used for final browser checks; it rendered successfully. These checks are not physical-device or live authorization evidence.
- `npm audit` reports **two moderate affected packages**, both from React Router: untrusted-path open redirect and SSR hydration constructor injection. The app uses client-side BrowserRouter and fixed internal destinations, reducing current exposure, but this is not a security sign-off. Plan a reviewed v7 upgrade in the security pass. [Upstream redirect advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6).

## Release status: not yet ready for public iOS distribution

| Item | Evidence and next work | Owner |
|---|---|---|
| Live database safety / updates | Saved July 30 findings: profiles RLS off and an empty Realtime publication. Proposals 014/015 were staged; no apply record was found. Verify current live state, then use backup + reviewed runbooks. Existing 011–013 apply records remain authoritative history. | Agent with approved database access/review |
| Account deletion | No in-app deletion flow or privileged, authenticated cleanup endpoint exists. Implement deletion including owned data/Storage, then verify failure and re-authentication paths. | Engineering |
| Privacy, support, abuse controls | No complete privacy/support surface, reporting workflow or block model exists. Removing a friend is not a durable block. Define and implement these before public distribution. | Engineering + owner-provided contact/policy details |
| Push notifications | No push plugin, permission UX, device-token storage, APNs sender or retry/delivery handling. In-app badges/Realtime are not push. Implement a minimal mission/invite/review notification path. | Engineering + Apple credentials |
| Transactional email | Auth flows exist. Reward-creator notification code exists, but deployment and delivery are unverified; other legacy notifier functions are disabled. Verify Supabase SMTP/templates/redirects and choose the smallest supported email path. | Agent with service access |
| Native invitations | Public-link builder is fixed. Native share sheet/clipboard behavior and opening HTTPS invitations into the installed app are not verified or fully implemented; configure Universal Links or specify a tested web-to-app handoff. | Engineering + domain/Apple setup |
| Native authentication | Cold/warm callback tests pass against mocked Capacitor. Verify confirmation and magic links on a real iPhone, including killed-app launch. Native Google is hidden; email is the launch path. | Mac/device verification |
| iOS signing and archive | Capacitor iOS shell exists, floor 15.0; no signing Team configured. Rebuild/sync on Mac, sign, test camera/proof, safe areas, keyboard, haptics, backgrounding, then upload an internal TestFlight build. | Apple account holder + Mac agent |
| Family positioning | Current model is peer accounts. No guardian/child roles, managed child accounts or parental permissions. Market the current release to account-owning adults; parent-managed child accounts need a separately designed permission flow. | Product/engineering |
| Localization polish | Twelve locales have matching keys. Some older proof, toast and reward-detail strings remain hardcoded English; plural/formatter and local-day streak follow-ups remain in the existing backlog. | Engineering |

Apple's guidelines address in-app account deletion, privacy-policy access, social-login alternatives and user-generated-content safeguards. Use those requirements when designing the remaining release work; the table is an implementation gap review, not a promise of App Review approval. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). Native callback handling follows [Capacitor App API](https://capacitorjs.com/docs/apis/app).

## What Michael actually needs to provide

No action is needed to keep this UX work. For the release pass, provide access through the relevant signed-in dashboards or approved credential mechanism, not passwords in chat:

1. Apple Developer membership/team and access to a Mac/iPhone for signing and device verification. APNs access is needed when push is implemented.
2. Access to the existing Supabase and hosting projects to verify live policies, auth redirects and deployments. Rotate the previously shared database password as part of the release process; do not repeat it in a transcript.
3. The chosen public web origin and a support contact/operator identity for the privacy/support pages. `VITE_PUBLIC_APP_URL` must be set in native build configuration; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` already exist locally. Server secrets must never use a `VITE_` prefix.
4. For branded email delivery, access to the sender domain/DNS and the chosen email provider. The agent can perform the configuration once connected; no need to add a second provider just because an old example file lists it.

Sentry, Cloudflare, AI image generation, more relationship modes, and more automation are not prerequisites for this core workflow. Images can already be uploaded. Add further services only for a specific demonstrated need.

## Rollback

No data migrations, schema changes or live deletions are part of this pass. The pre-pass baseline is `14c92a0`. Revert implementation commit `c8a52c3` to restore the old product behavior, retaining all user data. For selective reversal (navigation, appearance, creation forms), make a focused follow-up patch against that baseline and rerun the gates: these components share types and translations, so restoring arbitrary files independently can break the build. The implementation and handoff documentation are committed separately.

Implementation `c8a52c3` was pushed to origin/main successfully. Baseline `14c92a0` remains in history. The separate documentation commit contains this review and the screenshots.
