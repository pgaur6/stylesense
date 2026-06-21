'use client';

// app/wardrobe/page.jsx
// The user's virtual wardrobe — a grid of uploaded garment cards.
// Fetches all items on load. Includes ImageUpload so new items
// can be added and the grid refreshes automatically after each upload.
//
// Layout:
//   - 2-column grid on mobile, 3-column on desktop
//   - Each card: image fills the top portion, tag pills below
//   - Empty state: centered prompt with ImageUpload zone inline

import { useState, useEffect } from 'react';
import { getSessionId } from '../../utils/session';
import ImageUpload from '../../components/ImageUpload';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';

// ── WardrobeCard ─────────────────────────────────────────────────────────────
// Inline component — used only on this page, no need for a separate file.
// Shows the garment image and a row of tag pills below it.
function WardrobeCard({ item }) {
  const tags = item.tags || {};

  // Build a flat list of pill strings from the tag object
  // occasions is an array — we take the first one to keep the card compact
  const pills = [
    tags.type,
    tags.colour,
    tags.fit,
    Array.isArray(tags.occasions) ? tags.occasions[0] : tags.occasions,
  ].filter(Boolean); // remove any undefined or empty values

  return (
    <div className="bg-surface border border-stroke rounded-xl overflow-hidden">

      {/* Image — aspect-[4/3] fills the top 2/3 of the card */}
      <div className="aspect-[4/3] overflow-hidden bg-background">
        <img
          src={item.image_url}
          alt={tags.type || 'Wardrobe item'}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Tag pills — muted border and muted text, no colour fill */}
      <div className="p-3 flex flex-wrap gap-1.5">
        {pills.map((pill, index) => (
          <span
            key={index}
            className="font-body text-[10px] text-dust border border-stroke px-2 py-0.5 rounded-md capitalize"
          >
            {pill}
          </span>
        ))}
      </div>

    </div>
  );
}

// ── WardrobePage ─────────────────────────────────────────────────────────────
export default function WardrobePage() {

  const [items, setItems]           = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError]           = useState(null);

  // Fetch all wardrobe items for this session from the backend
  // Called once on mount, and again after every successful upload
  async function fetchWardrobe() {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const apiUrl   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/wardrobe?sessionId=${sessionId}`);
      const data     = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not load your wardrobe.');
      }

      setItems(data.items || []);

    } catch (err) {
      setError(err.message || 'Could not load your wardrobe. Please refresh.');
    } finally {
      // Only matters for the initial load — clears the full-screen spinner
      setPageLoading(false);
    }
  }

  // Load wardrobe on first render
  useEffect(() => {
    fetchWardrobe();
  }, []);

  // Called by ImageUpload when an item is successfully uploaded.
  // Re-fetches the full list so the new card appears in the grid.
  // The imageUrl param is available here if needed later but not used yet.
  function handleUploadSuccess() {
    fetchWardrobe();
  }

  // ── Full-screen loading state (initial page load only) ───────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading your wardrobe..." />
      </div>
    );
  }

  // ── Main page ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl mx-auto">

        {/* Stylist Header — signature design system element */}
        <div className="mb-4">
          <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
            WARDROBE
          </p>
          <hr className="border-stroke mt-2" />
        </div>

        {/* Page heading */}
        <h1 className="font-display text-3xl font-bold text-ink leading-tight mb-6">
          Your wardrobe
        </h1>

        {/* Error — shown if fetching the wardrobe failed */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">

            {/* Hanger icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-dust"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
            </svg>

            <div>
              <p className="font-display text-xl font-semibold text-ink mb-2">
                Your wardrobe is empty
              </p>
              <p className="font-body text-sm text-dust max-w-xs mx-auto">
                Add your first item and StyleSense will start making recommendations.
              </p>
            </div>

            {/* Upload zone sits inside the empty state — act immediately */}
            <div className="w-full max-w-sm">
              <ImageUpload
                onUpload={handleUploadSuccess}
                hint="Upload a photo of any garment you own"
              />
            </div>

          </div>
        )}

        {/* ── Grid state (items exist) ── */}
        {items.length > 0 && (
          <div>

            {/* Upload zone — always visible at the top so adding is one action */}
            <div className="mb-6">
              <ImageUpload
                onUpload={handleUploadSuccess}
                hint="Add another item to your wardrobe"
              />
            </div>

            {/* Item count */}
            <p className="font-body text-xs text-dust mb-4">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>

            {/* 2-column on mobile, 3-column on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {items.map(item => (
                <WardrobeCard key={item.id} item={item} />
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}