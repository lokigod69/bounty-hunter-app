# Session Log
Newest first. Append-only — entries are never rewritten.
When this file exceeds ~300 lines, move the oldest half to `archive/log-2026.md`.

## 2026-07-07 (late evening) - Gift emblem pilot asset generated
- **Changed:** Used the gpt-image-2 prompt skill + image generation flow to create one gift/present contract emblem pilot. Copied the generated PNG into `assets-src/generated/gift-emblem-pilot-v1.png`, then normalized the connected background field to exact solid `#FF00FF` for chroma-key use.
- **Files:** assets-src/generated/gift-emblem-pilot-v1.png
- **Verification:** PNG exists at the target path; 2,220,729 bytes; valid PNG signature; 1254x1254 square; sampled canvas edges are exact `#FF00FF`.
- **Open:** Remaining Phase 3 asset slots still pending: credit emblem, mode identity artwork, empty-state illustrations, reward-store placeholder art, iOS icon/splash.

## 2026-07-07 (evening) — Refactor landed; 4-track audit; premium polish phase 0-1
- **Changed:** Verified + committed the floating UI refactor (fixed 2 broken theme-contract tests first). Ran a 4-agent audit (design congruence / code review / UX flow / assets+sound). Fixed two white-screen P1s the audit found in the fresh refactor (emoji names crash avatarFallback; duplicate UserCredits realtime channel subscribe throws and unmounts the app). Batch A polish (dead fonts, safe areas, Spinner primitive, `.modal-enter`, `.text-sm` weight bug, sound-registry fix — 10 sound keys were silently no-oping). Asset slim-down: public/ went ~71 MB → ~2 MB (marketing/raw audio/unused fonts → assets-src/; 1 MB logo → 32 KB + 3 KB favicon). Batch B+C (2 agents): every button → AppButton, every modal → modal-enter/Escape/44px/one backdrop, PageState/EmptyState/Spinner everywhere, teal → var(--mode-accent).
- **Files:** ~45 across src/, index.html, public/→assets-src/, docs/premium-v1/ROADMAP.md
- **Commits:** 8a18540, b17469b, 2c569a3, e5543dc, b0d5a61, 3e3191d
- **Found:** UX audit: 5 nouns for the task object; Archive/History page unreachable (nav commented out); /profile/edit orphan leaks all modes + debug panel; rejected proofs vanish silently; no action badges; invites only find existing accounts; theme/onboarding localStorage-only (profile.theme is read but never written). Asset audit: coin is SVG with clean slots; is_daily/streaks have full theme strings but zero UI; no haptics. Image pipeline: Codex CLI 0.128.0 + gpt-image-2-skill (~/.codex/skills/). chrome-devtools MCP deadlocks with parallel Claude sessions (shared profile — needs --isolated).
- **Open:** dead-CSS purge + Codex image pilot running as background agents at write time; roadmap = docs/premium-v1/ROADMAP.md (5 phases); noun-system decision parked for Michael.

## 2026-07-07 — Second Brain installed; project surveyed from evidence
- **Changed:** Created `memory/` (INDEX, STATE, DECISIONS, ARCHITECTURE, LOG + raw/notes/archive) and wired the Project Memory block into new AGENTS.md/CLAUDE.md. No app code touched.
- **Files:** memory/*, AGENTS.md, CLAUDE.md
- **Commits:** none (working tree already carried an unrelated uncommitted UI refactor — left untouched)
- **Found:** Last commit 2026-06-18 "Harden V1 launch readiness" (~3 weeks idle). History: Oct 2025 doc deep-dive → security proposals 001–008 with prod runbooks → Jan 2026 onboarding/tutorial/themes burst → June 2026 codex refactor pass (domain extraction, vitest suite, credit lockdown, storage-bucket migration, fresh docs). Working tree holds an uncommitted UI-primitives consolidation (27 files, +625/−906).
- **Open:** Production migration state unknown; UI refactor unverified/uncommitted; proof-type product decision pending — see [[STATE]] Open questions.
