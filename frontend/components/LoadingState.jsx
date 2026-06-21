// LoadingState.jsx
// Spinner + message shown while the app waits for an AI response.
// Used on every feature page and during onboarding profile generation.
//
// Props:
//   message — string e.g. "Building your style profile..."
//             See design system for the exact message per feature.

export default function LoadingState({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">

      {/*
        Spinner ring:
        border-accent        → full ring in brand purple
        border-t-transparent → top segment invisible = spinning arc effect
        animate-spin         → Tailwind's built-in CSS rotation animation
      */}
      <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />

      {/* Only renders if a message string was passed in */}
      {message && (
        <p className="font-body text-sm text-dust text-center max-w-xs">
          {message}
        </p>
      )}

    </div>
  );
}