import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: "Missing env vars",
      url:  url  ? "SET" : "MISSING",
      key:  key  ? "SET" : "MISSING",
    });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("deals").select("id").limit(1);
    return NextResponse.json({ ok: !error, supabaseError: error?.message ?? null, rowCount: data?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, threw: String(e) });
  }
}
