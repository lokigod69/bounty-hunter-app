/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Tailwind's smallest breakpoint is sm:640px, which is wider than every
        // phone in portrait — so "phone" and "small phone" were the same bucket
        // and layouts had to jump straight from 1 to 2 columns at 640. `xs`
        // splits the 360-419px phones (iPhone SE/12 mini, most Androids) from
        // the 420px+ ones.
        xs: '420px',
        // `nav` decides desktop-header vs hamburger. It must NOT be `md`.
        //
        // Tailwind's breakpoints are width-only, and a landscape phone is wide:
        // an iPhone 16 Pro Max is 932x430, an iPhone 14 is 844x390. Both clear
        // `md` (768px), so they rendered the full desktop header — nav, standing
        // block, credits, avatar, name, sign-out — with the hamburger hidden, in
        // 390px of height. `body { overflow-x: hidden }` swallowed the overflow,
        // so it looked like overlapping controls rather than a broken layout.
        //
        // The extra `min-height` is what makes this width-AND-height decision
        // correct: no phone in landscape is taller than ~430px, and no tablet or
        // desktop window we care about is shorter than 500px. iPad landscape
        // (1024x768) still gets the desktop header; every phone orientation gets
        // the hamburger.
        nav: { raw: '(min-width: 768px) and (min-height: 500px)' },
      },
      colors: {
        'indigo': {
          950: '#1a1a3a',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};