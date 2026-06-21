'use client';

// /frontend/app/features/outfit-pairing/page.jsx
// Feature 1 — "What Goes With This?"
// Accepts a garment photo (via ImageUpload) or a text description.
// Calls POST /api/outfit-pairing and renders 3 outfit cards + an avoid note.

import { useState } from 'react';
import Link from 'next/link';
import { getSessionId } from '../../../utils/session';
import ImageUpload from '../../../components/ImageUpload';
import LoadingState from '../../../components/LoadingState';
import ErrorMessage from '../../../components/ErrorMessage';
import FeedbackButtons from '../../../components/FeedbackButtons';

export default function OutfitPairingPage() {

  // 'image' = photo upload mode  |  'text' = typed description mode
  const [mode, setMode] = useState('image');

  // Cloudinary URL returned by ImageUpload after it finishes its own upload.
  // This is what we send to /api/outfit-pairing as imageUrl.
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  // Controlled value for the text description textarea
  const [textInput, setTextInput] = useState('');

  // True while the /api/outfit-pairing call is in flight
  const [loading, setLoading] = useState(false);

  // Friendly error string — never a raw error object
  const [error, setError] = useState(null);

  // Parsed AI result shape: { garmentRead, outfits: [...], avoid }
  const [result, setResult] = useState(null);

  // After results arrive, check if GPT-4o had no wardrobe items to reference.
  // This happens when the user's wardrobe is empty or nothing matched.
  // We still show the outfits — just with a gentle nudge to add wardrobe items.
  const wardrobeWasEmpty =
    result &&
    result.outfits.every(
      (outfit) => !outfit.wardrobeUsed || outfit.wardrobeUsed.length === 0
    );

  // Submit button is disabled until the user has either uploaded an image
  // (image mode) or typed something (text mode)
  const canSubmit =
    mode === 'image' ? !!uploadedImageUrl : !!textInput.trim();

  // Switch mode and clear any lingering errors.
  // We intentionally do NOT clear uploadedImageUrl or textInput so the
  // user doesn't lose their input if they accidentally tap the wrong mode.
  function handleModeSwitch(newMode) {
    setMode(newMode);
    setError(null);
  }

  // Wipe all state and go back to the input view
  function handleTryAnother() {
    setResult(null);
    setUploadedImageUrl(null);
    setTextInput('');
    setError(null);
  }

  async function handleGetOutfits() {
    setError(null);

    const sessionId = getSessionId();

    // Guard: should not be reachable because the button is disabled,
    // but double-checking here prevents an accidental empty request.
    if (mode === 'image' && !uploadedImageUrl) {
      setError('Please upload a garment photo first.');
      return;
    }
    if (mode === 'text' && !textInput.trim()) {
      setError('Please describe the garment you want to style.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Send either imageUrl or text — never both, never neither
      const body = {
        sessionId,
        ...(mode === 'image'
          ? { imageUrl: uploadedImageUrl }
          : { text: textInput.trim() }),
      };

      const response = await fetch(`${apiUrl}/api/outfit-pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setResult(data.result);

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-background min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">

        {/* ── Page header — always visible ─────────────────────────────── */}
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
            WHAT GOES WITH THIS
          </p>
          <hr className="border-stroke mt-2 mb-3" />
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            Build an outfit around a piece
          </h1>
          <p className="font-body text-sm text-dust mt-2">
            Upload a garment or describe it. StyleSense will build three complete
            outfits using your wardrobe.
          </p>
        </div>

        {/* ── Input card — hidden once loading or results are showing ──── */}
        {!result && !loading && (
          <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6 space-y-4">

            {/* Mode toggle: "Upload a photo" vs "Describe it" */}
            <div className="flex gap-2">
              <button
                onClick={() => handleModeSwitch('image')}
                className={`flex-1 font-body font-medium text-sm px-4 py-2.5 rounded-lg border transition-colors duration-150 ${
                  mode === 'image'
                    ? 'bg-accent text-surface border-accent'
                    : 'bg-transparent text-ink border-stroke hover:bg-accent-pale'
                }`}
              >
                Upload a photo
              </button>
              <button
                onClick={() => handleModeSwitch('text')}
                className={`flex-1 font-body font-medium text-sm px-4 py-2.5 rounded-lg border transition-colors duration-150 ${
                  mode === 'text'
                    ? 'bg-accent text-surface border-accent'
                    : 'bg-transparent text-ink border-stroke hover:bg-accent-pale'
                }`}
              >
                Describe it
              </button>
            </div>

            {/* ── Image upload mode ── */}
            {mode === 'image' && (
              <div className="space-y-2">
                <ImageUpload
                  hint="Upload a garment — shirt, trousers, dress, shoes..."
                  onUpload={(url) => {
                    setUploadedImageUrl(url);
                    setError(null);
                  }}
                  loading={false}
                />
                {/* Small confirmation once the image is uploaded and stored */}
                {uploadedImageUrl && (
                  <p className="font-body text-xs text-buy flex items-center gap-1.5 pl-1">
                    <span>✓</span>
                    <span>Image uploaded — tap below to get outfit ideas</span>
                  </p>
                )}
              </div>
            )}

            {/* ── Text description mode ── */}
            {mode === 'text' && (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g. Navy blue slim-fit cotton Oxford shirt"
                rows={4}
                className="w-full bg-surface border border-stroke rounded-xl px-4 py-3 font-body text-sm text-ink placeholder:text-dust focus:outline-none focus:border-accent resize-none transition-colors duration-150"
              />
            )}

            {/* Submit — disabled until input is ready */}
            <button
              onClick={handleGetOutfits}
              disabled={!canSubmit}
              className="w-full bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Get outfit ideas
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && (
          <LoadingState message="Searching your wardrobe..." />
        )}

        {/* ── Error — shown below the input card, not instead of it ─────── */}
        {error && !loading && (
          <ErrorMessage message={error} />
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {result && !loading && (
          <>

            {/* "Try another garment" at the top so the user doesn't have
                to scroll all the way down to reset */}
            <button
              onClick={handleTryAnother}
              className="w-full bg-transparent border border-stroke text-ink font-body font-medium text-sm px-5 py-3 rounded-lg hover:bg-accent-pale transition-colors duration-150"
            >
              ← Try another garment
            </button>

            {/* ── Garment read card ── */}
            {/* This is what the AI understood. Feels like a stylist's eye. */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  GARMENT READ
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-base text-ink leading-relaxed">
                {result.garmentRead}
              </p>
            </div>

            {/* ── Empty wardrobe nudge ── */}
            {/* Only shown when no wardrobe items were matched.
                Outfits still show — this card explains why they're generic. */}
            {wardrobeWasEmpty && (
              <div className="bg-accent-pale border border-stroke rounded-xl p-4">
                <p className="font-body text-sm text-ink leading-relaxed">
                  These outfits are based on general styling principles.{' '}
                  <Link
                    href="/wardrobe"
                    className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Add items to your wardrobe
                  </Link>{' '}
                  and StyleSense will suggest outfits grounded in what you
                  actually own.
                </p>
              </div>
            )}

            {/* ── Three outfit cards ── */}
            <div className="space-y-4">
              {result.outfits.map((outfit) => (
                <div
                  key={outfit.id}
                  className="bg-surface border border-stroke rounded-xl p-4 md:p-6"
                >

                  {/* Stylist Header — "LOOK 01" also serves as the card number */}
                  <div className="mb-4">
                    <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                      LOOK 0{outfit.id}
                    </p>
                    <hr className="border-stroke mt-2" />
                  </div>

                  {/* Occasion badge — muted accent pill */}
                  <div className="mb-4">
                    <span className="font-display text-[10px] font-semibold tracking-wide uppercase bg-accent-pale text-accent px-2.5 py-1 rounded-md">
                      {outfit.occasion}
                    </span>
                  </div>

                  {/* Pieces list — each piece on its own line with an em dash */}
                  <ul className="space-y-2 mb-4">
                    {outfit.pieces.map((piece, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="font-body text-xs text-dust mt-0.5 shrink-0 select-none">
                          —
                        </span>
                        <span className="font-body text-sm text-ink leading-snug">
                          {piece}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Style logic — the stylist's reasoning, visually subordinate */}
                  <p className="font-body text-xs text-dust leading-relaxed border-t border-stroke pt-3">
                    {outfit.styleLogic}
                  </p>

                </div>
              ))}
            </div>

            {/* ── Avoid section ── */}
            {/* Amber/maybe palette signals caution without being alarming */}
            <div className="bg-maybe-pale border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-3">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-maybe">
                  AVOID PAIRING WITH
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-sm text-ink leading-relaxed">
                {result.avoid}
              </p>
            </div>

            {/* ── Feedback ── */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <FeedbackButtons
                feature="outfit_pairing"
                responseSnippet={result.garmentRead}
              />
            </div>

          </>
        )}

      </div>
    </main>
  );
}