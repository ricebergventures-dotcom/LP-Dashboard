// Server-side only — enriches deal records with sector + geography via Gemini.
// Called after Decile Hub sync and via the /api/enrich backfill endpoint.

import { generateText } from "./gemini";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

const ENRICH_SYSTEM = `You are a startup classifier. Given a company name, return ONLY a JSON object — no markdown, no explanation, no extra text.

Format: {"sector":"<value>","geography":"<value>"}

SECTOR — pick the single best match from these 6 broad categories. "Other" is a last resort only if truly nothing fits:
- Technology: AI, machine learning, SaaS, B2B software, developer tools, data platforms, cloud, APIs, automation, cybersecurity, no-code/low-code
- Healthcare: digital health, telemedicine, medical devices, biotech, drug discovery, genomics, diagnostics, life sciences, therapeutics, bioinformatics, wellness
- Finance: payments, banking, lending, insurance, trading, financial infrastructure, accounting, crypto, blockchain, DeFi, Web3, tokenization
- Deep Tech: hardware, semiconductors, quantum computing, robotics, space tech, drones, advanced materials, photonics, energy storage, defence tech
- Climate: clean energy, solar, wind, carbon capture, sustainability, EVs, green materials, recycling, agritech, water tech
- Consumer: e-commerce, marketplaces, social apps, gaming, media, entertainment, direct-to-consumer products, food tech, travel, education
- Other: use ONLY if truly none of the above apply

GEOGRAPHY — pick the company's primary country of operations or founding.
- Use specific countries when possible: United States, United Kingdom, Germany, France, Switzerland, Israel, India, China, Japan, Singapore, Canada, Australia, Brazil, Sweden, Netherlands, Spain, South Korea
- Use a region (Europe, Southeast Asia, Latin America, Africa, Middle East) only if the country is unclear
- Use "Global" ONLY for truly borderless/distributed companies — not as a fallback
- When the company name contains a geographic clue, use it
- Always return a value — never leave geography empty

Examples:
{"sector":"Technology","geography":"United States"} for "OpenAI"
{"sector":"Finance","geography":"United Kingdom"} for "Revolut"
{"sector":"Healthcare","geography":"Switzerland"} for "Molecular Partners"
{"sector":"Technology","geography":"Germany"} for "Personio"
{"sector":"Deep Tech","geography":"France"} for "Mistral AI"
{"sector":"Climate","geography":"United States"} for "Carbon Engineering"
{"sector":"Healthcare","geography":"Israel"} for "Medigus"
{"sector":"Consumer","geography":"India"} for "Meesho"
{"sector":"Finance","geography":"United States"} for "Coinbase"
{"sector":"Deep Tech","geography":"United States"} for "SpaceX"`;


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
