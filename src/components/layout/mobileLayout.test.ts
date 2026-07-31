// src/components/layout/mobileLayout.test.ts
// Guards the mobile-layout invariants that are invisible on a desktop browser
// and were each shipped broken for months.
//
// These read source text rather than rendering, deliberately: the bugs are
// cascade/breakpoint/intrinsic-sizing facts, not behaviour a jsdom render would
// ever expose — jsdom has no viewport, does not evaluate media queries, and
// does not lay out flexbox, so it cannot tell a 0px-wide title from a visible
// one. Every guard here was probed against the pre-fix source shape first.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf-8');

describe('the desktop-header breakpoint is width AND height', () => {
  // A landscape iPhone is 844x390 or 932x430 — wider than Tailwind's md
  // (768px). Deciding "desktop" on width alone gave landscape phones the full
  // desktop header with the hamburger hidden, and body{overflow-x:hidden}
  // hid the resulting overlap.
  const config = read('tailwind.config.js');
  const layout = read('src', 'components', 'Layout.tsx');

  it('defines a nav screen constrained on both axes', () => {
    expect(config).toMatch(/nav:\s*\{\s*raw:\s*'\(min-width:\s*768px\)\s*and\s*\(min-height:\s*500px\)'/);
  });

  it('clears every landscape phone height', () => {
    // The tallest phone landscape height in circulation is ~430px
    // (iPhone 16 Pro Max, 932x430). The threshold must sit above it.
    const minHeight = Number(/and \(min-height:\s*(\d+)px\)/.exec(config)?.[1]);
    expect(minHeight).toBeGreaterThan(430);
    // ...and below any tablet in landscape (iPad is 1024x768).
    expect(minHeight).toBeLessThan(768);
  });

  it('switches the header and hamburger on nav:, never on md:', () => {
    // Both halves must use the same signal or a phone gets neither nav or both.
    expect(layout).toContain('hidden nav:flex');
    expect(layout).toContain('nav:hidden');
    expect(layout).not.toMatch(/\bmd:(flex|hidden|block)\b/);
  });
});

describe('page gutters are applied exactly once', () => {
  // PageContainer owns the page gutter. Layout's <main> used to add its own on
  // top, leaving 296px of usable width on a 360px phone.
  const layout = read('src', 'components', 'Layout.tsx');
  const mainTag = /<main[^>]*className="([^"]*)"/.exec(layout)?.[1] ?? '';

  it('finds the main element', () => {
    expect(mainTag).not.toBe('');
  });

  it('main adds no horizontal padding or max-width of its own', () => {
    expect(mainTag).not.toMatch(/\bpx-\d/);
    expect(mainTag).not.toMatch(/\bcontainer\b/);
    expect(mainTag).not.toMatch(/\bmax-w-/);
  });

  it('PageContainer still supplies one', () => {
    expect(read('src', 'components', 'layout', 'PageContainer.tsx')).toMatch(/px-4/);
  });
});

describe('viewport-height classes keep a fallback for the iOS floor', () => {
  // The build targets iOS 15.0; `dvh` landed in Safari 15.4. Every dvh rule
  // therefore needs a plain-vh declaration before it, or 15.0-15.3 gets no
  // height at all.
  const css = read('src', 'index.css');

  it('every dvh block is preceded by a vh fallback', () => {
    const blocks = css.match(/(?:height|max-height):[^;]*dvh[^;]*;/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);

    for (const cls of ['h-app', 'modal-h-standard', 'modal-h-tall', 'modal-h-sheet', 'modal-h-panel', 'lightbox-media']) {
      const rule = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      expect(rule, `${cls} rule body`).not.toBe('');
      const decls = rule.split(';').filter((d) => /(?:^|\s)(?:max-)?height:/.test(d));
      expect(decls[0], `${cls} first declaration must be plain vh`).toMatch(/\dvh/);
      expect(decls[0], `${cls} first declaration must not use dvh`).not.toMatch(/dvh/);
    }
  });

  it('clamps against the visual viewport so the keyboard cannot cover a footer', () => {
    // dvh tracks browser chrome but NOT the iOS keyboard; --visual-vh does.
    expect(css).toMatch(/--visual-vh:\s*100vh/);
    expect(css).toMatch(/min\(95dvh,\s*calc\(var\(--visual-vh\)\s*\*\s*0\.95\)\)/);
  });
});

