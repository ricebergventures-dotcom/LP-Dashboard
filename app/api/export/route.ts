import { NextResponse } from "next/server";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { createRouteClient } from "@/lib/supabase-server";
import { generatePdf } from "@/lib/pdf-generator";
import { computeAggregatedData } from "@/utils/aggregations";
import type { Deal, WeeklySummary } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createRouteClient();

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const from = fromParam
    ? startOfDay(parseISO(fromParam))
    : startOfDay(subDays(now, 6));
  const to = toParam ? endOfDay(parseISO(toParam)) : endOfDay(now);

  // Fetch deals in range
  const { data: dealsRaw, error: dealsErr } = await supabase
    .from("deals")
    .select("*")
    .gte("date_added", format(from, "yyyy-MM-dd"))
    .lte("date_added", format(to, "yyyy-MM-dd"))
    .order("date_added", { ascending: false });

  if (dealsErr) {
    return new NextResponse(dealsErr.message, { status: 500 });
  }

  const deals = (dealsRaw as Deal[]) ?? [];

  // Fetch latest summary
  const { data: summaryRaw } = await supabase
    .from("weekly_summaries")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const summary = (summaryRaw as WeeklySummary) ?? null;
  const { metrics, sectors, stages } = computeAggregatedData(deals);
  const fundName = process.env.NEXT_PUBLIC_FUND_NAME ?? "LP Report";

  const pdfBuffer = await generatePdf({
    fundName,
    dateRange: { from, to },
    deals,
    summary,
    metrics,
    sectors,
    stages,
  });

  const fileName = `${fundName.replace(/\s+/g, "-")}-LP-Report-${format(to, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
