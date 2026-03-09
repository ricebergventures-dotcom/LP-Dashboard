// Server-side only — imported only from app/api/export/route.ts
// Uses pdf-lib (pure JS, no native modules) instead of @react-pdf/renderer.
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { format } from "date-fns";
import { formatStage } from "@/utils/formatters";
import type { Deal, WeeklySummary, DashboardMetrics, SectorCount, StageCount } from "@/types";

// ─── Colors ───────────────────────────────────────────────────────────────────
const C_BLACK = rgb(0,     0,     0);
const C_DARK  = rgb(0.102, 0.102, 0.102);  // #1a1a1a
const C_MID   = rgb(0.333, 0.333, 0.333);  // #555555
const C_LIGHT = rgb(0.533, 0.533, 0.533);  // #888888
const C_RULE  = rgb(0.667, 0.667, 0.667);  // #aaaaaa
const C_GRID  = rgb(0.733, 0.733, 0.733);  // #bbbbbb
const C_ROW   = rgb(0.867, 0.867, 0.867);  // #dddddd

// ─── Page constants ───────────────────────────────────────────────────────────
const A4_W      = 595.28;
const A4_H      = 841.89;
const MARGIN    = 72;
const CONTENT_W = A4_W - 2 * MARGIN;
const FOOTER_Y  = MARGIN - 18;   // 54 pts from bottom of page

// ─── Public types ─────────────────────────────────────────────────────────────
export interface PdfData {
  fundName:  string;
  dateRange: { from: Date; to: Date };
  deals:     Deal[];
  summary:   WeeklySummary | null;
  metrics:   DashboardMetrics;
  sectors:   SectorCount[];
  stages:    StageCount[];
}

// ─── Internal types ───────────────────────────────────────────────────────────
interface TableRow { name: string; count: number; total: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

}

/** Wraps text into lines that fit within maxWidth. Respects existing newlines. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      if (!word) continue;
      const probe = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
        current = probe;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Draws a Name / Deals / % of Total table.
 * Column widths match the original react-pdf layout (52 pts Deals, 68 pts Pct).
 * Returns the y position below the last row.
 */
