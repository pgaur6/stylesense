# StyleSense Design System
> Paste this file into every future UI coding session.
> Every component in this product must follow these patterns exactly.
> Do not deviate without updating this file.

---

## Color Tokens

All colors are defined in `tailwind.config.js`. Do not use Tailwind's built-in `gray-*`, `blue-*`, or `text-gray-*` classes anywhere in this project. Use only the tokens below.

| Token class | Hex | When to use |
|---|---|---|
| `bg-canvas` | `#F4F4F5` | Page background only — the outer shell of every page |
| `bg-surface` | `#FFFFFF` | Cards, input fields, modals, bottom sheets |
| `border-edge` | `#E2E1DE` | All borders and horizontal dividers |
| `text-ink` | `#18181B` | Headlines, body copy, UI labels — anything that needs to be fully readable |
| `text-muted` | `#7A6C65` | Secondary text: captions, metadata, helper text, timestamps |
| `bg-accent` / `text-accent` | `#6B4D7A` | Buttons (bg), active nav state (text/underline), focus rings (ring-accent), inline text links |
| `hover:bg-accent-hover` | `#5A3D68` | Button hover state only |
| `bg-accent-muted` | `#EDE6F0` | Active chip/filter background, subtle highlight behind interactive text |
| `text-buy` / `bg-buy` / `bg-buy-subtle` | `#3D6B4F` / `#EBF3EE` | BUY verdict text, badge background tint |
| `text-skip` / `bg-skip` / `bg-skip-subtle` | `#7A4040` / `#F3EBEB` | SKIP verdict text, error states, badge background tint |
| `text-maybe` / `bg-maybe` / `bg-maybe-subtle` | `#8B6B20` / `#F7F0E3` | MAYBE verdict text, caution states, badge background tint |

---

## Typography

### Loading fonts in layout.jsx

```jsx
import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets:  ['latin'],
  weight:   ['400', '600', '700', '900'],
  style:    ['normal', 'italic'],
  variable: '--font-fraunces',
  display:  'swap',
})

const dmSans = DM_Sans({
  subsets:  ['latin'],
  weight:   ['400', '500', '600'],
  variable: '--font-dm-sans',
  display:  'swap',
})

// Apply to <html> element:
// <html className={`${fraunces.variable} ${dmSans.variable}`}>
// <body className="font-body text-ink antialiased">
```

### When to use each typeface

| Class | Typeface | Weight | Use for |
|---|---|---|---|
| `font-display font-black italic` | Fraunces 900 | Italic | Verdict stamp (BUY/SKIP/MAYBE) at `text-6xl`. This is the only moment Fraunces appears at full scale. |
| `font-display font-bold` | Fraunces 700 | Normal | Feature page hero label (e.g. "What Goes With This?") at `text-2xl` max |
| `font-display font-semibold italic` | Fraunces 600 | Italic | Outfit title cards, pull-quote moments |
| `font-body font-semibold` | DM Sans 600 | Normal | Section headings, card titles, button text |
| `font-body font-medium` | DM Sans 500 | Normal | Subheadings, nav items, form labels |
| `font-body` | DM Sans 400 | Normal | All body copy, AI response text, helper text |

**Rule:** If you are not writing a verdict, an outfit title, or a page hero label, you should be in `font-body`. Fraunces used in the wrong place immediately reads as a mistake.

---

## Card Pattern

White card on the `canvas` background. No shadow — white on `#F4F4F5` creates natural definition.

```jsx
<div className="bg-surface border border-edge rounded-card p-5">
  {/* card content */}
</div>
```

For AI output cards (where the result is the main content), add a left accent strip:
```jsx
<div className="bg-surface border border-edge rounded-card p-5 border-l-4 border-l-accent">
  {/* AI-generated content */}
</div>
```

Compact variant (tight spacing, used inside lists):
```jsx
<div className="bg-surface border border-edge rounded-card p-4">
  {/* compact card content */}
</div>
```

**Never use** `shadow-md`, `shadow-lg`, or any shadow on cards.

---

## Button Pattern

### Primary button (accent violet)
```jsx
<button className="bg-accent hover:bg-accent-hover text-white font-body font-semibold text-sm rounded-tag px-5 py-3 transition-colors w-full">
  Analyse Outfit
</button>
```

### Ghost button (outlined, for secondary actions)
```jsx
<button className="border border-edge text-ink font-body font-medium text-sm rounded-tag px-5 py-3 transition-colors hover:bg-canvas w-full">
  Skip for Now
</button>
```

