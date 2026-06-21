// routes/onboarding.js
// POST /api/onboarding
// Receives the user's 7 questionnaire answers, generates a style profile
// via GPT-4o, saves it to Supabase, and returns it to the frontend.

const express  = require('express');
const router   = express.Router();

const { costGuard }   = require('../middleware/costGuard');
const { callGPT4o }   = require('../utils/openai');
const { saveProfile } = require('../utils/supabase');
const { logAICall }   = require('../utils/logger');

// System prompt — exact text from the build context spec
const PROFILE_GENERATION_SYSTEM_PROMPT = `You are StyleSense, an expert personal fashion stylist. You have been given a user's onboarding questionnaire answers. Generate a concise, accurate style profile based on their answers.

Return ONLY valid JSON in this exact format — no other text, no markdown, no explanation:
{
  "summary": "Two sentences describing this person's style identity and what they are trying to achieve",
  "aesthetic": ["2-3 single words or short phrases describing their style, e.g. minimalist, smart casual, clean"],
  "occasions": ["array of occasions they dress for based on their answers"],
  "palette": "One sentence describing their colour preferences and what to avoid",
  "avoid": "One sentence describing silhouettes, patterns, or styles that do not work for them",
  "budget_range": "Their budget range as a string, e.g. Rs. 2,000-5,000 per item",
  "stylist_note": "One expert observation about their style that they may not have articulated themselves"
}`;

// Strips markdown fences GPT-4o sometimes adds, then parses JSON
function parseAIJson(text) {
  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(clean);
}

// POST /api/onboarding
router.post('/', costGuard, async (req, res) => {
  const { sessionId, answers } = req.body;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return res.status(400).json({ error: 'A valid session ID is required.' });
  }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Questionnaire answers are required.' });
  }

  const requiredFields = ['gender', 'bodyType', 'aesthetic', 'occasions', 'budget', 'colours', 'stylingChallenge'];
  const missingFields = requiredFields.filter(function(field) { return !answers[field]; });
  if (missingFields.length > 0) {
    return res.status(400).json({ error: 'Missing answers for: ' + missingFields.join(', ') });
  }

  try {
    const aesthetic = Array.isArray(answers.aesthetic) ? answers.aesthetic.join(', ') : answers.aesthetic;
    const occasions = Array.isArray(answers.occasions) ? answers.occasions.join(', ') : answers.occasions;

    const userMessage = [
      'Here are the user onboarding questionnaire answers:',
      'Gender: ' + answers.gender,
      'Body type: ' + answers.bodyType,
      'Aesthetic preferences: ' + aesthetic,
      'Occasions they dress for: ' + occasions,
      'Budget per clothing item: ' + answers.budget,
      'Colour preferences: ' + answers.colours,
      'Biggest styling challenge: ' + answers.stylingChallenge,
      'Generate a complete style profile based on these answers.'
    ].join('\n');

    const startTime  = Date.now();
    const aiResponse = await callGPT4o(PROFILE_GENERATION_SYSTEM_PROMPT, userMessage);
    const latencyMs  = Date.now() - startTime;

    let profileJson;
    try {
      profileJson = parseAIJson(aiResponse.text);
    } catch (parseError) {
      console.error('Failed to parse AI profile response:', aiResponse.text);
      return res.status(500).json({ error: 'We had trouble reading your style profile. Please try again.' });
    }

    const saveResult = await saveProfile(sessionId, profileJson);
    if (!saveResult.success) {
      console.error('Failed to save profile to Supabase:', saveResult.error);
      return res.status(500).json({ error: 'We had trouble saving your profile. Please try again.' });
    }

    logAICall({
      sessionId:         sessionId,
      feature:           'onboarding',
      queryText:         answers.stylingChallenge,
      imagePresent:      false,
      wardrobeItemsUsed: 0,
      inputTokens:       aiResponse.usage.prompt_tokens,
      outputTokens:      aiResponse.usage.completion_tokens,
      latencyMs:         latencyMs,
    });

    return res.status(200).json({ success: true, profile: profileJson });

  } catch (err) {
    console.error('Onboarding route unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;