function drawTable(
  page:  PDFPage,
  x:     number,
  y:     number,
  width: number,
  rows:  TableRow[],
  reg:   PDFFont,
  bld:   PDFFont,
): number {
  // Right edges of right-aligned columns
  const dealEdge = x + width - 68;  // "Deals" col right  (52 pts wide, left of pct col)
  const pctEdge  = x + width;       // "% of Total" col right (68 pts wide)

  // ── Header text ──
  page.drawText("Name", { x, y, font: bld, size: 6.5, color: C_LIGHT });
  page.drawText("Deals", {
    x: dealEdge - bld.widthOfTextAtSize("Deals", 6.5),
    y, font: bld, size: 6.5, color: C_LIGHT,
  });
  page.drawText("% of Total", {
    x: pctEdge - bld.widthOfTextAtSize("% of Total", 6.5),
    y, font: bld, size: 6.5, color: C_LIGHT,
  });

  y -= 9;
  page.drawLine({ start: { x, y }, end: { x: pctEdge, y }, thickness: 1.0, color: C_BLACK });
  y -= 1;

  // ── Data rows ──
  for (const row of rows) {
    y -= 13;  // top-pad (5 pts) + font ascender (~8 pts)

    page.drawText(row.name, { x, y, font: reg, size: 8.5, color: C_DARK });

    const cStr = String(row.count);
    page.drawText(cStr, {
      x: dealEdge - reg.widthOfTextAtSize(cStr, 8.5),
      y, font: reg, size: 8.5, color: C_DARK,
    });

    const pStr = row.total > 0
      ? `${((row.count / row.total) * 100).toFixed(1)}%`
      : "—";
    page.drawText(pStr, {
      x: pctEdge - reg.widthOfTextAtSize(pStr, 8.5),
      y, font: reg, size: 8.5, color: C_DARK,
    });

    y -= 5;  // bottom-pad
    page.drawLine({ start: { x, y }, end: { x: pctEdge, y }, thickness: 0.5, color: C_ROW });
  }

  return y;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generatePdf(data: PdfData): Promise<Uint8Array> {
  const { fundName, dateRange, deals, summary, metrics, sectors, stages } = data;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${fundName} — LP Pipeline Intelligence Report`);
  pdfDoc.setAuthor(fundName);
  pdfDoc.setCreator("LP Dashboard");

  const reg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bld = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([A4_W, A4_H]);

  const weekEndingLabel = `Week ending ${format(dateRange.to, "MMMM d, yyyy")}`;
  const totalNewDeals   = deals.length;

  let y = A4_H - MARGIN;   // y starts at top margin (coordinates are from bottom)
  const x = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawText(fundName.toUpperCase(), { x, y, font: bld, size: 11, color: C_BLACK });
  const weW = reg.widthOfTextAtSize(weekEndingLabel, 8);
  page.drawText(weekEndingLabel, {
    x: x + CONTENT_W - weW, y,
    font: reg, size: 8, color: C_MID,
  });

  y -= 16;
  page.drawText("LP Pipeline Intelligence Report", { x, y, font: reg, size: 8.5, color: C_MID });

  y -= 14;
  page.drawLine({ start: { x, y }, end: { x: x + CONTENT_W, y }, thickness: 1.5, color: C_BLACK });

  y -= 24;

  // ── Section 1 — Executive Summary ───────────────────────────────────────────
  if (summary && summary.summary_text.trim().length > 0) {
    page.drawText("Executive Summary", { x, y, font: bld, size: 6.5, color: C_LIGHT });
    y -= 14;

    const lines = wrapText(summary.summary_text, reg, 9, CONTENT_W);
    for (const line of lines) {
      page.drawText(line, { x, y, font: reg, size: 9, color: C_DARK });
      y -= 14.85;   // 9pt × 1.65 line-height
    }
    y -= 8;
  }

  // ── Section 2 — Pipeline Metrics ────────────────────────────────────────────
  page.drawText("Pipeline Metrics", { x, y, font: bld, size: 6.5, color: C_LIGHT });
  y -= 12;

  const metricItems: Array<{ label: string; value: string }> = [
    { label: "Total New Deals",   value: String(totalNewDeals) },
    { label: "Inbound This Month", value: String(metrics.dealsThisMonth) },
    { label: "Active Pipeline",   value: String(metrics.activePipeline) },
    { label: "Total Tracked",     value: String(totalNewDeals) },
  ];

  const CELL_W   = CONTENT_W / 2;
  const CELL_H   = 60;
  const gridTop  = y;

  // Outer top border
  page.drawLine({
    start: { x, y: gridTop }, end: { x: x + CONTENT_W, y: gridTop },
    thickness: 0.5, color: C_GRID,
  });

  metricItems.forEach((item, i) => {
    const col     = i % 2;
    const row     = Math.floor(i / 2);
    const cellX   = x + col * CELL_W;
    const cellTop = gridTop - row * CELL_H;

    // Left border (left column only — shared with right column)
    if (col === 0) {
      page.drawLine({
        start: { x: cellX, y: cellTop }, end: { x: cellX, y: cellTop - CELL_H },
        thickness: 0.5, color: C_GRID,
      });
    }
    // Right border
    page.drawLine({
      start: { x: cellX + CELL_W, y: cellTop }, end: { x: cellX + CELL_W, y: cellTop - CELL_H },
      thickness: 0.5, color: C_GRID,
    });
    // Bottom border
    page.drawLine({
      start: { x: cellX, y: cellTop - CELL_H }, end: { x: cellX + CELL_W, y: cellTop - CELL_H },
      thickness: 0.5, color: C_GRID,
    });

    // Label
    page.drawText(item.label.toUpperCase(), {
      x: cellX + 16, y: cellTop - 20,
      font: bld, size: 6.5, color: C_LIGHT,
    });
    // Value
    page.drawText(item.value, {
      x: cellX + 16, y: cellTop - 20 - 26,
      font: bld, size: 22, color: C_BLACK,
    });
  });

  y = gridTop - 2 * CELL_H - 8;

  // ── Section 3 — Sector Breakdown ─────────────────────────────────────────────
  const sectorRows: TableRow[] = sectors
    .slice(0, 12)
    .map((s) => ({ name: s.sector, count: s.count, total: totalNewDeals }));

  if (sectorRows.length > 0) {
    page.drawText("Sector Breakdown", { x, y, font: bld, size: 6.5, color: C_LIGHT });
    y -= 12;
    y = drawTable(page, x, y, CONTENT_W, sectorRows, reg, bld);
    y -= 8;
  }

  // ── Section 4 — Stage Distribution ──────────────────────────────────────────
  const stageRows: TableRow[] = stages.map((s) => ({
    name: formatStage(s.stage),
    count: s.count,
    total: totalNewDeals,
  }));

  if (stageRows.length > 0) {
    page.drawText("Stage Distribution", { x, y, font: bld, size: 6.5, color: C_LIGHT });
    y -= 12;
    drawTable(page, x, y, CONTENT_W, stageRows, reg, bld);
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x, y: FOOTER_Y + 10 }, end: { x: x + CONTENT_W, y: FOOTER_Y + 10 },
    thickness: 0.5, color: C_RULE,
  });
  page.drawText("Confidential — For Limited Partner Use Only", {
    x, y: FOOTER_Y, font: reg, size: 7, color: C_LIGHT,
  });
  const p1 = "Page 1 of 1";
  page.drawText(p1, {
    x: x + CONTENT_W - reg.widthOfTextAtSize(p1, 7),
    y: FOOTER_Y, font: reg, size: 7, color: C_LIGHT,
  });

  return pdfDoc.save();
}
