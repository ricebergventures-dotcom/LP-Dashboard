// POST /api/sync  — manual trigger
// GET  /api/sync  — Vercel Cron trigger (requires Authorization: Bearer <CRON_SECRET>)
//
// Fetches new deals from Decile Hub since the last sync,
// upserts them into the deals table, and returns a summary of what changed.
//
// Prerequisite DB migration (run once in Supabase SQL editor):
//   ALTER TABLE deals
//     ADD CONSTRAINT deals_company_date_unique
//     UNIQUE (company_name, date_added);

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { fetchDealsFromDecileHub, mapDecileHubDeal, DecileHubError } from "@/lib/decile-hub";
import { enrichBatch } from "@/lib/enrichment";
import { chunkArray } from "@/utils/csv-parser";
import type { ApiResponse, WeeklySummary } from "@/types";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 50;

export interface SyncResult {
  fetched: number;
  inserted: number;
  skipped: number;
  enriched: number;
}

// Vercel Cron calls GET — verify the cron secret to prevent abuse.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

export async function POST(request: Request) {
  void request;
  return runSync();
}

async function runSync() {
  const supabase = createRouteClient();

  // ── Determine last-sync timestamp ─────────────────────────────────────────
  // Use the most recent weekly_summary's generated_at as the high-water mark.
  // If there are no summaries yet we fetch everything.
  const { data: latestSummary } = await supabase
    .from("weekly_summaries")
    .select("generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single<Pick<WeeklySummary, "generated_at">>();

  const since = latestSummary ? new Date(latestSummary.generated_at) : undefined;

  // ── Fetch from Decile Hub ─────────────────────────────────────────────────
  let rawDeals;
  try {
    rawDeals = await fetchDealsFromDecileHub(since);
  } catch (err) {
    if (err instanceof DecileHubError) {
      const status = err.status === 401 ? 401 : err.status === 429 ? 429 : 502;
      return NextResponse.json<ApiResponse<never>>(
        { error: err.message },
        { status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<ApiResponse<never>>(
      { error: `Decile Hub fetch failed: ${message}` },
      { status: 502 }
    );
  }

  const fetched = rawDeals.length;

  if (fetched === 0) {
    return NextResponse.json<ApiResponse<SyncResult>>({
      data: { fetched: 0, inserted: 0, skipped: 0 },
    });
  }

  // ── Map + upsert in chunks of 50 ─────────────────────────────────────────
  const mapped = rawDeals.map((raw) => mapDecileHubDeal(raw));

  // Use chunk size of 1 for first insert to surface any DB errors clearly
  const chunks = chunkArray(mapped, CHUNK_SIZE);
  let inserted = 0;
  let skipped = 0;
  let firstError: string | null = null;
  const insertedRows: { id: string; company_name: string }[] = [];

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("deals")
      .upsert(chunk, {
        onConflict: "company_name,date_added",
        ignoreDuplicates: true,
      })
      .select("id, company_name");

    if (error) {
      console.error("[sync] Supabase upsert error:", error.message);
      if (!firstError) firstError = error.message;
      skipped += chunk.length;
    } else {
      const upserted = data?.length ?? 0;
      inserted += upserted;
      skipped += chunk.length - upserted;
      if (data) insertedRows.push(...data);
    }
  }

  // ── Enrich newly inserted deals with sector + geography ───────────────────
  let enriched = 0;
  if (insertedRows.length > 0) {
    const enrichmentMap = await enrichBatch(insertedRows, 5);
    for (const [id, { sector, geography }] of enrichmentMap) {
      const { error: updateError } = await supabase
        .from("deals")
        .update({ sector, geography })
        .eq("id", id);
      if (!updateError) enriched++;
    }
  }

  return NextResponse.json<ApiResponse<SyncResult & { firstError?: string }>>({
    data: { fetched, inserted, skipped, enriched, ...(firstError ? { firstError } : {}) },
  });
}
