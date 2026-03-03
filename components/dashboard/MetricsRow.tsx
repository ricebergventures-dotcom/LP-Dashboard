import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatPercent, formatCheckSize } from "@/utils/formatters";
import type { DashboardMetrics } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsRowProps {
  metrics: DashboardMetrics;
}

export function MetricsRow({ metrics }: MetricsRowProps) {
  const {
    dealsThisWeek,
    dealsThisMonth,
    activePipeline,
    weekOverWeekChange,
    totalDeployed,
  } = metrics;

  const wowPositive = weekOverWeekChange > 0;
  const wowNegative = weekOverWeekChange < 0;

  return (
    <div className="flex border border-border divide-x divide-border">
      <MetricCell title="Inbound This Week" value={formatCount(dealsThisWeek)} />
      <MetricCell title="Inbound This Month" value={formatCount(dealsThisMonth)} />
      <MetricCell title="Active Pipeline" value={formatCount(activePipeline)} />
      <MetricCell
        title="Week-over-Week"
        value={formatPercent(weekOverWeekChange)}
        valueClass={
          wowPositive ? "text-green-600" : wowNegative ? "text-red-500" : "text-muted-foreground"
        }
        trend={wowPositive ? "up" : wowNegative ? "down" : "flat"}
      />
      <MetricCell title="Total Deployed" value={formatCheckSize(totalDeployed)} />
    </div>
  );
}

interface MetricCellProps {
  title: string;
  value: string;
  valueClass?: string;
  trend?: "up" | "down" | "flat";
}

function MetricCell({ title, value, valueClass, trend }: MetricCellProps) {
  return (
    <div className="flex-1 px-6 py-5">
      <p className="tabular text-[10px] uppercase tracking-[0.1em] text-muted-foreground mb-3">
        {title}
      </p>
      <p className={`tabular text-5xl font-light leading-none ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {trend === "flat" && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span
            className={`text-[11px] ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {trend === "flat" ? "no change" : "vs last week"}
          </span>
        </div>
      )}
    </div>
  );
}

export function MetricsRowSkeleton() {
  return (
    <div className="flex border border-border divide-x divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-1 px-6 py-5">
          <Skeleton className="h-3 w-28 mb-3" />
          <Skeleton className="h-12 w-20" />
        </div>
      ))}
    </div>
  );
}
