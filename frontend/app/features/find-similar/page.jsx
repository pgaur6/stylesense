'use client';

import { useState } from 'react';
import ImageUpload from '../../../components/ImageUpload';
import LoadingState from '../../../components/LoadingState';
import ErrorMessage from '../../../components/ErrorMessage';
import FeedbackButtons from '../../../components/FeedbackButtons';
import { getSessionId } from '../../../utils/session';

// ─────────────────────────────────────────────────────────────────────────────
// ProductCard
// Renders a single Google Shopping result card.
// Uses a plain <img> tag intentionally — next/image requires domain
// configuration for every external hostname, and SerpAPI thumbnails
// come from Google's encrypted CDN which would need a wildcard config.
// Falls back to a soft accent-pale placeholder on image load failure.
// Displays the retailer source badge using the `source` field added
// to serpapi.js during the India geo-targeting fix.
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="bg-surface border border-stroke rounded-xl overflow-hidden flex flex-col">

      {/* Thumbnail — plain img tag, not next/image */}
      <div className="aspect-square bg-accent-pale overflow-hidden">
        {!imgFailed && product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-accent-pale" />
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col flex-1 gap-2">

        {/* Retailer badge — from serpapi.js source field e.g. "Myntra", "Bewakoof" */}
        {product.source && (
          <span className="font-display text-[9px] font-semibold tracking-wide uppercase text-accent bg-accent-pale px-2 py-0.5 rounded-md self-start">
            {product.source}
          </span>
        )}

        {/* Title — 2 lines max, ellipsis on overflow */}
        <p className="font-body text-xs text-ink leading-snug line-clamp-2 flex-1">
          {product.title}
        </p>

        {/* Price — accent colour for visual distinction */}
        <p className="font-body text-sm font-semibold text-accent">
          {product.price}
        </p>

        {/* View item button — opens Google Shopping page in new tab */}
        {product.link ? (
          <a href={product.link} target="_blank" rel="noopener noreferrer" className="w-full text-center bg-transparent border border-stroke text-ink font-body font-medium text-xs px-3 py-2 rounded-lg hover:bg-accent-pale transition-colors duration-150">
            View item
          </a>
        ) : (
          <span className="w-full text-center font-body text-xs text-dust px-3 py-2">
            Link unavailable
          </span>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FindSimilarPage
// Feature 4: Upload any fashion image → AI identifies the key item and
// generates shopping search queries → SerpAPI returns Indian Google Shopping
// results → displayed as a scannable product grid.
// ─────────────────────────────────────────────────────────────────────────────
export default function FindSimilarPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Called by ImageUpload after it has finished uploading the image to
  // Cloudinary and received the hosted URL back. We then pass that URL
  // straight to /api/find-similar.
  async function handleUpload(imageUrl) {
    setLoading(true);
    setError(null);
    setResult(null);

    const sessionId = getSessionId();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/find-similar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, imageUrl }),
        }
      );

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

  // Resets the page fully so the user can try a different image
  function handleReset() {
    setResult(null);
    setError(null);
  }

  return (
    <main className="bg-background min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">

        {/* ── Page header ────────────────────────────────────────────── */}
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
            FIND SIMILAR
          </p>
          <hr className="border-stroke mt-2" />
        </div>

        <h1 className="font-display text-3xl font-bold text-ink leading-tight">
          Find me something like this
        </h1>
        <p className="font-body text-sm text-dust">
          Upload any fashion image — a screenshot, a saved look, a photo — and
          StyleSense will find similar pieces you can shop right now.
        </p>

        {/* ── Upload area ─────────────────────────────────────────────
            Hidden once results arrive or while the API call is loading.
            ImageUpload handles the Cloudinary upload internally.        */}
        {!result && !loading && (
          <ImageUpload
            onUpload={handleUpload}
            hint="Upload a fashion image to find similar items"
            loading={false}
          />
        )}

        {/* ── Loading state ───────────────────────────────────────────
            Shown while /api/find-similar is processing.                */}
        {loading && (
          <LoadingState message="Finding similar pieces..." />
        )}

        {/* ── Error state ─────────────────────────────────────────────
            Friendly message + reset button. Never a raw error object.  */}
        {error && !loading && (
          <div className="space-y-3">
            <ErrorMessage message={error} />
            <button
              onClick={handleReset}
              className="w-full bg-transparent border border-stroke text-ink font-body font-medium text-sm px-5 py-3 rounded-lg hover:bg-accent-pale transition-colors duration-150"
            >
              Try another image
            </button>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────
            Only rendered after a successful API response.              */}
        {result && !loading && (
          <div className="space-y-4">

            {/* FOUND ITEM card — tells the user what the AI identified
                before showing shopping results, so they can see whether
                the extraction was accurate.                            */}
            <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
              <div className="mb-4">
                <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                  FOUND ITEM
                </p>
                <hr className="border-stroke mt-2" />
              </div>
              <p className="font-body text-xs text-dust mb-1">We identified:</p>
              <p className="font-body text-sm text-ink leading-relaxed">
                {result.itemDescription}
              </p>
            </div>

            {/* Search query line — muted and small, informational only */}
            <p className="font-body text-xs text-dust px-1">
              Searched for:{' '}
              <span className="italic">{result.searchQueryUsed}</span>
            </p>

            {/* ── Empty state ─────────────────────────────────────────
                Shown when SerpAPI returned no products for any query.  */}
            {result.products.length === 0 && (
              <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">
                <div className="mb-4">
                  <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                    SHOPPING RESULTS
                  </p>
                  <hr className="border-stroke mt-2" />
                </div>
                <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
                  <p className="font-display text-lg font-semibold text-ink">
                    No matches found
                  </p>
                  <p className="font-body text-sm text-dust max-w-xs">
                    {result.noResultsMessage ||
                      'No products found for this search.'}{' '}
                    Try uploading a clearer photo of the item, or one with a
                    plainer background.
                  </p>
                  <button
                    onClick={handleReset}
                    className="bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* ── Product grid ────────────────────────────────────────
                2 columns on mobile, 3 on desktop.
                Each ProductCard handles its own image error state.     */}
            {result.products.length > 0 && (
              <div>
                <div className="mb-3">
                  <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
                    SHOPPING RESULTS
                  </p>
                  <hr className="border-stroke mt-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.products.map((product, index) => (
                    <ProductCard key={index} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* Feedback buttons — only when there are real results to rate */}
            {result.products.length > 0 && (
              <FeedbackButtons
                feature="find_similar"
                responseSnippet={(result.itemDescription || '').slice(0, 200)}
              />
            )}

            {/* Reset — always shown at the bottom of results */}
            <button
              onClick={handleReset}
              className="w-full bg-transparent border border-stroke text-ink font-body font-medium text-sm px-5 py-3 rounded-lg hover:bg-accent-pale transition-colors duration-150"
            >
              Try another image
            </button>

          </div>
        )}

      </div>
    </main>
  );
}