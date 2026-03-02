import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function makeCookieHandlers() {
  const store = cookies();
  return {
    getAll() {
      return store.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          store.set(name, value, options as Parameters<typeof store.set>[2])
        );
      } catch {
        // In Server Components cookies are read-only — this is expected.
      }
    },
  };
}

// Server Component client — use in RSC page.tsx / layout.tsx.
export function createServerClient() {
  return createSSRClient(url(), key(), { cookies: makeCookieHandlers() });
}

// Route Handler client — use in app/api/**/route.ts.
export function createRouteClient() {
  return createSSRClient(url(), key(), { cookies: makeCookieHandlers() });
}
