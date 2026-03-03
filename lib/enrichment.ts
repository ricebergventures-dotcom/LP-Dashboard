// Server-side only — enriches deal records with sector + geography via Gemini.
// Called after Decile Hub sync and via the /api/enrich backfill endpoint.

import { generateText } from "./gemini";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

const ENRICH_SYSTEM = `You are a startup classifier. Given a company name, return ONLY a JSON object with no extra text, no markdown, no explanation.

Use exactly this format:
{"sector":"<value>","geography":"<value>"}

sector must be one of: AI/ML, Fintech, Healthtech, SaaS, Climate Tech, Consumer, Deep Tech, Crypto/Web3, Other
geography must be the primary country or region (e.g. United States, United Kingdom, Europe, India, Southeast Asia, Latin America, Global)
If uncertain about geography, use your best guess based on the company name — never leave it empty.`;

export async function enrichCompany(companyName: string): Promise<EnrichmentResult> {
  const text = await generateText({
    systemPrompt: ENRICH_SYSTEM,
    userMessage: companyName,
    temperature: 0,
    maxTokens: 120,
  });

  try {
    // Find the first JSON object anywhere in the response (handles fences, preamble, etc.)
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("no JSON object found");
    const json = JSON.parse(match[0]) as { sector?: unknown; geography?: unknown };
    return {
      sector: typeof json.sector === "string" && json.sector ? json.sector : "Other",
      geography: typeof json.geography === "string" && json.geography ? json.geography : "Global",
    };
  } catch {
    return { sector: "Other", geography: "Global" };
  }
}

/**
 * Enriches a batch of companies using Gemini, running `concurrency` calls in parallel.
 * Returns a Map from deal ID → EnrichmentResult.
 * Failed individual calls are silently skipped (Promise.allSettled).
 */
export async function enrichBatch(
  companies: { id: string; company_name: string }[],
  concurrency = 5
): Promise<Map<string, EnrichmentResult>> {
  const results = new Map<string, EnrichmentResult>();

  for (let i = 0; i < companies.length; i += concurrency) {
    const batch = companies.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (c) => {
        const result = await enrichCompany(c.company_name);
        return { id: c.id, ...result };
      })
    );

    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.set(s.value.id, { sector: s.value.sector, geography: s.value.geography });
      }
    }
  }

  return results;
}
