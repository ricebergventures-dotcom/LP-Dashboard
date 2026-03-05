import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { MetricsRow, MetricsRowSkeleton } from "@/components/dashboard/MetricsRow";
import { SectorBarChart, SectorBarChartSkeleton } from "@/components/dashboard/SectorBarChart";
import { StageDonutChart, StageDonutChartSkeleton } from "@/components/dashboard/StageDonutChart";
import { GeographyBarChart, GeographyBarChartSkeleton } from "@/components/dashboard/GeographyBarChart";
import { InboundTrendChart, InboundTrendChartSkeleton } from "@/components/dashboard/InboundTrendChart";
import { WeeklySummaryPanel, WeeklySummaryPanelSkeleton } from "@/components/dashboard/WeeklySummaryPanel";
import { TransactionsTable, TransactionsTableSkeleton } from "@/components/dashboard/TransactionsTable";
import {
  computeMetrics,
  computeSectorCounts,
  computeStageCounts,
  computeGeographyCounts,
  computeMonthlyInbound,
} from "@/utils/aggregations";
import type { Deal, WeeklySummary } from "@/types";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

async function PipelineContent() {
  const supabase = createServerClient();

  const [dealsResult, summaryResult, { data: { user } }] = await Promise.all([
    supabase.from("deals").select("*").order("date_added", { ascending: false }),
    supabase
      .from("weekly_summaries")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.auth.getUser(),
  ]);

  const deals = (dealsResult.data as Deal[]) ?? [];
  const summary = summaryResult.error ? null : (summaryResult.data as WeeklySummary);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  const metrics = computeMetrics(deals);
  const sectors = computeSectorCounts(deals);
  const stages = computeStageCounts(deals);
  const geographies = computeGeographyCounts(deals);
  const monthly = computeMonthlyInbound(deals);
  const sectorCount = new Set(deals.map((d) => d.sector).filter(Boolean)).size;
  const geoCount = new Set(deals.map((d) => d.geography).filter(Boolean)).size;
  const recentDeals = deals.slice(0, 15);

  // suppress unused warning
  void geoCount;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Pipeline" subtitle={`${deals.length} deals tracked`} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* KPI grid */}
          <MetricsRow
            metrics={metrics}
            totalDeals={deals.length}
            sectorCount={sectorCount}
            geoCount={geoCount}
          />

          {/* Inbound deal flow — last 12 months */}
          <InboundTrendChart data={monthly} />

          {/* Sector breakdown + Stage distribution */}
          <div className="flex gap-5 items-start">
            <SectorBarChart data={sectors} />
            <StageDonutChart data={stages} />
          </div>

          {/* Geography */}
          <GeographyBarChart data={geographies} />

          {/* AI Weekly Intelligence */}
          <WeeklySummaryPanel summary={summary} />

          {/* Recent deals */}
          <TransactionsTable deals={recentDeals} />

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
        <div className="p-6 space-y-5">
          <MetricsRowSkeleton />
          <InboundTrendChartSkeleton />
          <div className="flex gap-5 items-start">
            <SectorBarChartSkeleton />
            <StageDonutChartSkeleton />
          </div>
          <GeographyBarChartSkeleton />
          <WeeklySummaryPanelSkeleton />
          <TransactionsTableSkeleton />
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
