"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Loader2, Copy, Check, RefreshCw, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreview {
  id: string;
  url: string;
  name: string;
}

type GenStatus = "idle" | "loading" | "done" | "error";

function renderPost(text: string) {
  // Split into paragraphs, highlight hashtags within each
  return text.split(/\n+/).map((para, i) => {
    if (!para.trim()) return null;
    const parts = para.split(/(#\w+)/g);
    return (
      <p key={i} className="leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith("#") ? (
            <span key={j} className="text-[#5CD3D3] font-medium">{part}</span>
          ) : (
            part
          )
        )}
      </p>
    );
  });
}

export function EventPostCreator() {
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [takeaways, setTakeaways]   = useState("");
  const [people, setPeople]         = useState("");
  const [images, setImages]         = useState<ImagePreview[]>([]);
  const [status, setStatus]         = useState<GenStatus>("idle");
  const [post, setPost]             = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [copied, setCopied]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const readers: Promise<ImagePreview>[] = Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `${file.name}-${Date.now()}`,
              url: reader.result as string,
              name: file.name,
            });
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((previews) =>
      setImages((prev) => [...prev, ...previews])
    );
  }, []);

  const removeImage = (id: string) =>
    setImages((prev) => prev.filter((img) => img.id !== id));

  const generate = useCallback(async () => {
    if (!title.trim() || !description.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    setPost("");

    try {
      const res = await fetch("/api/generate-event-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, takeaways, people }),
      });
      const json = (await res.json()) as { post?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPost(json.post ?? "");
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate");
      setStatus("error");
    }
  }, [title, description, takeaways, people]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Left: Form ── */}
      <div className="space-y-5">
        <Field label="Event Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Web Summit 2025"
            className={inputCls}
          />
        </Field>

        <Field label="Event Description" required hint="What happened? What was the context?">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Attended a two-day conference on AI and emerging tech. Great panels on the future of foundation models and meet investors from across Europe…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Key Takeaways" hint="Optional — specific insights worth sharing">
          <textarea
            value={takeaways}
            onChange={(e) => setTakeaways(e.target.value)}
            rows={3}
            placeholder="e.g. Open-source models are catching up fast. Regulation is coming but slower than expected."
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="People Met / Sessions Attended" hint="Optional — names, panels, or companies">
          <input
            type="text"
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            placeholder="e.g. Sarah from Sequoia, the AI regulation panel, team from Mistral"
            className={inputCls}
          />
        </Field>

        {/* Photo upload */}
        <Field label="Photos" hint="Optional — shown as preview only">
          <div
            role="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleImages(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-[2px] py-6 text-muted-foreground hover:border-[#5CD3D3]/40 hover:text-[#5CD3D3]/60 transition-colors cursor-pointer"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px]">Click or drag photos here</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImages(e.target.files)}
          />
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="relative group h-16 w-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover border border-border rounded-[2px]"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        {status === "error" && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}

        <Button
          onClick={() => void generate()}
          disabled={!canGenerate || status === "loading"}
          className="w-full h-10 bg-[#5CD3D3] text-black hover:bg-[#5CD3D3]/90 disabled:opacity-40 font-medium gap-2"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {status === "loading" ? "Generating…" : "Generate LinkedIn Post"}
        </Button>
      </div>

      {/* ── Right: Output ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Generated Post
          </p>
          {status === "done" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => void generate()}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
              <button
                onClick={() => void copyToClipboard()}
                className="flex items-center gap-1 text-[11px] text-[#5CD3D3] hover:text-[#5CD3D3]/80 transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <div className="min-h-[360px] border border-border bg-card p-5 rounded-[2px]">
          {status === "idle" && (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <p className="text-[12px] text-muted-foreground/40 text-center">
                Fill in the event details and click<br />
                Generate LinkedIn Post
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[12px]">Writing your post…</span>
            </div>
          )}

          {status === "done" && post && (
            <div className="space-y-3 text-[13px] text-foreground">
              {/* LinkedIn-style header */}
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <div className="h-8 w-8 rounded-full bg-[#5CD3D3]/10 border border-[#5CD3D3]/25 flex items-center justify-center text-[10px] font-bold text-[#5CD3D3]">
                  YO
                </div>
                <div>
                  <p className="text-[12px] font-medium leading-none">You</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Just now · 🌐</p>
                </div>
              </div>
              <div className="space-y-2.5 text-[13px] leading-relaxed">
                {renderPost(post)}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <p className="text-[12px] text-destructive text-center">{errorMsg}</p>
            </div>
          )}
        </div>

        {status === "done" && (
          <Button
            variant="outline"
            onClick={() => void copyToClipboard()}
            className="w-full h-9 gap-2 text-sm"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied to clipboard!" : "Copy to Clipboard"}
          </Button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-card border border-border text-sm px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#5CD3D3]/60 transition-colors rounded-[2px]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
          {required && <span className="text-[#5CD3D3] ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-[10px] text-muted-foreground/50">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
