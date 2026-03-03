import { NextResponse } from "next/server";
import { getOpenAIClient, SUMMARY_MODEL } from "@/lib/openai";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export interface CompanyInsights {
  sector: string;
  geography: string;
  description: string;
  fundingStage: string;
  marketOpportunity: string;
  considerations: string[];
}

const SYSTEM_PROMPT = `You are a VC analyst assistant. Given a startup company name, provide a brief structured analysis.

Return valid JSON only — no markdown fences, no explanation outside the JSON. Use this exact structure:
{
  "sector": "one of: AI/ML, Biotech, CleanTech, Defense/DualUse, FinTech, HealthTech, HardTech/Robotics, SaaS, SpaceTech, Other",
  "geography": "headquarters country or region (e.g. India, USA, Europe)",
  "description": "what the company does in 2-3 sentences",
  "fundingStage": "estimated funding stage e.g. Pre-Seed, Seed, Series A",
  "marketOpportunity": "market size and opportunity in 1-2 sentences",
  "considerations": ["2-3 key investment considerations as concise strings"]
}

If you lack reliable information about a specific company, use best judgment from the name and note uncertainty.`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { company_name } = body as { company_name?: string };

  if (!company_name) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "company_name is required" },
      { status: 400 }
    );
  }

  let openai;
  try {
    openai = getOpenAIClient();
  } catch (e) {
    return NextResponse.json<ApiResponse<never>>(
      { error: e instanceof Error ? e.message : "Gemini client init failed" },
      { status: 500 }
    );
  }

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Company: ${company_name}` },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini API call failed";
    return NextResponse.json<ApiResponse<never>>({ error: msg }, { status: 502 });
  }

  const text = completion.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    const insights = JSON.parse(text) as CompanyInsights;
    return NextResponse.json<ApiResponse<CompanyInsights>>({ data: insights });
  } catch {
    // Gemini returned non-JSON — wrap as description
    return NextResponse.json<ApiResponse<CompanyInsights>>({
      data: {
        sector: "Unknown",
        geography: "Unknown",
        description: text,
        fundingStage: "Unknown",
        marketOpportunity: "",
        considerations: [],
      },
    });
  }
}
