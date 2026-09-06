# Bounty Hunter — Memory Index
Last updated: 2026-09-07

> Private missions and rewards between connected people. The UX simplification is complete; public iOS release work remains. Read [[STATE]] for current truth; older audit and release notes are historical evidence, not current task instructions.

## Map

| File | What it holds | Read when |
|---|---|---|
| [[STATE]] | Current truth: works / in progress / problems / next actions | Every session |
| [[DECISIONS]] | Why things are the way they are | Before changing direction |
| [[ARCHITECTURE]] | How the system is built | Before touching structure |
| [[LOG]] | Dated session journal, newest first | Catching up on recent work |
| raw/ | Untouched captures: pasted chats, research, prompts | Only when hunting a source |
| notes/ | Compiled topic pages | When INDEX points you there |
| archive/ | Rolled-off log entries and retired notes | Almost never |

Deep documentation already lives outside memory/ — don't duplicate it:
`docs/codex-refactor-pass/` (current source of truth, esp. `03_SOURCE_OF_TRUTH.md` and `10_FINAL_HANDOFF.md`), `CODEX_NEXT_STEPS.md` (prioritized backlog), `SAYA_USAGE.md` (user-facing guide), `db/proposals/` + `docs/runbooks/` (production SQL process).

## Topic notes
*(none yet)*

## Rules for agents
Read [[STATE]] at session start; open the rest only when needed. After meaningful work: prepend [[LOG]], refresh [[STATE]], append decisions to [[DECISIONS]]. Update, don't duplicate. Date everything. Mark wrong things `⚠️ superseded` — never leave known-false statements looking current. Never edit raw/. Full protocol: SecondBrainOS/PROTOCOL.md.
