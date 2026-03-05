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
import type { MonthlyInbound } from "@/types";

interface InboundTrendChartProps {
  data: MonthlyInbound[];
}

export function InboundTrendChart({ data }: InboundTrendChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Inbound Deal Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState label="No inbound data yet" />
        </CardContent>
      </Card>
    );
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Inbound Deal Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickCount={4}
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
            <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={40}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill="#5CD3D3"
                  fillOpacity={max === 0 ? 0.3 : 0.3 + 0.7 * (d.count / max)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function InboundTrendChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  );
}
