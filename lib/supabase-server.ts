import {
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Server Component client — use in RSC page.tsx / layout.tsx.
// Pass `cookies` as a function reference; the library calls it internally.
export function createServerClient() {
  return createServerComponentClient({ cookies });
}

// Route Handler client — use in app/api/**/route.ts.
// Unlike the server component client, this one can write cookies (required for
// token refresh inside API routes).
export function createRouteClient() {
  return createRouteHandlerClient({ cookies });
}
