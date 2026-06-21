'use client';

// /frontend/app/features/outfit-check/page.jsx
// Outfit Check feature page.
// Accepts a full outfit photo, sends it to /api/outfit-check,
// and renders structured stylist feedback in five cards.
// Works with no wardrobe and no style profile — null-safe throughout.

import { useState } from 'react';
import { getSessionId } from '@/utils/session';
import ImageUpload from '@/components/ImageUpload';
import LoadingState from '@/components/LoadingState';
import ErrorMessage from '@/components/ErrorMessage';
import FeedbackButtons from '@/components/FeedbackButtons';

export default function OutfitCheckPage() {
  // imageUrl  — the Cloudinary URL returned by ImageUpload after upload
  // loading   — true while the API call is in flight
  // error     — friendly error string to show if something goes wrong
  // result    — the parsed JSON object from /api/outfit-check on success
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null);

  // Called by ImageUpload once the photo has been uploaded to Cloudinary.
  // uploadedUrl is a Cloudinary HTTPS URL — we pass it straight to the backend.
  async function handleUpload(uploadedUrl) {
    setImageUrl(uploadedUrl);
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const sessionId = getSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/outfit-check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, imageUrl: uploadedUrl }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || 'Something went wrong while checking your outfit. Please try again.'
        );
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Clears all state so the user can check a different outfit.
  function handleReset() {
    setImageUrl(null);
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
            IS THIS OUTFIT OKAY?
          </p>
          <hr className="border-stroke mt-2 mb-4" />
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            Outfit Check
          </h1>
          <p className="font-body text-sm text-dust mt-2">
            Upload a photo of your full outfit and get honest, constructive feedback from your personal stylist.
          </p>
        </div>

        {/* ── Upload — hidden once results are showing ─────────────── */}
        {!result && !loading && (
          <ImageUpload
            onUpload={handleUpload}
            hint="Upload a full outfit photo"
            loading={loading}
          />
        )}

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading && (
          <LoadingState message="Reading your outfit..." />
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && !loading && (
          <ErrorMessage message={error} />
        )}

        {/* ── Results ──────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">

            {/* ── 1. Outfit Read ───────────────────────────────────── */}
            {/* Sets the scene — what the stylist sees before any critique */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  OUTFIT READ
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-xs text-dust mb-2">What we see</p>
              <p className="font-display text-lg font-semibold text-ink leading-snug">
                {result.outfitRead}
              </p>
            </div>

            {/* ── 2. What's Working ────────────────────────────────── */}
            {/* Green left border on each item — signals positive feedback */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  WHAT'S WORKING
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <div className="space-y-3">
                {result.whatWorking.map((item, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-buy pl-3 py-0.5"
                  >
                    <p className="font-body text-sm font-medium text-ink">
                      {item.point}
                    </p>
                    <p className="font-body text-xs text-dust mt-1">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. What to Watch ─────────────────────────────────── */}
            {/* Amber border on each issue. Empty state shows a success card. */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  WHAT TO WATCH
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              {result.whatOff.length === 0 ? (
                <div className="bg-buy-pale rounded-lg px-4 py-3">
                  <p className="font-body text-sm font-medium text-buy">
                    This outfit works — nothing to change.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.whatOff.map((item, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-maybe pl-3 py-0.5"
                    >
                      <p className="font-body text-sm font-medium text-ink">
                        {item.point}
                      </p>
                      <p className="font-body text-xs text-dust mt-1">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 4. One Swap ───────────────────────────────────────── */}
            {/* The most prominent card — accent border + accent-pale fill */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  ONE SWAP
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-xs text-dust mb-3">
                One change that would elevate this
              </p>
              <div className="border-l-4 border-accent bg-accent-pale rounded-r-xl pl-4 pr-3 py-3">
                <p className="font-body text-sm text-ink leading-relaxed">
                  {result.oneSwap}
                </p>
              </div>
            </div>

            {/* ── 5. Occasion Fit ───────────────────────────────────── */}
            {/* Two columns with a vertical divider — no heavy boxes */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  OCCASION FIT
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <div className="flex gap-0">

                {/* Works for — green bullet */}
                <div className="flex-1 pr-4">
                  <p className="font-body text-xs font-medium text-dust uppercase tracking-wide mb-3">
                    Works for
                  </p>
                  <ul className="space-y-2">
                    {result.occasionFit.works.map((occasion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-buy text-xs mt-0.5 shrink-0">●</span>
                        <span className="font-body text-sm text-ink">{occasion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vertical divider */}
                <div className="w-px bg-stroke shrink-0" />

                {/* Avoid for — skip/red bullet */}
                <div className="flex-1 pl-4">
                  <p className="font-body text-xs font-medium text-dust uppercase tracking-wide mb-3">
                    Avoid for
                  </p>
                  <ul className="space-y-2">
                    {result.occasionFit.doesNotWork.map((occasion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-skip text-xs mt-0.5 shrink-0">●</span>
                        <span className="font-body text-sm text-ink">{occasion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>

            {/* ── 6. Feedback + Reset ───────────────────────────────── */}
            <FeedbackButtons
  feature="outfit_check"
  responseSnippet={(result.outfitRead || '').slice(0, 200)}
/>

            <button
              onClick={handleReset}
              className="w-full bg-transparent border border-stroke text-ink font-body font-medium text-sm px-5 py-3 rounded-lg hover:bg-accent-pale transition-colors duration-150"
            >
              Check another outfit
            </button>

          </div>
        )}

      </div>
    </main>
  );
}