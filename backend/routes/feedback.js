// /backend/routes/feedback.js
// Handles user feedback (thumbs up / thumbs down) after each AI response.

const express = require('express');
const router = express.Router();

// POST /api/feedback
// Will receive a rating (thumbs_up or thumbs_down) and log it.
// Optionally posts to a Google Sheet webhook if the env var is set.
// (Logic added in Milestone 4)

module.exports = router;