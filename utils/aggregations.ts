import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  subWeeks,
  parseISO,
  isWithinInterval,
  compareDesc,
} from "date-fns";
import type {
  Deal,
  DashboardMetrics,
  SectorCount,
  StageCount,
  GeographyCount,
  AggregatedData,
} from "@/types";

export function computeMetrics(deals: Deal[]): DashboardMetrics {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  let dealsThisWeek = 0;
  let dealsLastWeek = 0;
  let dealsThisMonth = 0;
  let activePipeline = 0;
  let totalDeployed = 0;

  for (const deal of deals) {
    const date = parseISO(deal.date_added);

    if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
      dealsThisWeek++;
    }
    if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) {
      dealsLastWeek++;
    }
    if (date >= monthStart) {
      dealsThisMonth++;
    }
    if (deal.status === "active") {
      activePipeline++;
    }
    if (deal.check_size !== null) {
      totalDeployed += deal.check_size;
    }
  }

  const weekOverWeekChange =
    dealsLastWeek === 0
      ? dealsThisWeek > 0
        ? 100
        : 0
      : ((dealsThisWeek - dealsLastWeek) / dealsLastWeek) * 100;

  return {
    dealsThisWeek,
    dealsThisMonth,
    activePipeline,
    weekOverWeekChange,
    totalDeployed,
  };
}

export function computeSectorCounts(deals: Deal[]): SectorCount[] {
  const map = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.sector) continue; // skip empty sectors
    map.set(deal.sector, (map.get(deal.sector) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeStageCounts(deals: Deal[]): StageCount[] {
  const map = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.stage) continue;
    map.set(deal.stage, (map.get(deal.stage) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeGeographyCounts(deals: Deal[]): GeographyCount[] {
  const map = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.geography || deal.geography === "Unknown") continue;
    map.set(deal.geography, (map.get(deal.geography) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([geography, count]) => ({ geography, count }))
    .sort((a, b) => b.count - a.count);
}

/** Returns metrics, sector counts, stage counts, and geography counts. */
export function computeAggregatedData(deals: Deal[]): AggregatedData {
  return {
    metrics: computeMetrics(deals),
    sectors: computeSectorCounts(deals),
    stages: computeStageCounts(deals),
    geographies: computeGeographyCounts(deals),
  };
}

export function buildSectorRecord(deals: Deal[]): Record<string, number> {
  return Object.fromEntries(
    computeSectorCounts(deals).map(({ sector, count }) => [sector, count])
  );
}

export function buildStageRecord(deals: Deal[]): Record<string, number> {
  return Object.fromEntries(
    computeStageCounts(deals).map(({ stage, count }) => [stage, count])
  );
}

export function buildGeographyRecord(deals: Deal[]): Record<string, number> {
  const map = new Map<string, number>();
  for (const deal of deals) {
    map.set(deal.geography, (map.get(deal.geography) ?? 0) + 1);
  }
  return Object.fromEntries(
    Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  );
}

// ─── AI summary grouping ───────────────────────────────────────────────────────

/** Pre-aggregated counts across all three dimensions used by the AI summary
 *  prompt. Returned as plain records so they JSON-serialise cleanly. */
export interface DealGroupSummary {
  totalDeals: number;
  activePipeline: number;
  totalDeployed: number;   // sum of non-null check_size values (USD)
  sectors: Record<string, number>;
  stages: Record<string, number>;
  geographies: Record<string, number>;
}

export function buildSummaryGroups(deals: Deal[]): DealGroupSummary {
  const metrics = computeMetrics(deals);
  return {
    totalDeals: deals.length,
    activePipeline: metrics.activePipeline,
    totalDeployed: metrics.totalDeployed,
    sectors: buildSectorRecord(deals),
    stages: buildStageRecord(deals),
    geographies: buildGeographyRecord(deals),
  };
}

// ─── Recent deals ──────────────────────────────────────────────────────────────

/**
 * Returns the last `n` deals sorted by date_added descending.
 * Ties are broken by the order of the input array (stable sort).
 */
export function getRecentDeals(deals: Deal[], n: number): Deal[] {
  return [...deals]
    .sort((a, b) =>
      compareDesc(parseISO(a.date_added), parseISO(b.date_added))
    )
    .slice(0, n);
}
