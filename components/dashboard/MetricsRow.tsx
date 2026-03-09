"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/types";
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
  accentColor?: string;
  index: number;
}

function StatCard({ label, value, accentColor, index }: StatCardProps) {
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
      <p className="tabular text-[2rem] font-light leading-none text-foreground">
        {value}
      </p>
    </motion.div>
  );
}

export function MetricsRow({ metrics, totalDeals, sectorCount, geoCount }: MetricsRowProps) {
  const { dealsThisMonth, activePipeline } = metrics;

  const animTotal   = useCountUp(totalDeals,     800,   0);
  const animActive  = useCountUp(activePipeline, 800,  70);
  const animMonth   = useCountUp(dealsThisMonth, 800, 140);
  const animGeos    = useCountUp(geoCount,       800, 210);
  const animSectors = useCountUp(sectorCount,    800, 280);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <StatCard index={0} label="Total Pipeline"       value={String(animTotal)}   accentColor="#5CD3D3" />
      <StatCard index={1} label="Active Deals"         value={String(animActive)} />
      <StatCard index={2} label="Inbound This Month"   value={String(animMonth)} />
      <StatCard index={3} label="Geographic Coverage"  value={String(animGeos)} />
      <StatCard index={4} label="Sectors Covered"      value={String(animSectors)} />
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
