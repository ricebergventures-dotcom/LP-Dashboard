import OpenAI from "openai";

// Server-side only — never import this in client components.
// The OPENAI_API_KEY env var is NOT prefixed with NEXT_PUBLIC_.
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const SUMMARY_MODEL = "gpt-4o" as const;
export const SUMMARY_TEMPERATURE = 0.3;
export const SUMMARY_MAX_TOKENS = 200;

export const SUMMARY_SYSTEM_PROMPT = `You are a senior analyst at a venture capital firm writing a weekly deal flow summary for limited partners.

Write in an institutional, data-driven tone. Be factual and concise. Do not use promotional language, superlatives, or filler phrases. Do not say "exciting" or "impressive." Write maximum 4 sentences. Summarize the week's deal activity, notable sector trends, and stage distribution. Reference specific numbers.`;
