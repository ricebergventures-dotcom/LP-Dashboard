import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { createRouteClient, createServiceClient } from "@/lib/supabase-server";
import { generateText } from "@/lib/gemini";
import {
  MONTHLY_SUMMARY_SYSTEM_PROMPT,
  MONTHLY_SUMMARY_TEMPERATURE,
  MONTHLY_SUMMARY_MAX_TOKENS,
} from "@/lib/openai";
import {
  buildSectorRecord,
  buildStageRecord,
  buildGeographyRecord,
} from "@/utils/aggregations";
import type { Deal, MonthlySummary, ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteClient();

  const { data, error } = await supabase
    .from("monthly_summaries")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<MonthlySummary | null>>({
    data: (data as MonthlySummary) ?? null,
  });
}

export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json<ApiResponse<never>>(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured — add it in Vercel → Settings → Environment Variables.",
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createRouteClient();
    const serviceSupabase = createServiceClient();

    // Default to previous full month
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    const monthStart = startOfMonth(prevMonth);
    const monthEnd = endOfMonth(prevMonth);
    const monthKey = format(prevMonth, "yyyy-MM");
    const monthLabel = format(prevMonth, "MMMM yyyy");

    const { data: dealsRaw, error: dealsErr } = await supabase
      .from("deals")
      .select("*")
      .gte("date_added", format(monthStart, "yyyy-MM-dd"))
      .lte("date_added", format(monthEnd, "yyyy-MM-dd"));

    if (dealsErr) {
      return NextResponse.json<ApiResponse<never>>(
        { error: dealsErr.message },
        { status: 500 }
      );
    }

    const deals = (dealsRaw as Deal[]) ?? [];
    const sectorBreakdown = buildSectorRecord(deals);
    const stageDistribution = buildStageRecord(deals);
    const geographyBreakdown = buildGeographyRecord(deals);

    const sectorLines = Object.entries(sectorBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([s, c]) => `  ${s}: ${c}`)
      .join("\n");

    const stageLines = Object.entries(stageDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([s, c]) => `  ${s}: ${c}`)
      .join("\n");

    const geoLines = Object.entries(geographyBreakdown)
      .slice(0, 6)
      .map(([g, c]) => `  ${g}: ${c}`)
      .join("\n");

    const userMessage = [
      `Month: ${monthLabel}`,
      `Total deals reviewed: ${deals.length}`,
      `Active: ${deals.filter((d) => d.status === "active").length}`,
      `Passed: ${deals.filter((d) => d.status === "passed").length}`,
      `In diligence: ${deals.filter((d) => d.status === "diligence").length}`,
      `\nSector breakdown:\n${sectorLines || "  (none)"}`,
      `\nStage distribution:\n${stageLines || "  (none)"}`,
      `\nTop geographies:\n${geoLines || "  (none)"}`,
    ].join("\n");

    let summaryText: string;
    try {
      summaryText = await generateText({
        systemPrompt: MONTHLY_SUMMARY_SYSTEM_PROMPT,
        userMessage,
        temperature: MONTHLY_SUMMARY_TEMPERATURE,
        maxTokens: MONTHLY_SUMMARY_MAX_TOKENS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Gemini error";
      return NextResponse.json<ApiResponse<never>>(
        { error: `AI generation failed: ${message}` },
        { status: 502 }
      );
    }

    const { data: saved, error: saveErr } = await serviceSupabase
      .from("monthly_summaries")
      .insert({
        month: monthKey,
        month_label: monthLabel,
        summary_text: summaryText,
        deal_count: deals.length,
        sector_breakdown: sectorBreakdown,
        geography_breakdown: geographyBreakdown,
        stage_distribution: stageDistribution,
      })
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json<ApiResponse<never>>(
        { error: saveErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<MonthlySummary>>({
      data: saved as MonthlySummary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    );
  }
}
