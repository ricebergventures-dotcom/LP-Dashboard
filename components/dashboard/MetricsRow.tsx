"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/utils/formatters";
import type { DashboardMetrics } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

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
  index: number;
}

function StatCard({ label, value, valueClass, sub, subClass, trend, accentColor, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="bg-card border border-border p-5 space-y-2.5 cursor-default"
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
    </motion.div>
  );
}

export function MetricsRow({ metrics, totalDeals, sectorCount, geoCount }: MetricsRowProps) {
  const { dealsThisWeek, dealsThisMonth, activePipeline, weekOverWeekChange } = metrics;
  const wowUp = weekOverWeekChange > 0;
  const wowDown = weekOverWeekChange < 0;
  const wowFlat = weekOverWeekChange === 0;

  // Count-up animations staggered by card index
  const animTotal      = useCountUp(totalDeals,     800,  0);
  const animActive     = useCountUp(activePipeline, 800,  70);
  const animMonth      = useCountUp(dealsThisMonth, 800, 140);
  const animWeek       = useCountUp(dealsThisWeek,  800, 210);
  const animSectors    = useCountUp(sectorCount,    800, 280);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <StatCard index={0} label="Total Pipeline"      value={String(animTotal)}   accentColor="#5CD3D3" />
      <StatCard index={1} label="Active Deals"        value={String(animActive)} />
      <StatCard index={2} label="Inbound This Month"  value={String(animMonth)} />
      <StatCard
        index={3}
        label="This Week"
        value={String(animWeek)}
        valueClass={wowUp ? "text-emerald-500" : wowDown ? "text-red-400" : undefined}
        sub={
          wowFlat
            ? "no change vs last week"
            : `${wowUp ? "+" : ""}${formatPercent(weekOverWeekChange)} vs last week`
        }
        subClass={wowUp ? "text-emerald-500" : wowDown ? "text-red-400" : "text-muted-foreground"}
        trend={wowUp ? "up" : wowDown ? "down" : "flat"}
      />
      <StatCard index={4} label="Sectors Covered"    value={String(animSectors)} />
    </div>
  );
}

export function MetricsRowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card border border-border p-5 space-y-2.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
