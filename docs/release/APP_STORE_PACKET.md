# App Store and public information packet

Prepared 2026-09-07 from current code. **Draft; not submitted or published as a privacy policy.** Public operator identity, a monitored support address, age/market scope and provider-retention facts have not been supplied. Do not invent them or claim legal compliance from this packet.

## Store copy ready for owner details

**Name:** Bounty Hunter

**Subtitle:** Missions for your everyday life

**Description:** Turn everyday chores and thoughtful favours into private missions with people you know. Send a mission, choose a gift or credit reward, and follow its progress together. Complete missions, review proof when needed, and collect rewards offered by your connections. Choose a visual skin that makes your mission board feel yours.

**Keywords:** chores,favours,missions,rewards,friends,habits

Do not advertise paid work, redeemable money, staffed moderation, child accounts, parental controls, AI image generation or guaranteed notifications. The current app has no child/household permission model. Resolve age and child-use scope before family/kids marketing or a Kids Category submission. Notifications may be listed only after activation and device acceptance.

## Review access and app behaviour

Provide App Review with two dedicated review accounts and fictional missions/rewards so sender and recipient actions can be tested. Keep credentials in App Store Connect review notes, not this public repository; create them only once review access can be delivered securely. Keep the backend available through review. No real user's content is needed.

Review sequence: sign in → People/accept invitation → create mission for connection → recipient accepts/submits → sender approves → credits update once → claim an offered reward → Collected/Mark as used/Undo. Profile offers account deletion after recent authentication. The shield on a person, mission or reward opens Block/Report. A report is privately stored; it does not currently start a staffed response workflow.

The unsigned macOS CI archive proves compilation. Signing, provisioning, physical-device acceptance, screenshots from the release build, App Store Connect privacy/age-rating answers and TestFlight distribution remain separate. Apple requires working review access and appropriate safeguards for user-generated content, including reporting, blocking and a response process; current private report storage alone does not complete that requirement. See [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Privacy facts to use in the published policy

| Data and purpose | Current implementation |
| --- | --- |
| Email and account identity | Supabase Auth signs users in. Profile display name/avatar identifies them to authorized connections. Private email is not exposed through profile lookup. |
| Connections and content | Mission/reward text, assignments, proofs, reward artwork and collection/credit records enable the shared workflow. Participants may see their shared content; this is not end-to-end encryption. |
| Uploaded files | Supabase Storage stores proofs privately and serves authorized signed links. Avatar/reward artwork follows its bucket's access rules; do not describe every uploaded image as private. Recipients can retain copies and previously cached files may remain accessible. |
| Safety reports and blocks | Private records support blocking and report intake. Reports are not visible to other app users. An operator must define and run the review/escalation process. |
| Email delivery | Supabase Auth uses Resend SMTP; the reward notifier uses Resend. These services process recipient addresses and message/delivery metadata. |
| Device notifications | Currently off. When enabled, the server stores an APNs token tied to a device installation and Auth session. Apple receives generic event text and identifiers. Permission is optional. |
| Hosting and service logs | Vercel, Supabase and Resend operate the service and may retain request/delivery/security logs. Confirm actual plan settings and retention before promising durations. The page also requests Poppins from Google Fonts. |
| Local device state | Session credentials, locale/skin preferences, invitation state and an opaque deletion receipt are used for app operation. The new push code does not persist an APNs token or duplicate the session bearer in its own storage. |

Deletion removes the account's Auth identity, profile, owned/shared mission data and relevant files through the verified cleanup workflow. It removes the deleted user's ledger entries but retains the counterpart's existing balance and ledger, detaching deleted mission references. Private deletion progress/receipt records survive Auth deletion for recovery; there is currently no scheduled expiry for those receipts. Provider backups/logs and copies already held by recipients are separate. Do not promise immediate erasure of every backup or every copy.

No advertising SDK, cross-app tracking or monetized credits were introduced in this release. Confirm provider practices and the final binary before answering Apple's privacy questions. Candidate linked-to-user categories include contact info (email/name), identifiers (user/device when push is enabled), user content (photos/video, mission/reward text and customer support reports), and applicable usage/diagnostic data retained by services. Purpose is app functionality/security; final selections must reflect the deployed services, not only the frontend. [Apple privacy-detail guidance](https://developer.apple.com/app-store/app-privacy-details/) requires third-party practices to be included and answers kept current.

## Support page copy to finish

**Bounty Hunter support**

For help, contact **[monitored support address]**. Include the app version, device model and a short description. Do not send passwords, sign-in links or private proof files unless a secure support channel is arranged.

To block or report someone, open the shield beside their name. To delete your account, open Profile → Delete account and follow the recent sign-in confirmation. Blocking cannot recall information already downloaded by someone else.

Operated by **[public operator name and required contact details]**. The response-time statement must reflect actual staffing. This copy can be published at stable `/support` and `/privacy` URLs once the missing facts are supplied; no placeholder page has been published.

## Owner inputs that unlock the final work

1. Public operator name and a monitored support inbox; applicable markets/age scope and the actual report responder. This enables accurate contact/privacy pages and report-response arrangements. Objectionable-content filtering and moderation operations still need completion before public UGC distribution; a word blacklist is not a verified solution for twelve languages and uploads.
2. Apple Developer enrollment/team access, App Store Connect access and an iPhone for signed acceptance. Keys/certificates belong in provider secret storage, never chat.
3. Use Supabase's supported credential-rotation interface for the previously exposed database password. Routine release SQL now uses temporary provider credentials and does not need that password.

No Cloudflare, Sentry, Firebase or additional paid service is automatically required. Add a service only to meet an actual unmet requirement, with a verified configuration and owner access.
