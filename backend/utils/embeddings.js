// embeddings.js
//
// WHY THIS FILE EXISTS:
// StyleSense uses semantic search to find wardrobe items relevant to a query.
// Instead of searching by keyword (fragile, misses synonyms), we convert
// both the query and each wardrobe item into a list of numbers (an embedding)
// that captures meaning. Items whose numbers are directionally similar to
// the query's numbers are semantically related — even if they use
// different words. This file handles both generating those number lists
// and finding the most relevant wardrobe items from a given query.

const OpenAI = require('openai');

// Initialise the OpenAI client once for this module.
// The SDK reads OPENAI_API_KEY from process.env automatically.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─────────────────────────────────────────────────────────────────────────────
// cosineSimilarity (internal helper — not exported)
// Measures how similar two embedding arrays are.
// Returns a number between 0 and 1: closer to 1 = more similar meaning.
//
// Formula: dot product of a and b, divided by (magnitude of a × magnitude of b)
// This normalises for array length so only direction matters, not scale.
// ─────────────────────────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot  = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Guard against division by zero (empty or all-zero vectors)
  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

// ─────────────────────────────────────────────────────────────────────────────
// generateEmbedding
// Converts a plain text string into an array of 1536 floats using
// OpenAI's text-embedding-3-small model.
//
// Called when:
//   - A new wardrobe item is uploaded (to embed its tag text for storage)
//   - A feature route runs a query (to embed the query before searching)
//
// Parameters:
//   text — the string to embed (e.g. "olive green tapered chinos smart casual work")
//
// Returns:
//   An array of 1536 numbers (floats)
// ─────────────────────────────────────────────────────────────────────────────
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    // The SDK returns an array of embedding objects; we always send one input
    // so we take the first (and only) result's embedding array.
    return response.data[0].embedding;
  } catch (error) {
    console.error('[embeddings] generateEmbedding failed:', error.message);
    throw new Error('Failed to generate embedding. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// findTopK
// Given a query embedding, finds the most semantically similar wardrobe items.
//
// Parameters:
//   queryEmbedding — the embedding array for the query (from generateEmbedding)
//   items          — array of wardrobe item objects, each with an `embedding` field
//   k              — how many top results to return (usually 5)
//
// Behaviour:
//   1. Scores every item using cosine similarity against the query
//   2. Sorts all items highest score first
//   3. Keeps only items with similarity > 0.3 (the relevance threshold)
//   4. Returns up to k of those passing items
//   5. If fewer than k items pass, returns all that do
//   6. If NO items pass the 0.3 threshold but items exist, returns the
//      single closest one (so GPT-4o always has at least something to work with)
//   7. If the items array is empty, returns []
// ─────────────────────────────────────────────────────────────────────────────
function findTopK(queryEmbedding, items, k) {
  // Edge case: no wardrobe items at all
  if (!items || items.length === 0) return [];

  // Score every item
  const scored = items.map((item) => ({
    ...item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  // Sort highest similarity first
  scored.sort((a, b) => b.similarity - a.similarity);

  // Keep only items above the relevance threshold
  const passing = scored.filter((item) => item.similarity > 0.3);

  if (passing.length > 0) {
    // Normal case: return top k of the passing items
    return passing.slice(0, k);
  }

  // Fallback: nothing passed 0.3, but return the closest item anyway
  // so GPT-4o always has at least one wardrobe reference to work with
  console.warn('[embeddings] No items passed the 0.3 threshold. Returning closest item as fallback.');
  return [scored[0]];
}

module.exports = { generateEmbedding, findTopK };