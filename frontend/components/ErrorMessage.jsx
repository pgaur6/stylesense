// ErrorMessage.jsx
// Friendly error card shown when an API call fails or returns an error.
// Never shows a raw error object — always a human-readable message.
// Used on every feature page and in the wardrobe upload flow.
//
// Props:
//   message — string describing what went wrong.
//             Falls back to a generic message if nothing is passed.

export default function ErrorMessage({ message }) {
  return (
    <div className="bg-skip-pale border border-stroke rounded-xl p-4 flex items-start gap-3">

      {/*
        Warning icon — inline SVG, no library needed.
        text-skip  → applies the dark-red design system colour to the stroke.
        shrink-0   → stops the icon collapsing if the message text is long.
      */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-skip mt-0.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8"   x2="12"    y2="12" />
        <line x1="12" y1="16"  x2="12.01" y2="16" />
      </svg>

      <div className="flex flex-col gap-0.5">

        {/* Fixed heading — identical on every error card */}
        <p className="font-body text-sm font-medium text-skip">
          Something went wrong
        </p>

        {/* Specific error message, or safe fallback */}
        <p className="font-body text-sm text-ink">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>

      </div>

    </div>
  );
}