describe('touch targets are chosen by pointer type, not window width', () => {
  const css = read('src', 'index.css');

  it('forces a 16px/44px floor on coarse pointers', () => {
    // iOS zooms the page on focusing any field under 16px and never zooms back.
    // The old guard was `sm:` (min-width 640px), which a landscape phone clears.
    const block = /@media\s*\(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(block).not.toBe('');
    expect(block).toMatch(/font-size:\s*16px/);
    expect(block).toMatch(/min-height:\s*44px/);
  });
});

describe('the header wordmark cannot paint over the mobile control cluster', () => {
  // A flex item that is min-w-0 yields; a flex-shrink-0 CHILD of it does not
  // yield with it, it overflows the parent's box and paints over whatever comes
  // next. At 390px the header demanded 474.7px of the 358px it has — 40px mark
  // + 8px gap + 215.7px of "BOUNTY HUNTER" (7.428em, measured out of
  // mandaloretitle.ttf, at text-2xl with .app-title's 0.12em tracking) against a
  // 211px mobile cluster — so 117px of wordmark landed on the standing sigil and
  // the credit pill. body{overflow-x:hidden} meant no scrollbar ever appeared,
  // the same concealment as the landscape BLOCKER.
  const layout = read('src', 'components', 'Layout.tsx');
  const brand = /<Link to="\/" className="([^"]*)"/.exec(layout)?.[1] ?? '';

  it('finds the brand link', () => {
    expect(brand).not.toBe('');
  });

  it('the brand link yields instead of overflowing its min-w-0 parent', () => {
    expect(brand).not.toMatch(/\bflex-shrink-0\b/);
    expect(brand).toMatch(/\bmin-w-0\b/);
  });

  it('the mark itself still never shrinks', () => {
    const img = /<img\s+[\s\S]*?className="([^"]*)"/.exec(layout)?.[1] ?? '';
    expect(img).toMatch(/\bflex-shrink-0\b/);
  });

  it('the wordmark is hidden until there is width for it', () => {
    // The wordmark needs a 507px viewport at text-2xl (40 + 8 + 215.7 + 211 +
    // 32px of gutter). No phone in portrait clears that at any readable size,
    // so below sm only the mark renders; truncate is the backstop above it.
    const span = /<span className="(app-title[^"]*)"/.exec(layout)?.[1] ?? '';
    expect(span).toMatch(/\bhidden\b/);
    expect(span).toMatch(/\bsm:inline\b/);
    expect(span).toMatch(/\btruncate\b/);
  });

  it('the credit pill never renders a sentence', () => {
    // The loading branch used to put German "Credits werden geladen..."
    // (168.8px at text-sm) inside a pill that cannot shrink, taking the mobile
    // cluster from 211px to 334px of the 358px available.
    const credits = read('src', 'components', 'UserCredits.tsx');
    expect(credits).not.toMatch(/<span>\{t\('common\.loadingCredits'\)\}<\/span>/);
    expect(credits).toMatch(/aria-label=\{t\('common\.loadingCredits'\)\}/);
  });
});

