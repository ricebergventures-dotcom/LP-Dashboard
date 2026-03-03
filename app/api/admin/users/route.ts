import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function makeClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

async function getAdminUser(supabase: ReturnType<typeof makeClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

// GET /api/admin/users — list all profiles
export async function GET() {
  const supabase = makeClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PATCH /api/admin/users — approve or update a user
export async function PATCH(request: Request) {
  const supabase = makeClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id: string;
    approved?: boolean;
    role?: string;
  };

  const update: Record<string, unknown> = {};
  if (body.approved !== undefined) update.approved = body.approved;
  if (body.role !== undefined) update.role = body.role;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
