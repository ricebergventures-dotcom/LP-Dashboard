import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GEMINI_MODEL } from "@/lib/gemini";
import type { Deal } from "@/types";
import { startOfMonth, parseISO, subMonths, format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContext(deals: Deal[]): string {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  // Counts
  const active    = deals.filter((d) => d.status === "active").length;
  const passed    = deals.filter((d) => d.status === "passed").length;
  const diligence = deals.filter((d) => d.status === "diligence").length;

  const thisMonth = deals.filter((d) => {
    if (!d.date_added) return false;
    const date = parseISO(d.date_added);
    return !isNaN(date.getTime()) && date >= monthStart;
  });

  const lastMonth = deals.filter((d) => {
    if (!d.date_added) return false;
    const date = parseISO(d.date_added);
    return !isNaN(date.getTime()) && date >= lastMonthStart && date < monthStart;
  });

  // Sector breakdown
  const sectorMap = new Map<string, number>();
  for (const d of deals) {
    if (d.sector) sectorMap.set(d.sector, (sectorMap.get(d.sector) ?? 0) + 1);
  }
  const sectors = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]);

  // Geography breakdown
  const geoMap = new Map<string, number>();
  for (const d of deals) {
    if (d.geography && d.geography !== "Unknown")
      geoMap.set(d.geography, (geoMap.get(d.geography) ?? 0) + 1);
  }
  const geos = Array.from(geoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Stage breakdown
  const stageMap = new Map<string, number>();
  for (const d of deals) {
    if (d.stage) stageMap.set(d.stage, (stageMap.get(d.stage) ?? 0) + 1);
  }
  const stages = Array.from(stageMap.entries()).sort((a, b) => b[1] - a[1]);

  const fmtDeal = (d: Deal) =>
    `${d.date_added ?? "unknown date"} | ${d.company_name} | ${d.sector || "Unknown sector"} | ${d.stage || "Unknown stage"} | ${d.geography || "Unknown"} | ${d.status}`;

  const lines: string[] = [
    `=== DEALFLOW DATABASE ===`,
    `Data as of: ${format(now, "MMMM d, yyyy")}`,
    `Current month: ${format(now, "MMMM yyyy")}`,
    ``,
    `PIPELINE OVERVIEW`,
    `Total companies tracked: ${deals.length}`,
    `Active pipeline: ${active}`,
    `Passed / declined: ${passed}`,
    `In diligence: ${diligence}`,
    `Added this month (${format(now, "MMMM yyyy")}): ${thisMonth.length}`,
    `Added last month (${format(lastMonthStart, "MMMM yyyy")}): ${lastMonth.length}`,
    ``,
    `SECTOR BREAKDOWN`,
    ...sectors.map(([s, n]) => `  ${s}: ${n} companies`),
    ``,
    `GEOGRAPHY BREAKDOWN (top 10)`,
    ...geos.map(([g, n]) => `  ${g}: ${n} companies`),
    ``,
    `STAGE DISTRIBUTION`,
    ...stages.map(([s, n]) => `  ${s}: ${n} companies`),
    ``,
    `COMPANIES ADDED THIS MONTH (${format(now, "MMMM yyyy")})`,
    thisMonth.length > 0
      ? thisMonth.map(fmtDeal).join("\n")
      : "  None yet this month.",
    ``,
    `ALL COMPANIES (date_added | company | sector | stage | geography | status)`,
    ...deals.map(fmtDeal),
  ];

  return lines.join("\n");
}

