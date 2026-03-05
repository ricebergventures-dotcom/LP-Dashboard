"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/utils/formatters";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { WeeklySummary } from "@/types";

interface WeeklySummaryPanelProps {
  summary: WeeklySummary | null;
}

export function WeeklySummaryPanel({ summary }: WeeklySummaryPanelProps) {
  const { isAdmin } = useAuth();
  const [current, setCurrent] = useState<WeeklySummary | null>(summary);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", { method: "POST" });
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error) errorMsg = json.error;
        } catch { /* empty body — keep the status-code message */ }
        throw new Error(errorMsg);
      }
      const json = (await res.json()) as { data: WeeklySummary };
      setCurrent(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="tabular text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Weekly Intelligence
        </p>
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
              aria-label="Refresh summary"
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
      <CardContent className="pt-4 pb-5">
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
          <p className="text-sm leading-7 text-foreground">{current.summary_text}</p>
        ) : isAdmin ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              No intelligence report for this week.
            </p>
            <Button
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="h-7 gap-1.5 text-xs"
            >
              <Sparkles className="h-3 w-3" />
              {generating ? "Generating…" : "Generate Now"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary available for this week.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function WeeklySummaryPanelSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="h-px bg-border" />
      <CardContent className="pt-4 pb-5 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
