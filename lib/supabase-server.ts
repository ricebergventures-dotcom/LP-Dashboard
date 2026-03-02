import { createClient } from "@supabase/supabase-js";

// Simple anon client for server-side reads.
// Auth is disabled — no cookies or session management needed.
function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createServerClient() {
  return makeClient();
}

export function createRouteClient() {
  return makeClient();
}
