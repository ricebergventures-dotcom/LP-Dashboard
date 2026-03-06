import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { MetricsRow, MetricsRowSkeleton } from "@/components/dashboard/MetricsRow";
import { SectorBarChart, SectorBarChartSkeleton } from "@/components/dashboard/SectorBarChart";
import { StageDonutChart, StageDonutChartSkeleton } from "@/components/dashboard/StageDonutChart";
import { GeographyBarChart, GeographyBarChartSkeleton } from "@/components/dashboard/GeographyBarChart";
import { InboundTrendChart, InboundTrendChartSkeleton } from "@/components/dashboard/InboundTrendChart";
import { MonthlySummaryPanel, MonthlySummaryPanelSkeleton } from "@/components/dashboard/MonthlySummaryPanel";
import { MemoDealsTable, MemoDealsTableSkeleton } from "@/components/dashboard/MemoDealsTable";
import {
  computeMetrics,
  computeSectorCounts,
  computeStageCounts,
  computeGeographyCounts,
  computeMonthlyInbound,
} from "@/utils/aggregations";
import type { Deal, MonthlySummary } from "@/types";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

async function PipelineContent() {
  const supabase = createServerClient();

  const [dealsResult, summaryResult] = await Promise.all([
    supabase.from("deals").select("*").order("date_added", { ascending: false }),
    supabase
      .from("monthly_summaries")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const deals = (dealsResult.data as Deal[]) ?? [];
  const summary = summaryResult.error ? null : (summaryResult.data as MonthlySummary);

  const metrics = computeMetrics(deals);
  const sectors = computeSectorCounts(deals);
  const stages = computeStageCounts(deals);
  const geographies = computeGeographyCounts(deals);
  const monthly = computeMonthlyInbound(deals);
  const sectorCount = new Set(deals.map((d) => d.sector).filter(Boolean)).size;
  const geoCount = new Set(deals.map((d) => d.geography).filter(Boolean)).size;
  const memoDeals = deals.filter((d) => d.stage === "Develop Deal Memo [Hold]");

  // suppress unused warning
  void geoCount;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Pipeline" subtitle={`${deals.length} deals tracked`} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* KPI grid */}
          <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
            <MetricsRow
              metrics={metrics}
              totalDeals={deals.length}
              sectorCount={sectorCount}
              geoCount={geoCount}
            />
          </div>

          {/* Inbound deal flow — last 12 months */}
          <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <InboundTrendChart data={monthly} />
          </div>

          {/* Sector breakdown + Stage distribution */}
          <div className="animate-fade-up flex gap-5 items-start" style={{ animationDelay: "160ms" }}>
            <SectorBarChart data={sectors} />
            <StageDonutChart data={stages} />
          </div>

          {/* Geography */}
          <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
            <GeographyBarChart data={geographies} />
          </div>

          {/* AI Monthly Intelligence */}
          <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
            <MonthlySummaryPanel summary={summary} />
          </div>

          {/* Investment Memo Pipeline */}
          {memoDeals.length > 0 && (
            <div className="animate-fade-up" style={{ animationDelay: "400ms" }}>
              <MemoDealsTable deals={memoDeals} />
            </div>
          )}

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
          <MonthlySummaryPanelSkeleton />
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
