// /backend/routes/features.js
// Handles all four core AI styling feature routes.
// This router is mounted at /api, so routes here become:
//   /api/outfit-pairing, /api/buy-decision, /api/outfit-check, /api/find-similar

const express = require('express');
const router = express.Router();

// POST /api/outfit-pairing
// Will generate 3 outfit suggestions for a garment using the user's wardrobe.
// (Logic added in Milestone 4)

// POST /api/buy-decision
// Will return a Buy / Skip / Maybe verdict for a product photo.
// (Logic added in Milestone 5)

// POST /api/outfit-check
// Will evaluate a full outfit photo and return structured feedback.
// (Logic added in Milestone 6)

// POST /api/find-similar
// Will extract the key item from a photo and return Google Shopping results.
// (Logic added in Milestone 7)

module.exports = router;