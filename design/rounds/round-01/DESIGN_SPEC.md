# Bounty Hunter — clear shared workflow

**2026-09-07 update:** Michael has reopened material/heading direction in `rounds/round-02/`. That round is pending his approval. This spec describes the currently implemented round 01; its sans page-heading choice is not the requested future direction.

Locked 2026-09-07 under Michael's delegated design decision. Reference: `rounds/round-01/A-01.png`, inspected directly.

- Retain the existing ink/navy atmosphere, mint `#20F9D2` default accent, gold `#F5D76E` and rose `#FF6FAE` optional styles. Approximate reference surface `#141E2E`, bright text `#F5F7FA`, secondary text `#ADB5C3`, quiet white borders at 10–15% opacity.
- Keep installed body fonts and existing logo/coin assets. Use readable sans page titles, 28–36px, weight 650–700, normal tracking. Reserve Mandalore for the small brand wordmark. Body 14–16px; compact labels 12–14px. Inputs at least 16px on touch devices.
- Rhythm 4/8/16/24/32px; phone gutters 16px. Main cards approximately 16px radius, quiet borders, minimal shadow. No added animation libraries.
- Header: brand, credit balance, profile avatar. Standing moves into the profile surface. No cursor-trail control or logout button competing with navigation.
- Three persistent destinations: Missions / Rewards / People. Phone bottom bar in document flex layout, with the safe-area inset and minimum 44px targets. Desktop inline navigation. Active route is explicit; badges indicate actual work.
- Mission header: title, contextual subtitle, History link, clear creation action. For you / Sent by you route links share a segmented visual treatment. Review work appears above waiting work. Existing routes remain valid.
- Empty secondary sections do not render. One empty state explains the next useful action. Optional description, deadline, and proof requirements expand inside the mission form.
- All visual styles share the same people, permissions, vocabulary, and currency. Style does not imply family/partner roles or separate dashboards.
- Keep the existing modal focus trap, Escape handling, proof viewers, approval rules, payout feedback, and reduced-motion/transparency behavior.

## Intentional deviations from the generated reference

Use the real logo and coin, existing TaskCard details/approval modals, and existing fonts. No fake iOS status bar in web code. Mission actions remain in the existing accessible task detail surface instead of duplicating handlers on cards. Support responsive desktop grids and real content of arbitrary length. The review count can live on the Sent by you link, avoiding a second redundant callout.
