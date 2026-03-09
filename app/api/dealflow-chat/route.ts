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

const SYSTEM_PROMPT = `You are an AI investment analyst for a deep-tech venture capital firm.
You help VC partners quickly understand their dealflow, pipeline activity, and sector trends.

Your knowledge comes EXCLUSIVELY from the dealflow data provided below in each message.
Never fabricate or hallucinate company names, sectors, or any data not present in the dataset.

Response style:
- Concise and professional, like an internal VC memo
- Use bullet points and numbered lists for clarity
- Reference specific company names, sectors, and stages from the data
- Highlight trends or patterns when relevant
- If asked about something not in the data, say so clearly

You can help with:
- Deal counts by time period (month, quarter, year)
- Sector and geography breakdowns
- Stage progression and pipeline status
- Notable companies or patterns worth flagging
- Comparisons between time periods`;

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
      maxOutputTokens: 800,
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
