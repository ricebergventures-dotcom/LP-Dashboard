"use client";

import { useState } from "react";
import Image from "next/image";

const SECTORS = [
  "Life Science",
  "Spacetech",
  "Future of Compute",
  "Quantum",
  "Climate Tech",
  "Cybersecurity",
  "Fintech",
  "Other",
];

type Status = "idle" | "loading" | "success" | "error";

export default function SubmitDealPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      company_name:   (form.elements.namedItem("company_name")   as HTMLInputElement).value,
      contact_name:   (form.elements.namedItem("contact_name")   as HTMLInputElement).value,
      contact_email:  (form.elements.namedItem("contact_email")  as HTMLInputElement).value,
      website:        (form.elements.namedItem("website")        as HTMLInputElement).value,
      sector:         (form.elements.namedItem("sector")         as HTMLSelectElement).value,
      description:    (form.elements.namedItem("description")    as HTMLTextAreaElement).value,
      pitch_deck_url: (form.elements.namedItem("pitch_deck_url") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/submit-deal", {
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

  const fundName = process.env.NEXT_PUBLIC_FUND_NAME ?? "Riceberg Ventures";

  if (status === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto">
            <span className="text-emerald-400 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold">Deal submitted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you — we&apos;ll review your submission and be in touch if there&apos;s a fit.
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
            {fundName}
          </p>
          <h1 className="text-2xl font-light">Submit a Deal</h1>
          <p className="text-sm text-muted-foreground">
            Share a company you think we should look at. Include a pitch deck link or a brief description.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* Company + Contact */}
          <div className="space-y-3">
            <Field label="Company Name" required>
              <input
                name="company_name"
                type="text"
                required
                placeholder="Acme Inc."
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Your Name" required>
                <input
                  name="contact_name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  className={inputCls}
                />
              </Field>
              <Field label="Your Email" required>
                <input
                  name="contact_email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Website">
                <input
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Sector">
                <select name="sector" className={inputCls}>
                  <option value="">Select sector</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Description */}
          <Field label="Description" required>
            <textarea
              name="description"
              required
              rows={5}
              placeholder="What does the company do? What problem are they solving? What's the traction or key insight?"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Pitch deck */}
          <Field label="Pitch Deck Link">
            <input
              name="pitch_deck_url"
              type="url"
              placeholder="https://docsend.com/..."
              className={inputCls}
            />
          </Field>

          {status === "error" && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full h-10 bg-[#5CD3D3] text-black text-sm font-medium hover:bg-[#5CD3D3]/90 disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? "Submitting…" : "Submit Deal"}
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
