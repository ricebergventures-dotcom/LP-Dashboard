// Server-side only — imported only from app/api/export/route.ts
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { formatStage } from "@/utils/formatters";
import type { Deal, WeeklySummary, DashboardMetrics, SectorCount, StageCount } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

// A4 at 72 dpi: 595.28 × 841.89 pts. One inch = 72 pts.
const MARGIN = 72;

// ─── Style sheet ──────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    paddingTop: MARGIN,
    // Leave extra space at the bottom for the fixed footer (footer height ≈ 30 pts)
    paddingBottom: MARGIN + 30,
    paddingHorizontal: MARGIN,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  fundName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#000000",
  },
  weekEnding: {
    fontSize: 8,
    color: "#555555",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 8.5,
    color: "#555555",
    marginTop: 4,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    marginBottom: 22,
  },

  // ─── Section labels ────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: "#888888",
    marginBottom: 10,
    marginTop: 24,
  },

  // ─── Executive summary ─────────────────────────────────────────────────────
  summaryText: {
    fontSize: 9,
    lineHeight: 1.65,
    color: "#1a1a1a",
  },

  // ─── Metrics 2×2 grid ─────────────────────────────────────────────────────
  //
  //  Outer wrapper carries the top and left borders; each cell provides right
  //  and bottom borders so the internal lines are shared.
  //
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 0.5,
    borderTopColor: "#bbbbbb",
    borderLeftWidth: 0.5,
    borderLeftColor: "#bbbbbb",
    marginTop: 2,
  },
  metricCell: {
    width: "50%",
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRightWidth: 0.5,
    borderRightColor: "#bbbbbb",
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbbbbb",
  },
  metricLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#888888",
    marginBottom: 7,
  },
  metricValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    lineHeight: 1,
  },

  // ─── Data tables ──────────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 5,
    marginTop: 2,
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
    paddingVertical: 5,
  },
  thCell: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#888888",
  },
  tdCell: {
    fontSize: 8.5,
    color: "#1a1a1a",
  },
  colName: {
    flex: 1,
  },
  colDeals: {
    width: 52,
    textAlign: "right",
  },
  colPct: {
    width: 68,
    textAlign: "right",
  },

  // ─── Fixed footer ─────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: MARGIN - 18,  // sits 18 pts above the bottom margin line
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#aaaaaa",
    paddingTop: 7,
  },
  footerText: {
    fontSize: 7,
    color: "#888888",
  },
});

// ─── Helper — format WoW percentage ──────────────────────────────────────────

function fmtWow(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ─── Helper — table section ───────────────────────────────────────────────────

interface TableRow {
  name: string;
  count: number;
  total: number;
}

function DataTable({ rows }: { rows: TableRow[] }) {
  return (
    <View>
      <View style={S.tableHeaderRow}>
        <Text style={[S.thCell, S.colName]}>Name</Text>
        <Text style={[S.thCell, S.colDeals]}>Deals</Text>
        <Text style={[S.thCell, S.colPct]}>% of Total</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={S.tableDataRow}>
          <Text style={[S.tdCell, S.colName]}>{row.name}</Text>
          <Text style={[S.tdCell, S.colDeals]}>{row.count}</Text>
          <Text style={[S.tdCell, S.colPct]}>
            {row.total > 0
              ? `${((row.count / row.total) * 100).toFixed(1)}%`
              : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── PDF document ─────────────────────────────────────────────────────────────

export interface PdfData {
  fundName: string;
  dateRange: { from: Date; to: Date };
  deals: Deal[];
  summary: WeeklySummary | null;
  metrics: DashboardMetrics;
  sectors: SectorCount[];
  stages: StageCount[];
}

function LpReportDocument({
  fundName,
  dateRange,
  deals,
  summary,
  metrics,
  sectors,
  stages,
}: PdfData) {
  const weekEndingLabel = `Week ending ${format(dateRange.to, "MMMM d, yyyy")}`;
  const totalNewDeals = deals.length;

  const sectorRows: TableRow[] = sectors
    .slice(0, 12)
    .map((s) => ({ name: s.sector, count: s.count, total: totalNewDeals }));

  const stageRows: TableRow[] = stages.map((s) => ({
    name: formatStage(s.stage),
    count: s.count,
    total: totalNewDeals,
  }));

  const pipelineMetrics: Array<{ label: string; value: string }> = [
    { label: "Total New Deals", value: String(totalNewDeals) },
    { label: "Deals This Week", value: String(metrics.dealsThisWeek) },
    { label: "Active Pipeline", value: String(metrics.activePipeline) },
    { label: "Week-over-Week", value: fmtWow(metrics.weekOverWeekChange) },
  ];

  return (
    <Document
      title={`${fundName} — LP Pipeline Intelligence Report`}
      author={fundName}
      creator="LP Dashboard"
      subject={weekEndingLabel}
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={S.headerTopRow}>
          <Text style={S.fundName}>{fundName.toUpperCase()}</Text>
          <Text style={S.weekEnding}>{weekEndingLabel}</Text>
        </View>
        <Text style={S.subtitle}>LP Pipeline Intelligence Report</Text>
        <View style={S.headerRule} />

        {/* ── Section 1: Executive Summary ─────────────────────────────── */}
        {summary !== null && summary.summary_text.trim().length > 0 && (
          <View>
            <Text style={S.sectionLabel}>Executive Summary</Text>
            <Text style={S.summaryText}>{summary.summary_text}</Text>
          </View>
        )}

        {/* ── Section 2: Pipeline Metrics ───────────────────────────────── */}
        <Text style={S.sectionLabel}>Pipeline Metrics</Text>
        <View style={S.metricsGrid}>
          {pipelineMetrics.map((m) => (
            <View key={m.label} style={S.metricCell}>
              <Text style={S.metricLabel}>{m.label}</Text>
              <Text style={S.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Section 3: Sector Breakdown ───────────────────────────────── */}
        {sectorRows.length > 0 && (
          <View>
            <Text style={S.sectionLabel}>Sector Breakdown</Text>
            <DataTable rows={sectorRows} />
          </View>
        )}

        {/* ── Section 4: Stage Distribution ─────────────────────────────── */}
        {stageRows.length > 0 && (
          <View>
            <Text style={S.sectionLabel}>Stage Distribution</Text>
            <DataTable rows={stageRows} />
          </View>
        )}

        {/* ── Fixed footer ──────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            Confidential — For Limited Partner Use Only
          </Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generatePdf(data: PdfData): Promise<Buffer> {
  const element = <LpReportDocument {...data} />;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
