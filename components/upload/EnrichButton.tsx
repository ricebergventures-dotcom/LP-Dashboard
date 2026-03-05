"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { EnrichResult } from "@/app/api/enrich/route";
import type { ApiResponse } from "@/types";

type State =
  | { kind: "idle" }
  | { kind: "loading"; enriched: number; remaining: number | null }
  | { kind: "success"; totalEnriched: number }
  | { kind: "error"; message: string; enrichedSoFar: number };

export function EnrichButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleEnrich() {
    setState({ kind: "loading", enriched: 0, remaining: null });
    let totalEnriched = 0;
    let prevRemaining: number | null = null;
    let stuckBatches = 0;

    while (true) {
      let json: ApiResponse<EnrichResult>;
      try {
        const res = await fetch("/api/enrich", { method: "POST" });
        json = (await res.json()) as ApiResponse<EnrichResult>;
        if (!res.ok || json.error || !json.data) {
          setState({
            kind: "error",
            message: json.error ?? `HTTP ${res.status}`,
            enrichedSoFar: totalEnriched,
          });
          return;
        }
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Unexpected error",
          enrichedSoFar: totalEnriched,
        });
        return;
      }

      const { enriched, remaining } = json.data;
      totalEnriched += enriched;

      if (remaining === 0) {
        setState({ kind: "success", totalEnriched });
        return;
      }

      // Stop if remaining count hasn't decreased for 3 consecutive batches
      // (some companies may be unclassifiable — don't loop forever)
      if (prevRemaining !== null && remaining >= prevRemaining) {
        stuckBatches++;
        if (stuckBatches >= 3) {
          setState({ kind: "success", totalEnriched });
          return;
        }
      } else {
        stuckBatches = 0;
      }
      prevRemaining = remaining;

      setState({ kind: "loading", enriched: totalEnriched, remaining });
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
        {isLoading ? "Enriching…" : "Enrich all companies"}
      </button>

      {state.kind === "loading" && (
        <p className="text-sm text-muted-foreground">
          {state.remaining !== null ? (
            <>
              Enriched <span className="text-foreground font-medium">{state.enriched}</span> so far
              {" · "}
              <span className="text-foreground font-medium">{state.remaining}</span> remaining…
            </>
          ) : (
            "Starting enrichment…"
          )}
        </p>
      )}

      {state.kind === "success" && (
        <p className="text-sm text-muted-foreground">
          Done —{" "}
          <span className="text-foreground font-medium">{state.totalEnriched}</span> deal
          {state.totalEnriched !== 1 ? "s" : ""} enriched with sector &amp; geography.
          Refresh the dashboard to see the updated charts.
        </p>
      )}

      {state.kind === "error" && (
        <div className="space-y-1">
          <p className="text-sm text-red-600">{state.message}</p>
          {state.enrichedSoFar > 0 && (
            <p className="text-xs text-muted-foreground">
              {state.enrichedSoFar} deals were enriched before the error.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
