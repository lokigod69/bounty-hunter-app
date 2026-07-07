# assets-src

Source material intentionally kept OUT of `public/`. Everything under
`public/` ships verbatim into `dist/` and into the Capacitor iOS app —
this folder existed as ~68 MB of dead weight in every build (marketing
campaigns, raw/unused audio, unused font variants).

- `marketing/` — campaign art, never referenced by the app.
- `sounds/` — raw audio (.aif/.wav masters, Ableton .asd, untrimmed mp3s).
  The app only serves the registered files listed in
  `src/utils/soundManager.ts`; those stay in `public/sounds/`.
- `fonts/` — Howdybun (retired) and the 26 Mandalore variants the CSS
  never loads. The three loaded TTFs stay in `public/fonts/mandalore/`.

If you add a sound/font back into the app: move the file to `public/`,
register it (soundManager / @font-face), and keep the master here.
