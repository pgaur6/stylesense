// logger.js
//
// WHY THIS FILE EXISTS:
// Every GPT-4o call in StyleSense costs real money and takes real time.
// Without logging, you have no visibility into:
//   - Which features are being used most
//   - Which calls are slow (high latencyMs = poor user experience)
//   - How close you are to the daily $2 spend cap
//   - Whether a bug is causing repeated or runaway API calls
//
// Every route calls logAICall() after each AI response. The log line
// goes to the server console (visible in Railway's log dashboard), and
// the cost is forwarded to addToSpend() so costGuard can enforce the cap.
//
// NEVER log API keys, session tokens, or raw image data here.
// queryText is logged but kept short — it is never a full prompt.

const { addToSpend } = require('../middleware/costGuard');

// GPT-4o pricing as of the build context specification.
// Input tokens:  $0.0000025 per token  ($2.50 per 1M tokens)
// Output tokens: $0.000010  per token  ($10.00 per 1M tokens)
const INPUT_TOKEN_COST  = 0.0000025;
const OUTPUT_TOKEN_COST = 0.000010;

// ─────────────────────────────────────────────────────────────────────────────
// logAICall
// Logs a structured record of one AI call and registers its cost with
// the daily spend tracker in costGuard.js.
//
// Parameters (all inside a single params object):
//   sessionId        — the localStorage UUID identifying this user session
//   feature          — which feature made this call, e.g. "outfit_pairing"
//   queryText        — a short description of what was asked (not the full prompt)
//   imagePresent     — boolean: was an image included in this call?
//   wardrobeItemsUsed — number of wardrobe items injected into the prompt
//   inputTokens      — prompt_tokens from the OpenAI usage object
//   outputTokens     — completion_tokens from the OpenAI usage object
//   latencyMs        — how long the AI call took in milliseconds
//
// Returns: nothing. Side effect: logs to console + updates daily spend.
// ─────────────────────────────────────────────────────────────────────────────
function logAICall(params) {
  const {
    sessionId,
    feature,
    queryText,
    imagePresent,
    wardrobeItemsUsed,
    inputTokens,
    outputTokens,
    latencyMs,
  } = params;

  // Handle missing token values safely — if a call failed partway through,
  // inputTokens or outputTokens might be undefined or null. Default to 0
  // so the cost calculation never produces NaN.
  const safeInputTokens  = inputTokens  || 0;
  const safeOutputTokens = outputTokens || 0;

  // Calculate the cost of this single AI call in USD
  const cost = (safeInputTokens * INPUT_TOKEN_COST) + (safeOutputTokens * OUTPUT_TOKEN_COST);

  // Build the structured log object — one line, easy to grep in Railway logs
  const logEntry = {
    timestamp:         new Date().toISOString(),
    sessionId:         sessionId        || 'unknown',
    feature:           feature          || 'unknown',
    queryText:         queryText        || '',
    imagePresent:      imagePresent     || false,
    wardrobeItemsUsed: wardrobeItemsUsed || 0,
    inputTokens:       safeInputTokens,
    outputTokens:      safeOutputTokens,
    latencyMs:         latencyMs        || 0,
    costUsd:           parseFloat(cost.toFixed(6)),
  };

  // Print the log entry as a single JSON line to the server console.
  // In Railway, this appears in the Logs tab of your backend deployment.
  console.log('[AI_CALL]', JSON.stringify(logEntry));

  // Register this call's cost with the daily spend tracker.
  // costGuard.addToSpend() adds it to the running total and will block
  // further requests if the daily $2 limit has been reached.
  addToSpend(cost);
}

module.exports = { logAICall };