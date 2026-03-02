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

interface SectorBarChartProps {
  data: SectorCount[];
}

export function SectorBarChart({ data }: SectorBarChartProps) {
  // Sort descending by deal count
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
        <ResponsiveContainer width="100%" height={280}>
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
              cursor={{ fill: "#FAFAFA" }}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #E5E5E5",
                borderRadius: 2,
                fontSize: 12,
              }}
              formatter={(value: number) => [value, "Deals"]}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={18}>
              {sorted.map((_, i) => (
                <Cell key={i} fill="#5CD3D3" fillOpacity={1 - i * 0.1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

