"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { formatDate } from "@/utils/formatters";
import type { Deal } from "@/types";
import type { CompanyInsights } from "@/app/api/insights/route";

interface MemoDealsTableProps {
  deals: Deal[];
}

type BriefState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; description: string }
  | { status: "error"; message: string };

const SECTOR_COLOR: Record<string, string> = {
  "Life Science":      "text-violet-400 bg-violet-500/10 border-violet-500/25",
  "Spacetech":         "text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
  "Future of Compute": "text-[#5CD3D3] bg-[#5CD3D3]/10 border-[#5CD3D3]/25",
  "Quantum":           "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/25",
  "Climate Tech":      "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  "Cybersecurity":     "text-red-400 bg-red-500/10 border-red-500/25",
  "Fintech":           "text-blue-400 bg-blue-500/10 border-blue-500/25",
};

async function fetchBrief(companyName: string): Promise<string> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: CompanyInsights; error?: string };
  if (json.error) throw new Error(json.error);
  return json.data?.description ?? "No description available.";
}

export function MemoDealsTable({ deals }: MemoDealsTableProps) {
  const [briefs, setBriefs] = useState<Record<string, BriefState>>({});
  const [generatingAll, setGeneratingAll] = useState(false);

  const generateBrief = useCallback(async (deal: Deal) => {
    setBriefs((prev) => ({ ...prev, [deal.id]: { status: "loading" } }));
    try {
      const description = await fetchBrief(deal.company_name);
      setBriefs((prev) => ({ ...prev, [deal.id]: { status: "done", description } }));
    } catch (err) {
      setBriefs((prev) => ({
        ...prev,
        [deal.id]: { status: "error", message: err instanceof Error ? err.message : "Failed" },
      }));
    }
  }, []);

  const generateAll = useCallback(async () => {
    setGeneratingAll(true);
    // Set all pending deals to loading
    const pending = deals.filter((d) => {
      const s = briefs[d.id];
      return !s || s.status === "idle" || s.status === "error";
    });
    setBriefs((prev) => {
      const next = { ...prev };
      for (const d of pending) next[d.id] = { status: "loading" };
      return next;
    });
    // Run 3 at a time to avoid rate limits
    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      await Promise.allSettled(
        batch.map(async (deal) => {
          try {
            const description = await fetchBrief(deal.company_name);
            setBriefs((prev) => ({ ...prev, [deal.id]: { status: "done", description } }));
          } catch (err) {
            setBriefs((prev) => ({
              ...prev,
              [deal.id]: { status: "error", message: err instanceof Error ? err.message : "Failed" },
            }));
          }
        })
      );
    }
    setGeneratingAll(false);
  }, [deals, briefs]);

  if (deals.length === 0) {
    return null;
  }

  const allDone = deals.every((d) => briefs[d.id]?.status === "done");

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Investment Memo Pipeline
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deals.length} {deals.length === 1 ? "company" : "companies"} under evaluation
          </p>
        </div>
        {!allDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void generateAll()}
            disabled={generatingAll}
            className="h-7 gap-1.5 text-xs"
          >
            {generatingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {generatingAll ? "Generating…" : "Generate All Briefs"}
          </Button>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Table */}
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {deals.map((deal) => {
            const brief = briefs[deal.id] ?? { status: "idle" };
            const sectorCls = SECTOR_COLOR[deal.sector] ?? "text-muted-foreground bg-muted/20 border-border";

            return (
              <div key={deal.id} className="px-5 py-4 space-y-2.5">
                {/* Row top: name + meta */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold">{deal.company_name}</span>
                    {deal.sector && (
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-[2px] ${sectorCls}`}>
                        {deal.sector}
                      </span>
                    )}
                    {deal.geography && deal.geography !== "Unknown" && (
                      <span className="text-[11px] text-muted-foreground">{deal.geography}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground/60">{deal.stage}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {deal.date_added ? formatDate(deal.date_added) : "—"}
                    </span>
                    {brief.status !== "done" && brief.status !== "loading" && (
                      <button
                        onClick={() => void generateBrief(deal)}
                        className="text-[11px] text-[#5CD3D3] hover:text-[#5CD3D3]/80 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Brief
                      </button>
                    )}
                    {brief.status === "done" && (
                      <button
                        onClick={() => void generateBrief(deal)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Brief */}
                {brief.status === "loading" && (
                  <div className="space-y-1.5 pl-0.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </div>
                )}
                {brief.status === "done" && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed pl-0.5">
                    {brief.description}
                  </p>
                )}
                {brief.status === "error" && (
                  <p className="text-[11px] text-destructive pl-0.5">{brief.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function MemoDealsTableSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-36" />
      </div>
      <div className="h-px bg-border" />
      <CardContent className="p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
