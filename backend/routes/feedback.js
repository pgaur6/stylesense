// feedback.js
//
// WHY THIS FILE EXISTS:
// Receives thumbs up / thumbs down ratings from users after viewing
// AI results. Logs to console for Railway visibility, and optionally
// forwards to a Google Sheet via webhook (GOOGLE_WEBHOOK_URL in .env).
//
// IMPORTANT — no costGuard here. No AI calls happen in this route.
// Webhook failures must NEVER surface as errors to the user.

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Valid values for the feature and rating fields —
// used to reject malformed requests before any logging happens
const VALID_FEATURES = ['outfit_pairing', 'buy_decision', 'outfit_check', 'find_similar'];
const VALID_RATINGS  = ['thumbs_up', 'thumbs_down'];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/feedback
// Accepts a thumbs up or down rating from the user after an AI response.
// Logs it to console (visible in Railway), and optionally forwards it
// to a Google Sheet via GOOGLE_WEBHOOK_URL if that env var is set.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { sessionId, feature, rating, responseSnippet } = req.body;

  // Step 1: Validate required fields
  if (!sessionId || !feature || !rating) {
    return res.status(400).json({
      error: 'sessionId, feature, and rating are required.'
    });
  }

  if (!VALID_FEATURES.includes(feature)) {
    return res.status(400).json({
      error: `feature must be one of: ${VALID_FEATURES.join(', ')}`
    });
  }

  if (!VALID_RATINGS.includes(rating)) {
    return res.status(400).json({
      error: 'rating must be thumbs_up or thumbs_down.'
    });
  }

  // Build the structured feedback object.
  // timestamp is added server-side so every log entry has a
  // consistent, reliable time regardless of the client's clock.
  const feedback = {
    timestamp:       new Date().toISOString(),
    sessionId,
    feature,
    rating,
    // responseSnippet is optional — default to empty string if not provided,
    // and cap at 200 characters to keep logs readable
    responseSnippet: (responseSnippet || '').slice(0, 200),
  };

  // Step 2: Log to console — always, regardless of webhook config.
  // This line is visible in Railway logs even without a Google Sheet set up.
  console.log('[FEEDBACK]', JSON.stringify(feedback));

  // Step 3: Forward to Google Sheet webhook — only if GOOGLE_WEBHOOK_URL is set.
  // If the env var is missing, this entire block is skipped silently.
  // If the POST fails for any reason (timeout, Apps Script error, network blip),
  // we log it and continue — the failure must never reach the user.
  if (process.env.GOOGLE_WEBHOOK_URL) {
    try {
      await axios.post(process.env.GOOGLE_WEBHOOK_URL, feedback, {
        headers: { 'Content-Type': 'application/json' },
        // 5-second timeout — don't let a slow Apps Script response
        // hold up the user's feedback confirmation
        timeout: 5000,
      });
    } catch (webhookErr) {
      // Log for Railway visibility but do not re-throw —
      // the feedback is already captured in the console log above
      console.error('[FEEDBACK] Webhook POST failed:', webhookErr.message);
    }
  }

  // Step 4: Return success — always, regardless of webhook outcome
  return res.json({ success: true });
});

module.exports = router;