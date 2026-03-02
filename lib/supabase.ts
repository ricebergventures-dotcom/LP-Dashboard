import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Browser-side client — safe to use in "use client" components.
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY automatically.
export function createClient() {
  return createClientComponentClient();
}
