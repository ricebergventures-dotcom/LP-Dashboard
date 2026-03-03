import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

// Simple anon client for server-side reads.
// `cache: "no-store"` prevents Next.js from caching Supabase fetch calls.
function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

export function createServerClient() {
  return makeClient();
}

export function createRouteClient() {
  return makeClient();
}

// Cookie-aware client for middleware — reads/writes session cookies so
// Supabase Auth works across server components and API routes.
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}
