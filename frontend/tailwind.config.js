/** @type {import('tailwindcss').Config} */
module.exports = {

  // Tells Tailwind which files to scan for class names
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './utils/**/*.{js,jsx}',
  ],

  theme: {
    extend: {

      // ── Colour tokens ──────────────────────────────────────────────────
      // Every colour used in StyleSense lives here.
      // Never use raw Tailwind colours like gray-500 or blue-200.
      colors: {
        background:    '#EDEDEA', // page background — warm stone
        surface:       '#FFFFFF', // cards and panels — floats on background
        ink:           '#18171A', // primary text — near black
        dust:          '#847B74', // secondary / muted text
        accent:        '#3D3566', // brand purple — CTAs, active states, focus
        'accent-pale': '#ECEAF5', // soft purple — chip fills, ghost hover
        stroke:        '#E0DDD8', // all borders and dividers

        buy:           '#286541', // buy verdict — dark green
        'buy-pale':    '#E5F0E8', // buy badge background — soft green
        skip:          '#8C2F3A', // skip verdict — dark red
        'skip-pale':   '#F5E8EA', // skip badge background — soft red
        maybe:         '#7B5B17', // maybe verdict — dark amber
        'maybe-pale':  '#F3EDDF', // maybe badge background — soft amber
      },

      // ── Font families ──────────────────────────────────────────────────
      // These reference CSS variables registered by layout.jsx.
      // font-display → Syne (headings, eyebrow labels, verdicts only)
      // font-body    → DM Sans (all other text — also set as default on body)
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body:    ['var(--font-dm-sans)', 'sans-serif'],
      },

    },
  },

  plugins: [],
};