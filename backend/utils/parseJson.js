// parseJson.js
//
// WHY THIS FILE EXISTS:
// GPT-4o sometimes wraps its JSON response in markdown code fences
// (```json ... ```) even when the prompt says not to. JavaScript's
// JSON.parse() cannot handle those fences and will throw a SyntaxError.
// This utility strips fences before parsing so every route in the app
// gets clean, reliable JSON parsing from a single shared function.

// parseAIJson takes the raw text string returned by GPT-4o and returns
// a parsed JavaScript object. Throws a friendly error if parsing fails.
function parseAIJson(text) {
  // Step 1: Remove opening ```json fence (with or without a newline after it)
  // Step 2: Remove closing ``` fence (with or without a newline after it)
  // Step 3: Trim any leftover whitespace from both ends
  const cleanText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    // Log the raw text to the server console so you can see exactly
    // what GPT-4o returned — useful for debugging a bad prompt
    console.error('parseAIJson failed. Raw text from GPT-4o was:');
    console.error(cleanText);

    // Throw a friendly error that the route can send back to the frontend
    throw new Error('AI returned an unexpected format. Please try again.');
  }
}

module.exports = { parseAIJson };