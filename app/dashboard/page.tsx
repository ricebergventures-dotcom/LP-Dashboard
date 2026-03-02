import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { MetricsRow, MetricsRowSkeleton } from "@/components/dashboard/MetricsRow";
import { SectorBarChart, SectorBarChartSkeleton } from "@/components/dashboard/SectorBarChart";
import { StageDonutChart, StageDonutChartSkeleton } from "@/components/dashboard/StageDonutChart";
import { WeeklySummaryPanel, WeeklySummaryPanelSkeleton } from "@/components/dashboard/WeeklySummaryPanel";
import { TransactionsTable, TransactionsTableSkeleton } from "@/components/dashboard/TransactionsTable";
import { computeMetrics, computeSectorCounts, computeStageCounts } from "@/utils/aggregations";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import type { Deal, WeeklySummary, Profile } from "@/types";

export const metadata = { title: "Dashboard" };

// Force dynamic rendering — dashboard data changes frequently
export const dynamic = "force-dynamic";

async function DashboardContent() {
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Parallel data fetches
  const [dealsResult, summaryResult, profileResult] = await Promise.all([
    supabase.from("deals").select("*").order("date_added", { ascending: false }),
    supabase
      .from("weekly_summaries")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const deals = (dealsResult.data as Deal[]) ?? [];
  const summary = summaryResult.error ? null : (summaryResult.data as WeeklySummary);
  const profile = profileResult.data as Profile | null;
  const isAdmin = profile?.role === "admin";

  const metrics = computeMetrics(deals);
  const sectors = computeSectorCounts(deals);
  const stages = computeStageCounts(deals);
  const recentDeals = deals.slice(0, 20);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Dashboard" />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Metrics row */}
          <MetricsRow metrics={metrics} />

          {/* Charts row */}
          <div className="flex gap-5 items-start">
            <SectorBarChart data={sectors} />
            <StageDonutChart data={stages} />
          </div>

          {/* Summary panel */}
          <WeeklySummaryPanel summary={summary} isAdmin={isAdmin} />

          {/* Recent transactions */}
          <TransactionsTable deals={recentDeals} />

          {/* Export footer */}
          <div className="flex justify-end pb-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <a href="/api/export" download>
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full overflow-hidden">
          <TopBar title="Dashboard" />
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
              <MetricsRowSkeleton />
              <div className="flex gap-5 items-start">
                <SectorBarChartSkeleton />
                <StageDonutChartSkeleton />
              </div>
              <WeeklySummaryPanelSkeleton />
              <TransactionsTableSkeleton />
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
