"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatDate, formatStage, formatCheckSize } from "@/utils/formatters";
import type { Deal, DealStatus } from "@/types";

interface AllTransactionsTableProps {
  deals: Deal[];
}

const STATUS_VARIANT: Record<DealStatus, "active" | "passed" | "diligence"> = {
  active: "active",
  passed: "passed",
  diligence: "diligence",
};

const STATUS_OPTIONS: Array<{ value: DealStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "diligence", label: "Diligence" },
  { value: "passed", label: "Passed" },
];

export function AllTransactionsTable({ deals }: AllTransactionsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return deals.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesQuery =
        !q ||
        d.company_name.toLowerCase().includes(q) ||
        d.sector.toLowerCase().includes(q) ||
        d.geography.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [deals, query, statusFilter]);

  return (
    <Card>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <Input
          placeholder="Search company, sector, geography…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 max-w-xs text-xs"
        />
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as DealStatus | "all")}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded-sm transition-colors ${
                statusFilter === opt.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto tabular text-[11px] text-muted-foreground">
          {filtered.length} deal{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            label={deals.length === 0 ? "No deals yet. Upload a CSV to get started." : "No deals match your filters."}
            height="h-32"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Check Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium text-foreground">
                    {deal.company_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {deal.sector}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatStage(deal.stage)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {deal.geography}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[deal.status]}>
                      {deal.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular text-xs text-muted-foreground">
                    {formatDate(deal.date_added)}
                  </TableCell>
                  <TableCell className="tabular text-xs text-muted-foreground text-right">
                    {formatCheckSize(deal.check_size)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function AllTransactionsTableSkeleton() {
  return (
    <Card>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-7 w-48" />
      </div>
      <CardContent className="p-0">
        <div className="px-4 pb-4 space-y-3 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
