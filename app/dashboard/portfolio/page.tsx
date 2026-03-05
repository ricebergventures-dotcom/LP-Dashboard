import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { SectorBarChart, SectorBarChartSkeleton } from "@/components/dashboard/SectorBarChart";
import { StageDonutChart, StageDonutChartSkeleton } from "@/components/dashboard/StageDonutChart";
import { GeographyBarChart, GeographyBarChartSkeleton } from "@/components/dashboard/GeographyBarChart";
import { InboundTrendChart, InboundTrendChartSkeleton } from "@/components/dashboard/InboundTrendChart";
import {
  computeSectorCounts,
  computeStageCounts,
  computeGeographyCounts,
  computeMonthlyInbound,
} from "@/utils/aggregations";
import type { Deal } from "@/types";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1 p-4 border border-border">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

async function PipelineContent() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("deals")
    .select("*")
    .order("date_added", { ascending: false });

  const deals = (data as Deal[]) ?? [];

  const sectors = computeSectorCounts(deals);
  const stages = computeStageCounts(deals);
  const geographies = computeGeographyCounts(deals);
  const monthly = computeMonthlyInbound(deals);

  const total = deals.length;
  const active = deals.filter((d) => d.status === "active").length;
  const sectorCount = new Set(deals.map((d) => d.sector).filter(Boolean)).size;
  const geoCount = new Set(deals.map((d) => d.geography).filter(Boolean)).size;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Pipeline" />
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-b border-border pb-6">
            <StatCard label="Total Deals" value={total} />
            <StatCard label="Active Pipeline" value={active} />
            <StatCard label="Sectors" value={sectorCount} />
            <StatCard label="Geographies" value={geoCount} />
          </div>

          {/* Monthly inbound trend */}
          <InboundTrendChart data={monthly} />

          {/* Sector + Stage side by side */}
          <div className="flex gap-5 items-start">
            <SectorBarChart data={sectors} />
            <StageDonutChart data={stages} />
          </div>

          {/* Geography */}
          <GeographyBarChart data={geographies} />
        </div>
      </div>
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Pipeline" />
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-b border-border pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 border border-border animate-pulse bg-muted/30" />
            ))}
          </div>
          <InboundTrendChartSkeleton />
          <div className="flex gap-5 items-start">
            <SectorBarChartSkeleton />
            <StageDonutChartSkeleton />
          </div>
          <GeographyBarChartSkeleton />
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <PipelineContent />
    </Suspense>
  );
}
