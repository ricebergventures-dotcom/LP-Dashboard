import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }),
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Check approval + role via raw REST fetch using the user's access token
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=approved,role`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const profiles = (await profileRes.json()) as { approved: boolean; role: string }[];
    const profile = profiles[0];
    const approved = profile?.approved === true;

    if (!approved) {
      return NextResponse.redirect(new URL("/auth/pending", request.url));
    }

    // Admin-only routes — redirect viewers to the dashboard root
    const isAdmin = profile?.role === "admin";
    const adminOnlyPaths = ["/dashboard/upload", "/dashboard/admin"];
    if (!isAdmin && adminOnlyPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Approved logged-in user hitting auth pages → redirect to dashboard
  if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) {
    if (session) {
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=approved`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const profiles = (await profileRes.json()) as { approved: boolean }[];
      if (profiles[0]?.approved === true) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/auth/signup"],
};
