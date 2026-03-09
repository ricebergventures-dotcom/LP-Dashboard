import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildEmailHtml(body: {
  name: string;
  email?: string;
  linkedin: string;
  firm?: string;
  description: string;
  your_name: string;
  your_email: string;
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
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:400;">New Investor / LP Referral</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Referred by ${body.your_name} &lt;<a href="mailto:${body.your_email}" style="color:#5CD3D3;">${body.your_email}</a>&gt;</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Name", body.name)}
        ${row("Email", body.email ? `<a href="mailto:${body.email}" style="color:#5CD3D3;">${body.email}</a>` : null)}
        ${row("LinkedIn", `<a href="${body.linkedin}" style="color:#5CD3D3;">${body.linkedin}</a>`)}
        ${row("Firm", body.firm)}
      </table>
      <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-left:3px solid #5CD3D3;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Why referring</p>
        <p style="margin:0;font-size:13px;color:#111;line-height:1.6;white-space:pre-wrap;">${body.description}</p>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eee;background:#fafafa;">
      <p style="margin:0;font-size:11px;color:#999;">Submitted via riceberg.vc/refer · Riceberg Ventures LP Dashboard</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      email?: string;
      linkedin: string;
      firm?: string;
      description: string;
      your_name: string;
      your_email: string;
    };

    if (!body.name || !body.linkedin || !body.description || !body.your_name || !body.your_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store in Supabase
    const { error: dbError } = await supabase.from("lp_referrals").insert({
      name:        body.name,
      email:       body.email || null,
      linkedin:    body.linkedin,
      firm:        body.firm || null,
      description: body.description,
      your_name:   body.your_name,
      your_email:  body.your_email,
    });

    if (dbError) throw new Error(dbError.message);

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    "Riceberg LP Referrals <onboarding@resend.dev>",
        to:      ["pitchdeckriceberg@gmail.com"],
        replyTo: body.your_email,
        subject: `New LP Referral: ${body.name}${body.firm ? ` · ${body.firm}` : ""}`,
        html:    buildEmailHtml(body),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
