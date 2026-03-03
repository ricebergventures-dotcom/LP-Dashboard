// POST /api/enrich — backfills sector + geography for existing deals
// that were synced before enrichment was added.

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { enrichBatch } from "@/lib/enrichment";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export interface EnrichResult {
  total: number;
  enriched: number;
}

export async function POST() {
  const supabase = createRouteClient();

  // Fetch all deals with empty sector or geography
  const { data: deals, error } = await supabase
    .from("deals")
    .select("id, company_name")
    .or("sector.is.null,sector.eq.,geography.is.null,geography.eq.");

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  const total = deals?.length ?? 0;
  if (total === 0) {
    return NextResponse.json<ApiResponse<EnrichResult>>({
      data: { total: 0, enriched: 0 },
    });
  }

  const enrichmentMap = await enrichBatch(deals!, 5);

  let enriched = 0;
  for (const [id, { sector, geography }] of Array.from(enrichmentMap.entries())) {
    const { error: updateError } = await supabase
      .from("deals")
      .update({ sector, geography })
      .eq("id", id);
    if (!updateError) enriched++;
  }

  return NextResponse.json<ApiResponse<EnrichResult>>({
    data: { total, enriched },
  });
}