describe('FriendCard wraps rather than spilling past its own border', () => {
  // The action cluster is built from unbreakable 44/48px buttons, so its
  // min-content width is ~270px (Annehmen 122.4 + gap 12 + Ablehnen 135.7 +
  // ml-4). A flex item's min-width defaults to `auto`, i.e. min-content, so the
  // row physically could not shrink to the 296px content box a 360px phone
  // gives it: min-content was 334px in English and 380px in German. min-w-0 on
  // the identity column only donated a budget that was already insufficient —
  // the name and email went to zero AND the row still overflowed the card
  // border, hidden once more by body{overflow-x:hidden}.
  const card = read('src', 'components', 'FriendCard.tsx');
  const root = /<BaseCard variant="glass" className="([^"]*)"/.exec(card)?.[1] ?? '';
  const info = /\{\/\* Info[\s\S]*?\*\/\}\s*<div className="([^"]*)"/.exec(card)?.[1] ?? '';
  const actions = /\{\/\* Status\/Actions[\s\S]*?\*\/\}\s*<div className="([^"]*)"/.exec(card)?.[1] ?? '';

  it('finds all three', () => {
    expect(root).not.toBe('');
    expect(info).not.toBe('');
    expect(actions).not.toBe('');
  });

  it('the card row is allowed to wrap', () => {
    expect(root).toMatch(/\bflex-wrap\b/);
  });

  it('the identity column has a floor, not just a zero', () => {
    expect(info).toMatch(/\bbasis-\d/);
  });

  it('the action cluster is wrap-safe', () => {
    // space-x-* is margin-left on every item after the first, which under
    // flex-wrap lands on the first item of each wrapped line too.
    expect(actions).not.toMatch(/\bspace-x-/);
    expect(actions).toMatch(/\bgap-\d/);
  });

  it('RATCHET (passes pre-fix): fixed from content, not from a width breakpoint', () => {
    // Locked in after the fact, not a regression probe. The demand here is
    // content- and locale-driven, so a width breakpoint would be the same class
    // of mistake as md: on the header.
    for (const cls of [root, info, actions]) {
      expect(cls).not.toMatch(/\b(xs|sm|md|lg|xl|nav):/);
    }
  });
});

describe('a task card title survives the widest badge row we ship', () => {
  // The h3 was the only box in the row with BOTH flex-shrink:1 and
  // min-width:0 — the status chip and the daily badge are
  // `whitespace-nowrap flex-shrink-0` and the countdown column is
  // flex-shrink-0 — so flexbox resolved the entire deficit against the title
  // and min-w-0 put its floor at 0. line-clamp-2 compiles to overflow:hidden,
  // so a zero-width title renders NOTHING: no ellipsis, no overflow, no clue.
  //
  // German is where it crosses zero: "Zurückgesendet" (112px) +
  // "Täglicher Moment" (139px) + two 8px gaps = 268px of nowrap badges. The
  // content box is 296px on a 360px phone and 264px in the desktop
  // lg:grid-cols-3 grid ((1024-64-48)/3 = 304px card, sm:p-5) — which is the
  // NARROWEST task card in the app, and the reason this is not fixed with a
  // breakpoint. English lands at 176px and merely looks cramped. Polish is
  // worse than German again at 289px.
  const card = read('src', 'components', 'TaskCard.tsx');
  const topRow = /\{\/\* Top row[\s\S]*?\{\/\* Bottom row/.exec(card)?.[0] ?? '';

  it('finds the top row', () => {
    expect(topRow).not.toBe('');
  });

  it('the badge row can wrap', () => {
    expect(topRow).toMatch(/\bflex-wrap\b/);
  });

  it('the title claims a line instead of collapsing to zero', () => {
    const h3 = /<h3 className=\{`([^`]*)`\}/.exec(topRow)?.[1] ?? '';
    expect(h3).not.toBe('');
    expect(h3).toMatch(/\bbasis-\d/); // wraps to its own line rather than vanishing
    expect(h3).toMatch(/\bflex-1\b/); // and then fills it
  });

  it('every nowrap badge has an overflow backstop', () => {
    // Same spirit as .standing-rank's 14ch clamp: the widest shipped label is
    // Polish "Codzienny obowiązek" at 161px and the narrowest line the badge
    // ever gets is 187px, so this never fires today — it just guarantees the
    // row cannot overflow the card whatever a future translator writes.
    // Both quote styles: the status chip's className is a template literal
    // (it interpolates the status colours), the daily badge's is a plain string.
    const badges = topRow.match(/className=(?:"|\{`)[^"`]*whitespace-nowrap flex-shrink-0[^"`]*(?:"|`)/g) ?? [];
    expect(badges.length).toBe(2);
    for (const badge of badges) expect(badge).toMatch(/\bmax-w-full\b/);
  });

  it('RATCHET (passes pre-fix): fixed from content, not from a width breakpoint', () => {
    // The narrowest task card is the desktop 3-column one at 264px, not a phone
    // at 296px, so an xs:/sm: fix would have closed the report and left the
    // desktop grid broken.
    const group = /<div className="flex-1 min-w-0 flex ([^"]*)"/.exec(topRow)?.[1] ?? '';
    expect(group).not.toBe('');
    expect(group).not.toMatch(/\b(xs|sm|md|lg|xl|nav):/);
  });
});
