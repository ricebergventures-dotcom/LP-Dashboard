import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import { chunkArray } from "@/utils/csv-parser";
import type { CsvDealRow, ImportResult, ApiResponse, Profile } from "@/types";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 50;

export async function POST(request: Request) {
  const supabase = createRouteClient();

  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Role check — admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Pick<Profile, "role">>();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Forbidden — admin access required" },
      { status: 403 }
    );
  }

  // Parse body
  let rows: CsvDealRow[];
  try {
    const body = (await request.json()) as { rows?: CsvDealRow[] };
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "No valid rows provided" },
        { status: 400 }
      );
    }
    rows = body.rows;
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Batch insert in chunks of 50
  const chunks = chunkArray(rows, CHUNK_SIZE);
  const result: ImportResult = { success: 0, errors: [] };

  for (const chunk of chunks) {
    const inserts = chunk.map((row) => ({
      company_name: row.company_name,
      sector: row.sector,
      stage: row.stage,
      geography: row.geography,
      status: row.status,
      notes: row.notes ?? null,
      date_added: row.date_added ?? new Date().toISOString().slice(0, 10),
      source: "CSV Import",
      created_by: user.id,
    }));

    const { error } = await supabase.from("deals").insert(inserts);
    if (error) {
      // Record which rows in this chunk failed
      chunk.forEach((_, i) => {
        const globalRow = result.success + result.errors.length + i + 1;
        result.errors.push({ row: globalRow, message: error.message });
      });
    } else {
      result.success += chunk.length;
    }
  }

  return NextResponse.json<ApiResponse<ImportResult>>({ data: result });
}
