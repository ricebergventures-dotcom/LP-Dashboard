// Server-side only — enriches deal records with sector + geography via Gemini.
// Called after Decile Hub sync and via the /api/enrich backfill endpoint.

import { getOpenAIClient, SUMMARY_MODEL } from "./openai";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

const ENRICH_PROMPT = `Given a startup company name, respond ONLY with a raw JSON object (no markdown, no explanation):
{
  "sector": "<one of: AI/ML, Fintech, Healthtech, SaaS, Climate Tech, Consumer, Deep Tech, Crypto/Web3, Other>",
  "geography": "<primary country or region, e.g. United States, Europe, India, Southeast Asia, Latin America>"
}`;

export async function enrichCompany(companyName: string): Promise<EnrichmentResult> {
  const openai = getOpenAIClient();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let completion;
  try {
    completion = await openai.chat.completions.create(
      {
        model: SUMMARY_MODEL,
        temperature: 0,
        max_tokens: 80,
        messages: [
          { role: "system", content: ENRICH_PROMPT },
          { role: "user", content: `Company: ${companyName}` },
        ],
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = (completion.choices[0]?.message?.content ?? "{}").trim();
  try {
    // Strip markdown fences if present
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const json = JSON.parse(clean);
    return {
      sector: typeof json.sector === "string" && json.sector ? json.sector : "Other",
      geography: typeof json.geography === "string" && json.geography ? json.geography : "Unknown",
    };
  } catch {
    return { sector: "Other", geography: "Unknown" };
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
