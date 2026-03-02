"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { StageCount } from "@/types";

// Teal — dark to light as specified
const FILLS = ["#5CD3D3", "#4BBFBF", "#3AABAB", "#2E9797", "#228383", "#166F6F"];

interface StageDonutChartProps {
  data: StageCount[];
}

export function StageDonutChart({ data }: StageDonutChartProps) {
  if (data.length === 0) {
    return (
      <Card className="w-72">
        <CardHeader>
          <CardTitle>Stage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState label="No deal data yet" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({ name: d.stage, value: d.count }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Stage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Donut with total count in centre */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={FILLS[i % FILLS.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #E5E5E5",
                  borderRadius: 2,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Centre total */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          >
            <span className="tabular text-2xl font-light text-foreground leading-none">
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
              total
            </span>
          </div>
        </div>

        {/* Custom legend */}
        <div className="mt-3 space-y-1.5">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: FILLS[i % FILLS.length] }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <span className="tabular text-xs text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StageDonutChartSkeleton() {
  return (
    <Card className="w-72">
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
        <div className="mt-3 space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
