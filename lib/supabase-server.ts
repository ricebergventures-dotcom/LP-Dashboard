import { createClient } from "@supabase/supabase-js";

// Simple anon client for server-side reads.
// Auth is disabled — no cookies or session management needed.
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
