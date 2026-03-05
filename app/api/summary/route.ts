import { NextResponse } from "next/server";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { createRouteClient, createServiceClient } from "@/lib/supabase-server";
import { generateText } from "@/lib/gemini";
import { SUMMARY_TEMPERATURE, SUMMARY_MAX_TOKENS, SUMMARY_SYSTEM_PROMPT } from "@/lib/openai";
import {
  buildSectorRecord,
  buildStageRecord,
} from "@/utils/aggregations";
import type { Deal, WeeklySummary, ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteClient();

  const { data, error } = await supabase
    .from("weekly_summaries")
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

  return NextResponse.json<ApiResponse<WeeklySummary | null>>({
    data: (data as WeeklySummary) ?? null,
  });
}

export async function POST() {
  const supabase = createRouteClient();
  const serviceSupabase = createServiceClient(); // bypasses RLS for the insert

  // Fetch last 7 days of deals
  const now = new Date();
  const weekEnd = endOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));

  const { data: dealsRaw, error: dealsErr } = await supabase
    .from("deals")
    .select("*")
    .gte("date_added", format(weekStart, "yyyy-MM-dd"))
    .lte("date_added", format(weekEnd, "yyyy-MM-dd"));

  if (dealsErr) {
    return NextResponse.json<ApiResponse<never>>(
      { error: dealsErr.message },
      { status: 500 }
    );
  }

  const deals = (dealsRaw as Deal[]) ?? [];
  const topSectors = buildSectorRecord(deals);
  const stageDistribution = buildStageRecord(deals);

  const sectorLines = Object.entries(topSectors)
    .sort(([, a], [, b]) => b - a)
    .map(([s, c]) => `  ${s}: ${c}`)
    .join("\n");

  const stageLines = Object.entries(stageDistribution)
    .map(([s, c]) => `  ${s}: ${c}`)
    .join("\n");

  const userMessage = [
    `Week: ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
    `Total deals reviewed: ${deals.length}`,
    `Active: ${deals.filter((d) => d.status === "active").length}`,
    `Passed: ${deals.filter((d) => d.status === "passed").length}`,
    `In diligence: ${deals.filter((d) => d.status === "diligence").length}`,
    `\nSector breakdown:\n${sectorLines || "  (none)"}`,
    `\nStage distribution:\n${stageLines || "  (none)"}`,
  ].join("\n");

  const summaryText = await generateText({
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    userMessage,
    temperature: SUMMARY_TEMPERATURE,
    maxTokens: SUMMARY_MAX_TOKENS,
  });

  const { data: saved, error: saveErr } = await serviceSupabase
    .from("weekly_summaries")
    .insert({
      week_start: format(weekStart, "yyyy-MM-dd"),
      week_end: format(weekEnd, "yyyy-MM-dd"),
      summary_text: summaryText,
      deal_count: deals.length,
      top_sectors: topSectors,
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

  return NextResponse.json<ApiResponse<WeeklySummary>>({
    data: saved as WeeklySummary,
  });
}