const FUND_KNOWLEDGE = `
=== ABOUT RICEBERG VENTURES ===

Riceberg Ventures is the world's first truly global early-stage deep-tech fund.
We back mission-driven founders developing breakthrough technologies to address major challenges.
The team comprises scientists, engineers, and entrepreneurs committed to supporting scientific innovators.

INVESTMENT THESIS
- Stage: Pre-seed and seed
- Focus: Deep-tech startups globally
- Philosophy: Back research-driven companies with potential for global scalability
- Sectors: Life Science, Spacetech, Future of Compute, Quantum, Climate Tech, Cybersecurity, Fintech

TEAM
- Ankit Anand — Managing Partner (Zurich / San Francisco)
- Lino Gandola — Managing Partner (London)
- Mredul Sarda — General Partner (Mumbai)
- Shubham Raj — General Partner (San Francisco)
The team also includes venture partners, investment principals, and operational staff across multiple continents.

PORTFOLIO COMPANIES (confirmed investments)
- EtherealX — Spacetech, India (next-gen satellite infrastructure)
- Manastu Space — Spacetech, India (green propulsion for small satellites)
- Signatur Biosciences — Life Science, UK (liquid biopsy / early disease detection)
- Keyron Medical — Life Science, UK (hardware security for medical devices)
- Surf Therapeutics — Life Science, USA (surfactant therapies for lung disease)
- Sleepiz — Life Science, Switzerland (contact-free clinical sleep monitoring) [Syndicate]
- Swisspod — Climate Tech, Switzerland (hyperloop transportation)
- BChar — Climate Tech, Switzerland (carbon capture via biochar) [Syndicate]
- Rigor AI — Cybersecurity, USA (AI-powered security testing for critical software) [Syndicate]
- Arch0 — Cybersecurity, India (foundational secure computing architecture)
- Kicksky Space — Spacetech

NOTABLE INITIATIVES
- Co-founded India's first spacetech accelerator for early-stage founders

HOW TO SUBMIT A DEAL / GET IN TOUCH
- Email: [email protected]
- LinkedIn: linkedin.com/company/riceberg-ventures/
- Deal submission form: riceberg.vc/submit (or use the "Submit Deal" link in this dashboard)
- Riceberg invests at pre-seed and seed stage in deep-tech globally
- Founders should share: company overview, sector, stage, geography, and a pitch deck or description

WEBSITE: riceberg.vc
`.trim();

const SYSTEM_PROMPT = `You are an AI assistant for Riceberg Ventures, a global early-stage deep-tech VC fund.

You have two knowledge sources:
1. FUND KNOWLEDGE — static facts about Riceberg Ventures (team, thesis, portfolio, how to submit deals)
2. LIVE DEALFLOW DATA — real-time pipeline data fetched from the database, prepended to the first user message

Use both sources together to give the most complete, accurate answers.

RULES:
- For fund facts (team, thesis, portfolio companies, how to apply): use FUND KNOWLEDGE
- For pipeline stats, deal counts, stages, sectors in the pipeline: use the LIVE DEALFLOW DATA
- Never fabricate company names, numbers, or facts not present in either source
- If you cannot answer from either source, say so clearly

RESPONSE STYLE:
- Concise and professional — like a sharp internal analyst
- Use bullet points and numbered lists for clarity
- When citing pipeline stats, be specific (numbers, company names, sectors)
- For fund questions, be informative and welcoming — some users may be founders exploring the fund

YOU CAN ANSWER:
- Deal counts by time period, sector, stage, or geography
- Pipeline trends and patterns
- Fund thesis, team, and investment focus
- How founders can submit a deal or get in touch
- Portfolio company details
- Comparisons across time periods or sectors

${FUND_KNOWLEDGE}`;

// ─── Gemini multi-turn call ───────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  messages: { role: "user" | "model"; content: string }[]
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const body = {
    contents: messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!body.messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Fetch all deals from Supabase
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("date_added", { ascending: false });

    if (error) throw new Error(error.message);

    const deals = (data as Deal[]) ?? [];
    const context = buildContext(deals);

    // Prepend context to the first user message
    const geminiMessages: { role: "user" | "model"; content: string }[] =
      body.messages.map((m, i) => ({
        role: m.role === "assistant" ? "model" : "user",
        content:
          i === 0
            ? `${context}\n\n---\n\nUSER QUESTION:\n${m.content}`
            : m.content,
      }));

    const answer = await callGemini(SYSTEM_PROMPT, geminiMessages);

    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
