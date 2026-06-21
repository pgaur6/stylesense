'use client';

// /frontend/app/features/buy-decision/page.js (or .jsx — match your project)
// The Buy Decision feature page.
// Flow: user uploads product photo → ImageUpload POSTs to /api/wardrobe/upload
// to get a Cloudinary URL → this page POSTs that URL to /api/buy-decision →
// renders the verdict result using the design system.

import { useState } from 'react';
import ImageUpload from '../../../components/ImageUpload';
import LoadingState from '../../../components/LoadingState';
import ErrorMessage from '../../../components/ErrorMessage';
import FeedbackButtons from '../../../components/FeedbackButtons';
import { getSessionId } from '../../../utils/session';

export default function BuyDecisionPage() {
  // result: the parsed JSON object from /api/buy-decision, or null before submission
  // loading: true while the API call is in flight
  // error: a friendly error string, or null if no error
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── handleUpload ───────────────────────────────────────────────────────────
  // Called by ImageUpload once the image is on Cloudinary.
  // uploadedImageUrl is the Cloudinary URL — the image is already hosted.
  // We immediately call /api/buy-decision with it.
  async function handleUpload(uploadedImageUrl) {
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const sessionId = getSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/buy-decision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, imageUrl: uploadedImageUrl }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Verdict config ─────────────────────────────────────────────────────────
  // Maps each verdict string to the design-system background + text tokens.
  // text-surface = white (#FFFFFF) — legible on all three verdict backgrounds.
  // This is the ONLY place on the page where a full-color background is used.
  const verdictConfig = {
    Buy:   { bg: 'bg-buy',   text: 'text-surface', label: 'BUY'   },
    Skip:  { bg: 'bg-skip',  text: 'text-surface', label: 'SKIP'  },
    Maybe: { bg: 'bg-maybe', text: 'text-surface', label: 'MAYBE' },
  };

  // ── Profile match badge config ──────────────────────────────────────────────
  // Deliberately subtle — pale backgrounds, never competing with the verdict.
  const profileMatchConfig = {
    'Strong Fit':  { bg: 'bg-buy-pale',    text: 'text-buy'    },
    'Neutral':     { bg: 'bg-accent-pale', text: 'text-accent' },
    'Off-profile': { bg: 'bg-skip-pale',   text: 'text-skip'   },
  };

  const vConfig = result?.verdict    ? verdictConfig[result.verdict]          : null;
  const mConfig = result?.profileMatch ? profileMatchConfig[result.profileMatch] : null;

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">

        {/* ── Page heading ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            Should I Buy This?
          </h1>
          <p className="font-body text-sm text-dust mt-1">
            Upload a product photo for an honest verdict against your wardrobe.
          </p>
        </div>

        {/* ── Upload card ───────────────────────────────────────────────────── */}
        {/* ImageUpload handles the Cloudinary upload internally.               */}
        {/* loading={loading} locks the upload area while the API call runs.   */}
        <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
          <ImageUpload
            onUpload={handleUpload}
            hint="Upload a product photo"
            loading={loading}
          />
        </div>

        {/* ── Loading state ─────────────────────────────────────────────────── */}
        {loading && (
          <LoadingState message="Checking your wardrobe..." />
        )}

        {/* ── Error state ───────────────────────────────────────────────────── */}
        {error && !loading && (
          <ErrorMessage message={error} />
        )}

        {/* ── Result section ────────────────────────────────────────────────── */}
        {result && !loading && (
          <>

            {/* ── 1. What the AI saw ─────────────────────────────────────── */}
            {/* Shown first — sets context before the verdict lands.           */}
            {/* Uses muted text (text-dust) so it reads as background info,   */}
            {/* not the main event.                                            */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-3">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  WHAT WE SEE
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-sm text-dust leading-relaxed">
                {result.itemDescription}
              </p>
            </div>

            {/* ── 2. Overlap warning ─────────────────────────────────────── */}
            {/* Warm amber tint (bg-maybe-pale) — a signal, not an alarm.     */}
            {/* Only rendered when wardrobeOverlap is true AND detail exists. */}
            {result.wardrobeOverlap && result.overlapDetail && (
              <div className="bg-maybe-pale border border-stroke rounded-xl p-4 md:p-6">
                <div className="mb-2">
                  <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-maybe">
                    HEADS UP
                  </p>
                </div>
                <p className="font-body text-sm text-ink leading-relaxed">
                  You already own something similar:{' '}
                  <span className="font-medium">{result.overlapDetail}</span>
                </p>
              </div>
            )}

            {/* ── 3. Verdict hero ────────────────────────────────────────── */}
            {/* Full-width colored band. The single bold visual moment on     */}
            {/* the page. Everything else is quiet so this lands hard.        */}
            {/* rounded-xl matches the card system; no shadow needed —        */}
            {/* the color itself creates the visual weight.                   */}
            {vConfig && (
              <div className={`${vConfig.bg} rounded-xl px-6 py-10 text-center`}>
                <p className={`font-display text-6xl font-extrabold ${vConfig.text} leading-none tracking-tight`}>
                  {vConfig.label}
                </p>
              </div>
            )}

            {/* ── 4. Verdict detail card ─────────────────────────────────── */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6 space-y-4">

              {/* Stylist header */}
              <div>
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  VERDICT
                </p>
                <hr className="border-stroke mt-2" />
              </div>

              {/* Verdict reason — the most important sentence on the page.   */}
              {/* text-base (16px) + leading-relaxed gives it room to breathe */}
              <p className="font-body text-base text-ink leading-relaxed">
                {result.verdictReason}
              </p>

              {/* Maybe condition — left-border callout, distinct but calm.   */}
              {/* Only rendered when verdict is Maybe and condition exists.   */}
              {result.verdict === 'Maybe' && result.maybeCondition && (
                <div className="border-l-[3px] border-maybe bg-maybe-pale rounded-r-lg px-4 py-3">
                  <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-maybe mb-1">
                    BUY IF
                  </p>
                  <p className="font-body text-sm text-ink leading-relaxed">
                    {result.maybeCondition}
                  </p>
                </div>
              )}

              {/* Profile match badge + wardrobe count — quiet meta row.     */}
              {/* Neither element should draw the eye away from the verdict. */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {mConfig && (
                  <span
                    className={`font-display text-[10px] font-semibold tracking-wide uppercase ${mConfig.bg} ${mConfig.text} px-2.5 py-1 rounded-md`}
                  >
                    {result.profileMatch}
                  </span>
                )}
                {result.worksWithCount > 0 && (
                  <span className="font-body text-xs text-dust">
                    Pairs with {result.worksWithCount}{' '}
                    {result.worksWithCount === 1 ? 'item' : 'items'} in your wardrobe
                  </span>
                )}
              </div>

              {/* Profile match reason — softer explanation below the badge. */}
              {result.profileMatchReason && (
                <p className="font-body text-sm text-dust leading-relaxed">
                  {result.profileMatchReason}
                </p>
              )}

            </div>

            {/* ── 5. Feedback ────────────────────────────────────────────── */}
            <FeedbackButtons
              feature="buy_decision"
              responseSnippet={result.verdictReason?.slice(0, 200)}
            />

          </>
        )}

      </div>
    </main>
  );
}