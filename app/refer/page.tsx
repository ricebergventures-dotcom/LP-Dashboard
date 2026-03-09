"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function ReferInvestorPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name:        (form.elements.namedItem("name")        as HTMLInputElement).value,
      email:       (form.elements.namedItem("email")       as HTMLInputElement).value,
      linkedin:    (form.elements.namedItem("linkedin")    as HTMLInputElement).value,
      firm:        (form.elements.namedItem("firm")        as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
      your_name:   (form.elements.namedItem("your_name")   as HTMLInputElement).value,
      your_email:  (form.elements.namedItem("your_email")  as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/submit-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto">
            <span className="text-emerald-400 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold">Referral submitted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you — we&apos;ll review your referral and reach out if there&apos;s a mutual fit.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Riceberg Ventures
          </p>
          <h1 className="text-2xl font-light">Refer an Investor / LP</h1>
          <p className="text-sm text-muted-foreground">
            Know someone who should be in our network? Share their details and we&apos;ll take it from there.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* Investor details */}
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
              Investor / LP Details
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" required>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="LinkedIn Profile" required>
              <input
                name="linkedin"
                type="url"
                required
                placeholder="https://linkedin.com/in/janesmith"
                className={inputCls}
              />
            </Field>

            <Field label="Firm / Organisation">
              <input
                name="firm"
                type="text"
                placeholder="e.g. Sequoia, Family Office, Independent"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="h-px bg-border" />

          <Field label="Why are you referring them?" required>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="What makes them a great fit for Riceberg? What's their background, focus, or interest in deep tech?"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="h-px bg-border" />

          {/* Referrer */}
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
              Your Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your Name" required>
                <input
                  name="your_name"
                  type="text"
                  required
                  placeholder="Your name"
                  className={inputCls}
                />
              </Field>
              <Field label="Your Email" required>
                <input
                  name="your_email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {status === "error" && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full h-10 bg-[#5CD3D3] text-black text-sm font-medium hover:bg-[#5CD3D3]/90 disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? "Submitting…" : "Submit Referral"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputCls =
  "w-full bg-card border border-border text-sm px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#5CD3D3]/60 transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
        {required && <span className="text-[#5CD3D3] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
