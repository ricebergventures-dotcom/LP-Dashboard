import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  // List all profiles via service key
  let allProfiles: unknown = null;
  let serviceKeyPresent = !!serviceKey;
  if (serviceKey) {
    const service = createServiceClient(url, serviceKey);
    const { data, error } = await service.from("profiles").select("id, email, role, approved");
    allProfiles = error ? { error: error.message } : data;
  }

  if (!session) {
    return NextResponse.json({
      error: "no session",
      serviceKeyPresent,
      allProfiles,
    });
  }

  return NextResponse.json({
    userId: session.user.id,
    userEmail: session.user.email,
    serviceKeyPresent,
    allProfiles,
  });
}
