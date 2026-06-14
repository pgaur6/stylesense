// /backend/routes/onboarding.js
// Handles all routes related to user onboarding and profile generation.

const express = require('express');
const router = express.Router();

// POST /api/onboarding
// Will receive the user's questionnaire answers, call GPT-4o to generate
// a style profile, save it to Supabase, and return the profile JSON.
// (Logic added in Milestone 3)

module.exports = router;