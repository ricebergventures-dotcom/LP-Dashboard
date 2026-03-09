import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildEmailHtml(body: {
  company_name: string;
  contact_name: string;
  contact_email: string;
  website?: string;
  sector?: string;
  description: string;
  pitch_deck_url?: string;
}): string {
  const row = (label: string, value?: string | null) =>
    value
      ? `<tr>
          <td style="padding:8px 12px;font-weight:600;color:#555;white-space:nowrap;vertical-align:top;font-size:13px;">${label}</td>
          <td style="padding:8px 12px;color:#111;font-size:13px;">${value}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#0A0C12;padding:24px 28px;">
      <p style="margin:0;color:#5CD3D3;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-family:monospace;">Riceberg Ventures</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:400;">New Deal Submission</h1>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row("Company", body.company_name)}
        ${row("Sector", body.sector)}
        ${row("Website", body.website ? `<a href="${body.website}" style="color:#5CD3D3;">${body.website}</a>` : null)}
        ${row("Contact", body.contact_name)}
        ${row("Email", `<a href="mailto:${body.contact_email}" style="color:#5CD3D3;">${body.contact_email}</a>`)}
        ${row("Pitch Deck", body.pitch_deck_url ? `<a href="${body.pitch_deck_url}" style="color:#5CD3D3;">View deck</a>` : null)}
      </table>
      <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-left:3px solid #5CD3D3;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Description</p>
        <p style="margin:0;font-size:13px;color:#111;line-height:1.6;white-space:pre-wrap;">${body.description}</p>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eee;background:#fafafa;">
      <p style="margin:0;font-size:11px;color:#999;">Submitted via riceberg.vc/submit · Riceberg Ventures LP Dashboard</p>
    </div>
  </div>
</body>
</html>`;
}

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

    // 1. Store in Supabase
    const { error: dbError } = await supabase.from("deal_submissions").insert({
      company_name:   body.company_name,
      contact_name:   body.contact_name,
      contact_email:  body.contact_email,
      website:        body.website || null,
      sector:         body.sector || null,
      description:    body.description,
      pitch_deck_url: body.pitch_deck_url || null,
    });

    if (dbError) throw new Error(dbError.message);

    // 2. Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:     "Riceberg Deal Flow <onboarding@resend.dev>",
        to:       ["pitchdeckriceberg@gmail.com"],
        replyTo:  body.contact_email,
        subject:  `New Deal: ${body.company_name}${body.sector ? ` · ${body.sector}` : ""}`,
        html:     buildEmailHtml(body),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
