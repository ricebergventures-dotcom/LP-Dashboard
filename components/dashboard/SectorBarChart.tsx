"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { SectorCount } from "@/types";

// Distinct color per sector — falls back to palette by index
const SECTOR_COLORS: Record<string, string> = {
  Technology:   "#5CD3D3",
  Healthcare:   "#A78BFA",
  Finance:      "#60A5FA",
  "Deep Tech":  "#FBBF24",
  Climate:      "#34D399",
  Consumer:     "#FB923C",
  Other:        "#94A3B8",
};
const FALLBACK_PALETTE = ["#5CD3D3", "#A78BFA", "#60A5FA", "#FBBF24", "#34D399", "#FB923C", "#94A3B8"];

function getSectorColor(sector: string, index: number): string {
  return SECTOR_COLORS[sector] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] ?? "#5CD3D3";
}

interface SectorBarChartProps {
  data: SectorCount[];
}

export function SectorBarChart({ data }: SectorBarChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Sector Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState label="No deal data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Sector Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickCount={4}
            />
            <YAxis
              dataKey="sector"
              type="category"
              width={112}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 2,
                fontSize: 12,
              }}
              formatter={(value: number) => [value, "Deals"]}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={20}>
              {sorted.map((entry, i) => (
                <Cell key={i} fill={getSectorColor(entry.sector, i)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Color legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {sorted.map((entry, i) => (
            <div key={entry.sector} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: getSectorColor(entry.sector, i) }}
              />
              <span className="text-[10px] text-muted-foreground">{entry.sector}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectorBarChartSkeleton() {
  return (
    <Card className="flex-1">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}
