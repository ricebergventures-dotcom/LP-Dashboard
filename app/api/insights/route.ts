import { NextResponse } from "next/server";
import { generateText, GEMINI_MODEL } from "@/lib/gemini";
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

  let text: string;
  try {
    text = await generateText({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Search for the startup "${company_name}" and provide the structured analysis.`,
      temperature: 0.2,
      maxTokens: 600,
      useSearch: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini API call failed";
    return NextResponse.json<ApiResponse<never>>({ error: msg }, { status: 502 });
  }

  try {
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const insights = JSON.parse(clean) as CompanyInsights;
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
