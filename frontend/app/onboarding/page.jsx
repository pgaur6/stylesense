'use client';

// app/onboarding/page.jsx
// The 7-step onboarding questionnaire.
// Three render states: questionnaire → loading → profile result.
// Never renders all three at once — each state fully replaces the previous.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionId, markOnboardingComplete } from '../../utils/session';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';

// ── Step definitions ─────────────────────────────────────────────────────────
// Each step maps to one field in the answers object.
// type: 'single' | 'multi' | 'text'
const STEPS = [
  {
    number: 1,
    field: 'gender',
    question: 'How do you identify?',
    type: 'single',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  {
    number: 2,
    field: 'bodyType',
    question: 'How would you describe your build?',
    type: 'single',
    options: ['Athletic', 'Slim', 'Average', 'Curvy', 'Broader build'],
  },
  {
    number: 3,
    field: 'aesthetic',
    question: 'Pick the aesthetics that feel like you.',
    subtitle: 'Choose everything that applies.',
    type: 'multi',
    options: ['Minimalist', 'Smart Casual', 'Streetwear', 'Classic', 'Boho', 'Business Formal'],
  },
  {
    number: 4,
    field: 'occasions',
    question: "What are you mostly dressing for?",
    subtitle: 'Choose everything that applies.',
    type: 'multi',
    options: ['Daily Work', 'Casual Weekends', 'Going Out', 'Formal Events', 'Travel'],
  },
  {
    number: 5,
    field: 'budget',
    question: "What's your budget per clothing item?",
    type: 'single',
    options: ['Under ₹1,000', '₹1,000–₹3,000', '₹3,000–₹7,000', '₹7,000+'],
  },
  {
    number: 6,
    field: 'colours',
    question: 'Colours you always reach for — and any you avoid?',
    type: 'text',
    placeholder: 'e.g. I love navy and olive. I avoid bright colours and anything neon.',
  },
  {
    number: 7,
    field: 'stylingChallenge',
    question: "What's your biggest styling frustration?",
    type: 'text',
    placeholder: 'e.g. I buy things and never wear them. I can never put outfits together.',
  },
];

// ── OptionTile ───────────────────────────────────────────────────────────────
// Large tappable tile used for both single-select and multi-select questions.
// Selected state is visually distinct: accent-pale background + accent border
// + accent text + bold weight. Unselected is surface white with stroke border.
function OptionTile({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl border transition-colors duration-150 ${
        selected
          ? 'bg-accent-pale border-accent text-accent font-semibold'
          : 'bg-surface border-stroke text-ink font-medium hover:bg-accent-pale hover:border-accent'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-body text-sm">{label}</span>
        {/* Checkmark only appears when selected */}
        {selected && (
          <span className="text-accent text-sm font-bold ml-3">✓</span>
        )}
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();

  // Which step the user is currently on (1–7)
  const [currentStep, setCurrentStep] = useState(1);

  // All 7 answers stored here. Empty values until the user fills them in.
  const [answers, setAnswers] = useState({
    gender: '',
    bodyType: '',
    aesthetic: [],
    occasions: [],
    budget: '',
    colours: '',
    stylingChallenge: '',
  });

  // Controls the loading screen (shown while GPT-4o is generating the profile)
  const [loading, setLoading] = useState(false);

  // Holds the error message if the API call fails
  const [error, setError] = useState(null);

  // Holds the returned profile object once generation succeeds
  const [profile, setProfile] = useState(null);

  // The step definition object for the current step number
  const step = STEPS[currentStep - 1];

  // Returns true if the current step has a valid, non-empty answer
  function isStepValid() {
    const value = answers[step.field];
    if (step.type === 'multi') return value.length > 0;
    if (step.type === 'text')  return value.trim().length > 0;
    return value !== '';
  }

  // Single-select: replaces the current answer with the clicked option
  function handleSingleSelect(field, value) {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }

  // Multi-select: toggles the clicked option on or off
  function handleMultiToggle(field, value) {
    setAnswers(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }

  // Free-text: updates the answer as the user types
  function handleTextChange(field, value) {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }

  // Called when the user clicks "Build my profile" on step 7
  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      const apiUrl    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/api/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Mark onboarding as complete in localStorage so the app knows
      markOnboardingComplete();

      // Store the profile — this triggers the profile result render state
      setProfile(data.profile);

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── STATE 2: Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <LoadingState message="Building your style profile..." />
      </div>
    );
  }

  // ── STATE 3: Profile result ────────────────────────────────────────────────
  if (profile) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Stylist Header — signature element from the design system */}
          <div className="mb-2">
            <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
              YOUR STYLE PROFILE
            </p>
            <hr className="border-stroke mt-2" />
          </div>

          {/* Summary + aesthetic tags + stylist note */}
          <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6">

            {/* Summary — the two-sentence style identity */}
            <p className="font-body text-sm text-ink leading-relaxed mb-4">
              {profile.summary}
            </p>

            {/* Aesthetic tags — rendered as accent pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(profile.aesthetic || []).map(tag => (
                <span
                  key={tag}
                  className="font-display text-[10px] font-semibold tracking-wide uppercase bg-accent-pale text-accent px-2.5 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Stylist note — highlighted with left border accent */}
            <div className="bg-accent-pale rounded-lg p-3 border-l-2 border-accent">
              <p className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-accent mb-1.5">
                Stylist's note
              </p>
              <p className="font-body text-sm text-ink leading-relaxed">
                {profile.stylist_note}
              </p>
            </div>

          </div>

          {/* Profile details — palette, avoid, budget */}
          <div className="bg-surface border border-stroke rounded-xl p-4 md:p-6 space-y-4">

            <div>
              <p className="font-body text-xs text-dust mb-1">Colour palette</p>
              <p className="font-body text-sm text-ink leading-relaxed">{profile.palette}</p>
            </div>

            <hr className="border-stroke" />

            <div>
              <p className="font-body text-xs text-dust mb-1">To avoid</p>
              <p className="font-body text-sm text-ink leading-relaxed">{profile.avoid}</p>
            </div>

            <hr className="border-stroke" />

            <div>
              <p className="font-body text-xs text-dust mb-1">Budget</p>
              <p className="font-body text-sm text-ink">{profile.budget_range}</p>
            </div>

          </div>

          {/* CTA — takes the user to the wardrobe upload page */}
          <button
            type="button"
            onClick={() => router.push('/wardrobe')}
            className="w-full bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150"
          >
            Get started →
          </button>

        </div>
      </div>
    );
  }

  // ── STATE 1: Questionnaire ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto">

        {/* Step indicator — muted, small, not a heavy progress bar */}
        <p className="font-body text-xs text-dust mb-6">
          Step {currentStep} of 7
        </p>

        {/* Question heading — Syne display font as spec'd for page-level h1 */}
        <h1 className={`font-display text-2xl font-bold text-ink leading-tight ${step.subtitle ? 'mb-2' : 'mb-6'}`}>
          {step.question}
        </h1>

        {/* Subtitle for multi-select questions */}
        {step.subtitle && (
          <p className="font-body text-sm text-dust mb-6">{step.subtitle}</p>
        )}

        {/* Error message — shown if a previous submit attempt failed */}
        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Answer options */}
        <div className="space-y-3 mb-8">

          {/* Single-select tiles */}
          {step.type === 'single' && step.options.map(opt => (
            <OptionTile
              key={opt}
              label={opt}
              selected={answers[step.field] === opt}
              onClick={() => handleSingleSelect(step.field, opt)}
            />
          ))}

          {/* Multi-select tiles — each toggles independently */}
          {step.type === 'multi' && step.options.map(opt => (
            <OptionTile
              key={opt}
              label={opt}
              selected={answers[step.field].includes(opt)}
              onClick={() => handleMultiToggle(step.field, opt)}
            />
          ))}

          {/* Free-text — clean textarea, no heavy borders */}
          {step.type === 'text' && (
            <textarea
              value={answers[step.field]}
              onChange={e => handleTextChange(step.field, e.target.value)}
              placeholder={step.placeholder}
              rows={4}
              className="w-full bg-surface border border-stroke rounded-xl px-4 py-3 font-body text-sm text-ink placeholder:text-dust focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
            />
          )}

        </div>

        {/* Navigation */}
        <div className="space-y-3">

          {/* Primary action — Next on steps 1–6, submit on step 7 */}
          {currentStep < 7 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!isStepValid()}
              className="w-full bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isStepValid()}
              className="w-full bg-accent text-surface font-body font-medium text-sm px-5 py-3 rounded-lg hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Build my profile
            </button>
          )}

          {/* Ghost back button — only shown from step 2 onwards */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s - 1)}
              className="w-full bg-transparent border border-stroke text-ink font-body font-medium text-sm px-5 py-3 rounded-lg hover:bg-accent-pale transition-colors duration-150"
            >
              Back
            </button>
          )}

        </div>
      </div>
    </div>
  );
}