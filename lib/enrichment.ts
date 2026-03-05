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

const ENRICH_SYSTEM = `You are a startup research analyst. Your job is to classify a company into a sector and country using Google Search.

STEP 1 — SEARCH FIRST, ALWAYS. Search for the company name before answering. Most of these are early-stage startups — do not rely on training data alone.
STEP 2 — COMMIT. If your search returned ANY useful information about what the company does, you MUST pick one of the 7 specific sectors below. "Other" is only valid for companies you searched for and found nothing about at all (stealth / no web presence).
STEP 3 — OUTPUT. Return ONLY a valid JSON object. No markdown, no code fences, no explanation, no citations — just the JSON.

Format: {"sector":"<value>","geography":"<value>"}

━━━ SECTOR ━━━
Pick EXACTLY one of these 7 values (never "Deep Tech", never anything else):

• Technology   — AI/ML, SaaS, B2B software, developer tools, cybersecurity, data platforms, cloud infrastructure, APIs, automation, no-code/low-code, analytics, AdTech
• Healthcare   — digital health, medtech, biotech, drug discovery, genomics, diagnostics, life sciences, therapeutics, bioinformatics, wellness, pharma, telemedicine, medical devices
• Space        — satellites, space infrastructure, orbital systems, launch vehicles, drones/UAVs, aerospace, earth observation, defence tech, hypersonic transport, hyperloop
• Climate      — clean energy, solar, wind, carbon capture, EVs, agritech, precision agriculture, sustainable materials, recycling, water tech, circular economy, energy storage
• Hardware     — semiconductors, chips, quantum computing, robotics, advanced materials, photonics, IoT devices, embedded systems, computing architecture, physical security hardware
• Finance      — payments, neobanking, lending, insurance, trading platforms, financial infrastructure, accounting software, crypto, blockchain, DeFi, Web3, wealthtech, regtech
• Consumer     — e-commerce, marketplaces, social apps, gaming, media, entertainment, direct-to-consumer, food tech, travel, edtech, fitness, home goods, HR tech
• Other        — ONLY if you searched and found NO information about what the company does

RULE: If you found the company and understood what it does → you MUST use one of the 7 specific sectors above. Returning "Other" when you have search results is wrong.

CRITICAL: NEVER return "Deep Tech" or "DeepTech" — this label does not exist.
If you would have chosen "Deep Tech", use this instead:
  → aerospace / satellites / launch / defence / drones / hyperloop → Space
  → semiconductors / chips / quantum / robotics / photonics / embedded → Hardware

━━━ DISAMBIGUATION ━━━
When a company sits at the boundary of two sectors, use the PRIMARY end-application:
• AI tool built for doctors / hospitals / clinics → Healthcare
• AI tool built for businesses in general → Technology
• Hardware security device (HSM / TPM / PUF / physical token) → Hardware
• Software cybersecurity / zero-trust / SIEM / threat detection → Technology
• Space-based earth observation used for climate monitoring → Space
• Biochar / soil carbon / agri carbon credits → Climate
• Computational or digital pathology platform → Healthcare
• Contact-free sleep monitoring / diagnostic wearable → Healthcare
• Drug discovery software / bioinformatics platform → Healthcare
• Quality assurance / testing software → Technology
• Physical computing architecture / novel ISA / chip design → Hardware

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
    userMessage: `Search Google for the startup "${companyName}". Find out: (1) what the company does, (2) what industry it operates in, (3) which country it is headquartered or incorporated in. If the first search is not specific enough, search again with more keywords. Once you have found what the company does, you MUST commit to one of the 7 specific sectors — do not return "Other" if you found useful information. Return the JSON classification.`,
    temperature: 0.2,
    maxTokens: 400,
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

  // Accept valid sector; remap legacy / too-broad labels.
  // Normalise to catch all capitalisation / spacing variants Gemini might produce
  // (e.g. "deep tech", "DEEP TECH", "Deep-Tech", "deeptech").
  const normalised = rawSector.toLowerCase().replace(/[\s_-]+/g, "");
  let sector: string;
  if (normalised === "deeptech") {
    sector = "Hardware"; // conservative fallback; force re-enrich will correct if wrong
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
