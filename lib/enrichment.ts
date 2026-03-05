// Server-side only — enriches deal records with sector + geography via Gemini
// with Google Search grounding for accurate results on obscure startups.

import { generateText } from "./gemini";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

// System prompt: strict JSON output, detailed sector/geography rules.
// Search grounding means Gemini fetches live data — so the prompt should
// focus on extraction/classification, not pattern-matching from training data.
const ENRICH_SYSTEM = `You are a startup data analyst. Your job is to classify a startup's sector and country of origin.

You will receive a company name. Use Google Search to look up what the company does, where it is based, and what industry it belongs to. Then return ONLY a valid JSON object — no markdown, no explanation, no citations, no extra text.

Format: {"sector":"<value>","geography":"<value>"}

SECTOR RULES — choose one of these 6 categories:
- Technology: AI/ML, SaaS, B2B software, developer tools, data platforms, cloud infrastructure, APIs, automation, cybersecurity, no-code/low-code, analytics
- Healthcare: digital health, telemedicine, medical devices, biotech, drug discovery, genomics, diagnostics, life sciences, therapeutics, bioinformatics, wellness, MedTech, pharma
- Finance: payments, neobanking, lending, insurance, trading platforms, financial infrastructure, accounting software, crypto, blockchain, DeFi, Web3, tokenization, wealthtech
- Deep Tech: hardware, semiconductors, quantum computing, robotics, space tech, satellite, drones, advanced materials, photonics, energy storage, defence tech, autonomous vehicles
- Climate: clean energy, solar, wind, carbon capture, sustainability platforms, EVs, green materials, recycling, agritech, precision agriculture, water tech, circular economy
- Consumer: e-commerce, marketplaces, social apps, gaming, media, entertainment, direct-to-consumer, food tech, travel, edtech, fitness, home goods

"Other" — use ONLY if the company is clearly not in any of the above (very rare). Do NOT use as a fallback for uncertainty; instead, look up the company.

GEOGRAPHY RULES:
- Return the company's primary country of operations or founding
- Use the full country name: United States, United Kingdom, Germany, France, Switzerland, Israel, India, China, Japan, Singapore, Canada, Australia, Brazil, Sweden, Netherlands, Spain, South Korea, Austria, Denmark, Finland, Norway, Belgium, Poland, Portugal, Estonia, UAE, Saudi Arabia, Kenya, Nigeria, South Africa, Argentina, Mexico, Colombia, Kyrgyzstan
- Use a region (Europe, Southeast Asia, Latin America, Middle East, Africa) ONLY if the specific country cannot be determined
- NEVER use "Global" — even distributed/remote-first companies have a country of incorporation or primary operations
- NEVER return empty geography

EXAMPLES:
{"sector":"Technology","geography":"United States"} — OpenAI
{"sector":"Finance","geography":"United Kingdom"} — Revolut
{"sector":"Healthcare","geography":"Switzerland"} — Molecular Partners
{"sector":"Deep Tech","geography":"France"} — Mistral AI
{"sector":"Climate","geography":"United States"} — Carbon Engineering
{"sector":"Technology","geography":"Germany"} — Personio
{"sector":"Healthcare","geography":"Israel"} — Medigus
{"sector":"Consumer","geography":"India"} — Meesho
{"sector":"Deep Tech","geography":"United States"} — SpaceX
{"sector":"Finance","geography":"United States"} — Stripe
{"sector":"Technology","geography":"Estonia"} — Pipedrive
{"sector":"Healthcare","geography":"United Kingdom"} — Babylon Health
{"sector":"Deep Tech","geography":"Kyrgyzstan"} — Manas TU Space`;


export async function enrichCompany(companyName: string): Promise<EnrichmentResult> {
  const text = await generateText({
    systemPrompt: ENRICH_SYSTEM,
    userMessage: `Company name: "${companyName}"\n\nSearch for this company and return the JSON classification.`,
    temperature: 0,
    maxTokens: 150,
    useSearch: true,
  });

  try {
    // Find the first JSON object anywhere in the response (handles fences, preamble, citations, etc.)
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("no JSON object found");
    const json = JSON.parse(match[0]) as { sector?: unknown; geography?: unknown };

    const sector =
      typeof json.sector === "string" && json.sector.trim()
        ? json.sector.trim()
        : "Other";
    const geography =
      typeof json.geography === "string" && json.geography.trim()
        ? json.geography.trim()
        : "Unknown";

    // Reject placeholder/fallback values that slipped through
    const badSectors = ["", "Other", "Unknown", "N/A", "n/a"];
    const badGeos = ["", "Global", "Unknown", "N/A", "n/a", "Worldwide"];

    return {
      sector: badSectors.includes(sector) ? "Other" : sector,
      geography: badGeos.includes(geography) ? "Unknown" : geography,
    };
  } catch {
    return { sector: "Other", geography: "Unknown" };
  }
}

/**
 * Enriches a batch of companies using Gemini + Google Search,
 * running `concurrency` calls in parallel.
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
