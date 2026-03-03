// POST /api/enrich
//
// Backfills sector + geography for all deals that currently have empty values.
// Useful for enriching the initial 276 deals imported from Decile Hub.
// Safe to call multiple times — skips deals that already have both fields set.

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { enrichBatch } from "@/lib/enrichment";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";
// Vercel default timeout is 10s on Hobby, 300s on Pro.
// Set to 300s to allow enriching large batches.
export const maxDuration = 300;

export interface EnrichResult {
  processed: number;
  enriched: number;
  errors: number;
}

export async function POST() {
  const supabase = createRouteClient();

  // Find deals that are missing sector OR geography
  const { data: unenriched, error: fetchError } = await supabase
    .from("deals")
    .select("id, company_name")
    .or("sector.eq.,geography.eq.");

  if (fetchError) {
    return NextResponse.json<ApiResponse<never>>(
      { error: `Failed to query deals: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const companies = unenriched ?? [];
  const processed = companies.length;

  if (processed === 0) {
    return NextResponse.json<ApiResponse<EnrichResult>>({
      data: { processed: 0, enriched: 0, errors: 0 },
    });
  }

  // Enrich in batches of 5 concurrent Gemini calls
  const enrichmentMap = await enrichBatch(companies, 5);

  // Write results back to Supabase
  let enriched = 0;
  let errors = 0;

  for (const [id, { sector, geography }] of enrichmentMap) {
    const { error: updateError } = await supabase
      .from("deals")
      .update({ sector, geography })
      .eq("id", id);

    if (updateError) {
      console.error(`[enrich] Failed to update deal ${id}:`, updateError.message);
      errors++;
    } else {
      enriched++;
    }
  }

  return NextResponse.json<ApiResponse<EnrichResult>>({
    data: { processed, enriched, errors },
  });
}
