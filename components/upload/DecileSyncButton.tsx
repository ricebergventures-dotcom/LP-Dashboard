"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { SyncResult } from "@/app/api/sync/route";
import type { ApiResponse } from "@/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: SyncResult }
  | { kind: "error"; message: string };

export function DecileSyncButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSync() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = (await res.json()) as ApiResponse<SyncResult>;

      if (!res.ok || json.error) {
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
        onClick={handleSync}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Syncing…" : "Sync from Decile Hub"}
      </button>

      {state.kind === "success" && (
        <p className="text-sm text-muted-foreground">
          Sync complete —{" "}
          <span className="text-foreground font-medium">{state.result.inserted}</span> new deal
          {state.result.inserted !== 1 ? "s" : ""} added,{" "}
          <span className="text-foreground font-medium">{state.result.skipped}</span> skipped
          {" "}(already imported), {state.result.fetched} fetched total.
        </p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </div>
  );
}
