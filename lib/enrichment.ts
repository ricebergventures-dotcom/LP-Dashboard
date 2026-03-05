// Server-side only — enriches deal records with sector + geography via Gemini
// with Google Search grounding so every classification is backed by live data.

import { generateText } from "./gemini";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

// ─── Sector taxonomy ──────────────────────────────────────────────────────────
// "Deep Tech" is intentionally excluded — it is too broad to be useful.
// Hardware and space startups are placed in their own specific categories.
// ─────────────────────────────────────────────────────────────────────────────

const ENRICH_SYSTEM = `You are a startup research analyst. Given a company name, use Google Search to find what the company does and where it is based, then return a JSON classification.

ALWAYS search for the company before answering. Do not rely on training data alone — many of these are early-stage startups not in your training data.

Return ONLY a valid JSON object. No markdown, no code fences, no explanation, no citations — just the JSON.

Format: {"sector":"<value>","geography":"<value>"}

━━━ SECTOR ━━━
Choose the single best match from EXACTLY these 8 values. "Other" is a last resort — if you are unsure, search harder.

• Technology   — AI/ML, SaaS, B2B software, developer tools, cybersecurity, data platforms, cloud infrastructure, APIs, automation, no-code/low-code, analytics, AdTech
• Healthcare   — digital health, medtech, biotech, drug discovery, genomics, diagnostics, life sciences, therapeutics, bioinformatics, wellness, pharma, telemedicine, medical devices
• Space        — satellites, space infrastructure, orbital systems, launch vehicles, drones/UAVs, aerospace, earth observation, defence tech, hypersonic transport
• Climate      — clean energy, solar, wind, carbon capture, EVs, agritech, precision agriculture, sustainable materials, recycling, water tech, circular economy, energy storage
• Hardware     — semiconductors, chips, quantum computing, robotics, advanced materials, photonics, IoT devices, embedded systems, computing architecture, physical security hardware
• Finance      — payments, neobanking, lending, insurance, trading platforms, financial infrastructure, accounting software, crypto, blockchain, DeFi, Web3, wealthtech, regtech
• Consumer     — e-commerce, marketplaces, social apps, gaming, media, entertainment, direct-to-consumer, food tech, travel, edtech, fitness, home goods, HR tech
• Other        — use ONLY if after searching the company genuinely fits none of the above

CRITICAL: NEVER return "Deep Tech" or "DeepTech" — this label does not exist in the taxonomy.
If you would have chosen "Deep Tech", apply this rule instead:
  → aerospace / satellites / launch / defence / drones → Space
  → semiconductors / chips / quantum / robotics / photonics / embedded → Hardware

━━━ GEOGRAPHY ━━━
Return the company's primary country of operations or country of incorporation.

CRITICAL RULES:
• NEVER return "Global" — every company has a primary country. Global operations do not mean no headquarters.
• NEVER return empty — if uncertain after searching, use the country of the founding team or legal entity.
• Use full country names: United States, United Kingdom, Germany, France, Switzerland, Israel, India, China, Japan, Singapore, Canada, Australia, Brazil, Sweden, Netherlands, Spain, South Korea, Austria, Denmark, Finland, Norway, Belgium, Poland, Portugal, Estonia, Czech Republic, Romania, UAE, Saudi Arabia, Kenya, Nigeria, South Africa, Argentina, Mexico, Colombia, Kyrgyzstan, Ukraine, Greece, Turkey
• If the company name or domain contains a country clue (e.g. ".de", ".fr", "Swiss"), use it.
• Use a region (Europe, Southeast Asia, Latin America, Middle East, Africa) ONLY as last resort when search truly cannot determine a country.

━━━ EXAMPLES ━━━
{"sector":"Technology","geography":"United States"} — OpenAI
{"sector":"Finance","geography":"United Kingdom"} — Revolut
{"sector":"Healthcare","geography":"Switzerland"} — Molecular Partners
{"sector":"Technology","geography":"Germany"} — Personio
{"sector":"Climate","geography":"United States"} — Carbon Engineering
{"sector":"Healthcare","geography":"Israel"} — Medigus
{"sector":"Consumer","geography":"India"} — Meesho
{"sector":"Finance","geography":"United States"} — Stripe
{"sector":"Space","geography":"United States"} — SpaceX
{"sector":"Space","geography":"Switzerland"} — Swisspod
{"sector":"Hardware","geography":"Switzerland"} — Keyron
{"sector":"Space","geography":"Kyrgyzstan"} — Manas TU Space
{"sector":"Technology","geography":"Estonia"} — Pipedrive
{"sector":"Healthcare","geography":"United Kingdom"} — Babylon Health
{"sector":"Climate","geography":"Switzerland"} — Bchar`;


export async function enrichCompany(companyName: string): Promise<EnrichmentResult> {
  const text = await generateText({
    systemPrompt: ENRICH_SYSTEM,
    userMessage: `Search Google for the startup "${companyName}" — find what they do, what industry they are in, and which country they are based in or incorporated in. Then return the JSON classification.`,
    temperature: 0.1,
    maxTokens: 200,
    useSearch: true,
  });

  try {
    // Prefer a JSON object that contains both keys (handles surrounding text / citations)
    const strict = text.match(/\{[^{}]*"sector"[^{}]*"geography"[^{}]*\}|\{[^{}]*"geography"[^{}]*"sector"[^{}]*\}/);
    const raw = strict ?? text.match(/\{[\s\S]*?\}/);
    if (!raw) throw new Error("no JSON found");
    const json = JSON.parse(raw[0]) as { sector?: unknown; geography?: unknown };
    return parseResult(json);
  } catch {
    return { sector: "Other", geography: "Unknown" };
  }
}

function parseResult(json: { sector?: unknown; geography?: unknown }): EnrichmentResult {
  const VALID_SECTORS = new Set([
    "Technology", "Healthcare", "Space", "Climate", "Hardware", "Finance", "Consumer",
  ]);
  const BAD_GEOS = new Set(["", "Global", "Worldwide", "International", "N/A", "n/a", "Unknown"]);

  const rawSector = typeof json.sector === "string" ? json.sector.trim() : "";
  const rawGeo    = typeof json.geography === "string" ? json.geography.trim() : "";

  // Accept valid sector; remap legacy / too-broad labels
  let sector: string;
  if (rawSector === "Deep Tech" || rawSector === "DeepTech") {
    sector = "Hardware"; // conservative fallback — will be re-enriched on next run if wrong
  } else if (VALID_SECTORS.has(rawSector)) {
    sector = rawSector;
  } else {
    sector = "Other";
  }

  const geography = BAD_GEOS.has(rawGeo) || !rawGeo ? "Unknown" : rawGeo;

  return { sector, geography };
}

/**
 * Enriches a batch of companies using Gemini + Google Search,
 * running `concurrency` calls in parallel.
 * Returns a Map from deal ID → EnrichmentResult.
 * Failed individual calls are silently skipped (Promise.allSettled).
 */
export async function enrichBatch(
  companies: { id: string; company_name: string }[],
  concurrency = 3
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
