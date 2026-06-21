// /backend/routes/features.js
// Handles all four core AI styling feature routes.
// This router is mounted at /api, so routes here become:
//   /api/outfit-pairing, /api/buy-decision, /api/outfit-check, /api/find-similar

const express = require('express');
const router = express.Router();

const { ITEM_TAGGING_PROMPT, OUTFIT_PAIRING_SYSTEM_PROMPT, BUY_DECISION_SYSTEM_PROMPT, OUTFIT_CHECK_SYSTEM_PROMPT } = require('../utils/prompts');
const { callGPT4o, callGPT4oVision } = require('../utils/openai');
const { generateEmbedding, findTopK } = require('../utils/embeddings');
const { getWardrobeItems, getProfile } = require('../utils/supabase');
const { parseAIJson } = require('../utils/parseJson');
const { logAICall } = require('../utils/logger');
const { costGuard } = require('../middleware/costGuard');
const { searchGoogleShopping } = require('../utils/serpapi');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/outfit-pairing
// Generates 3 outfit suggestions for a garment using the user's wardrobe
// and style profile. Accepts either an imageUrl (Cloudinary URL already
// uploaded by the frontend) or a plain-text garment description.
// Returns { success: true, result: { garmentRead, outfits, avoid } }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/outfit-pairing', costGuard, async (req, res) => {
  // Capture the start time immediately — every millisecond after this
  // is included in the latency we log at the end.
  const startTime = Date.now();

  try {
    const { sessionId, imageUrl, text } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    // Friendly errors only — never expose raw error objects to the frontend.
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'A session ID is required to generate outfit suggestions.',
      });
    }
    if (!imageUrl && !text) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a garment photo or a text description to get outfit suggestions.',
      });
    }

    // ── Step 1: Determine the garment description ─────────────────────────────
    // Path A — imageUrl provided: call GPT-4o Vision with ITEM_TAGGING_PROMPT.
    //   This is the same prompt used during wardrobe upload. It returns a JSON
    //   tags object describing the garment in detail. We use that raw text as
    //   the garment description for the next steps.
    // Path B — text provided: use it directly. No vision call, no extra cost.
    let garmentDescription;
    let visionUsage = null; // will hold token counts if a vision call happens

    if (imageUrl) {
      const visionResult = await callGPT4oVision(
        ITEM_TAGGING_PROMPT,
        'Describe this garment for styling',
        imageUrl
      );
      garmentDescription = visionResult.text;
      visionUsage = visionResult.usage; // save tokens for the combined log below
    } else {
      garmentDescription = text;
    }

    // ── Step 2: Generate an embedding for the garment description ─────────────
    // Converts the garment description into a 1,536-number vector (a coordinate
    // in style-space). We will use this vector to find the closest wardrobe items.
    const queryEmbedding = await generateEmbedding(garmentDescription);

    // ── Step 3: Find the 5 most relevant wardrobe items ───────────────────────
    // getWardrobeItems returns every item the user has uploaded for this session.
    // findTopK compares the garment vector against each item's stored embedding
    // using cosine similarity and returns the top 5 closest matches.
    // If the wardrobe is empty, pass [] — we NEVER invent wardrobe items.
    const allItems = await getWardrobeItems(sessionId);
    const top5 = allItems.length > 0 ? findTopK(queryEmbedding, allItems, 5) : [];

    // ── Step 4: Fetch the user's style profile ────────────────────────────────
    // Returns the profile JSON object saved during onboarding, or null if the
    // user skipped onboarding. The null case is handled in Step 5.
    const profile = await getProfile(sessionId);

    // ── Step 5: Build the personalised system prompt via string replacement ───
    // OUTFIT_PAIRING_SYSTEM_PROMPT contains three placeholder slots that must
    // be filled with real data before GPT-4o can generate useful outfits:
    //
    //   {{PROFILE_JSON}}        → the user's full style profile as a JSON string
    //   {{WARDROBE_ITEMS_JSON}} → the top 5 wardrobe items as a JSON string
    //   {{GARMENT_DESCRIPTION}} → the garment text we arrived at in Step 1
    //
    // Each .replace() returns the updated string, so the three calls chain:
    // the second works on the output of the first, the third on the second.
    //
    // profile || {} : if getProfile returned null, substitute an empty object
    // so JSON.stringify produces "{}" instead of "null" — GPT-4o handles an
    // empty profile gracefully; it cannot handle the word "null".
    const systemPrompt = OUTFIT_PAIRING_SYSTEM_PROMPT
      .replace('{{PROFILE_JSON}}',        JSON.stringify(profile || {}, null, 2))
      .replace('{{WARDROBE_ITEMS_JSON}}', JSON.stringify(top5, null, 2))
      .replace('{{GARMENT_DESCRIPTION}}', garmentDescription);

    // ── Step 6: Call GPT-4o with the personalised prompt ─────────────────────
    // The system prompt now contains the user's profile and wardrobe.
    // We pass garmentDescription again as the user message — GPT-4o treats
    // the system prompt as context/instructions and the user message as the
    // specific request to act on.
    const aiResult = await callGPT4o(systemPrompt, garmentDescription);

    // ── Step 7: Parse the JSON response ──────────────────────────────────────
    // parseAIJson strips any accidental markdown code fences GPT-4o may have
    // added, then calls JSON.parse. Throws a friendly error if parsing fails.
    const parsed = parseAIJson(aiResult.text);

    // ── Step 8: Log the AI call ───────────────────────────────────────────────
    // When imageUrl was provided there were two GPT-4o calls (vision + text).
    // We add their token counts together so the log reflects the true cost
    // of the full request. If text input, visionUsage is null so we add 0.
    const latencyMs = Date.now() - startTime;
    const totalInputTokens  = (visionUsage ? visionUsage.prompt_tokens     : 0)
                             + aiResult.usage.prompt_tokens;
    const totalOutputTokens = (visionUsage ? visionUsage.completion_tokens : 0)
                             + aiResult.usage.completion_tokens;

    logAICall({
      sessionId,
      feature:           'outfit_pairing',
      queryText:         garmentDescription,
      imagePresent:      !!imageUrl,
      wardrobeItemsUsed: top5.length,
      inputTokens:       totalInputTokens,
      outputTokens:      totalOutputTokens,
      latencyMs,
    });

    // ── Step 9: Return the result ─────────────────────────────────────────────
    return res.json({ success: true, result: parsed });

  } catch (error) {
    // Log the full error server-side for debugging, but send only a friendly
    // message to the frontend — never expose raw error objects or stack traces.
    console.error('[outfit-pairing] error:', error.message);

    // parseAIJson throws a known, user-friendly message we want to surface.
    // All other errors (network failures, OpenAI outages, etc.) get the
    // generic fallback so raw system internals are never exposed.
    const isKnownError = error.message === 'AI returned an unexpected format. Please try again.';
    return res.status(500).json({
      success: false,
      error: isKnownError
        ? error.message
        : 'Something went wrong while generating outfit suggestions. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/buy-decision
// Evaluates a product photo against the user's wardrobe and style profile.
// Returns a Buy / Skip / Maybe verdict with a direct, specific reason.
// Requires: { sessionId, imageUrl } — image input is always required here.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/buy-decision', costGuard, async (req, res) => {
  // Capture start time immediately — every ms after this counts toward latency.
  const startTime = Date.now();

  try {
    const { sessionId, imageUrl } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    // Unlike outfit-pairing, buy-decision has no text fallback.
    // A product photo is required — there is nothing to evaluate without one.
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'A session ID is required to check this product.',
      });
    }
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a product photo to get a buy recommendation.',
      });
    }

    // ── Step 1: Describe the product using GPT-4o Vision ─────────────────────
    // ITEM_TAGGING_PROMPT asks GPT-4o to return a structured JSON description
    // of the item: type, colour, fit, style, occasions, fabric, pattern.
    // This rich description is what we convert into an embedding in Step 2,
    // so the wardrobe search is based on the actual item — not the raw image.
    const visionResult = await callGPT4oVision(
      ITEM_TAGGING_PROMPT,
      'Describe this product precisely',
      imageUrl
    );
    const itemDescription = visionResult.text;

    // ── Step 2: Generate an embedding for the item description ────────────────
    // Converts the text description into a 1,536-number vector.
    // This vector represents "where this item lives in style-space" and is
    // used in Step 3 to find wardrobe items that are semantically similar.
    const queryEmbedding = await generateEmbedding(itemDescription);

    // ── Step 3: Find the 5 most similar wardrobe items ────────────────────────
    // getWardrobeItems returns every item the user has uploaded this session.
    // findTopK scores each one by cosine similarity to the query embedding
    // and returns the top 5. Similarity threshold is 0.3 (set inside findTopK).
    //
    // FEWER-THAN-3 CASE: if the user has uploaded fewer than 3 items, top5
    // will simply contain fewer than 5 results. We pass that smaller array
    // to GPT-4o as-is. The BUY_DECISION_SYSTEM_PROMPT already instructs
    // GPT-4o: "if fewer than 3 wardrobe items pair with this, question the
    // value" — so a lean wardrobe naturally pushes the verdict toward Maybe
    // or Skip. We do not block, pad, or invent items.
    //
    // EMPTY WARDROBE CASE: if no items exist at all, top5 is []. GPT-4o
    // will return worksWithCount: 0 and lean toward Skip or Maybe with
    // the reason "no wardrobe overlap to confirm compatibility".
    const allItems = await getWardrobeItems(sessionId);
    const top5 = allItems.length > 0 ? findTopK(queryEmbedding, allItems, 5) : [];

    // ── Step 4: Fetch the user's style profile ────────────────────────────────
    // Returns the profile JSON saved during onboarding, or null if skipped.
    // The null case is handled in Step 5 with the || {} fallback.
    const profile = await getProfile(sessionId);

    // ── Step 5: Build the personalised system prompt ──────────────────────────
    // BUY_DECISION_SYSTEM_PROMPT contains two placeholder slots:
    //   {{PROFILE_JSON}}        → the user's style profile (aesthetic, palette,
    //                             occasions, avoid, budget_range)
    //   {{WARDROBE_ITEMS_JSON}} → the top 5 most similar wardrobe items
    //
    // These give GPT-4o the context it needs to evaluate:
    //   (a) whether this item fits the user's stated aesthetic
    //   (b) whether they already own something similar (overlap check)
    //   (c) how many existing wardrobe items it pairs with (the "3 item rule")
    //
    // profile || {} prevents the literal string "null" appearing in the prompt
    // if onboarding was skipped. GPT-4o handles an empty {} gracefully by
    // giving general advice without personal context.
    const systemPrompt = BUY_DECISION_SYSTEM_PROMPT
      .replace('{{PROFILE_JSON}}',        JSON.stringify(profile || {}, null, 2))
      .replace('{{WARDROBE_ITEMS_JSON}}', JSON.stringify(top5, null, 2));

    // ── Step 6: Call GPT-4o for the Buy / Skip / Maybe verdict ───────────────
    // The system prompt carries the user context. itemDescription is the
    // user message — it is the specific product GPT-4o is being asked to judge.
    const aiResult = await callGPT4o(systemPrompt, itemDescription);

    // ── Step 7: Parse the JSON response ──────────────────────────────────────
    // parseAIJson strips any markdown fences GPT-4o may have added,
    // then calls JSON.parse. Throws a friendly error if parsing fails.
    const parsed = parseAIJson(aiResult.text);

    // ── Step 8: Log the AI call ───────────────────────────────────────────────
    // Two GPT-4o calls happened in this request: vision (Step 1) and text
    // (Step 6). We sum their token counts so the log reflects the full cost.
    const latencyMs = Date.now() - startTime;
    const totalInputTokens  = visionResult.usage.prompt_tokens     + aiResult.usage.prompt_tokens;
    const totalOutputTokens = visionResult.usage.completion_tokens + aiResult.usage.completion_tokens;

    logAICall({
      sessionId,
      feature:           'buy_decision',
      queryText:         itemDescription,
      imagePresent:      true,
      wardrobeItemsUsed: top5.length,
      inputTokens:       totalInputTokens,
      outputTokens:      totalOutputTokens,
      latencyMs,
    });

    // ── Step 9: Return the result ─────────────────────────────────────────────
    return res.json({ success: true, result: parsed });

  } catch (error) {
    // Log the full error server-side so it appears in Railway logs for debugging.
    // Send only a friendly message to the frontend — never raw errors or stacks.
    console.error('[buy-decision] error:', error.message);

    // parseAIJson throws a known user-facing message we want to surface directly.
    // All other failures (network, OpenAI outage, Supabase timeout) get the
    // generic fallback — safe and informative without exposing internals.
    const isKnownError = error.message === 'AI returned an unexpected format. Please try again.';
    return res.status(500).json({
      success: false,
      error: isKnownError
        ? error.message
        : 'Something went wrong while evaluating this product. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/outfit-check
// Evaluates a full outfit photo against the user's style profile.
// Does NOT retrieve wardrobe items — profile context only.
// Works even if the user has no style profile (null-safe).
// Returns { success: true, result: { outfitRead, whatWorking, whatOff, oneSwap, occasionFit } }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/outfit-check', costGuard, async (req, res) => {
  const startTime = Date.now();

  try {
    const { sessionId, imageUrl } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!sessionId || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and imageUrl are required.',
      });
    }

    // ── Step 1: Vision call — describe every item visible in the outfit photo ─
    // Uses ITEM_TAGGING_PROMPT as the system prompt (same as wardrobe upload).
    // The user message specifically asks for a full outfit description.
    const visionResult = await callGPT4oVision(
      ITEM_TAGGING_PROMPT,
      'Describe every item in this full outfit in detail',
      imageUrl
    );
    const outfitDescription = visionResult.text;

    // ── Step 2: Fetch the user's style profile — may be null ──────────────────
    // If the user skipped onboarding, getProfile returns null.
    // We handle this in Step 3 — never crash on a null profile.
    const profile = await getProfile(sessionId);

    // ── Step 3: Build a safe profile context string ───────────────────────────
    // If profile is null, we give GPT-4o a plain English fallback instruction
    // instead of the word "null", which it cannot reason about usefully.
    const profileContext = profile
      ? JSON.stringify(profile, null, 2)
      : 'No style profile available. Evaluate the outfit on its own styling merits without personalisation.';

    // ── Step 4: Inject profile and outfit description into the system prompt ──
    // OUTFIT_CHECK_SYSTEM_PROMPT has two placeholders:
    //   {{PROFILE_JSON}}       → the user's style profile (or the fallback string)
    //   {{OUTFIT_DESCRIPTION}} → the outfit description from the vision call
    const systemPrompt = OUTFIT_CHECK_SYSTEM_PROMPT
      .replace('{{PROFILE_JSON}}', profileContext)
      .replace('{{OUTFIT_DESCRIPTION}}', outfitDescription);

    // ── Step 5: Text call — evaluate the outfit ───────────────────────────────
    // System prompt carries the user context and outfit description.
    // outfitDescription is also passed as the user message — GPT-4o uses it
    // as the specific thing it is being asked to evaluate.
    const aiResult = await callGPT4o(systemPrompt, outfitDescription);

    // ── Step 6: Parse the JSON response ──────────────────────────────────────
    const parsed = parseAIJson(aiResult.text);

    // ── Step 7: Log the combined cost of both AI calls ────────────────────────
    // Two calls happened: vision (Step 1) and text (Step 5).
    // Token counts are summed so the log reflects the true cost of the request.
    const latencyMs = Date.now() - startTime;
    logAICall({
      sessionId,
      feature:           'outfit_check',
      queryText:         outfitDescription.slice(0, 200),
      imagePresent:      true,
      wardrobeItemsUsed: 0,
      inputTokens:       visionResult.usage.prompt_tokens  + aiResult.usage.prompt_tokens,
      outputTokens:      visionResult.usage.completion_tokens + aiResult.usage.completion_tokens,
      latencyMs,
    });

    return res.json({ success: true, result: parsed });

  } catch (error) {
    console.error('[outfit-check] error:', error.message);
    const isKnownError = error.message === 'AI returned an unexpected format. Please try again.';
    return res.status(500).json({
      success: false,
      error: isKnownError
        ? error.message
        : 'Something went wrong while checking your outfit. Please try again.',
    });
  }
});
// POST /api/find-similar
// Accepts an image URL, identifies the key fashion item using GPT-4o Vision,
// then searches Google Shopping for similar products via SerpAPI.
// If SerpAPI fails at any point, the route continues gracefully — never crashes.
router.post('/find-similar', costGuard, async (req, res) => {
  const startTime = Date.now();
  const { sessionId, imageUrl } = req.body;

  // Validate that both required fields were sent
  if (!sessionId || !imageUrl) {
    return res.status(400).json({ error: 'sessionId and imageUrl are required.' });
  }

  // The system prompt tells GPT-4o to identify the standout item and write shopping queries
  const FIND_SIMILAR_SYSTEM_PROMPT = `You are StyleSense — an expert fashion analyst. Your job is to identify the most interesting or purchase-worthy fashion item in an image and generate precise, effective shopping search queries to find similar products.

IMPORTANT RULES:
- Focus on ONE item — the most interesting, standout, or likely to be searched
- Be specific about colour: "cobalt blue" not "blue", "olive green" not "green"
- Include fit descriptor in the search queries
- Queries should be practical shopping search terms someone would actually type on Myntra or Google Shopping

Return ONLY valid JSON in this exact format — no other text, no markdown:
{
  "itemDescription": "Colour + type + fit + style category. E.g: Olive green tapered cargo trousers, relaxed fit, utilitarian street style",
  "searchQueries": [
    "Most specific query: brand style + type + colour + fit",
    "Medium query: type + colour + fit + style",
    "Broad query: type + colour"
  ]
}`;

  try {
    // Step 1: Ask GPT-4o Vision to identify the item and generate search queries
    const aiResponse = await callGPT4oVision(
      FIND_SIMILAR_SYSTEM_PROMPT,
      'Identify the key item and generate search queries',
      imageUrl
    );

    // Step 2: Parse the JSON that GPT-4o returns (strips markdown fences if present)
    const parsed = parseAIJson(aiResponse.text);
    const { itemDescription, searchQueries } = parsed;

    // Step 3: Run the first (most specific) query against Google Shopping
    let products = [];
    let searchQueryUsed = searchQueries[0];

    try {
      products = await searchGoogleShopping(searchQueries[0]);
    } catch (serpErr) {
      // SerpAPI failure must not crash the app — log it and continue with an empty array
      console.error('SerpAPI query 1 failed:', serpErr.message);
      products = [];
    }

    // Step 4: If fewer than 3 results came back, try the second query and merge results
    if (products.length < 3 && searchQueries[1]) {
      try {
        const moreProducts = await searchGoogleShopping(searchQueries[1]);
        // Deduplicate by product link before merging
        const existingLinks = new Set(products.map((p) => p.link));
        const uniqueExtra = moreProducts.filter((p) => !existingLinks.has(p.link));
        products = [...products, ...uniqueExtra];
      } catch (serpErr) {
        // Second query also failed — keep whatever we have from query 1
        console.error('SerpAPI query 2 failed:', serpErr.message);
      }
    }

    // Step 5: Log this AI call (tokens used, latency, cost tracking)
    await logAICall({
      sessionId,
      feature: 'find_similar',
      queryText: itemDescription,
      imagePresent: true,
      wardrobeItemsUsed: 0,
      inputTokens: aiResponse.usage.prompt_tokens,
      outputTokens: aiResponse.usage.completion_tokens,
      latencyMs: Date.now() - startTime,
    });

    // Step 6: Build the result object
    const result = {
      itemDescription,
      searchQueryUsed,
      products,
    };

    // If no products were found at all, attach a friendly message (spec-defined empty state)
    if (products.length === 0) {
      result.noResultsMessage =
        'No products found for this search. Try uploading a clearer image or a different angle.';
    }

    return res.json({ success: true, result });

  } catch (err) {
    console.error('find-similar route error:', err.message);
    return res.status(500).json({
      error: 'Something went wrong while finding similar items. Please try again.',
    });
  }
});

module.exports = router;