import OpenAI from "openai";

// Server-side only — never import this in client components.
// Uses Google Gemini via its OpenAI-compatible endpoint.
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _client;
}

export const SUMMARY_MODEL = "gemini-1.5-flash" as const;
export const SUMMARY_TEMPERATURE = 0.3;
export const SUMMARY_MAX_TOKENS = 200;

export const SUMMARY_SYSTEM_PROMPT = `You are a senior analyst at a venture capital firm writing a weekly deal flow summary for limited partners.

Write in an institutional, data-driven tone. Be factual and concise. Do not use promotional language, superlatives, or filler phrases. Do not say "exciting" or "impressive." Write maximum 4 sentences. Summarize the week's deal activity, notable sector trends, and stage distribution. Reference specific numbers.`;

export const MONTHLY_SUMMARY_SYSTEM_PROMPT = `You are a senior analyst at a venture capital firm writing a monthly deal flow report for limited partners.

Write in an institutional, data-driven tone. Be factual and concise. Do not use promotional language, superlatives, or filler phrases. Do not say "exciting" or "impressive."

Write exactly 3–4 complete sentences following this structure:
1. "{Month} saw {N} deals reviewed across the pipeline, of which {active} remained active, {passed} were passed, and {diligence} advanced to due diligence."
2. "Sector breakdown: {top sectors with exact counts, e.g. Healthcare led with X deals, followed by Technology (Y) and Space (Z)}."
3. "The dominant geography was {top country/region}, accounting for {N} deals."
4. (Optional) "Stage distribution showed {Pre-Seed/Seed/etc. breakdown}."

Always finish the last sentence. Never truncate mid-sentence.`;

export const MONTHLY_SUMMARY_TEMPERATURE = 0.2;
export const MONTHLY_SUMMARY_MAX_TOKENS = 450;
