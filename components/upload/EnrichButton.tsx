"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { EnrichResult } from "@/app/api/enrich/route";
import type { ApiResponse } from "@/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: EnrichResult }
  | { kind: "error"; message: string };

export function EnrichButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleEnrich() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/enrich", { method: "POST" });
      const json = (await res.json()) as ApiResponse<EnrichResult>;

      if (!res.ok || json.error || !json.data) {
        setState({ kind: "error", message: json.error ?? `HTTP ${res.status}` });
        return;
      }

      setState({ kind: "success", result: json.data });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  }

  const isLoading = state.kind === "loading";

  return (
    <div className="space-y-3">
      <button
        onClick={handleEnrich}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
        {isLoading ? "Enriching…" : "Enrich with Gemini"}
      </button>

      {state.kind === "success" && (
        <p className="text-sm text-muted-foreground">
          Enriched{" "}
          <span className="text-foreground font-medium">{state.result.enriched}</span> deal
          {state.result.enriched !== 1 ? "s" : ""} with sector &amp; geography.
          {state.result.remaining > 0 && (
            <> <span className="text-foreground font-medium">{state.result.remaining}</span> still need enrichment — run again.</>
          )}
          {state.result.remaining === 0 && " All deals are enriched."}
        </p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </div>
  );
}
