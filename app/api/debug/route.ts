import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "no session", cookies: cookieStore.getAll().map(c => c.name) });
  }

  const tokenPreview = session.access_token?.substring(0, 30) + "...";

  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${session.user.id}&select=approved`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const profileBody = await profileRes.text();

  return NextResponse.json({
    userId: session.user.id,
    userEmail: session.user.email,
    tokenPreview,
    profileStatus: profileRes.status,
    profileBody,
  });
}
