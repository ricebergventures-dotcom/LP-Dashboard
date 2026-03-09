import {
  startOfMonth,
  parseISO,
  compareDesc,
} from "date-fns";
import type {
  Deal,
  DashboardMetrics,
  SectorCount,
  StageCount,
  GeographyCount,
  AggregatedData,
  MonthlyInbound,
} from "@/types";

export function computeMetrics(deals: Deal[]): DashboardMetrics {
  const now = new Date();
  const monthStart = startOfMonth(now);

  let dealsThisMonth = 0;
  let activePipeline = 0;

  for (const deal of deals) {
    if (deal.status === "active") {
      activePipeline++;
    }
    if (!deal.date_added) continue;
    const date = parseISO(deal.date_added);
    if (isNaN(date.getTime())) continue;

    if (date >= monthStart) {
      dealsThisMonth++;
    }
  }

  return {
    dealsThisMonth,
    activePipeline,
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

// Maps raw Decile Hub stage names → grouped display labels.
// Any unlisted stage falls into "Other".
const STAGE_GROUP_MAP: Record<string, string> = {
  // Added — new prospects entering the funnel
  "Added":                        "Added",
  "Reach Out to Cold Lead":       "Added",
  "Reach Out to Inbound Lead":    "Added",
  "Set Up Call":                  "Added",
  "Call Scheduled [Hold]":        "Added",
  "Stealth Startups":             "Added",

  // Developing Deal Memo — active evaluation
  "Tracking for Future Rounds":   "Developing Deal Memo",
  "Thesis Assessment Qualified":  "Developing Deal Memo",
  "Company Review [Hold]":        "Developing Deal Memo",
  "Review Opportunity [Hold]":    "Developing Deal Memo",
  "IC Evaluation":                "Developing Deal Memo",
  "Collect Materials":            "Developing Deal Memo",
  "Develop Deal Memo [Hold]":     "Developing Deal Memo",
  "Start Due Diligence":          "Developing Deal Memo",

  // Out of Thesis
  "Out of Thesis but Opportunistic": "Out of Thesis",
  "Missed Opportunity":           "Out of Thesis",

  // Failed Review
  "Failed Review":                "Failed Review",
  "Declined by GP":               "Failed Review",
  "No Response":                  "Failed Review",
  "Failed Due Diligence":         "Failed Review",
  "Unresponsive":                 "Failed Review",

  // Invested
  "Investment Closed [Hold]":     "Invested",
  "Send Wire":                    "Invested",
  "Invest through Syndicate":     "Invested",
};

export function groupStage(stage: string): string {
  return STAGE_GROUP_MAP[stage] ?? "Other";
}

export function computeStageCounts(deals: Deal[]): StageCount[] {
  const map = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.stage) continue;
    const group = groupStage(deal.stage);
    map.set(group, (map.get(group) ?? 0) + 1);
  }
  // Fixed display order
  const ORDER = ["Added", "Developing Deal Memo", "Out of Thesis", "Failed Review", "Invested", "Other"];
  return ORDER
    .filter((g) => map.has(g))
    .map((g) => ({ stage: g, count: map.get(g)! }));
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

// ─── Monthly inbound trend ─────────────────────────────────────────────────────

/** Returns deal counts grouped by calendar month for the last `months` months. */
export function computeMonthlyInbound(deals: Deal[], months = 12): MonthlyInbound[] {
  const now = new Date();
  const result: MonthlyInbound[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const year = now.getMonth() - i < 0
      ? now.getFullYear() - 1
      : now.getFullYear();
    const month = ((now.getMonth() - i) % 12 + 12) % 12;
    const label = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    const count = deals.filter((d) => {
      if (!d.date_added) return false;
      const added = parseISO(d.date_added);
      if (isNaN(added.getTime())) return false;
      return added.getFullYear() === year && added.getMonth() === month;
    }).length;
    result.push({ month: label, count });
  }

  return result;
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
