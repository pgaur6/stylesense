'use client';

// app/page.jsx
// Landing page — the first thing a new user sees.
//
// TWO STATES:
//   1. Checking (instant): blank stone screen while localStorage is read.
//      Prevents a flash of the landing page for users who've already onboarded.
//   2. Landing: shown only to users who haven't completed onboarding.
//      Typographic, no images, single CTA to /onboarding.
//
// router.replace (not router.push) is used for the redirect so the back
// button on /wardrobe doesn't return to this landing page.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasCompletedOnboarding } from '../utils/session';

export default function HomePage() {
  const router = useRouter();

  // true during the instant localStorage check — shows a blank screen
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      // Returning user — go straight to wardrobe
      router.replace('/wardrobe');
    } else {
      // New user — show the landing page
      setChecking(false);
    }
  }, []);

  // ── Checking state — blank stone screen for a split second ───────────────
  // This prevents the full landing page flashing before the redirect fires.
  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  // ── Landing page ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full flex flex-col items-center text-center">

        {/* Eyebrow label — Stylist Header pattern, no hr here */}
        <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent mb-8">
          STYLESENSE
        </p>

        {/* Headline — bold, specific to the product's actual problem */}
        {/* Syne display font, large weight — the typographic centrepiece */}
        <h1 className="font-display text-4xl font-bold text-ink leading-tight mb-4">
          Stop buying clothes you'll never wear.
        </h1>

        {/* Subtext — one line, muted, body font */}
        <p className="font-body text-sm text-dust mb-10">
          AI styling built around what's actually in your wardrobe.
        </p>

        {/* Primary CTA — exact design system button pattern */}
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          className="w-full bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150"
        >
          Get started
        </button>

        {/* Reassurance line below the button */}
        <p className="font-body text-xs text-dust mt-4">
          Takes about 2 minutes. No account needed.
        </p>

      </div>
    </div>
  );
}