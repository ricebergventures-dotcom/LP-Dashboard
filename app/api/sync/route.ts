// POST /api/sync  — manual trigger
// GET  /api/sync  — Vercel Cron trigger (requires Authorization: Bearer <CRON_SECRET>)
//
// Always fetches the complete prospect list from Decile Hub and upserts into
// the deals table. On conflict (company_name + date_added):
//   - stage and status are updated to reflect any Decile Hub changes
//   - sector and geography are preserved if already enriched
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
  // We do this before the Decile Hub fetch so we can merge enrichment data
  // into the upsert payload — preventing sector/geography from being blanked out.
  const { data: existingDeals } = await supabase
    .from("deals")
    .select("company_name, date_added, sector, geography");

  // Map: "company_name|date_added" → { sector, geography }
  const existingMap = new Map<string, { sector: string; geography: string }>();
  for (const deal of existingDeals ?? []) {
    existingMap.set(`${deal.company_name}|${deal.date_added}`, {
      sector: deal.sector ?? "",
      geography: deal.geography ?? "",
    });
  }

  // ── Fetch all prospects from Decile Hub (full sync, no date filter) ───────
  let rawDeals;
  try {
    rawDeals = await fetchDealsFromDecileHub();
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
      data: { fetched: 0, inserted: 0, updated: 0, enriched: 0 },
    });
  }

  // ── Map + merge existing enrichment ──────────────────────────────────────
  const mapped = rawDeals.map((raw) => {
    const deal = mapDecileHubDeal(raw);
    const key = `${deal.company_name}|${deal.date_added}`;
    const existing = existingMap.get(key);
    return {
      ...deal,
      // Preserve already-enriched sector/geography rather than blanking them out
      sector: existing?.sector || deal.sector,
      geography: existing?.geography || deal.geography,
    };
  });

  // Track which rows are genuinely new (not already in the DB)
  const newKeys = new Set(
    mapped
      .filter((d) => !existingMap.has(`${d.company_name}|${d.date_added}`))
      .map((d) => `${d.company_name}|${d.date_added}`)
  );

  // ── Upsert in chunks ──────────────────────────────────────────────────────
  // ignoreDuplicates: false → stage + status are updated for existing rows
  const chunks = chunkArray(mapped, CHUNK_SIZE);
  let inserted = 0;
  let updated = 0;
  let firstError: string | null = null;
  const upsertedRows: { id: string; company_name: string; date_added: string; sector: string }[] = [];

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("deals")
      .upsert(chunk, {
        onConflict: "company_name,date_added",
        ignoreDuplicates: false,
      })
      .select("id, company_name, date_added, sector");

    if (error) {
      console.error("[sync] Supabase upsert error:", error.message);
      if (!firstError) firstError = error.message;
    } else {
      for (const row of data ?? []) {
        upsertedRows.push(row);
        if (newKeys.has(`${row.company_name}|${row.date_added}`)) {
          inserted++;
        } else {
          updated++;
        }
      }
    }
  }

  // ── Enrich newly inserted deals that have no sector yet ───────────────────
  const toEnrich = upsertedRows
    .filter((r) => newKeys.has(`${r.company_name}|${r.date_added}`) && !r.sector)
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
