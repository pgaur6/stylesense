// openai.js
// Two functions for calling GPT-4o:
//   callGPT4o       — text-only (used for onboarding, outfit pairing result)
//   callGPT4oVision — text + image URL (used for all vision features)
// Both return { text, usage: { prompt_tokens, completion_tokens, total_tokens } }

const OpenAI = require('openai');

// Initialise the OpenAI client using the key from your .env file
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Calls GPT-4o with a system prompt and a plain text user message.
// Returns the response text and token usage for cost logging.
async function callGPT4o(systemPrompt, userMessage) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  });

  return {
    text: response.choices[0].message.content,
    usage: {
      prompt_tokens:     response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens:      response.usage.total_tokens,
    },
  };
}

// Calls GPT-4o with a system prompt, a text message, AND an image URL.
// The image is passed as an image_url content block in the user message.
// Used for: wardrobe tagging, buy decision, outfit check, find similar.
async function callGPT4oVision(systemPrompt, userMessage, imageUrl) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text',      text: userMessage },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  return {
    text: response.choices[0].message.content,
    usage: {
      prompt_tokens:     response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens:      response.usage.total_tokens,
    },
  };
}

module.exports = { callGPT4o, callGPT4oVision };