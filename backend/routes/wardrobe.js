// routes/wardrobe.js
// Two routes:
//   POST /api/wardrobe/upload — upload a garment image, tag it, embed it, save it
//   GET  /api/wardrobe        — fetch all wardrobe items for a session
//
// MULTER PLACEMENT — CRITICAL:
// multer must be in the middleware chain BEFORE the async handler.
// Pattern: router.post('/upload', costGuard, upload.single('image'), handler)
// This guarantees req.file is populated when the handler runs.
// If multer is missing from the chain, req.file is always undefined.

const express = require('express');
const router  = express.Router();
const multer  = require('multer');

const { costGuard }         = require('../middleware/costGuard');
const { uploadImage }       = require('../utils/cloudinary');
const { callGPT4oVision }   = require('../utils/openai');
const { generateEmbedding } = require('../utils/embeddings');
const { saveWardrobeItem, getWardrobeItems } = require('../utils/supabase');
const { logAICall }         = require('../utils/logger');

// ── Multer configuration ─────────────────────────────────────────────────────
// memoryStorage keeps the file in memory as a Buffer (req.file.buffer).
// We never write to disk — the buffer goes directly to Cloudinary.
// diskStorage is NOT used here — it would require managing temp files.
const upload = multer({ storage: multer.memoryStorage() });

// ── Item tagging system prompt — exact text from the build context spec ──────
const ITEM_TAGGING_PROMPT = `You are StyleSense, an expert fashion analyst. Analyse this garment image and return a precise tag object.

Return ONLY valid JSON — no other text, no markdown, no explanation:
{
  "type": "Specific garment type: e.g. trousers, shirt, dress, sneakers, blazer, etc.",
  "colour": "Specific shade, not just a basic colour: e.g. navy blue, olive green, off-white, burgundy",
  "fit": "Fit description: e.g. slim, tapered, relaxed, oversized, fitted, cropped",
  "style": ["2-3 style categories: e.g. smart casual, minimalist, streetwear, classic, formal"],
  "occasions": ["2-4 occasions this works for: e.g. work, casual weekend, going out, formal, gym"],
  "fabric": "Fabric type if visible: e.g. cotton, linen, denim, leather, synthetic. Use 'unknown' if not clear.",
  "pattern": "Pattern: solid, stripes, check, floral, graphic, etc."
}`;

// Strips markdown fences GPT-4o sometimes adds, then parses JSON.
function parseAIJson(text) {
  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(clean);
}

// ── POST /api/wardrobe/upload ────────────────────────────────────────────────
// Middleware chain (runs left to right before the handler):
//   1. costGuard    — blocks if daily spend is over $2
//   2. upload.single('image') — multer parses the file into req.file
//   3. async handler — req.file is guaranteed to be populated here
router.post('/upload', costGuard, upload.single('image'), async (req, res) => {

  // Validate that multer received a file
  // This catches cases where the frontend forgot to include the image field
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was received. Please try again.' });
  }

  // sessionId comes from the multipart form body (not a JSON body)
  const { sessionId } = req.body;

  if (!sessionId || sessionId.trim() === '') {
    return res.status(400).json({ error: 'A valid session ID is required.' });
  }

  try {
    // Step 1: Upload the image buffer to Cloudinary
    // req.file.buffer is the raw image data held in memory by multer
    const { url: imageUrl } = await uploadImage(
      req.file.buffer,
      req.file.originalname
    );

    // Step 2: Send the Cloudinary URL to GPT-4o Vision for tagging
    const startTime  = Date.now();
    const aiResponse = await callGPT4oVision(
      ITEM_TAGGING_PROMPT,
      'Tag this garment',
      imageUrl
    );
    const latencyMs = Date.now() - startTime;

    // Step 3: Parse the JSON tag object from the AI response
    let tags;
    try {
      tags = parseAIJson(aiResponse.text);
    } catch (parseError) {
      console.error('[wardrobe] Failed to parse AI tag response:', aiResponse.text);
      return res.status(500).json({
        error: 'We had trouble analysing your garment. Please try a clearer photo.',
      });
    }

    // Step 4: Build embed_text — exact format from the build context spec
    // This string is what gets converted to a vector for semantic search.
    // The order and spacing matter — always build it this way.
    const embedText = [
      tags.colour,
      tags.fit,
      tags.type,
      Array.isArray(tags.style)    ? tags.style.join(' ')    : tags.style,
      Array.isArray(tags.occasions) ? tags.occasions.join(' ') : tags.occasions,
    ].join(' ');

    // Step 5: Generate the embedding vector from the embed_text string
    // Returns an array of 1536 floats — stored in Supabase's VECTOR column
    const embedding = await generateEmbedding(embedText);

    // Step 6: Save the complete wardrobe item to Supabase
    const savedItem = await saveWardrobeItem(
      sessionId,
      imageUrl,
      tags,
      embedText,
      embedding
    );

    // Step 7: Log the AI call for cost tracking
    logAICall({
      sessionId,
      feature:           'wardrobe_upload',
      queryText:         embedText,
      imagePresent:      true,
      wardrobeItemsUsed: 0,
      inputTokens:       aiResponse.usage.prompt_tokens,
      outputTokens:      aiResponse.usage.completion_tokens,
      latencyMs,
    });

    // Step 8: Return success with the saved item
    return res.status(200).json({
      success: true,
      item: {
        id:        savedItem.id,
        image_url: savedItem.image_url,
        tags:      savedItem.tags,
        embed_text: savedItem.embed_text,
      },
    });

  } catch (err) {
    console.error('[wardrobe] Upload route unexpected error:', err);
    return res.status(500).json({
      error: 'Something went wrong uploading your item. Please try again.',
    });
  }
});

// ── GET /api/wardrobe?sessionId=... ──────────────────────────────────────────
// No costGuard here — this is a read-only route, no AI calls are made.
// Returns all wardrobe items for the session, or an empty array if none.
router.get('/', async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || sessionId.trim() === '') {
    return res.status(400).json({ error: 'A valid session ID is required.' });
  }

  try {
    const items = await getWardrobeItems(sessionId);
    return res.status(200).json({ success: true, items });

  } catch (err) {
    console.error('[wardrobe] GET route unexpected error:', err);
    return res.status(500).json({
      error: 'Something went wrong fetching your wardrobe. Please try again.',
    });
  }
});

module.exports = router;