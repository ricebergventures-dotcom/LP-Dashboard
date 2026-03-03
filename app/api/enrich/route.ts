// POST /api/enrich — backfills sector + geography for existing deals
// that were synced before enrichment was added.

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { enrichBatch } from "@/lib/enrichment";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

// Process 20 per call to stay within Vercel's function timeout.
// Run the endpoint multiple times until remaining reaches 0.
const BATCH_LIMIT = 20;

export interface EnrichResult {
  total: number;
  enriched: number;
  remaining: number;
}

export async function POST() {
  const supabase = createRouteClient();

  // Fetch deals with empty sector or geography, limited per call
  const { data: deals, error } = await supabase
    .from("deals")
    .select("id, company_name")
    .or("sector.is.null,sector.eq.,geography.is.null,geography.eq.")
    .limit(BATCH_LIMIT);

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  const total = deals?.length ?? 0;
  if (total === 0) {
    return NextResponse.json<ApiResponse<EnrichResult>>({
      data: { total: 0, enriched: 0, remaining: 0 },
    });
  }

  const enrichmentMap = await enrichBatch(deals!, 5);
  const geminiReturned = enrichmentMap.size;

  let enriched = 0;
  let firstUpdateError: string | null = null;
  for (const [id, { sector, geography }] of Array.from(enrichmentMap.entries())) {
    const { error: updateError } = await supabase
      .from("deals")
      .update({ sector, geography })
      .eq("id", id);
    if (!updateError) enriched++;
    else if (!firstUpdateError) firstUpdateError = updateError.message;
  }

  // Count how many still need enrichment
  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .or("sector.is.null,sector.eq.,geography.is.null,geography.eq.");

  return NextResponse.json({
    data: {
      total,
      geminiReturned,
      enriched,
      remaining: count ?? 0,
      ...(firstUpdateError ? { firstUpdateError } : {}),
    },
  });
}
