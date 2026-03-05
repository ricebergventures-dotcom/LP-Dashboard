// POST /api/sync  — manual trigger
// GET  /api/sync  — Vercel Cron trigger (requires Authorization: Bearer <CRON_SECRET>)
//
// Always fetches the complete prospect list from Decile Hub and upserts into
// the deals table. On conflict (decile_hub_id):
//   - stage and status are updated to reflect any Decile Hub changes
//   - sector and geography are preserved if already enriched
//
// Prerequisite DB migration (run once in Supabase SQL editor):
//   ALTER TABLE deals ADD COLUMN IF NOT EXISTS decile_hub_id integer;
//   ALTER TABLE deals ADD CONSTRAINT deals_decile_hub_id_unique UNIQUE (decile_hub_id);

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { fetchDealsFromDecileHub, mapDecileHubDeal, DecileHubError } from "@/lib/decile-hub";
import { enrichBatch } from "@/lib/enrichment";
import { chunkArray } from "@/utils/csv-parser";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 50;

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
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

  // ── Fetch existing deals to preserve enriched sector / geography ──────────
  const { data: existingDeals } = await supabase
    .from("deals")
    .select("company_name, date_added, decile_hub_id, sector, geography");

  // Index by Decile Hub prospect ID (primary) and by name|date (legacy fallback)
  const existingByHubId = new Map<number, { sector: string; geography: string }>();
  const existingByKey = new Map<string, { sector: string; geography: string }>();
  for (const deal of existingDeals ?? []) {
    const enrichment = { sector: deal.sector ?? "", geography: deal.geography ?? "" };
    if (deal.decile_hub_id) existingByHubId.set(deal.decile_hub_id as number, enrichment);
    existingByKey.set(`${deal.company_name}|${deal.date_added}`, enrichment);
  }

  // ── Fetch all prospects from Decile Hub (full sync, no date filter) ───────
  let rawDeals;
  try {
    rawDeals = await fetchDealsFromDecileHub();
  } catch (err) {
    if (err instanceof DecileHubError) {
      const status = err.status === 401 ? 401 : err.status === 429 ? 429 : 502;
      return NextResponse.json<ApiResponse<never>>({ error: err.message }, { status });
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
      data: { fetched: 0, inserted: 0, updated: 0, enriched: 0 },
    });
  }

  // ── Map + merge existing enrichment ──────────────────────────────────────
  const mapped = rawDeals.map((raw) => {
    const deal = mapDecileHubDeal(raw);
    // Look up by Decile Hub ID first; fall back to name|date for legacy rows
    const existing =
      existingByHubId.get(raw.id) ??
      existingByKey.get(`${deal.company_name}|${deal.date_added}`);
    return {
      ...deal,
      sector: existing?.sector || deal.sector,
      geography: existing?.geography || deal.geography,
    };
  });

  // Track which rows are genuinely new (no existing Decile Hub ID match)
  const newHubIds = new Set(
    mapped
      .filter((d) => d.decile_hub_id !== null && !existingByHubId.has(d.decile_hub_id!))
      .map((d) => d.decile_hub_id!)
  );

  // ── Upsert in chunks on decile_hub_id ────────────────────────────────────
  const chunks = chunkArray(mapped, CHUNK_SIZE);
  let inserted = 0;
  let updated = 0;
  let firstError: string | null = null;
  const upsertedRows: { id: string; company_name: string; date_added: string; decile_hub_id: number | null; sector: string }[] = [];

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("deals")
      .upsert(chunk, {
        onConflict: "decile_hub_id",
        ignoreDuplicates: false,
      })
      .select("id, company_name, date_added, decile_hub_id, sector");

    if (error) {
      console.error("[sync] Supabase upsert error:", error.message);
      if (!firstError) firstError = error.message;
    } else {
      for (const row of data ?? []) {
        upsertedRows.push(row);
        if (row.decile_hub_id !== null && newHubIds.has(row.decile_hub_id as number)) {
          inserted++;
        } else {
          updated++;
        }
      }
    }
  }

  // ── Enrich newly inserted deals that have no sector yet ───────────────────
  const toEnrich = upsertedRows
    .filter((r) => r.decile_hub_id !== null && newHubIds.has(r.decile_hub_id as number) && !r.sector)
    .map((r) => ({ id: r.id, company_name: r.company_name }));

  let enriched = 0;
  if (toEnrich.length > 0) {
    const enrichmentMap = await enrichBatch(toEnrich, 5);
    for (const [id, { sector, geography }] of Array.from(enrichmentMap.entries())) {
      const { error: updateError } = await supabase
        .from("deals")
        .update({ sector, geography })
        .eq("id", id);
      if (!updateError) enriched++;
    }
  }

  return NextResponse.json<ApiResponse<SyncResult & { firstError?: string }>>({
    data: { fetched, inserted, updated, enriched, ...(firstError ? { firstError } : {}) },
  });
}