### Disabled state (apply to both variants)
```jsx
className="... opacity-40 cursor-not-allowed pointer-events-none"
```

**Note:** Buttons use `rounded-tag` (6px), not `rounded-card`. The slight squareness is intentional — it reads decisive, like the stylist friend who doesn't over-soften opinions.

---

## Verdict Badge Pattern (The Signature Element)

This is the one moment where the display font is used at full scale. Never reduce this treatment into a small pill badge — the stamp is the point.

```jsx
// BUY verdict
<div className="text-center py-6">
  <p className="font-display font-black italic text-6xl leading-none text-buy">
    Buy
  </p>
  <hr className="mt-3 mx-auto w-20 border-buy opacity-40" />
</div>

// SKIP verdict
<div className="text-center py-6">
  <p className="font-display font-black italic text-6xl leading-none text-skip">
    Skip
  </p>
  <hr className="mt-3 mx-auto w-20 border-skip opacity-40" />
</div>

// MAYBE verdict
<div className="text-center py-6">
  <p className="font-display font-black italic text-6xl leading-none text-maybe">
    Maybe
  </p>
  <hr className="mt-3 mx-auto w-20 border-maybe opacity-40" />
</div>
```

After the stamp, the verdict reason renders in normal `font-body` at `text-sm text-ink` — the contrast in scale reinforces the authority of the verdict word.

---

## Eyebrow Label Pattern

Used on every AI output section to label what follows. This is the fashion-editorial caption structure that distinguishes AI output from a generic list.

```jsx
// Section with eyebrow label
<div className="space-y-1">
  <p className="text-[10px] font-body font-medium uppercase tracking-eyebrow text-muted">
    Style Logic
  </p>
  <p className="text-sm font-body text-ink leading-relaxed">
    {/* AI content goes here */}
  </p>
</div>
```

Use eyebrow labels for: Style Logic, What's Working, What's Off, One Swap, Occasion Fit, Verdict Reason, Profile Match.

---

## Loading State Pattern

```jsx
// Loading state — used while waiting for any AI response
<div className="flex flex-col items-center justify-center py-16 space-y-4">
  {/* Spinner: a rotating border circle, no SVG library needed */}
  <div className="w-8 h-8 rounded-full border-2 border-edge border-t-accent animate-spin" />
  <p className="text-sm font-body text-muted">
    {loadingMessage} {/* e.g. "Styling your look…" */}
  </p>
</div>
```

Suggested loading messages by feature:
- Onboarding: `"Building your style profile…"`
- Outfit Pairing: `"Checking your wardrobe…"`
- Buy Decision: `"Weighing up your wardrobe…"`
- Outfit Check: `"Reading the outfit…"`
- Find Similar: `"Identifying the key piece…"`

---

## Empty State Pattern

Used when wardrobe is empty, or a feature can't run without prior data.

```jsx
<div className="flex flex-col items-center text-center py-16 px-6 space-y-3">
  {/* Icon placeholder — replace with an SVG icon */}
  <div className="w-12 h-12 rounded-card bg-accent-muted flex items-center justify-center text-accent text-xl">
    {/* icon */}
  </div>
  <p className="font-body font-semibold text-ink text-base">
    {/* e.g. "No wardrobe items yet" */}
  </p>
  <p className="font-body text-sm text-muted leading-relaxed max-w-xs">
    {/* e.g. "Add at least one item to your wardrobe to get outfit suggestions." */}
  </p>
  {/* Optional CTA */}
  <button className="mt-2 bg-accent hover:bg-accent-hover text-white font-body font-semibold text-sm rounded-tag px-5 py-3 transition-colors">
    Add First Item
  </button>
</div>
```

Empty states must name what's missing and what to do about it. Never say "No data found."

---

## Error Message Pattern

```jsx
<div className="bg-skip-subtle border border-skip border-opacity-30 rounded-card p-4">
  <p className="font-body font-medium text-sm text-skip">
    {/* Friendly error — e.g. "Couldn't read the image. Try a clearer photo with good lighting." */}
  </p>
</div>
```

Errors explain the problem and hint at the fix. Never show raw error objects or generic "Something went wrong."

---

## Quick Reference — Layout Container

Every page uses a single-column mobile-first layout:

```jsx
<main className="min-h-screen bg-canvas">
  <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
    {/* page content */}
  </div>
</main>
```

On screens wider than 384px, content centers with `max-w-sm`. This is a one-hand app.

---

*StyleSense Design System v1.0 — generated alongside Milestone 1*