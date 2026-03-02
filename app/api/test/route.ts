import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl     = process.env.DECILE_HUB_BASE_URL;
  const token       = process.env.DECILE_HUB_API_TOKEN;
  const pipelineId  = process.env.DECILE_HUB_PIPELINE_ID ?? "WnW1aLKE";

  const builtUrl = baseUrl
    ? `${baseUrl}/api/v1/pipeline_prospects?pipeline_id=${pipelineId}&page=0`
    : null;

  // Try a live fetch if env vars are present
  let fetchResult: unknown = null;
  if (builtUrl && token) {
    try {
      const res = await fetch(builtUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      const body = await res.text();
      fetchResult = { status: res.status, bodyPreview: body.slice(0, 300) };
    } catch (e) {
      fetchResult = { threw: String(e) };
    }
  }

  // Also check if Supabase anon reads work
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseResult: unknown = null;
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data, error, count } = await sb.from("deals").select("*", { count: "exact" }).order("date_added", { ascending: false }).limit(3);
      supabaseResult = { error: error?.message ?? null, rowCount: data?.length ?? 0, totalCount: count, sample: data?.slice(0,1) };
    } catch (e) {
      supabaseResult = { threw: String(e) };
    }
  }

  return NextResponse.json({
    DECILE_HUB_BASE_URL: baseUrl ?? "MISSING",
    DECILE_HUB_API_TOKEN: token ? "SET" : "MISSING",
    builtUrl,
    fetchResult,
    supabaseResult,
  });
}
