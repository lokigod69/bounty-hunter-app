// src/hooks/useVisualViewport.ts
// Publishes the VISUAL viewport height as --visual-vh on <html>.
//
// Why this exists: `dvh` fixes one bug and not the other. It tracks browser
// chrome collapsing on scroll, which is what makes `100vh` too tall on mobile
// Safari. It does NOT track the software keyboard — on iOS the layout viewport
// is unchanged when the keyboard opens, so a `90dvh` modal keeps its full
// height and the keyboard covers the bottom of it, which is exactly where the
// submit button lives. `window.visualViewport.height` is the only value that
// reflects the keyboard, so modal heights are clamped against it as well.
//
// Written as a px value so CSS can do `calc(var(--visual-vh) * 0.9)`. The
// default in index.css is `100vh`, which is also valid in that calc, so any
// browser without visualViewport (or with JS still booting) renders sensibly.

import { useEffect } from 'react';

const VAR = '--visual-vh';

export function useVisualViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // pre-2018 Safari/Firefox: the CSS fallback covers it.

    let frame = 0;
    const publish = () => {
      frame = 0;
      document.documentElement.style.setProperty(VAR, `${vv.height}px`);
    };
    // resize/scroll can fire per frame while the keyboard animates.
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(publish);
    };

    publish();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      // Hand the value back to CSS rather than leaving a stale pixel height
      // frozen on the element after unmount.
      document.documentElement.style.removeProperty(VAR);
    };
  }, []);
}
