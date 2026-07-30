// src/components/layout/mobileLayout.test.ts
// Guards the two mobile-layout invariants that are invisible on a desktop
// browser and were each shipped broken for months.
//
// These read source text rather than rendering, deliberately: both bugs are
// cascade/breakpoint facts, not behaviour a jsdom render would ever expose —
// jsdom has no viewport and does not evaluate media queries.

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
