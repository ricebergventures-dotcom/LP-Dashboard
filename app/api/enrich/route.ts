// POST /api/enrich — backfills sector + geography for existing deals
// that were synced before enrichment was added.

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { enrichBatch } from "@/lib/enrichment";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

// Process 10 per call — search-grounded Gemini calls take 3-5 s each,
// so 10 × concurrency-3 keeps each API route call well under 60 s.
// The EnrichButton client loops automatically until remaining reaches 0.
const BATCH_LIMIT = 10;

// Deals that need enrichment — null/empty, placeholder values, retired sector
// names, or the old "Deep Tech" umbrella that should now be Space or Hardware.
//
// NOTE: "Other" and "Unknown" are intentionally NOT included here.
// They are valid final states — Gemini searched and genuinely couldn't classify
// the deal. Including them causes an infinite loop: every deal enriched to
// Other/Unknown gets re-queued, enriched again to Other/Unknown, forever.
const NEEDS_ENRICHMENT_FILTER = [
  "sector.is.null",
  "sector.eq.",
  // Retired broad label — split into Space / Hardware
  "sector.eq.Deep Tech",
  // Legacy narrow sectors from earlier schema
  "sector.eq.AI/ML",
  "sector.eq.Fintech",
  "sector.eq.Healthtech",
  "sector.eq.Biotech",
  "sector.eq.SaaS",
  "sector.eq.Climate Tech",
  "sector.eq.Crypto/Web3",
  "geography.is.null",
  "geography.eq.",
  // "Global" is a bad placeholder our prompt bans — re-enrich these
  "geography.eq.Global",
].join(",");

export interface EnrichResult {
  total: number;
  enriched: number;
  remaining: number;
  nextOffset?: number;
}

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

  // Normal mode: deals missing sector/geography or stuck with placeholder values.
  // Force mode: re-enrich every deal in offset-paginated batches so we don't
  //   keep fetching the same first N rows on every call.
  const { data: deals, error } = force
    ? await supabase
        .from("deals")
        .select("id, company_name")
        .order("id")
        .range(offset, offset + BATCH_LIMIT - 1)
    : await supabase
        .from("deals")
        .select("id, company_name")
        .or(NEEDS_ENRICHMENT_FILTER)
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

  const enrichmentMap = await enrichBatch(deals!, 3);
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

  // Remaining: in force mode count by offset; in normal mode use the filter.
  let remaining: number;
  if (force) {
    const { count: totalCount } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true });
    remaining = Math.max(0, (totalCount ?? 0) - offset - total);
  } else {
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .or(NEEDS_ENRICHMENT_FILTER);
    remaining = count ?? 0;
  }

  return NextResponse.json({
    data: {
      total,
      geminiReturned,
      enriched,
      remaining,
      nextOffset: force ? offset + total : undefined,
      ...(firstUpdateError ? { firstUpdateError } : {}),
    },
  });
}
