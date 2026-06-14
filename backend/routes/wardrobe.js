// /backend/routes/wardrobe.js
// Handles all routes related to the user's virtual wardrobe.

const express = require('express');
const router = express.Router();

// POST /api/wardrobe/upload
// Will receive a garment image, upload it to Cloudinary, tag it with GPT-4o Vision,
// generate an embedding, and save everything to Supabase.
// (Logic added in Milestone 3)

// GET /api/wardrobe
// Will fetch all wardrobe items for a given sessionId from Supabase.
// (Logic added in Milestone 3)

module.exports = router;