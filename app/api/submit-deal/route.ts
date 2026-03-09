import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      company_name: string;
      contact_name: string;
      contact_email: string;
      website?: string;
      sector?: string;
      description: string;
      pitch_deck_url?: string;
    };

    if (!body.company_name || !body.contact_email || !body.description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("deal_submissions").insert({
      company_name:   body.company_name,
      contact_name:   body.contact_name,
      contact_email:  body.contact_email,
      website:        body.website || null,
      sector:         body.sector || null,
      description:    body.description,
      pitch_deck_url: body.pitch_deck_url || null,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
