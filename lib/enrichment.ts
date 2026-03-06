// Server-side only — enriches deal records with sector + geography via Gemini
// with Google Search grounding so every classification is backed by live data.

import { generateText } from "./gemini";

export interface EnrichmentResult {
  sector: string;
  geography: string;
}

// ─── Sector taxonomy ──────────────────────────────────────────────────────────
// 7 specific sectors + "Other". Old labels (Technology, Healthcare, Space,
// Climate, Hardware, Finance, Consumer) are remapped in parseResult so that
// legacy DB rows update correctly on re-enrichment.
// ─────────────────────────────────────────────────────────────────────────────

const ENRICH_SYSTEM = `You are a startup research analyst. Your job is to classify a company into a sector and country using Google Search.

STEP 1 — SEARCH FIRST, ALWAYS. Search for the company name before answering. Most of these are early-stage startups — do not rely on training data alone.
STEP 2 — COMMIT. If your search returned ANY useful information about what the company does, you MUST pick one of the 7 specific sectors below. "Other" is only valid for companies you searched for and found nothing about at all (stealth / no web presence).
STEP 3 — OUTPUT. Return ONLY a valid JSON object. No markdown, no code fences, no explanation, no citations — just the JSON.

Format: {"sector":"<value>","geography":"<value>"}

━━━ SECTOR ━━━
Pick EXACTLY one of these 7 values (case-sensitive, never anything else):

• Life Science       — biotech, pharma, therapeutics, drug discovery, genomics, diagnostics, life sciences, medtech, digital health, medical devices, bioinformatics, computational pathology, clinical AI, liquid biopsy, surgical robotics, telemedicine, wellness platforms
• Spacetech          — satellites, orbital systems, launch vehicles, drones/UAVs, aerospace, earth observation, defence tech, hypersonic transport, hyperloop, space infrastructure, propulsion, re-entry systems
• Future of Compute  — AI/ML, SaaS, B2B software, developer tools, data platforms, cloud infrastructure, APIs, automation, no-code/low-code, analytics, AdTech, semiconductors, chips, robotics, embedded systems, computing architecture, photonics, IoT devices, advanced materials, quality assurance/testing software, HR tech
• Quantum            — quantum computing (hardware and software), quantum sensing, quantum communications, quantum cryptography, post-quantum security, quantum simulation
• Climate Tech       — clean energy, solar, wind, carbon capture, biochar/carbon credits, EVs, agritech, precision agriculture, sustainable materials, recycling, water tech, circular economy, energy storage
• Cybersecurity      — zero-trust, SIEM, threat detection, endpoint security, network security, identity & access management, fraud prevention, hardware security modules (HSM/TPM/PUF), physical unclonable functions, penetration testing, security operations
• Fintech            — payments, neobanking, lending, insurance, trading platforms, financial infrastructure, accounting software, crypto, blockchain, DeFi, Web3, wealthtech, regtech, open banking
• Other              — ONLY if you searched and found NO information about what the company does

RULE: If you found the company and understood what it does → you MUST use one of the 7 specific sectors above. Returning "Other" when you have search results is wrong.

CRITICAL: NEVER return "Deep Tech", "DeepTech", "Technology", "Healthcare", "Hardware", "Space", "Climate", "Finance", or "Consumer" — these labels do not exist in the taxonomy.

━━━ DISAMBIGUATION ━━━
When a company sits at the boundary of two sectors, use the PRIMARY end-application:
• AI/ML tool built for doctors / hospitals / clinics / diagnostics → Life Science
• AI/ML tool built for businesses in general → Future of Compute
• Quantum chip / quantum hardware → Quantum
• Post-quantum encryption software → Cybersecurity
• Hardware security device (HSM / TPM / PUF / physical token) → Cybersecurity
• Software cybersecurity / SIEM / threat detection → Cybersecurity
• Space-based earth observation used for climate monitoring → Spacetech (space is the primary medium)
• Biochar / soil carbon / agri carbon credits → Climate Tech
• Computational or digital pathology platform → Life Science
• Contact-free sleep monitoring / diagnostic wearable → Life Science
• Drug discovery software / bioinformatics platform → Life Science
• Quality assurance / testing software → Future of Compute
• Physical computing architecture / novel ISA / chip design → Future of Compute
• Crypto / DeFi / blockchain → Fintech

━━━ GEOGRAPHY ━━━
Return the company's primary country of operations or country of incorporation.

CRITICAL RULES:
• NEVER return "Global" — every company has a primary country. Global operations do not mean no headquarters.
• NEVER return empty — if uncertain after searching, use the country of the founding team or legal entity.
• Use full country names: United States, United Kingdom, Germany, France, Switzerland, Israel, India, China, Japan, Singapore, Canada, Australia, Brazil, Sweden, Netherlands, Spain, South Korea, Austria, Denmark, Finland, Norway, Belgium, Poland, Portugal, Estonia, Czech Republic, Romania, UAE, Saudi Arabia, Kenya, Nigeria, South Africa, Argentina, Mexico, Colombia, Kyrgyzstan, Ukraine, Greece, Turkey
• If the company name or domain contains a country clue (e.g. ".de", ".fr", "Swiss"), use it.
• Use a region (Europe, Southeast Asia, Latin America, Middle East, Africa) ONLY as last resort when search truly cannot determine a country.

━━━ EXAMPLES ━━━
{"sector":"Future of Compute","geography":"United States"} — OpenAI
{"sector":"Fintech","geography":"United Kingdom"} — Revolut
{"sector":"Life Science","geography":"Switzerland"} — Molecular Partners
{"sector":"Future of Compute","geography":"Germany"} — Personio
{"sector":"Climate Tech","geography":"United States"} — Carbon Engineering
{"sector":"Life Science","geography":"Israel"} — Medigus
{"sector":"Fintech","geography":"United States"} — Stripe
{"sector":"Spacetech","geography":"United States"} — SpaceX
{"sector":"Spacetech","geography":"Switzerland"} — Swisspod
{"sector":"Cybersecurity","geography":"Switzerland"} — Keyron
{"sector":"Spacetech","geography":"Kyrgyzstan"} — Manas TU Space
{"sector":"Future of Compute","geography":"Estonia"} — Pipedrive
{"sector":"Life Science","geography":"United Kingdom"} — Babylon Health
{"sector":"Climate Tech","geography":"Switzerland"} — Bchar
{"sector":"Quantum","geography":"United States"} — IonQ`;


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

