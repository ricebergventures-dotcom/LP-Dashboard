import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatPercent, formatCheckSize } from "@/utils/formatters";
import type { DashboardMetrics } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsRowProps {
  metrics: DashboardMetrics;
  totalDeals: number;
  sectorCount: number;
  geoCount: number;
}

interface StatCardProps {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
  trend?: "up" | "down" | "flat";
  accentColor?: string;
}

function StatCard({ label, value, valueClass, sub, subClass, trend, accentColor }: StatCardProps) {
  return (
    <div
      className="bg-card border border-border p-5 space-y-2.5"
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: 2 } : undefined}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
        {label}
      </p>
      <p className={`tabular text-[2rem] font-light leading-none ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />}
          {trend === "flat" && <Minus className="h-3 w-3 text-muted-foreground shrink-0" />}
          {sub && (
            <span className={`text-[11px] leading-none ${subClass ?? "text-muted-foreground"}`}>
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function MetricsRow({ metrics, totalDeals, sectorCount, geoCount }: MetricsRowProps) {
  const { dealsThisWeek, dealsThisMonth, activePipeline, weekOverWeekChange, totalDeployed } = metrics;
  const wowUp = weekOverWeekChange > 0;
  const wowDown = weekOverWeekChange < 0;
  const wowFlat = weekOverWeekChange === 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard
        label="Total Pipeline"
        value={formatCount(totalDeals)}
        accentColor="#5CD3D3"
      />
      <StatCard
        label="Active Deals"
        value={formatCount(activePipeline)}
      />
      <StatCard
        label="Inbound This Month"
        value={formatCount(dealsThisMonth)}
      />
      <StatCard
        label="This Week"
        value={formatCount(dealsThisWeek)}
        valueClass={wowUp ? "text-emerald-500" : wowDown ? "text-red-400" : undefined}
        sub={
          wowFlat
            ? "no change vs last week"
            : `${wowUp ? "+" : ""}${formatPercent(weekOverWeekChange)} vs last week`
        }
        subClass={wowUp ? "text-emerald-500" : wowDown ? "text-red-400" : "text-muted-foreground"}
        trend={wowUp ? "up" : wowDown ? "down" : "flat"}
      />
      <StatCard
        label="Sectors Covered"
        value={formatCount(sectorCount)}
      />
      <StatCard
        label="Capital Deployed"
        value={formatCheckSize(totalDeployed)}
      />
    </div>
  );
}

export function MetricsRowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border p-5 space-y-2.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
