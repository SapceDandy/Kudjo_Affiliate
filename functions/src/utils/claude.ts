import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Simple in-memory cache: key → { result, expiresAt }
const cache = new Map<string, { result: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function generateRecommendationCopy(
  context: string,
  scoringResults: Array<{ title: string; score: number; details: string }>,
  role: 'business' | 'influencer'
): Promise<string[]> {
  const cacheKey = `${role}:${JSON.stringify(scoringResults.map(r => r.title))}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const formattedResults = scoringResults
    .map((r, i) => `${i + 1}. "${r.title}" (score: ${r.score}/100) — ${r.details}`)
    .join('\n');

  const prompt = role === 'business'
    ? `You are an advisor for a local business on an affiliate marketing platform. Based on the following context and scored deal suggestions, write a short (2-3 sentence) natural-language recommendation for each deal explaining why it's a good idea. Be specific and actionable.

Context: ${context}

Scored suggestions:
${formattedResults}

Respond with one recommendation per line, matching the order above. No numbering or prefixes.`
    : `You are an advisor for a social media influencer on an affiliate marketing platform. Based on the following context and scored campaign matches, write a short (2-3 sentence) personalized recommendation for each campaign explaining why it's a good fit. Be encouraging and specific.

Context: ${context}

Scored matches:
${formattedResults}

Respond with one recommendation per line, matching the order above. No numbering or prefixes.`;

  try {
    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Pad or trim to match the number of scoring results
    const result = scoringResults.map((_, i) => lines[i] || 'Great opportunity — check it out!');

    cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback: return generic copy
    return scoringResults.map(() => 'This looks like a great opportunity based on your profile.');
  }
}
