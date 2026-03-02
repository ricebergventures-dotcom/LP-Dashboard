// Minimal Supabase type shim — replace with the generated output of
// `npx supabase gen types typescript --project-id <id>` for full type safety.
export type Database = {
  public: {
    Tables: {
      deals: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      weekly_summaries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Enums: Record<string, string>;
  };
};
