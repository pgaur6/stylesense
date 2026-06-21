// Returns the session ID from localStorage, creating one if it doesn't exist.
// The typeof window check is required because Next.js renders pages on the
// server first, where localStorage does not exist.
export function getSessionId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('stylesense_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('stylesense_session_id', id);
  }
  return id;
}

// Returns true if the user has already completed the onboarding questionnaire.
export function hasCompletedOnboarding() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('stylesense_onboarding_complete');
}

// Marks onboarding as complete by saving a flag to localStorage.
// Call this after the profile is successfully saved to Supabase.
export function markOnboardingComplete() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('stylesense_onboarding_complete', 'true');
}