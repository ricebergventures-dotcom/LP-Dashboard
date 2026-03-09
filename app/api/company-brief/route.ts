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
    let brief = await generateText({
      systemPrompt: `You write single-sentence anonymized descriptions of startups for a VC fund's internal dashboard.
Rules:
- ONE sentence only, 15–25 words
- NEVER mention the company name or any variation of it
- Start with "Company" or "Startup" or "Team"
- Be specific about what they build or the problem they solve
- Use plain language, no jargon
- Output only the sentence, nothing else`,
      userMessage: `Describe what this startup does WITHOUT naming it: ${company_name}${context ? ` (${context})` : ""}`,
      temperature: 0.3,
      maxTokens: 80,
      disableThinking: true,
      useSearch: true,
    });

    // Strip the company name from the output as a safety net
    // Replace full name and each word of the name (3+ chars) case-insensitively
    brief = brief.trim();
    const nameParts = company_name.split(/\s+/).filter((w) => w.length >= 3);
    const toStrip = [company_name, ...nameParts];
    for (const term of toStrip) {
      brief = brief.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "the company");
    }
    // Capitalise first letter in case replacement lowercased it
    brief = brief.charAt(0).toUpperCase() + brief.slice(1);

    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
