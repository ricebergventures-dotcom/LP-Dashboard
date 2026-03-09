"use client";

import { useEffect, useCallback } from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
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
  "Other":             "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

async function fetchDescription(companyName: string): Promise<string> {
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

  const generateBrief = useCallback(async (deal: Deal) => {
    setBriefs((prev) => ({ ...prev, [deal.id]: { status: "loading" } }));
    try {
      const description = await fetchDescription(deal.company_name);
      setBriefs((prev) => ({ ...prev, [deal.id]: { status: "done", description } }));
    } catch (err) {
      setBriefs((prev) => ({
        ...prev,
        [deal.id]: { status: "error", message: err instanceof Error ? err.message : "Failed" },
      }));
    }
  }, []);

  // Auto-generate descriptions for all deals on mount, 3 at a time
  useEffect(() => {
    if (deals.length === 0) return;

    let cancelled = false;

    async function run() {
      for (let i = 0; i < deals.length; i += 3) {
        if (cancelled) break;
        const batch = deals.slice(i, i + 3);
        setBriefs((prev) => {
          const next = { ...prev };
          for (const d of batch) {
            if (!next[d.id] || next[d.id]?.status === "idle") {
              next[d.id] = { status: "loading" };
            }
          }
          return next;
        });
        await Promise.allSettled(
          batch.map(async (deal) => {
            try {
              const description = await fetchDescription(deal.company_name);
              if (!cancelled) {
                setBriefs((prev) => ({ ...prev, [deal.id]: { status: "done", description } }));
              }
            } catch (err) {
              if (!cancelled) {
                setBriefs((prev) => ({
                  ...prev,
                  [deal.id]: { status: "error", message: err instanceof Error ? err.message : "Failed" },
                }));
              }
            }
          })
        );
      }
    }

    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals.map((d) => d.id).join(",")]);

  if (deals.length === 0) return null;

  return (
    <Card>
      <div className="px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Investment Memo Pipeline
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {deals.length} {deals.length === 1 ? "company" : "companies"} under evaluation
        </p>
      </div>

      <div className="h-px bg-border" />

      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {deals.map((deal) => {
            const brief = briefs[deal.id] ?? { status: "idle" };
            const sectorCls = SECTOR_COLOR[deal.sector] ?? "text-slate-400 bg-slate-500/10 border-slate-500/25";

            return (
              <div key={deal.id} className="px-5 py-4 space-y-2">
                {/* Meta row: sector · geography · stage · date */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {deal.sector && (
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-[2px] ${sectorCls}`}>
                        {deal.sector}
                      </span>
                    )}
                    {deal.geography && deal.geography !== "Unknown" && (
                      <span className="text-[11px] text-muted-foreground">{deal.geography}</span>
                    )}
                    {deal.stage && (
                      <span className="text-[10px] text-muted-foreground/50">{deal.stage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {deal.date_added ? formatDate(deal.date_added) : "—"}
                    </span>
                    {brief.status === "done" && (
                      <button
                        onClick={() => void generateBrief(deal)}
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {(brief.status === "idle" || brief.status === "loading") && (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                )}
                {brief.status === "done" && (
                  <p className="text-[12px] text-foreground/80 leading-relaxed">
                    {brief.description}
                  </p>
                )}
                {brief.status === "error" && (
                  <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                    {deal.sector ? `Company in the ${deal.sector} space` : "Early-stage deep-tech company"}{deal.geography && deal.geography !== "Unknown" ? ` from ${deal.geography}` : ""}.
                  </p>
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
      </div>
      <div className="h-px bg-border" />
      <CardContent className="p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-border space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
