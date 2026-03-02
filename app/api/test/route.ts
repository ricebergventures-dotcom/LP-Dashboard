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

  return NextResponse.json({
    DECILE_HUB_BASE_URL: baseUrl ?? "MISSING",
    DECILE_HUB_API_TOKEN: token ? "SET" : "MISSING",
    builtUrl,
    fetchResult,
  });
}
