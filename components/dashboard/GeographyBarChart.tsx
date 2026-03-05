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
import type { GeographyCount } from "@/types";

interface GeographyBarChartProps {
  data: GeographyCount[];
}

export function GeographyBarChart({ data }: GeographyBarChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Geography Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState label="No geography data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Geography Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 32)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickCount={4}
            />
            <YAxis
              dataKey="geography"
              type="category"
              width={128}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                color: "hsl(var(--foreground))",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number) => [value, "Deals"]}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={18}>
              {sorted.map((_, i) => (
                <Cell key={i} fill="#5CD3D3" fillOpacity={1 - i * 0.08} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function GeographyBarChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}