// Maps old sector labels (still emitted by Gemini before cache clears) → new taxonomy.
const LEGACY_REMAP: Record<string, string> = {
  "Technology": "Future of Compute",
  "Healthcare": "Life Science",
  "Space":      "Spacetech",
  "Climate":    "Climate Tech",
  "Hardware":   "Future of Compute",
  "Finance":    "Fintech",
  "Consumer":   "Other",
  "Deep Tech":  "Future of Compute",
};

function parseResult(json: { sector?: unknown; geography?: unknown }): EnrichmentResult {
  const VALID_SECTORS = new Set([
    "Life Science", "Spacetech", "Future of Compute", "Quantum",
    "Climate Tech", "Cybersecurity", "Fintech",
  ]);
  const BAD_GEOS = new Set(["", "Global", "Worldwide", "International", "N/A", "n/a", "Unknown"]);

  const rawSector = typeof json.sector === "string" ? json.sector.trim() : "";
  const rawGeo    = typeof json.geography === "string" ? json.geography.trim() : "";

  // Normalise to catch all capitalisation / spacing variants Gemini might produce
  const normalised = rawSector.toLowerCase().replace(/[\s_-]+/g, "");

  let sector: string;
  if (normalised === "deeptech") {
    sector = "Future of Compute";
  } else if (VALID_SECTORS.has(rawSector)) {
    sector = rawSector;
  } else if (LEGACY_REMAP[rawSector]) {
    sector = LEGACY_REMAP[rawSector]!;
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
