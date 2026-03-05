"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/utils/formatters";
import { RefreshCw, Sparkles, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { MonthlySummary } from "@/types";

interface MonthlySummaryPanelProps {
  summary: MonthlySummary | null;
}

export function MonthlySummaryPanel({ summary }: MonthlySummaryPanelProps) {
  const { isAdmin } = useAuth();
  const [current, setCurrent] = useState<MonthlySummary | null>(summary);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly-summary", { method: "POST" });
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error) errorMsg = json.error;
        } catch { /* keep status-code message */ }
        throw new Error(errorMsg);
      }
      const json = (await res.json()) as { data: MonthlySummary };
      setCurrent(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  // Top sectors sorted by count
  const topSectors = current
    ? Object.entries(current.sector_breakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
    : [];

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-[#5CD3D3]" />
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Monthly Intelligence
            {current && (
              <span className="ml-2 normal-case tracking-normal text-foreground/60">
                — {current.month_label}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {current && (
            <span className="tabular text-[11px] text-muted-foreground">
              Generated {formatDateTime(current.generated_at)}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              aria-label="Refresh monthly summary"
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Body */}
      <CardContent className="pt-4 pb-5 space-y-4">
        {error ? (
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="shrink-0 h-7 text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        ) : current ? (
          <>
            {/* Sector chips */}
            {topSectors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topSectors.map(([sector, count]) => (
                  <span
                    key={sector}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] border border-border bg-muted/20 text-foreground rounded-[3px]"
                  >
                    <span className="tabular font-medium text-[#5CD3D3]">{count}</span>
                    <span className="text-muted-foreground">{sector}</span>
                  </span>
                ))}
                <span className="inline-flex items-center px-2.5 py-1 text-[11px] text-muted-foreground">
                  {current.deal_count} total
                </span>
              </div>
            )}

            {/* AI summary */}
            <p className="text-sm leading-7 text-foreground">{current.summary_text}</p>
          </>
        ) : isAdmin ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              No monthly report generated yet. Generate one to see a full breakdown of last month&apos;s deal flow by sector, stage, and geography.
            </p>
            <Button
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="h-7 gap-1.5 text-xs"
            >
              <Sparkles className="h-3 w-3" />
              {generating ? "Generating…" : "Generate Monthly Report"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No monthly summary available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlySummaryPanelSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="h-px bg-border" />
      <CardContent className="pt-4 pb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-[3px]" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
