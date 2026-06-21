'use client';

// FeedbackButtons.jsx
// Thumbs up / thumbs down shown at the bottom of every AI result card.
//
// Props:
//   feature         — string e.g. "outfit_pairing" | "buy_decision" |
//                     "outfit_check" | "find_similar"
//   responseSnippet — string, the first portion of the AI result text
//
// CRITICAL: this component must NEVER crash the page.
// If the feedback POST fails, log it silently — never surface the error.

import { useState } from 'react';
import { getSessionId } from '../utils/session';

export default function FeedbackButtons({ feature, responseSnippet }) {

  // tracks whether the user has already clicked a button
  const [submitted, setSubmitted] = useState(false);

  async function handleFeedback(rating) {
    // Switch to confirmation immediately — before the API call — so the
    // interaction feels instant regardless of network speed
    setSubmitted(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          feature: feature,
          rating: rating,                                        // 'thumbs_up' or 'thumbs_down'
          responseSnippet: (responseSnippet || '').slice(0, 200), // max 200 chars per spec
        }),
      });
    } catch (err) {
      // POST failed — do nothing visible.
      // submitted is already true so the confirmation is already showing.
      console.error('Feedback POST failed (non-critical):', err);
    }
  }

  // ── Confirmation state (after either button is clicked) ──────────────────
  if (submitted) {
    return (
      <div className="flex items-center gap-2 pt-4">
        {/*
          Green checkmark circle — uses buy-pale and buy from the design system.
          Gives a clear positive signal that the click was registered.
        */}
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-buy-pale text-buy text-xs font-bold">
          ✓
        </span>
        <span className="font-body text-sm text-dust">
          Thanks for the feedback!
        </span>
      </div>
    );
  }

  // ── Default state (before any button is clicked) ─────────────────────────
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-stroke">

      <span className="font-body text-sm text-dust">Was this helpful?</span>

      {/*
        Thumbs up — hovers to buy-pale (soft green) with buy-coloured border.
        Positive action gets the positive colour family.
      */}
      <button
        onClick={() => handleFeedback('thumbs_up')}
        aria-label="Thumbs up"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-stroke text-ink font-body text-sm font-medium hover:bg-buy-pale hover:border-buy hover:text-buy transition-colors duration-150"
      >
        <span>👍</span>
        <span>Yes</span>
      </button>

      {/*
        Thumbs down — hovers to skip-pale (soft red) with skip-coloured border.
        Negative action gets the negative colour family.
      */}
      <button
        onClick={() => handleFeedback('thumbs_down')}
        aria-label="Thumbs down"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-stroke text-ink font-body text-sm font-medium hover:bg-skip-pale hover:border-skip hover:text-skip transition-colors duration-150"
      >
        <span>👎</span>
        <span>No</span>
      </button>

    </div>
  );
}