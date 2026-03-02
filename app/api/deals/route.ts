import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";
import type { Deal, ApiResponse } from "@/types";

export async function GET(request: Request) {
  const supabase = createRouteClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const sector = searchParams.get("sector");
  const stage = searchParams.get("stage");
  const status = searchParams.get("status");

  let query = supabase
    .from("deals")
    .select("*")
    .order("date_added", { ascending: false })
    .limit(Math.min(limit, 200));

  if (sector) query = query.eq("sector", sector);
  if (stage) query = query.eq("stage", stage);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<Deal[]>>({ data: (data as Deal[]) ?? [] });
}
