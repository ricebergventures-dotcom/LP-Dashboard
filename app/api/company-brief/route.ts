import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    company_name?: string;
    sector?: string;
    geography?: string;
  };

  const { company_name, sector, geography } = body;

  if (!company_name) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }

  const context = [
    sector ? `Sector: ${sector}` : null,
    geography && geography !== "Unknown" ? `Geography: ${geography}` : null,
  ].filter(Boolean).join(", ");

  try {
    const brief = await generateText({
      systemPrompt: `You write single-sentence anonymized descriptions of startups for a VC fund's internal dashboard.
Rules:
- ONE sentence only, 15–25 words
- Do NOT mention the company name
- Start with "Company" or "Startup" or "Team"
- Be specific about what they build or the problem they solve
- Use plain language, no jargon
- Output only the sentence, nothing else`,
      userMessage: `Company: ${company_name}${context ? ` (${context})` : ""}`,
      temperature: 0.3,
      maxTokens: 80,
      disableThinking: true,
      useSearch: true,
    });

    return NextResponse.json({ brief: brief.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
